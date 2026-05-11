import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects - public list of open research opportunities
export async function GET() {
  try {
    const projects = await db.project.findMany({
      where: {
        status: "OPEN",
        mentor: {
          status: "active",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        mentor: true,
      },
    });

    return NextResponse.json({
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        researchArea: project.researchArea,
        startTime: project.startTime,
        endTime: project.endTime,
        location: project.location,
        requirements: project.requirements,
        capacity: project.capacity,
        enrolled: project.enrolled,
        availableSeats: Math.max(0, project.capacity - project.enrolled),
        status: project.status,
        mentor: {
          id: project.mentor.userId,
          slug: project.mentor.userId,
          displayName: project.mentor.displayName,
          institution: project.mentor.institution,
          department: project.mentor.department,
          title: project.mentor.title,
          bioShort: project.mentor.bioShort,
          researchAreas: (project.mentor.researchAreas as string[]) || [],
          initials: project.mentor.displayName
            .split(" ")
            .map((name) => name[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        },
        agent: {
          active: true,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
