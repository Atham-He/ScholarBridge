import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractPdfText, scoreApplicationResume } from "@/lib/resume-ai";

const MAX_RESUME_SIZE = 10 * 1024 * 1024;

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: {
        resumeFileName: true,
        resumeMimeType: true,
        resumeData: true,
      },
    });

    if (!profile?.resumeData) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const fileName = profile.resumeFileName || "resume.pdf";
    return new NextResponse(profile.resumeData, {
      headers: {
        "Content-Type": profile.resumeMimeType || "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to fetch applicant resume:", error);
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const resume = formData.get("resume");

    if (!(resume instanceof File)) {
      return NextResponse.json({ error: "PDF resume is required" }, { status: 400 });
    }

    if (resume.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (resume.size > MAX_RESUME_SIZE) {
      return NextResponse.json({ error: "PDF resume must be 10MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await resume.arrayBuffer());
    if (buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
      return NextResponse.json({ error: "Uploaded file is not a valid PDF" }, { status: 400 });
    }
    const resumeText = await extractPdfText(buffer);

    const profile = await db.profile.upsert({
      where: { userId: user.id },
      update: {
        resumeFileName: resume.name,
        resumeMimeType: resume.type,
        resumeSize: resume.size,
        resumeData: buffer,
        resumeText,
        resumeUploadedAt: new Date(),
      },
      create: {
        userId: user.id,
        displayName: user.email?.split("@")[0] || "ScholarBridge User",
        resumeFileName: resume.name,
        resumeMimeType: resume.type,
        resumeSize: resume.size,
        resumeData: buffer,
        resumeText,
        resumeUploadedAt: new Date(),
      },
      select: {
        resumeFileName: true,
        resumeMimeType: true,
        resumeSize: true,
        resumeUploadedAt: true,
      },
    });

    const applications = await db.application.findMany({
      where: {
        applicantUserId: user.id,
        status: { not: "WITHDRAWN" },
      },
      select: { id: true },
    });
    type ApplicationItem = (typeof applications)[number];
    await Promise.all(applications.map((application: ApplicationItem) => scoreApplicationResume(application.id)));

    return NextResponse.json({ resume: profile });
  } catch (error) {
    console.error("Failed to upload applicant resume:", error);
    return NextResponse.json({ error: "Failed to upload resume" }, { status: 500 });
  }
}
