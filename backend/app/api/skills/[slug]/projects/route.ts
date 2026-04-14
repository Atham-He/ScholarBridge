import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { skillProjectCreateSchema } from "@/lib/validation";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const { slug } = await context.params;
  const skill = await db.skill.findUnique({ where: { slug } });
  if (!skill || skill.ownerUserId !== user.id) {
    return NextResponse.json({ error: "未找到 Skill 或无权操作" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = skillProjectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const { title, description, status, metaTags, sortOrder } = parsed.data;
  const project = await db.skillProject.create({
    data: {
      skillId: skill.id,
      title,
      description,
      status: status ?? "OPEN",
      metaTags: metaTags ?? undefined,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json({ project });
}
