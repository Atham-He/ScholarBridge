import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
      },
    });

    if (data.role === "MENTOR") {
      await tx.mentorProfile.create({
        data: {
          userId: created.id,
          displayName: data.displayName,
          institution: data.institution ?? "",
          department: data.department,
          title: data.title,
          bioShort: data.bioShort,
          location: data.location,
        },
      });
    } else {
      await tx.studentProfile.create({
        data: {
          userId: created.id,
          displayName: data.displayName,
          backgroundBrief: data.backgroundBrief,
        },
      });
    }

    return created;
  });

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
