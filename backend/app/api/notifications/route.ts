import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
  }

  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  type NotificationItem = (typeof items)[number];

  return NextResponse.json({
    notifications: items.map((n: NotificationItem) => ({
      id: n.id,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
}
