import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreApplicationResume } from "@/lib/resume-ai";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "MENTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await context.params;
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { project: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.mentorUserId !== user.id || application.project.mentorUserId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const scored = await scoreApplicationResume(applicationId);
    return NextResponse.json({ application: scored });
  } catch (error) {
    console.error("Failed to score application:", error);
    return NextResponse.json({ error: "Failed to score application" }, { status: 500 });
  }
}
