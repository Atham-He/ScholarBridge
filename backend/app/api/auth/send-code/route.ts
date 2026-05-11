import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateCode, hashcode, calculateExpiry } from "@/lib/verification";
import { emailService } from "@/lib/email";
import { sendVerificationSchema } from "@/lib/validation";
import { getClientIP } from "@/lib/utils";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = sendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const { role } = parsed.data;
  const ipAddress = getClientIP(request);

  // Check rate limiting: max 3 codes per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCodes = await db.emailVerification.count({
    where: {
      email,
      createdAt: { gte: oneHourAgo }
    }
  });

  if (recentCodes >= 3) {
    return NextResponse.json(
      { error: "发送过于频繁，请1小时后再试" },
      { status: 429 }
    );
  }

  // Check if email+role combination already verified
  const existingUser = await db.user.findFirst({
    where: {
      email,
      role
    }
  });

  if (existingUser) {
    return NextResponse.json(
      { error: role === 'MENTOR' ? '该邮箱已注册导师账号' : '该邮箱已注册学生账号' },
      { status: 409 }
    );
  }

  // Generate verification code
  const code = generateCode();
  const codeHash = await hashcode(code);
  const expiresAt = calculateExpiry(15); // 15 minutes

  // Delete any existing unused codes for this email+role to keep only one active code
  await db.emailVerification.deleteMany({
    where: {
      email,
      role,
      verified: false
    }
  });

  // Create verification record
  await db.emailVerification.create({
    data: {
      email,
      role,
      code: codeHash,
      expiresAt,
      ipAddress
    }
  });

  // Send email
  try {
    await emailService.sendVerification(email, code, role);
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `验证码已发送到 ${email}，15分钟内有效`,
  });
}
