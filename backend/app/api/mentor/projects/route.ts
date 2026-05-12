import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateWeightedAiScore } from "@/lib/resume-ai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { mentorUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              email: true,
              studentProfile: {
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
  const hardWeight = user.mentorProfile?.aiHardWeight ?? 50;

  return NextResponse.json({
    projects: projects.map((project) => ({
      ...project,
      applications: project.applications.map((application) => {
        const aiWeightedScore = calculateWeightedAiScore(application.aiHardScore, application.aiFitScore, hardWeight);

        return {
          id: application.id,
          status: application.status,
          coverLetter: application.coverLetter,
          mentorFeedback: application.mentorFeedback,
          aiHardScore: application.aiHardScore,
          aiFitScore: application.aiFitScore,
          aiWeightedScore,
          aiScoreSummary: application.aiScoreSummary,
          aiScoreError: application.aiScoreError,
          aiScoredAt: application.aiScoredAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
          student: {
            id: application.student.id,
            email: application.student.email,
            displayName: application.student.studentProfile?.displayName || application.student.email,
            education: application.student.studentProfile?.education,
            bioShort: application.student.studentProfile?.bioShort,
            interests: application.student.studentProfile?.interests,
            skills: application.student.studentProfile?.skills,
            resumeFileName: application.student.studentProfile?.resumeFileName,
            resumeSize: application.student.studentProfile?.resumeSize,
            resumeUploadedAt: application.student.studentProfile?.resumeUploadedAt,
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
      aiAgentEnabled: user.mentorProfile?.aiAgentEnabled ?? true,
      aiAgentPrompt: user.mentorProfile?.aiAgentPrompt || "",
      aiHardWeight: hardWeight,
      aiFitWeight: user.mentorProfile?.aiFitWeight ?? 50,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
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
      mentorUserId: user.id,
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
