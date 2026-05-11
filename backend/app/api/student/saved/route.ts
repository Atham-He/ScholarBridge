import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/student/saved - 获取学生收藏的导师列表
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedMentors = await db.savedMentor.findMany({
      where: {
        studentUserId: user.id,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    // 获取导师信息
    const mentors = await Promise.all(
      savedMentors.map(async (saved) => {
        const mentorProfile = await db.mentorProfile.findUnique({
          where: { userId: saved.mentorUserId },
        });

        if (!mentorProfile) return null;

        // 获取导师的项目
        const projects = await db.project.findMany({
          where: {
            mentorUserId: saved.mentorUserId,
            status: "OPEN",
          },
        });

        return {
          id: saved.id,
          slug: mentorProfile.userId,
          title: mentorProfile.displayName,
          mentor: {
            displayName: mentorProfile.displayName,
            institution: mentorProfile.institution,
          },
          tags: mentorProfile.researchAreas as string[] || [],
          openPositionsCount: projects.reduce((sum, p) => sum + (p.capacity - p.enrolled), 0),
        };
      })
    );

    return NextResponse.json({
      mentors: mentors.filter(Boolean),
    });
  } catch (error) {
    console.error("Failed to fetch saved mentors:", error);
    return NextResponse.json({ error: "Failed to fetch saved mentors" }, { status: 500 });
  }
}

// POST /api/student/saved - 收藏导师
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mentorUserId } = body;

    if (!mentorUserId) {
      return NextResponse.json({ error: "mentorUserId is required" }, { status: 400 });
    }

    // 检查导师是否存在
    const mentor = await db.mentorProfile.findUnique({
      where: { userId: mentorUserId },
    });

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    // 检查是否已经收藏
    const existing = await db.savedMentor.findUnique({
      where: {
        studentUserId_mentorUserId: {
          studentUserId: user.id,
          mentorUserId: mentorUserId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already saved" }, { status: 400 });
    }

    // 创建收藏
    const saved = await db.savedMentor.create({
      data: {
        studentUserId: user.id,
        mentorUserId: mentorUserId,
      },
    });

    return NextResponse.json({ saved });
  } catch (error) {
    console.error("Failed to save mentor:", error);
    return NextResponse.json({ error: "Failed to save mentor" }, { status: 500 });
  }
}

// DELETE /api/student/saved - 取消收藏导师
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mentorUserId = searchParams.get("mentorUserId");

    if (!mentorUserId) {
      return NextResponse.json({ error: "mentorUserId is required" }, { status: 400 });
    }

    await db.savedMentor.delete({
      where: {
        studentUserId_mentorUserId: {
          studentUserId: user.id,
          mentorUserId: mentorUserId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to unsave mentor:", error);
    return NextResponse.json({ error: "Failed to unsave mentor" }, { status: 500 });
  }
}
