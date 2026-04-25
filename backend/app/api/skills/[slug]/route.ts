import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  mentorInitials,
  parsePublicationsJson,
  parseStringArrayJson,
} from "@/lib/scholarbridge";
import { skillUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: Params) {
  const { slug } = await context.params;
  const skill = await db.skill.findUnique({
    where: { slug },
    include: {
      owner: { include: { mentorProfile: true } },
      projects: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!skill || skill.status !== "PUBLISHED" || !skill.isPublic) {
    return NextResponse.json({ error: "未找到公开的 Skill" }, { status: 404 });
  }

  const displayName = skill.owner.mentorProfile?.displayName ?? skill.owner.email;
  const institution = skill.owner.mentorProfile?.institution ?? "";
  const tags = parseStringArrayJson(skill.tags);
  const publications = parsePublicationsJson(skill.publications);
  const openPositionsCount = skill.projects.filter((p) => p.status === "OPEN").length;

  return NextResponse.json({
    skill: {
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      profileMarkdown: skill.profileMarkdown,
      tags,
      hIndex: skill.hIndex,
      i10Index: skill.i10Index,
      citationsDisplay: skill.citationsDisplay,
      researchSummary: skill.researchSummary,
      publications,
      agentActive: skill.agentActive,
      agentIntro: skill.agentIntro,
      scholarSyncedAt: skill.scholarSyncedAt,
      openPositionsCount,
      projects: skill.projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        metaTags: parseStringArrayJson(p.metaTags),
      })),
      mentor: {
        displayName,
        institution,
        department: skill.owner.mentorProfile?.department ?? null,
        title: skill.owner.mentorProfile?.title ?? null,
        bioShort: skill.owner.mentorProfile?.bioShort,
        location: skill.owner.mentorProfile?.location ?? null,
        scholarUrl: skill.owner.mentorProfile?.scholarUrl ?? null,
        introVideoUrl: skill.owner.mentorProfile?.introVideoUrl ?? null,
        introVideoPosterUrl: skill.owner.mentorProfile?.introVideoPosterUrl ?? null,
        initials: mentorInitials(displayName),
      },
    },
  });
}

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const { slug } = await context.params;
  const skill = await db.skill.findUnique({ where: { slug } });
  if (!skill || skill.ownerUserId !== user.id) {
    return NextResponse.json({ error: "未找到 Skill 或无权修改" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = skillUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const updated = await db.skill.update({
    where: { id: skill.id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.profileMarkdown !== undefined ? { profileMarkdown: d.profileMarkdown } : {}),
      ...(d.tags !== undefined ? { tags: d.tags } : {}),
      ...(d.hIndex !== undefined ? { hIndex: d.hIndex } : {}),
      ...(d.i10Index !== undefined ? { i10Index: d.i10Index } : {}),
      ...(d.citationsDisplay !== undefined ? { citationsDisplay: d.citationsDisplay } : {}),
      ...(d.researchSummary !== undefined ? { researchSummary: d.researchSummary } : {}),
      ...(d.publications !== undefined ? { publications: d.publications } : {}),
      ...(d.agentActive !== undefined ? { agentActive: d.agentActive } : {}),
      ...(d.agentIntro !== undefined ? { agentIntro: d.agentIntro } : {}),
      ...(d.scholarSyncedAt !== undefined
        ? {
            scholarSyncedAt:
              d.scholarSyncedAt === null ? null : new Date(d.scholarSyncedAt),
          }
        : {}),
      ...(d.publish === true
        ? {
            status: "PUBLISHED" as const,
            isPublic: true,
            publishedAt: skill.publishedAt ?? new Date(),
          }
        : {}),
      ...(d.publish === false
        ? {
            status: "DRAFT" as const,
            isPublic: false,
          }
        : {}),
    },
  });

  return NextResponse.json({ skill: updated });
}
