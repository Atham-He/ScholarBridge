import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import { emailService } from "@/lib/email";

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
  const existing = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        emailVerificationCode: code, 
        emailVerified: false,        
      },
    });

    await tx.profile.create({
      data: {
        userId: created.id,
        displayName: data.displayName,
        institution: data.institution,
        department: data.department,
        title: data.title,
        bioShort: data.bioShort,
        location: data.location,
        backgroundBrief: data.backgroundBrief,
      },
    });

    return created;
  });

  await emailService.sendVerification(user.email, code); 
  
  return NextResponse.json({
    ok: true,
    message: "注册成功，验证码已发送至邮箱",
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
