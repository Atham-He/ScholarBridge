import { createRequire } from "module";
import OpenAI from "openai";
import { db } from "@/lib/db";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text?: string }>;

type ScoreResult = {
  hardScore: number;
  fitScore: number;
  summary: string;
  source: "openai" | "heuristic";
};

export async function extractPdfText(buffer: Buffer) {
  try {
    const parsed = await pdfParse(buffer);
    return cleanText(parsed.text || "");
  } catch (error) {
    console.error("Failed to extract PDF text:", error);
    return "";
  }
}

export function calculateWeightedAiScore(
  hardScore?: number | null,
  fitScore?: number | null,
  hardWeight: number = 50
) {
  if (typeof hardScore !== "number" || typeof fitScore !== "number") {
    return null;
  }

  const normalizedHardWeight = Math.max(0, Math.min(100, hardWeight));
  const fitWeight = 100 - normalizedHardWeight;
  return Math.round(((hardScore * normalizedHardWeight + fitScore * fitWeight) / 100) * 10) / 10;
}

export async function scoreApplicationResume(applicationId: string) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: true,
      owner: { include: { profile: true } },
      applicant: { include: { profile: true } },
    },
  });

  if (!application) {
    return null;
  }

  const profile = application.owner.profile;
  if (!profile?.aiAgentEnabled) {
    return null;
  }

  const resumeText = application.applicant.profile?.resumeText || "";
  if (!resumeText.trim()) {
    await db.application.update({
      where: { id: applicationId },
      data: {
        aiHardScore: null,
        aiFitScore: null,
        aiScoreSummary: null,
        aiScoreError: "申请者尚未上传可解析的 PDF 简历",
        aiScoredAt: new Date(),
      },
    });
    return null;
  }

  try {
    const result = await scoreWithAiOrFallback({
      resumeText,
      coverLetter: application.coverLetter || "",
      projectTitle: application.project.title,
      projectDescription: application.project.description,
      projectResearchArea: application.project.researchArea,
      projectRequirements: application.project.requirements || "",
      ownerAgentPrompt: profile.aiAgentPrompt || "",
    });

    const updated = await db.application.update({
      where: { id: applicationId },
      data: {
        aiHardScore: result.hardScore,
        aiFitScore: result.fitScore,
        aiScoreSummary: result.summary,
        aiScoreError: null,
        aiScoredAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    console.error("Failed to score application resume:", error);
    await db.application.update({
      where: { id: applicationId },
      data: {
        aiScoreError: getAiErrorMessage(error),
        aiScoredAt: new Date(),
      },
    });
    return null;
  }
}

async function scoreWithAiOrFallback(params: {
  resumeText: string;
  coverLetter: string;
  projectTitle: string;
  projectDescription: string;
  projectResearchArea: string;
  projectRequirements: string;
  ownerAgentPrompt: string;
}): Promise<ScoreResult> {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicScore(params);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are ScholarBridge's resume screening agent for research applications.",
          "Score strictly from 0 to 100.",
          "hardScore measures objective academic/research strength: GPA, publications, awards, rigorous coursework, research output, technical depth.",
          "fitScore measures project match: overlap between project topic/requirements and the applicant's research experience, skills, and cover letter.",
          "Return only JSON: {\"hardScore\":number,\"fitScore\":number,\"summary\":\"short Chinese explanation\"}.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          params.ownerAgentPrompt ? `发布者自定义筛选偏好：\n${params.ownerAgentPrompt}` : "",
          `项目标题：${params.projectTitle}`,
          `研究方向：${params.projectResearchArea}`,
          `项目描述：${params.projectDescription}`,
          `项目要求：${params.projectRequirements || "未列出"}`,
          `申请说明：${params.coverLetter || "未填写"}`,
          `申请者 PDF 简历文本：\n${truncate(params.resumeText, 12000)}`,
        ].filter(Boolean).join("\n\n"),
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  const parsed = JSON.parse(text) as Partial<{ hardScore: number; fitScore: number; summary: string }>;
  return {
    hardScore: clampScore(parsed.hardScore),
    fitScore: clampScore(parsed.fitScore),
    summary: parsed.summary?.trim() || "AI 已完成简历评分。",
    source: "openai",
  };
}

function heuristicScore(params: {
  resumeText: string;
  coverLetter: string;
  projectTitle: string;
  projectDescription: string;
  projectResearchArea: string;
  projectRequirements: string;
  ownerAgentPrompt: string;
}): ScoreResult {
  const resume = params.resumeText.toLowerCase();
  const projectText = [
    params.projectTitle,
    params.projectDescription,
    params.projectResearchArea,
    params.projectRequirements,
    params.coverLetter,
  ].join(" ").toLowerCase();

  const hardSignals = [
    "gpa", "publication", "published", "paper", "conference", "journal", "award",
    "honor", "scholarship", "research assistant", "internship", "python", "pytorch",
    "tensorflow", "statistics", "machine learning", "实验", "论文", "发表", "奖学金",
    "绩点", "科研", "竞赛", "实习",
  ];
  const hardHits = hardSignals.filter((signal) => resume.includes(signal)).length;
  const hardScore = clampScore(45 + hardHits * 5 + Math.min(15, params.resumeText.length / 1000));

  const keywords = Array.from(new Set(projectText.match(/[\p{L}\p{N}+#.-]{3,}/gu) || []))
    .filter((word) => !["the", "and", "with", "for", "this", "that", "研究", "项目"].includes(word))
    .slice(0, 60);
  const matched = keywords.filter((word) => resume.includes(word));
  const fitScore = clampScore(40 + matched.length * 4 + (params.coverLetter ? 8 : 0));

  return {
    hardScore,
    fitScore,
    summary: `本地启发式评分：检测到 ${hardHits} 个硬实力信号，项目关键词匹配 ${matched.length} 个。配置 OPENAI_API_KEY 后会使用 AI 评分。`,
    source: "heuristic",
  };
}

function clampScore(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[truncated]` : text;
}

function getAiErrorMessage(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
  if (status === 401 || status === 403) {
    return "AI 服务鉴权失败：请检查 OPENAI_API_KEY 是否属于当前 OPENAI_BASE_URL，并在修改 .env 后重启服务。";
  }

  if (status === 404) {
    return "AI 模型不可用：请检查 OPENAI_MODEL 是否被当前服务支持。";
  }

  if (status === 429) {
    return "AI 服务额度或频率受限：请稍后重试或检查账户额度。";
  }

  return "AI 评分失败，请稍后重试";
}
