import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MentorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mentor");
  }
  if (user.role !== "MENTOR") {
    redirect("/");
  }

  const apps = await db.application.findMany({
    where: { mentorUserId: user.id },
    orderBy: { lastMessageAt: "desc" },
    include: {
      skill: true,
      student: { include: { studentProfile: true } },
      conversation: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        导师面板
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        查看学生与 AI
        分身的会话。高分或标记 NOTIFY
        的申请可优先跟进（演示中为解析回复中的标记）。
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">学生</th>
              <th className="px-4 py-3 font-medium">Skill</th>
              <th className="px-4 py-3 font-medium">AI 分</th>
              <th className="px-4 py-3 font-medium">提醒</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {apps.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  暂无申请。分享你的 Skill 链接给学生即可。
                </td>
              </tr>
            )}
            {apps.map((a) => (
              <tr key={a.id} className="bg-[var(--card)]">
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                  {a.student.studentProfile?.displayName ?? a.student.email}
                  {a.student.studentProfile?.backgroundBrief && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {a.student.studentProfile.backgroundBrief}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">{a.skill.title}</td>
                <td className="px-4 py-3">
                  {a.aiScore != null ? a.aiScore : "—"}
                </td>
                <td className="px-4 py-3">
                  {a.aiFlagNotify ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                      NOTIFY
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="px-4 py-3">
                  {a.conversation && (
                    <Link
                      href={`/c/${a.conversation.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      查看对话
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href="/mentor/skills/new"
        className="mt-8 inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        + 新建 Skill
      </Link>
    </div>
  );
}
