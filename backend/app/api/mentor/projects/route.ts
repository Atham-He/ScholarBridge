import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { mentorUserId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const title = typeof payload.title === "string" ? payload.title : "";
  const description = typeof payload.description === "string" ? payload.description : "";
  const researchArea = typeof payload.researchArea === "string" ? payload.researchArea : "";
  const startTime = typeof payload.startTime === "string" ? payload.startTime : "";
  const endTime = typeof payload.endTime === "string" ? payload.endTime : "";
  const location = typeof payload.location === "string" ? payload.location : "";
  const requirements = typeof payload.requirements === "string" ? payload.requirements : "";
  const capacity = typeof payload.capacity === "number" ? payload.capacity : Number(payload.capacity);

  if (!title || !description || !researchArea || !startTime || !capacity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      mentorUserId: user.id,
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

  return NextResponse.json({ project });
}
