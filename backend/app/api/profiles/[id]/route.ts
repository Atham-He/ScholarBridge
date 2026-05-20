import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      ownedProjects: {
        where: { status: "OPEN" },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user || !user.profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const projects = user.ownedProjects.map((project) => ({
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
  }));

  const openSeats = projects.reduce((total, project) => total + project.availableSeats, 0);

  return NextResponse.json({
    profile: {
      id: user.id,
      displayName: user.profile.displayName || user.email,
      institution: user.profile.institution || "Independent",
      department: user.profile.department,
      title: user.profile.title,
      bioShort: user.profile.bioShort,
      location: user.profile.location,
      contactEmail: user.profile.contactEmail,
      website: user.profile.website,
      researchAreas: (user.profile.researchAreas as string[]) || [],
      openProjectCount: projects.length,
      openSeats,
      projects,
    },
  });
}
