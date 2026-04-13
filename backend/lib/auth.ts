import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.userId },
    include: { mentorProfile: true, studentProfile: true },
  });
}

// NEW: Get user with specific role
export async function getUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: { mentorProfile: true, studentProfile: true },
  });
}

// NEW: Get all users by email (for dual-role support)
export async function getUsersByEmail(email: string) {
  return db.user.findMany({
    where: { email },
    include: { mentorProfile: true, studentProfile: true },
  });
}
