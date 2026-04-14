import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationStatusLabelZh } from "@/lib/applicationLabels";
import { aiScoreToPercent } from "@/lib/scholarbridge";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const apps = await db.application.findMany({
    where: { mentorUserId: user.id },
    orderBy: { lastMessageAt: "desc" },
    include: {
      skill: true,
      student: { include: { studentProfile: true } },
      conversation: true,
    },
  });

  return NextResponse.json({
    applications: apps.map((a) => ({
      id: a.id,
      status: a.status,
      statusLabelZh: applicationStatusLabelZh(a.status),
      aiScore: a.aiScore,
      matchScorePercent: aiScoreToPercent(a.aiScore),
      aiFlagNotify: a.aiFlagNotify,
      lastMessageAt: a.lastMessageAt,
      interviewAt: a.interviewAt,
      skill: { slug: a.skill.slug, title: a.skill.title },
      studentName: a.student.studentProfile?.displayName ?? a.student.email,
      studentBackground: a.student.studentProfile?.backgroundBrief,
      conversationId: a.conversation?.id ?? null,
    })),
  });
}
