import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreApplicationResume } from "@/lib/resume-ai";

// GET /api/student/applications - 获取学生的所有申请
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apps = await db.application.findMany({
      where: { studentUserId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        project: true,
        mentor: { include: { mentorProfile: true } },
      },
    });

    return NextResponse.json({ apps });
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

// POST /api/student/applications - apply to a project
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
    const coverLetter = typeof payload.coverLetter === "string" ? payload.coverLetter : undefined;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.status !== "OPEN") {
      return NextResponse.json({ error: "Project is not available" }, { status: 404 });
    }

    if (project.enrolled >= project.capacity) {
      return NextResponse.json({ error: "Project is full" }, { status: 409 });
    }

    const existing = await db.application.findUnique({
      where: {
        studentUserId_projectId: {
          studentUserId: user.id,
          projectId,
        },
      },
    });

    if (existing) {
      if (existing.status === "WITHDRAWN") {
        const application = await db.application.update({
          where: { id: existing.id },
          data: {
            status: "pending",
            coverLetter,
          },
          include: {
            project: true,
            mentor: { include: { mentorProfile: true } },
          },
        });

        await scoreApplicationResume(application.id);
        return NextResponse.json({ application }, { status: 200 });
      }

      if (existing.status === "accepted" || existing.status === "rejected") {
        return NextResponse.json({ error: "This application has already been decided" }, { status: 409 });
      }

      return NextResponse.json({ error: "Already applied" }, { status: 409 });
    }

    const application = await db.application.create({
      data: {
        studentUserId: user.id,
        mentorUserId: project.mentorUserId,
        projectId,
        coverLetter,
      },
      include: {
        project: true,
        mentor: { include: { mentorProfile: true } },
      },
    });

    await scoreApplicationResume(application.id);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("Failed to create application:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
