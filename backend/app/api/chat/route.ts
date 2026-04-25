import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PersonaChatService } from "@/lib/persona/chat";
import { StudentEvaluationService } from "@/lib/persona/evaluation";
import { createLLMProviderFromEnv } from "@/lib/persona/llm";
import type { ChatTurn } from "@/lib/persona/types";
import {
  buildMentorSystemPrompt,
  parseAiMarkers,
  stripAiMarkers,
} from "@/lib/prompt";
import { chatSendSchema } from "@/lib/validation";

function fallbackReply(mentorName: string): string {
  return [
    `Hello, I am ${mentorName}'s demo AI twin. ANTHROPIC_API_KEY is not configured, so a local fallback reply is being used.`,
    "You can continue asking questions. In the full setup, the reply will be generated from the mentor profile and persona evidence.",
    "[[SCORE:6]]",
  ].join("\n");
}

function buildStudentProfile(student: {
  email: string;
  studentProfile: {
    displayName: string | null;
    backgroundBrief: string | null;
    materialsJson: unknown;
  } | null;
}) {
  return {
    name: student.studentProfile?.displayName || student.email.split("@")[0],
    background: student.studentProfile?.backgroundBrief || "",
    materials: student.studentProfile?.materialsJson ?? [],
    email: student.email,
  };
}

function recommendationToNotify(recommendation?: string | null): boolean {
  return (
    recommendation === "strong_recommendation" ||
    recommendation === "recommend_interview"
  );
}

async function runPersonaChat(input: {
  conversationId: string;
  applicationId: string;
  content: string;
  persona: {
    id: string;
    personaJson: unknown;
    chunksJson: unknown;
  };
  studentProfile: ReturnType<typeof buildStudentProfile>;
  currentAiScore: number | null;
  currentAiFlagNotify: boolean;
}) {
  const sessionId = `conversation_${input.conversationId}`;
  const existingSession = await db.personaSession.findUnique({
    where: { sessionId },
  });

  const turns = (existingSession?.turnsJson as ChatTurn[] | null) ?? [];
  const llmProvider = await createLLMProviderFromEnv();
  const chatService = new PersonaChatService(llmProvider);
  const evaluationService = new StudentEvaluationService(llmProvider);

  const chatResponse = await chatService.chat({
    persona: input.persona.personaJson as any,
    chunks: input.persona.chunksJson as any[],
    message: input.content,
    studentProfile: input.studentProfile,
    session: { turns },
  });

  const newTurn: ChatTurn = {
    role: "user",
    message: input.content,
    answer: chatResponse.answer,
    citations: chatResponse.citations,
    retrievedChunks: chatResponse.retrievedChunks.map((chunk) => ({
      sourceId: chunk.sourceId,
      title: chunk.title,
      chunkIndex: chunk.chunkIndex,
    })),
    timestamp: new Date().toISOString(),
  };
  turns.push(newTurn);

  if (existingSession) {
    await db.personaSession.update({
      where: { id: existingSession.id },
      data: {
        turnsJson: turns as any,
        studentProfile: input.studentProfile as any,
        messageCount: turns.length,
        lastMessageAt: new Date(),
      },
    });
  } else {
    await db.personaSession.create({
      data: {
        personaId: input.persona.id,
        sessionId,
        turnsJson: turns as any,
        studentProfile: input.studentProfile as any,
        messageCount: turns.length,
        lastMessageAt: new Date(),
      },
    });
  }

  let aiScore = input.currentAiScore;
  let notifyMentor = input.currentAiFlagNotify;

  try {
    const evaluation = await evaluationService.evaluate({
      persona: input.persona.personaJson as any,
      chunks: input.persona.chunksJson as any[],
      studentProfile: input.studentProfile,
      transcript: turns.flatMap((turn) => ([
        { role: "user" as const, content: turn.message },
        { role: "assistant" as const, content: turn.answer },
      ])),
    });

    aiScore = evaluation.overallScore / 10;
    notifyMentor = recommendationToNotify(evaluation.recommendation);

    await db.personaEvaluation.upsert({
      where: { applicationId: input.applicationId },
      update: {
        overallScore: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        researchFit: evaluation.researchFit as any,
        technicalDepth: evaluation.technicalDepth as any,
        communication: evaluation.communication as any,
        initiative: evaluation.initiative as any,
        summary: evaluation.summary,
        followUpQuestions: evaluation.followUpQuestions as any,
        evidenceQuality: (evaluation.evidenceQuality ?? {}) as any,
        evidenceBreakdown: (evaluation.evidenceBreakdown ?? {}) as any,
      },
      create: {
        personaId: input.persona.id,
        applicationId: input.applicationId,
        overallScore: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        researchFit: evaluation.researchFit as any,
        technicalDepth: evaluation.technicalDepth as any,
        communication: evaluation.communication as any,
        initiative: evaluation.initiative as any,
        summary: evaluation.summary,
        followUpQuestions: evaluation.followUpQuestions as any,
        evidenceQuality: (evaluation.evidenceQuality ?? {}) as any,
        evidenceBreakdown: (evaluation.evidenceBreakdown ?? {}) as any,
      },
    });
  } catch (error) {
    console.error("Persona evaluation in /api/chat failed:", error);
  }

  return {
    assistantRaw: chatResponse.answer,
    displayReply: chatResponse.answer,
    aiScore,
    notifyMentor,
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = chatSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.issues.map((issue) => issue.message) },
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
              persona: true,
              projects: {
                where: { status: "OPEN" },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          mentor: { include: { mentorProfile: true } },
          student: { include: { studentProfile: true } },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const app = conversation.application;
  if (app.status === "WITHDRAWN") {
    return NextResponse.json({ error: "This application has been withdrawn" }, { status: 400 });
  }
  if (app.status === "REJECTED") {
    return NextResponse.json({ error: "This application has already ended" }, { status: 400 });
  }

  const isStudent = user.role === "STUDENT" && app.studentUserId === user.id;
  const isMentor = user.role === "MENTOR" && app.mentorUserId === user.id;
  if (!isStudent && !isMentor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isStudent) {
    return NextResponse.json(
      { error: "Only the student side can trigger AI replies in this flow" },
      { status: 403 },
    );
  }

  const mentorProfile = app.mentor.mentorProfile;
  if (!mentorProfile) {
    return NextResponse.json({ error: "Mentor profile is missing" }, { status: 500 });
  }

  await db.message.create({
    data: {
      conversationId,
      role: "USER",
      content,
    },
  });

  const skill = app.skill;
  const persona = skill.persona;
  let assistantRaw = "";
  let displayReply = "";
  let aiScore = app.aiScore;
  let notifyMentor = app.aiFlagNotify;

  if (persona && persona.buildStatus === "completed") {
    const personaResult = await runPersonaChat({
      conversationId,
      applicationId: app.id,
      content,
      persona: {
        id: persona.id,
        personaJson: persona.personaJson,
        chunksJson: persona.chunksJson,
      },
      studentProfile: buildStudentProfile(app.student),
      currentAiScore: app.aiScore,
      currentAiFlagNotify: app.aiFlagNotify,
    });
    assistantRaw = personaResult.assistantRaw;
    displayReply = personaResult.displayReply;
    aiScore = personaResult.aiScore;
    notifyMentor = personaResult.notifyMentor;
  } else {
    const openPositionsSummary =
      skill.projects.length > 0
        ? skill.projects.map((project) => `- ${project.title}: ${project.description}`).join("\n")
        : null;

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
      .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
      .map((message) => ({
        role: message.role.toLowerCase() as "user" | "assistant",
        content: message.content,
      }));

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!anthropicKey && !openaiKey) {
      assistantRaw = fallbackReply(mentorProfile.displayName);
    } else if (openaiKey && process.env.LLM_PROVIDER === "openai") {
      const client = new OpenAI({
        apiKey: openaiKey,
        baseURL: process.env.OPENAI_BASE_URL,
      });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          ...anthropicMessages,
        ],
      });
      assistantRaw =
        completion.choices[0]?.message?.content?.trim() ||
        "I cannot answer with the current evidence.";
    } else {
      const client = new Anthropic({ apiKey: anthropicKey! });
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
          .trim() || "I cannot answer with the current evidence.";
    }

    const markers = parseAiMarkers(assistantRaw);
    displayReply = stripAiMarkers(assistantRaw);
    aiScore = markers.score ?? app.aiScore;
    notifyMentor = markers.notify || app.aiFlagNotify;
  }

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
      aiScore,
      aiFlagNotify: notifyMentor,
    },
  });

  return NextResponse.json({
    message: displayReply,
    aiScore,
    notifyMentor,
  });
}
