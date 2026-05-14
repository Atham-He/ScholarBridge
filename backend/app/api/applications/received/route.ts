import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateWeightedAiScore } from "@/lib/resume-ai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  education: true,
                  bioShort: true,
                  interests: true,
                  skills: true,
                  resumeFileName: true,
                  resumeSize: true,
                  resumeUploadedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const hardWeight = user.profile?.aiHardWeight ?? 50;
  type ReceivedProject = (typeof projects)[number];
  type ReceivedApplication = ReceivedProject["applications"][number];

  return NextResponse.json({
    projects: projects.map((project: ReceivedProject) => ({
      ...project,
      applications: project.applications.map((application: ReceivedApplication) => {
        const aiWeightedScore = calculateWeightedAiScore(application.aiHardScore, application.aiFitScore, hardWeight);

        return {
          id: application.id,
          status: application.status,
          coverLetter: application.coverLetter,
          ownerFeedback: application.ownerFeedback,
          aiHardScore: application.aiHardScore,
          aiFitScore: application.aiFitScore,
          aiWeightedScore,
          aiScoreSummary: application.aiScoreSummary,
          aiScoreError: application.aiScoreError,
          aiScoredAt: application.aiScoredAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
          applicant: {
            id: application.applicant.id,
            email: application.applicant.email,
            displayName: application.applicant.profile?.displayName || application.applicant.email,
            education: application.applicant.profile?.education,
            bioShort: application.applicant.profile?.bioShort,
            interests: application.applicant.profile?.interests,
            skills: application.applicant.profile?.skills,
            resumeFileName: application.applicant.profile?.resumeFileName,
            resumeSize: application.applicant.profile?.resumeSize,
            resumeUploadedAt: application.applicant.profile?.resumeUploadedAt,
          },
        };
      }).sort((a, b) => {
        const scoreA = a.aiWeightedScore ?? -1;
        const scoreB = b.aiWeightedScore ?? -1;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
      applicationCount: project.applications.filter((application) => application.status !== "WITHDRAWN").length,
    })),
    aiConfig: {
      aiAgentEnabled: user.profile?.aiAgentEnabled ?? true,
      aiAgentPrompt: user.profile?.aiAgentPrompt || "",
      aiHardWeight: hardWeight,
      aiFitWeight: user.profile?.aiFitWeight ?? 50,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const title = typeof payload.title === "string" ? payload.title : "";
  const description = typeof payload.description === "string" ? payload.description : "";
  const researchArea = typeof payload.researchArea === "string" ? payload.researchArea : "";
  const startTime = typeof payload.startTime === "string" ? payload.startTime : "";
  const endTime = typeof payload.endTime === "string" ? payload.endTime : "";
  const location = typeof payload.location === "string" ? payload.location : "";
  const requirements = typeof payload.requirements === "string" ? payload.requirements : "";
  const capacity = typeof payload.capacity === "number" ? payload.capacity : Number(payload.capacity);

  if (!title || !description || !researchArea || !startTime || !capacity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      ownerUserId: user.id,
      title,
      description,
      researchArea,
      startTime,
      endTime: endTime || null,
      location: location || null,
      requirements: requirements || null,
      capacity,
      enrolled: 0,
      status: "OPEN",
    },
  });

  return NextResponse.json({ project });
}
