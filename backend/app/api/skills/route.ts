import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  agentBadgeVariant,
  mentorInitials,
  parseStringArrayJson,
} from "@/lib/scholarbridge";
import { skillCreateSchema } from "@/lib/validation";

export async function GET() {
  const skills = await db.skill.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: { publishedAt: "desc" },
    include: {
      owner: {
        include: { mentorProfile: true },
      },
      projects: true,
    },
  });

  const list = skills.map((s) => {
    const displayName = s.owner.mentorProfile?.displayName ?? s.owner.email;
    const institution = s.owner.mentorProfile?.institution ?? "";
    const openPositionsCount = s.projects.filter((p) => p.status === "OPEN").length;
    const tags = parseStringArrayJson(s.tags);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      mentorName: displayName,
      institution,
      publishedAt: s.publishedAt,
      /** ScholarBridge 导师卡片（与 frontend-example 对齐） */
      mentor: {
        displayName,
        institution,
        department: s.owner.mentorProfile?.department ?? null,
        title: s.owner.mentorProfile?.title ?? null,
        location: s.owner.mentorProfile?.location ?? null,
        initials: mentorInitials(displayName),
      },
      tags,
      hIndex: s.hIndex,
      citationsDisplay: s.citationsDisplay,
      openPositionsCount,
      agent: {
        active: s.agentActive,
        badgeVariant: agentBadgeVariant(s),
      },
    };
  });

  return NextResponse.json({ skills: list });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = skillCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const {
    title,
    slug,
    profileMarkdown,
    publish,
    tags,
    hIndex,
    citationsDisplay,
    researchSummary,
    publications,
    agentActive,
    agentIntro,
  } = parsed.data;
  const slugTaken = await db.skill.findUnique({ where: { slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "该 slug 已被占用" }, { status: 409 });
  }

  const shouldPublish = Boolean(publish);
  const skill = await db.skill.create({
    data: {
      ownerUserId: user.id,
      title,
      slug,
      profileMarkdown,
      status: shouldPublish ? "PUBLISHED" : "DRAFT",
      isPublic: shouldPublish,
      publishedAt: shouldPublish ? new Date() : null,
      tags: tags ?? undefined,
      hIndex: hIndex ?? undefined,
      citationsDisplay: citationsDisplay ?? undefined,
      researchSummary: researchSummary ?? undefined,
      publications: publications ?? undefined,
      agentActive: agentActive ?? true,
      agentIntro: agentIntro ?? undefined,
    },
  });

  return NextResponse.json({ skill });
}
