import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/mentors - 获取所有导师的公开信息
export async function GET() {
  try {
    const mentors = await db.mentorProfile.findMany({
      where: {
        status: "active",
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // 为每个导师计算开放职位数量
    const mentorsWithStats = await Promise.all(
      mentors.map(async (mentor) => {
        const projects = await db.project.findMany({
          where: {
            mentorUserId: mentor.userId,
            status: "OPEN",
          },
        });

        const openPositionsCount = projects.reduce((sum, p) => {
          return sum + Math.max(0, p.capacity - p.enrolled);
        }, 0);

        return {
          id: mentor.userId,
          slug: mentor.userId,
          title: mentor.displayName,
          mentor: {
            displayName: mentor.displayName,
            institution: mentor.institution,
            initials: mentor.displayName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
          },
          tags: (mentor.researchAreas as string[]) || [],
          openPositionsCount,
          agent: {
            active: true,
          },
        };
      })
    );

    return NextResponse.json({
      skills: mentorsWithStats,
    });
  } catch (error) {
    console.error("Failed to fetch mentors:", error);
    return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 500 });
  }
}
