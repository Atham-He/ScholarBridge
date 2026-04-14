import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WithdrawButton } from "@/app/student/withdraw-button";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/student");
  }
  if (user.role !== "STUDENT") {
    redirect("/");
  }

  const apps = await db.application.findMany({
    where: { studentUserId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      skill: true,
      mentor: { include: { mentorProfile: true } },
      conversation: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        学生面板
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        管理你的套磁会话；可随时撤回申请。
      </p>

      <ul className="mt-8 space-y-4">
        {apps.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-600">
            暂无记录。去{" "}
            <Link href="/browse" className="text-blue-600 hover:underline">
              浏览导师
            </Link>
            。
          </li>
        )}
        {apps.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
          >
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {a.skill.title}
              </p>
              <p className="text-sm text-slate-500">
                导师：{a.mentor.mentorProfile?.displayName ?? a.mentor.email}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                状态：{a.status}
                {a.aiScore != null && ` · AI 分：${a.aiScore}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {a.conversation &&
                a.status !== "WITHDRAWN" &&
                a.status !== "REJECTED" && (
                <Link
                  href={`/c/${a.conversation.id}`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  继续对话
                </Link>
              )}
              {a.status !== "WITHDRAWN" && a.status !== "REJECTED" && (
                <WithdrawButton applicationId={a.id} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
