import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";

const userWithProfileSelect = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  orcidId: true,
  orcidEmail: true,
  orcidName: true,
  lastLoginAt: true,
  lastRoleAt: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  emailVerificationCode: true,
  mentorProfile: true,
  studentProfile: {
    select: {
      userId: true,
      displayName: true,
      backgroundBrief: true,
      materialsJson: true,
      education: true,
      bioShort: true,
      interests: true,
      skills: true,
      resumeFileName: true,
      resumeMimeType: true,
      resumeSize: true,
      resumeUploadedAt: true,
    },
  },
};

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
    select: userWithProfileSelect,
  });
}

// NEW: Get user with specific role
export async function getUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: userWithProfileSelect,
  });
}

// NEW: Get all users by email (for dual-role support)
export async function getUsersByEmail(email: string) {
  return db.user.findMany({
    where: { email },
    select: userWithProfileSelect,
  });
}
