import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationMentorPatchSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/** 导师更新申请流水线状态（与 ScholarBridge 面板一致） */
export async function PATCH(request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json({ error: "需要导师账号" }, { status: 403 });
  }

  const { id } = await context.params;
  const app = await db.application.findUnique({ where: { id } });
  if (!app || app.mentorUserId !== user.id) {
    return NextResponse.json({ error: "未找到申请" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = applicationMentorPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const { status, interviewAt } = parsed.data;
  const updated = await db.application.update({
    where: { id },
    data: {
      status,
      ...(interviewAt !== undefined
        ? {
            interviewAt:
              interviewAt === null ? null : new Date(interviewAt),
          }
        : {}),
    },
  });

  return NextResponse.json({
    application: {
      id: updated.id,
      status: updated.status,
      interviewAt: updated.interviewAt,
    },
  });
}
