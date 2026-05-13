import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
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

    if (application.applicantUserId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (application.status !== "pending") {
      return NextResponse.json({ error: "Only pending applications can be withdrawn" }, { status: 409 });
    }

    // 更新申请状态为 WITHDRAWN
    const updated = await db.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: { status: "WITHDRAWN" },
      });

      return updatedApplication;
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Failed to withdraw application:", error);
    return NextResponse.json({ error: "Failed to withdraw application" }, { status: 500 });
  }
}
