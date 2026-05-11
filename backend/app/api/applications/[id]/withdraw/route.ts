import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/applications/[id]/withdraw - 撤回申请
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;

    // 检查申请是否存在且属于当前用户
    const application = await db.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.studentUserId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 更新申请状态为 WITHDRAWN
    const updated = await db.application.update({
      where: { id: applicationId },
      data: { status: "WITHDRAWN" },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Failed to withdraw application:", error);
    return NextResponse.json({ error: "Failed to withdraw application" }, { status: 500 });
  }
}
