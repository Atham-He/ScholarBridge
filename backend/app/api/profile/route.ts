import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const profileSelect = {
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
};

const cleanString = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);
const nullableString = (value: unknown) => {
  const cleaned = cleanString(value);
  return cleaned === undefined ? undefined : cleaned || null;
};
const stringList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: profileSelect,
    });

    if (!profile) {
      const newProfile = await db.profile.create({
        data: {
          userId: user.id,
          displayName: user.email?.split("@")[0] || "ScholarBridge User",
        },
        select: profileSelect,
      });
      return NextResponse.json({ profile: newProfile });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to fetch applicant profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      displayName,
      institution,
      department,
      title,
      bioShort,
      backgroundBrief,
      education,
      location,
      contactEmail,
      phone,
      website,
      researchAreas,
      interests,
      skills,
      status,
      aiAgentEnabled,
      aiAgentPrompt,
      aiHardWeight,
      aiFitWeight,
    } = body;
    const nextDisplayName = cleanString(displayName) || user.email?.split("@")[0] || "ScholarBridge User";
    const nextResearchAreas = stringList(researchAreas);
    const nextInterests = stringList(interests);
    const nextSkills = stringList(skills);

    const profile = await db.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: nextDisplayName,
        institution: nullableString(institution),
        department: nullableString(department),
        title: nullableString(title),
        bioShort: nullableString(bioShort),
        backgroundBrief: nullableString(backgroundBrief),
        education: nullableString(education),
        location: nullableString(location),
        contactEmail: nullableString(contactEmail),
        phone: nullableString(phone),
        website: nullableString(website),
        researchAreas: nextResearchAreas,
        interests: nextInterests,
        skills: nextSkills,
        status: cleanString(status) || "active",
        aiAgentEnabled: typeof aiAgentEnabled === "boolean" ? aiAgentEnabled : true,
        aiAgentPrompt: nullableString(aiAgentPrompt),
        aiHardWeight: typeof aiHardWeight === "number" ? aiHardWeight : 50,
        aiFitWeight: typeof aiFitWeight === "number" ? aiFitWeight : 50,
      },
      update: {
        displayName: nextDisplayName,
        institution: nullableString(institution),
        department: nullableString(department),
        title: nullableString(title),
        bioShort: nullableString(bioShort),
        backgroundBrief: nullableString(backgroundBrief),
        education: nullableString(education),
        location: nullableString(location),
        contactEmail: nullableString(contactEmail),
        phone: nullableString(phone),
        website: nullableString(website),
        researchAreas: nextResearchAreas,
        interests: nextInterests,
        skills: nextSkills,
        status: cleanString(status),
        aiAgentEnabled: typeof aiAgentEnabled === "boolean" ? aiAgentEnabled : undefined,
        aiAgentPrompt: nullableString(aiAgentPrompt),
        aiHardWeight: typeof aiHardWeight === "number" ? aiHardWeight : undefined,
        aiFitWeight: typeof aiFitWeight === "number" ? aiFitWeight : undefined,
      },
      select: profileSelect,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to update applicant profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
