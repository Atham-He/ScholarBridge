import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// GET /api/auth/session - Check if user is logged in
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName || user.email,
      },
    });
  } catch (error) {
    console.error("Failed to check session:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
