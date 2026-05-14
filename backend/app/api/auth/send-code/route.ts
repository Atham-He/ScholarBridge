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
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = sendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i: { message: string }) => i.message) },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
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
      { error: "Too many verification requests. Please try again in 1 hour." },
      { status: 429 }
    );
  }

  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: "This email is already registered" },
      { status: 409 }
    );
  }

  // Generate verification code
  const code = generateCode();
  const codeHash = await hashcode(code);
  const expiresAt = calculateExpiry(15); // 15 minutes

  await db.emailVerification.deleteMany({
    where: {
      email,
      verified: false
    }
  });

  // Create verification record
  await db.emailVerification.create({
    data: {
      email,
      code: codeHash,
      expiresAt,
      ipAddress
    }
  });

  // Send email
  try {
    await emailService.sendVerification(email, code);
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: "Failed to send the verification code. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `A verification code has been sent to ${email}. It will expire in 15 minutes.`,
  });
}
