import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function formatDate(value: Date | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function MentorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mentor");
  }
  if (user.role !== "MENTOR") {
    redirect("/");
  }

  const [apps, skills] = await Promise.all([
    db.application.findMany({
      where: { mentorUserId: user.id },
      orderBy: { lastMessageAt: "desc" },
      include: {
        skill: true,
        student: { include: { studentProfile: true } },
        conversation: true,
      },
    }),
    db.skill.findMany({
      where: { ownerUserId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        persona: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Mentor Dashboard
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Review student conversations and manage the evidence used to build each
        mentor persona.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Skill</th>
              <th className="px-4 py-3 font-medium">AI score</th>
              <th className="px-4 py-3 font-medium">Notify</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {apps.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No student conversations yet.
                </td>
              </tr>
            )}
            {apps.map((application) => (
              <tr key={application.id} className="bg-[var(--card)]">
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                  {application.student.studentProfile?.displayName ??
                    application.student.email}
                  {application.student.studentProfile?.backgroundBrief && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {application.student.studentProfile.backgroundBrief}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">{application.skill.title}</td>
                <td className="px-4 py-3">
                  {application.aiScore != null ? application.aiScore : "N/A"}
                </td>
                <td className="px-4 py-3">
                  {application.aiFlagNotify ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                      NOTIFY
                    </span>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-3">{application.status}</td>
                <td className="px-4 py-3">
                  {application.conversation && (
                    <Link
                      href={`/c/${application.conversation.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View chat
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Your Skills
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Minimal UI hooks for create and update now live here.
          </p>
        </div>
        <Link
          href="/mentor/skills/new"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Skill
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Skill</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Evidence</th>
              <th className="px-4 py-3 font-medium">Built at</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {skills.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No skills yet.
                </td>
              </tr>
            )}
            {skills.map((skill) => (
              <tr key={skill.id} className="bg-[var(--card)]">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {skill.title}
                  </p>
                  <p className="text-xs text-slate-500">{skill.slug}</p>
                </td>
                <td className="px-4 py-3">
                  {skill.isPublic ? "Published" : "Draft"}
                </td>
                <td className="px-4 py-3">
                  {skill.persona ? skill.persona.buildStatus : "Missing"}
                </td>
                <td className="px-4 py-3">
                  {skill.persona ? (
                    <span>
                      {skill.persona.sourceCount} sources /{" "}
                      {skill.persona.chunkCount} chunks
                    </span>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-3">
                  {formatDate(skill.persona?.builtAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/s/${skill.slug}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Public page
                    </Link>
                    {skill.persona && (
                      <Link
                        href={`/mentor/skills/${skill.slug}/persona`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Update persona
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
