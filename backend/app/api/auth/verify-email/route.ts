import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCode, isCodeExpired } from "@/lib/verification";
import { hashPassword } from "@/lib/password";
import { verifyEmailSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Find verification record
  const verification = await db.emailVerification.findFirst({
    where: {
      email: data.email,
      role: data.role,
      verified: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!verification) {
    return NextResponse.json(
      { error: "验证码不存在或已使用，请重新获取" },
      { status: 400 }
    );
  }

  // Check if expired
  if (isCodeExpired(verification.expiresAt)) {
    return NextResponse.json(
      { error: "验证码已过期，请重新获取" },
      { status: 400 }
    );
  }

  // Check attempts
  if (verification.attemptCount >= 3) {
    return NextResponse.json(
      { error: "验证失败次数过多，请重新获取验证码" },
      { status: 400 }
    );
  }

  // Verify code
  const isValid = await verifyCode(data.code, verification.code);
  if (!isValid) {
    // Increment attempt count
    await db.emailVerification.update({
      where: { id: verification.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date()
      }
    });

    return NextResponse.json(
      { error: "验证码错误" },
      { status: 400 }
    );
  }

  // Check if user already exists with this email+role
  const existingUser = await db.user.findFirst({
    where: {
      email: data.email,
      role: data.role
    }
  });

  if (existingUser) {
    return NextResponse.json(
      { error: data.role === 'MENTOR' ? '该邮箱已注册导师账号' : '该邮箱已注册学生账号' },
      { status: 409 }
    );
  }

  // Mark verification as used
  await db.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
      usedAt: new Date()
    }
  });

  // Create user account
  const passwordHash = await hashPassword(data.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        lastLoginAt: new Date(),
        lastRoleAt: new Date()
      }
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

  // Create session
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  await session.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
}
