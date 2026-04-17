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
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "邮箱或密码无效" }, { status: 400 });
  }

  const data = parsed.data;
  const normalizedEmail = normalizeEmail(data.email);

  const users = await db.$queryRaw<Array<{
    id: string;
    email: string;
    passwordHash: string | null;
    role: "MENTOR" | "STUDENT";
    lastRoleAt: Date | null;
  }>>`
    SELECT id, email, passwordHash, role, lastRoleAt
    FROM User
    WHERE lower(email) = ${normalizedEmail}
    ORDER BY lastRoleAt DESC
  `;

  if (users.length === 0) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const user = users.find((candidate) => candidate.role === data.role);

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  await session.save();

  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastRoleAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
