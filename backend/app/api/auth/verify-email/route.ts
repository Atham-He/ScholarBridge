import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCode, isCodeExpired } from "@/lib/verification";
import { hashPassword } from "@/lib/password";
import { verifyEmailSchema } from "@/lib/validation";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 }
    );
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i: { message: string }) => i.message),
      },
      { status: 400 }
    );
  }

  const data = {
    ...parsed.data,
    email: normalizeEmail(parsed.data.email),
  };

  // Find the latest verification record
  const verification = await db.emailVerification.findFirst({
    where: {
      email: data.email,
      verified: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verification) {
    return NextResponse.json(
      { error: "No pending verification found. Please request a new code." },
      { status: 400 }
    );
  }

  // Check expiration
  if (isCodeExpired(verification.expiresAt)) {
    return NextResponse.json(
      { error: "The verification code has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Check max attempts
  if (verification.attemptCount >= 3) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please request a new code." },
      { status: 400 }
    );
  }

  // Validate code
  const isValid = await verifyCode(data.code, verification.code);
  if (!isValid) {
    await db.emailVerification.update({
      where: { id: verification.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    return NextResponse.json(
      { error: "Incorrect verification code" },
      { status: 400 }
    );
  }

  // Check for existing user
  const existingUser = await db.user.findFirst({
    where: { email: data.email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Mark verification as used
  await db.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
      usedAt: new Date(),
    },
  });

  // Create user & profile
  const passwordHash = await hashPassword(data.password);

  const user = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        lastLoginAt: new Date(),
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

  // Create session
  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
