import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
    }

    const data = parsed.data;
    const normalizedEmail = normalizeEmail(data.email);

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

    const session = await getSession();
    session.userId = user.id;
    await session.save();

    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Failed to sign in:", error);
    return NextResponse.json({ error: "Sign-in failed. Please try again later." }, { status: 500 });
  }
}
