import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationStatusLabelEn, applicationStatusLabelZh } from "@/lib/applicationLabels";
import { aiScoreToPercent } from "@/lib/scholarbridge";
import { applicationCreateSchema } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "需要学生账号" }, { status: 403 });
  }

  const [apps, studentProfile] = await Promise.all([
    db.application.findMany({
      where: { studentUserId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        skill: true,
        mentor: { include: { mentorProfile: true } },
        conversation: true,
      },
    }),
    db.studentProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    applications: apps.map((a) => ({
      id: a.id,
      status: a.status,
      statusLabelZh: applicationStatusLabelZh(a.status),
      statusLabelEn: applicationStatusLabelEn(a.status),
      aiScore: a.aiScore,
      matchScorePercent: aiScoreToPercent(a.aiScore),
      aiFlagNotify: a.aiFlagNotify,
      createdAt: a.createdAt,
      lastMessageAt: a.lastMessageAt,
      interviewAt: a.interviewAt,
      skill: { id: a.skill.id, slug: a.skill.slug, title: a.skill.title },
      mentorName: a.mentor.mentorProfile?.displayName ?? a.mentor.email,
      mentorInstitution: a.mentor.mentorProfile?.institution ?? "",
      conversationId: a.conversation?.id ?? null,
    })),
    /** 学生申请材料（ScholarBridge 侧栏） */
    materials: studentProfile?.materialsJson ?? [],
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "需要学生账号" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = applicationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const skill = await db.skill.findUnique({
    where: { id: parsed.data.skillId },
  });

  if (!skill || skill.status !== "PUBLISHED" || !skill.isPublic) {
    return NextResponse.json({ error: "Skill 不可申请" }, { status: 400 });
  }

  if (skill.ownerUserId === user.id) {
    return NextResponse.json({ error: "不能向自己的 Skill 发起对话" }, { status: 400 });
  }

  const existing = await db.application.findUnique({
    where: {
      studentUserId_skillId: { studentUserId: user.id, skillId: skill.id },
    },
  });

  if (existing) {
    const conv = await db.conversation.findUnique({
      where: { applicationId: existing.id },
    });
    return NextResponse.json({
      applicationId: existing.id,
      conversationId: conv?.id ?? null,
      reused: true,
    });
  }

  const created = await db.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        studentUserId: user.id,
        mentorUserId: skill.ownerUserId,
        skillId: skill.id,
      },
    });
    const conv = await tx.conversation.create({
      data: { applicationId: app.id },
    });
    return { app, conv };
  });

  return NextResponse.json({
    applicationId: created.app.id,
    conversationId: created.conv.id,
    reused: false,
  });
}
