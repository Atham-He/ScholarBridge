import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";

const userWithProfileSelect = {
  id: true,
  email: true,
  passwordHash: true,
  orcidId: true,
  orcidEmail: true,
  orcidName: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  emailVerificationCode: true,
  profile: {
    select: {
      userId: true,
      displayName: true,
      institution: true,
      department: true,
      title: true,
      backgroundBrief: true,
      materialsJson: true,
      education: true,
      bioShort: true,
      location: true,
      contactEmail: true,
      phone: true,
      website: true,
      researchAreas: true,
      interests: true,
      skills: true,
      status: true,
      resumeFileName: true,
      resumeMimeType: true,
      resumeSize: true,
      resumeUploadedAt: true,
      aiAgentEnabled: true,
      aiAgentPrompt: true,
      aiHardWeight: true,
      aiFitWeight: true,
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

export async function getUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: userWithProfileSelect,
  });
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: userWithProfileSelect,
  });
}

export async function ensureProfile(userId: string, email?: string | null) {
  const displayName = email?.split("@")[0] || "ScholarBridge User";

  return db.profile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      displayName,
    },
  });
}
