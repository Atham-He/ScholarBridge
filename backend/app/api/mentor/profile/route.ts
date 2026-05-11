import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.mentorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
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

  const data: Prisma.MentorProfileUpdateInput = {
    ...(payload.displayName !== undefined && { displayName: String(payload.displayName) }),
    ...(payload.institution !== undefined && { institution: String(payload.institution) }),
    ...(payload.department !== undefined && { department: String(payload.department) }),
    ...(payload.title !== undefined && { title: String(payload.title) }),
    ...(payload.bioShort !== undefined && { bioShort: String(payload.bioShort) }),
    ...(payload.location !== undefined && { location: String(payload.location) }),
    ...(payload.contactEmail !== undefined && { contactEmail: String(payload.contactEmail) }),
    ...(payload.phone !== undefined && { phone: String(payload.phone) }),
    ...(payload.website !== undefined && { website: String(payload.website) }),
    ...(payload.researchAreas !== undefined && {
      researchAreas: payload.researchAreas as Prisma.InputJsonValue,
    }),
  };

  const profile = await db.mentorProfile.update({
    where: { userId: user.id },
    data,
  });

  return NextResponse.json({ profile });
}
