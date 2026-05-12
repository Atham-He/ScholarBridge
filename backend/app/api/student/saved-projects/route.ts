import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedProjects = await db.savedProject.findMany({
      where: { studentUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          include: {
            mentor: true,
          },
        },
      },
    });

    return NextResponse.json({
      projects: savedProjects.map(({ id, project, createdAt }) => ({
        id,
        savedAt: createdAt,
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          researchArea: project.researchArea,
          startTime: project.startTime,
          endTime: project.endTime,
          location: project.location,
          capacity: project.capacity,
          enrolled: project.enrolled,
          availableSeats: Math.max(0, project.capacity - project.enrolled),
          status: project.status,
          mentor: {
            displayName: project.mentor.displayName,
            institution: project.mentor.institution,
            department: project.mentor.department,
            title: project.mentor.title,
          },
        },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch saved projects:", error);
    return NextResponse.json({ error: "Failed to fetch saved projects" }, { status: 500 });
  }
}

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

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const saved = await db.savedProject.upsert({
      where: {
        studentUserId_projectId: {
          studentUserId: user.id,
          projectId,
        },
      },
      update: {},
      create: {
        studentUserId: user.id,
        projectId,
      },
    });

    return NextResponse.json({ saved }, { status: 201 });
  } catch (error) {
    console.error("Failed to save project:", error);
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    await db.savedProject.deleteMany({
      where: {
        studentUserId: user.id,
        projectId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to unsave project:", error);
    return NextResponse.json({ error: "Failed to unsave project" }, { status: 500 });
  }
}
