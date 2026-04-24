import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StartChatButton } from "@/app/s/[slug]/start-chat-button";

type Props = { params: Promise<{ slug: string }> };

export default async function SkillPublicPage(props: Props) {
  const { slug } = await props.params;
  const skill = await db.skill.findUnique({
    where: { slug },
    include: {
      owner: { include: { mentorProfile: true } },
      persona: true,
    },
  });

  if (!skill || skill.status !== "PUBLISHED" || !skill.isPublic) {
    notFound();
  }

  const user = await getCurrentUser();
  const isOwner = user?.id === skill.ownerUserId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-[var(--card)] p-6 shadow-sm dark:border-slate-700 sm:p-8">
        <p className="text-sm text-slate-500">
          {skill.owner.mentorProfile?.institution}
          {skill.owner.mentorProfile?.department
            ? ` / ${skill.owner.mentorProfile.department}`
            : ""}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          {skill.title}
        </h1>
        <p className="mt-4 text-slate-700 dark:text-slate-300">
          {skill.owner.mentorProfile?.title && (
            <span>{skill.owner.mentorProfile.title} / </span>
          )}
          {skill.owner.mentorProfile?.displayName}
        </p>
        {skill.owner.mentorProfile?.bioShort && (
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            {skill.owner.mentorProfile.bioShort}
          </p>
        )}
        <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {skill.profileMarkdown}
          </pre>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-700 sm:flex-row sm:flex-wrap sm:items-center">
          <StartChatButton
            skillId={skill.id}
            slug={skill.slug}
            isStudent={user?.role === "STUDENT"}
            isMentor={user?.role === "MENTOR"}
            isOwner={isOwner}
          />
          {isOwner && skill.persona && (
            <Link
              href={`/mentor/skills/${skill.slug}/persona`}
              className="text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Update persona evidence
            </Link>
          )}
          <Link
            href="/browse"
            className="text-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          >
            Back to browse
          </Link>
        </div>
      </div>
    </div>
  );
}
