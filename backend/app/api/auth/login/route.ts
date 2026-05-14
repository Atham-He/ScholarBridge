import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";

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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
  }

  const data = parsed.data;
  const normalizedEmail = normalizeEmail(data.email);

  const users = await db.$queryRaw<Array<{
    id: string;
    email: string;
    passwordHash: string | null;
  }>>`
    SELECT id, email, passwordHash
    FROM User
    WHERE lower(email) = ${normalizedEmail}
    LIMIT 1
  `;

  if (users.length === 0) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const user = users[0];

  if (!user.passwordHash) {
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
}
