import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, ensureProfile } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/projects - public list of open research opportunities
export async function GET() {
  try {
    const projects = await db.project.findMany({
      where: {
        status: "OPEN",
        owner: {
          profile: {
          status: "active",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        owner: { include: { profile: true } },
      },
    });

    type ProjectItem = (typeof projects)[number];

    return NextResponse.json({
      projects: projects.map((project: ProjectItem) => ({
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
        owner: {
          id: project.owner.id,
          slug: project.owner.id,
          displayName: project.owner.profile?.displayName || project.owner.email,
          institution: project.owner.profile?.institution,
          department: project.owner.profile?.department,
          title: project.owner.profile?.title,
          bioShort: project.owner.profile?.bioShort,
          researchAreas: (project.owner.profile?.researchAreas as string[]) || [],
          initials: (project.owner.profile?.displayName || project.owner.email)
            .split(" ")
            .map((name: string) => name[0])
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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const researchArea = typeof payload.researchArea === "string" ? payload.researchArea.trim() : "";
  const startTime = typeof payload.startTime === "string" ? payload.startTime.trim() : "";
  const endTime = typeof payload.endTime === "string" ? payload.endTime.trim() : "";
  const location = typeof payload.location === "string" ? payload.location.trim() : "";
  const requirements = typeof payload.requirements === "string" ? payload.requirements.trim() : "";
  const capacity = typeof payload.capacity === "number" ? payload.capacity : Number(payload.capacity);

  if (!title || !description || !researchArea || !startTime || !Number.isInteger(capacity) || capacity < 1) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await ensureProfile(user.id, user.email);

  const project = await db.project.create({
    data: {
      ownerUserId: user.id,
      title,
      description,
      researchArea,
      startTime,
      endTime: endTime || null,
      location: location || null,
      requirements: requirements || null,
      capacity,
      enrolled: 0,
      status: "OPEN",
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
