import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PersonaUpdateForm } from "@/app/mentor/skills/[slug]/persona/persona-update-form";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function MentorPersonaUpdatePage(props: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mentor");
  }
  if (user.role !== "MENTOR") {
    redirect("/");
  }

  const { slug } = await props.params;
  const skill = await db.skill.findUnique({
    where: { slug },
    include: {
      persona: true,
      owner: {
        include: {
          mentorProfile: true,
        },
      },
    },
  });

  if (!skill || skill.ownerUserId !== user.id || !skill.persona) {
    notFound();
  }

  const personaJson = skill.persona.personaJson as {
    mentor?: { name?: string; affiliation?: string; title?: string };
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Update Persona
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Add more evidence without changing the existing public Skill page.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/s/${skill.slug}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            View public page
          </Link>
          <Link
            href="/mentor"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to mentor dashboard
          </Link>
          <Link
            href={`/api/personas/${skill.persona.slug}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Persona JSON
          </Link>
          <Link
            href={`/api/personas/${skill.persona.slug}/agent-card`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Agent card
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-[var(--card)] p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Build status
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            {skill.persona.buildStatus}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Last built: {formatDate(skill.persona.builtAt)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[var(--card)] p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Evidence
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            {skill.persona.sourceCount} sources / {skill.persona.chunkCount} chunks
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Public {skill.persona.publicSourceCount}, upload{" "}
            {skill.persona.uploadSourceCount}, private{" "}
            {skill.persona.privateSourceCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[var(--card)] p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Persona slug
          </p>
          <p className="mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100">
            {skill.persona.slug}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Skill title: {skill.title}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-[var(--card)] p-6 shadow-sm dark:border-slate-700 sm:p-8">
        <PersonaUpdateForm
          personaSlug={skill.persona.slug}
          initialName={personaJson.mentor?.name || skill.owner.mentorProfile?.displayName || skill.owner.email}
          initialAffiliation={
            personaJson.mentor?.affiliation ||
            [
              skill.owner.mentorProfile?.institution,
              skill.owner.mentorProfile?.department,
            ]
              .filter(Boolean)
              .join(", ")
          }
          initialTitle={
            personaJson.mentor?.title ||
            skill.owner.mentorProfile?.title ||
            "Professor"
          }
        />
      </div>
    </div>
  );
}
