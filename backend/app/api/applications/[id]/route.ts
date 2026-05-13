import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const status = typeof payload.status === "string" ? payload.status : "";
    const hasOwnerFeedback = Object.prototype.hasOwnProperty.call(payload, "ownerFeedback");
    const ownerFeedback = typeof payload.ownerFeedback === "string" ? payload.ownerFeedback.trim() : "";

    if (!["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { project: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.ownerUserId !== user.id || application.project.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (application.status === "WITHDRAWN") {
      return NextResponse.json({ error: "Withdrawn applications cannot be updated" }, { status: 409 });
    }

    const updated = await db.$transaction(async (tx) => {
      const wasAccepted = application.status === "accepted";
      const willAccept = status === "accepted";

      if (!wasAccepted && willAccept) {
        const project = await tx.project.findUnique({
          where: { id: application.projectId },
        });

        if (!project || project.enrolled >= project.capacity) {
          throw new Error("PROJECT_FULL");
        }
      }

      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status,
          ...(hasOwnerFeedback && { ownerFeedback: ownerFeedback || null }),
        },
        include: {
          project: true,
          applicant: {
            include: {
              profile: {
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
            },
          },
        },
      });

      if (!wasAccepted && willAccept) {
        await tx.project.update({
          where: { id: application.projectId },
          data: { enrolled: { increment: 1 } },
        });
      }

      if (wasAccepted && !willAccept) {
        await tx.project.update({
          where: { id: application.projectId },
          data: { enrolled: { decrement: 1 } },
        });
      }

      return updatedApplication;
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_FULL") {
      return NextResponse.json({ error: "Project is full" }, { status: 409 });
    }

    console.error("Failed to update application:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
