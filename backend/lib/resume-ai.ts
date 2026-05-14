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
        aiScoreError: "The applicant has not uploaded a readable PDF resume yet",
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
          "Return only JSON: {\"hardScore\":number,\"fitScore\":number,\"summary\":\"short English explanation\"}.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          params.ownerAgentPrompt ? `Project owner's custom screening preferences:\n${params.ownerAgentPrompt}` : "",
          `Project title: ${params.projectTitle}`,
          `Research area: ${params.projectResearchArea}`,
          `Project description: ${params.projectDescription}`,
          `Project requirements: ${params.projectRequirements || "Not provided"}`,
          `Cover letter: ${params.coverLetter || "Not provided"}`,
          `Applicant PDF resume text:\n${truncate(params.resumeText, 12000)}`,
        ].filter(Boolean).join("\n\n"),
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  const parsed = JSON.parse(text) as Partial<{ hardScore: number; fitScore: number; summary: string }>;
  return {
    hardScore: clampScore(parsed.hardScore),
    fitScore: clampScore(parsed.fitScore),
    summary: parsed.summary?.trim() || "AI resume screening completed.",
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
    "tensorflow", "statistics", "machine learning", "experiment", "thesis", "research",
    "competition", "intern",
  ];
  const hardHits = hardSignals.filter((signal) => resume.includes(signal)).length;
  const hardScore = clampScore(45 + hardHits * 5 + Math.min(15, params.resumeText.length / 1000));

  const keywords = Array.from(new Set(projectText.match(/[\p{L}\p{N}+#.-]{3,}/gu) || []))
    .filter((word) => !["the", "and", "with", "for", "this", "that", "research", "project"].includes(word))
    .slice(0, 60);
  const matched = keywords.filter((word) => resume.includes(word));
  const fitScore = clampScore(40 + matched.length * 4 + (params.coverLetter ? 8 : 0));

  return {
    hardScore,
    fitScore,
    summary: `Local heuristic score: detected ${hardHits} hard-signal matches and ${matched.length} overlapping project keywords. Configure OPENAI_API_KEY to enable AI scoring.`,
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
    return "AI service authentication failed. Check whether OPENAI_API_KEY matches the current OPENAI_BASE_URL, then restart the service after updating .env.";
  }

  if (status === 404) {
    return "AI model unavailable. Check whether the current service supports OPENAI_MODEL.";
  }

  if (status === 429) {
    return "AI service is rate-limited or out of quota. Please try again later or check your account quota.";
  }

  return "AI scoring failed. Please try again later.";
}
