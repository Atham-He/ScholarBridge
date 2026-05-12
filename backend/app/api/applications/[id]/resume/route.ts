import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "MENTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await context.params;
    const application = await db.application.findUnique({
      where: { id: applicationId },
      select: {
        mentorUserId: true,
        project: {
          select: {
            mentorUserId: true,
          },
        },
        student: {
          select: {
            studentProfile: {
              select: {
                resumeFileName: true,
                resumeMimeType: true,
                resumeData: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.mentorUserId !== user.id || application.project.mentorUserId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resume = application.student.studentProfile;
    if (!resume?.resumeData) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const fileName = resume.resumeFileName || "resume.pdf";
    return new NextResponse(resume.resumeData, {
      headers: {
        "Content-Type": resume.resumeMimeType || "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to fetch application resume:", error);
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
  }
}
