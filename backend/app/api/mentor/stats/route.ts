import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { mentorUserId: user.id },
  });

  const stats = {
    total: projects.length,
    open: projects.filter(p => p.status === "OPEN").length,
    closed: projects.filter(p => p.status === "CLOSED").length,
    totalEnrolled: projects.reduce((sum, p) => sum + p.enrolled, 0),
  };

  return NextResponse.json({ stats });
}
