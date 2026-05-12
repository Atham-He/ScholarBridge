import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const studentProfileSelect = {
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
};

// GET /api/student/profile - 获取学生个人信息
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: studentProfileSelect,
    });

    if (!profile) {
      // 如果没有profile，创建一个默认的
      const newProfile = await db.studentProfile.create({
        data: {
          userId: user.id,
          displayName: user.email?.split("@")[0] || "Student",
        },
        select: studentProfileSelect,
      });
      return NextResponse.json({ profile: newProfile });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to fetch student profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/student/profile - 更新学生个人信息
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, bioShort, education, interests, skills } = body;

    const profile = await db.studentProfile.update({
      where: { userId: user.id },
      data: {
        displayName: displayName || undefined,
        bioShort: bioShort || undefined,
        education: education || undefined,
        interests: interests || undefined,
        skills: skills || undefined,
      },
      select: studentProfileSelect,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to update student profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
