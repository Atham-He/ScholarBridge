import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "需要学生账号" }, { status: 403 });
  }

  const { id } = await context.params;
  const app = await db.application.findUnique({ where: { id } });
  if (!app || app.studentUserId !== user.id) {
    return NextResponse.json({ error: "未找到申请" }, { status: 404 });
  }

  await db.application.update({
    where: { id },
    data: { status: "WITHDRAWN" },
  });

  return NextResponse.json({ ok: true });
}
