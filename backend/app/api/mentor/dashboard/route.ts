import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** 导师总览指标（对应 ScholarBridge Dashboard 卡片） */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [skills, applications] = await Promise.all([
    db.skill.findMany({
      where: { ownerUserId: user.id },
      include: { persona: true, projects: true },
    }),
    db.application.findMany({
      where: { mentorUserId: user.id },
    }),
  ]);

  const openPositions = skills.reduce(
    (acc, s) => acc + s.projects.filter((p) => p.status === "OPEN").length,
    0,
  );

  const pendingApplications = applications.filter((a) =>
    ["CHATTING", "UNDER_REVIEW"].includes(a.status),
  ).length;

  const conversationsThisWeek = applications.filter(
    (a) => a.lastMessageAt && a.lastMessageAt >= weekAgo,
  ).length;

  const scored = applications.filter((a) => a.aiScore != null);
  const avgScore =
    scored.length > 0
      ? scored.reduce((s, a) => s + (a.aiScore ?? 0), 0) / scored.length
      : null;

  return NextResponse.json({
    metrics: {
      pendingApplications,
      conversationsThisWeek,
      openPositions,
      /** 基于 AI 1–10 分的简单平均，前端可展示为百分比 */
      avgAiScore: avgScore != null ? Math.round(avgScore * 10) / 10 : null,
      avgAiScorePercent: avgScore != null ? Math.round(avgScore * 10) : null,
    },
    skills: skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      openPositions: s.projects.filter((p) => p.status === "OPEN").length,
      agentActive: s.agentActive,
      hasPersona: Boolean(s.persona),
      personaBuildStatus: s.persona?.buildStatus ?? null,
    })),
  });
}
