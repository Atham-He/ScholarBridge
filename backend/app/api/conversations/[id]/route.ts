import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripAiMarkers } from "@/lib/prompt";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          skill: { select: { title: true, slug: true } },
          mentor: { include: { mentorProfile: true } },
          student: { include: { studentProfile: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "未找到会话" }, { status: 404 });
  }

  const app = conversation.application;
  const okStudent = user.role === "STUDENT" && app.studentUserId === user.id;
  const okMentor = user.role === "MENTOR" && app.mentorUserId === user.id;
  if (!okStudent && !okMentor) {
    return NextResponse.json({ error: "无权查看" }, { status: 403 });
  }

  const chatClosed =
    app.status === "WITHDRAWN" || app.status === "REJECTED";
  const canChat = okStudent && !chatClosed;

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      applicationId: app.id,
      skill: app.skill,
      mentorName: app.mentor.mentorProfile?.displayName ?? app.mentor.email,
      studentName: app.student.studentProfile?.displayName ?? app.student.email,
      status: app.status,
      viewer: okMentor ? "MENTOR" : "STUDENT",
      canChat,
    },
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content:
        m.role === "ASSISTANT" ? stripAiMarkers(m.content) : m.content,
      createdAt: m.createdAt,
    })),
  });
}
