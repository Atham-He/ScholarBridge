import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildMentorSystemPrompt,
  parseAiMarkers,
  stripAiMarkers,
} from "@/lib/prompt";
import { chatSendSchema } from "@/lib/validation";

function fallbackReply(mentorName: string): string {
  return [
    `你好，我是 ${mentorName} 的演示分身。当前未配置 ANTHROPIC_API_KEY，因此使用本地兜底回复。`,
    "你可以继续提问；正式环境将使用完整导师资料生成回答。",
    "[[SCORE:6]]",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = chatSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const { conversationId, content } = parsed.data;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      application: {
        include: {
          skill: {
            include: {
              projects: {
                where: { status: "OPEN" },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          mentor: { include: { mentorProfile: true } },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const app = conversation.application;
  if (app.status === "WITHDRAWN") {
    return NextResponse.json({ error: "该申请已撤回" }, { status: 400 });
  }
  if (app.status === "REJECTED") {
    return NextResponse.json({ error: "该申请已结束" }, { status: 400 });
  }

  const isStudent = user.role === "STUDENT" && app.studentUserId === user.id;
  const isMentor = user.role === "MENTOR" && app.mentorUserId === user.id;
  if (!isStudent && !isMentor) {
    return NextResponse.json({ error: "无权访问该会话" }, { status: 403 });
  }

  if (!isStudent) {
    return NextResponse.json(
      { error: "演示中仅学生端可触发 AI 回复；导师请在面板查看记录。" },
      { status: 403 },
    );
  }

  const mentorProfile = app.mentor.mentorProfile;
  if (!mentorProfile) {
    return NextResponse.json({ error: "导师资料缺失" }, { status: 500 });
  }

  const skill = app.skill;
  const openPositionsSummary =
    skill.projects.length > 0
      ? skill.projects.map((p) => `- ${p.title}: ${p.description}`).join("\n")
      : null;

  await db.message.create({
    data: {
      conversationId,
      role: "USER",
      content,
    },
  });

  const history = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const system = buildMentorSystemPrompt({
    mentorDisplayName: mentorProfile.displayName,
    institution: mentorProfile.institution,
    title: mentorProfile.title,
    profileMarkdown: skill.profileMarkdown,
    researchSummary: skill.researchSummary,
    openPositionsSummary,
  });

  const anthropicMessages = history
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));

  let assistantRaw = "";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    assistantRaw = fallbackReply(mentorProfile.displayName);
  } else {
    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
      max_tokens: 900,
      system,
      messages: anthropicMessages,
    });
    assistantRaw =
      completion.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("\n")
        .trim() || "基于当前资料我无法确认。";
  }

  const markers = parseAiMarkers(assistantRaw);
  const displayReply = stripAiMarkers(assistantRaw);

  await db.message.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: assistantRaw,
    },
  });

  await db.application.update({
    where: { id: app.id },
    data: {
      lastMessageAt: new Date(),
      aiScore: markers.score ?? app.aiScore,
      aiFlagNotify: markers.notify || app.aiFlagNotify,
    },
  });

  return NextResponse.json({
    message: displayReply,
    aiScore: markers.score,
    notifyMentor: markers.notify,
  });
}
