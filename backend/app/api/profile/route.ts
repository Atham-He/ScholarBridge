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

    const profile = await db.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: displayName || user.email?.split("@")[0] || "ScholarBridge User",
        institution: institution || undefined,
        department: department || undefined,
        title: title || undefined,
        bioShort: bioShort || undefined,
        backgroundBrief: backgroundBrief || undefined,
        education: education || undefined,
        location: location || undefined,
        contactEmail: contactEmail || undefined,
        phone: phone || undefined,
        website: website || undefined,
        researchAreas: researchAreas || undefined,
        interests: interests || undefined,
        skills: skills || undefined,
        status: status || "active",
        aiAgentEnabled: typeof aiAgentEnabled === "boolean" ? aiAgentEnabled : true,
        aiAgentPrompt: aiAgentPrompt || undefined,
        aiHardWeight: typeof aiHardWeight === "number" ? aiHardWeight : 50,
        aiFitWeight: typeof aiFitWeight === "number" ? aiFitWeight : 50,
      },
      update: {
        displayName: displayName || undefined,
        institution: institution || undefined,
        department: department || undefined,
        title: title || undefined,
        bioShort: bioShort || undefined,
        backgroundBrief: backgroundBrief || undefined,
        education: education || undefined,
        location: location || undefined,
        contactEmail: contactEmail || undefined,
        phone: phone || undefined,
        website: website || undefined,
        researchAreas: researchAreas || undefined,
        interests: interests || undefined,
        skills: skills || undefined,
        status: status || undefined,
        aiAgentEnabled: typeof aiAgentEnabled === "boolean" ? aiAgentEnabled : undefined,
        aiAgentPrompt: typeof aiAgentPrompt === "string" ? aiAgentPrompt : undefined,
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
