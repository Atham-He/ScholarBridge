import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { skillProjectPatchSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

async function assertMentorOwnsProject(userId: string, projectId: string) {
  const project = await db.skillProject.findUnique({
    where: { id: projectId },
    include: { skill: true },
  });
  if (!project || project.skill.ownerUserId !== userId) {
    return null;
  }
  return project;
}

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await assertMentorOwnsProject(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "未找到项目" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = skillProjectPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const project = await db.skillProject.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.metaTags !== undefined ? { metaTags: d.metaTags } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(_request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await assertMentorOwnsProject(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "未找到项目" }, { status: 404 });
  }

  await db.skillProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
