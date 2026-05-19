import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeProjectIllustrationUrl } from "@/lib/project-illustration";

type Params = { params: Promise<{ id: string }> };
const PROJECT_STATUSES = ["OPEN", "CLOSED", "COMPLETED"] as const;
type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export async function GET(_request: NextRequest, context: Params) {
  const { id } = await context.params;
  const project = await db.project.findUnique({
    where: { id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const project = await db.project.findUnique({
    where: { id },
  });

  if (!project || project.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};

  const status = typeof payload.status === "string" &&
    PROJECT_STATUSES.includes(payload.status as ProjectStatusValue)
    ? payload.status as ProjectStatusValue
    : undefined;
  let illustrationUrl: string | null | undefined;
  try {
    illustrationUrl = normalizeProjectIllustrationUrl(payload.illustrationUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid project illustration" },
      { status: 400 },
    );
  }

  const data = {
    ...(payload.title !== undefined && { title: String(payload.title) }),
    ...(payload.description !== undefined && { description: String(payload.description) }),
    ...(payload.researchArea !== undefined && { researchArea: String(payload.researchArea) }),
    ...(payload.startTime !== undefined && { startTime: String(payload.startTime) }),
    ...(payload.endTime !== undefined && { endTime: payload.endTime ? String(payload.endTime) : null }),
    ...(payload.location !== undefined && { location: payload.location ? String(payload.location) : null }),
    ...(payload.requirements !== undefined && { requirements: payload.requirements ? String(payload.requirements) : null }),
    ...(illustrationUrl !== undefined && { illustrationUrl }),
    ...(payload.capacity !== undefined && { capacity: typeof payload.capacity === "number" ? payload.capacity : Number(payload.capacity) }),
    ...(status !== undefined && { status }),
  };

  const updated = await db.project.update({
    where: { id },
    data,
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const project = await db.project.findUnique({
    where: { id },
  });

  if (!project || project.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await db.project.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
