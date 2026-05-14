import type { Prisma } from "@prisma/client";
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
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i: { message: string }) => i.message) },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await db.$transaction(async (tx: Prisma.TransactionClient) => {
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
    message: "Registration successful. A verification code has been sent to your email.",
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
