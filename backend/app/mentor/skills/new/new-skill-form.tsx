"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PersonaAdvancedFields } from "@/app/mentor/skills/persona-advanced-fields";
import {
  appendAdvancedPersonaFields,
  createEmptyAdvancedPersonaValues,
  type AdvancedPersonaValues,
} from "@/app/mentor/skills/persona-form-data";

const defaultProfileMarkdown = [
  "## Research Directions",
  "- NLP / LLM",
  "",
  "## Student Expectations",
  "- Python",
  "- Reproducible experiments",
  "",
  "## FAQ",
  "Q: Do you accept students from adjacent areas?",
  "A: It depends on background and evidence of fit.",
].join("\n");

export function NewSkillForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [profileMarkdown, setProfileMarkdown] = useState(defaultProfileMarkdown);
  const [publish, setPublish] = useState(true);
  const [advancedValues, setAdvancedValues] = useState<AdvancedPersonaValues>(
    createEmptyAdvancedPersonaValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateAdvancedValue<K extends keyof AdvancedPersonaValues>(
    key: K,
    value: AdvancedPersonaValues[K],
  ) {
    setAdvancedValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("profileMarkdown", profileMarkdown);
    formData.set("publish", String(publish));
    appendAdvancedPersonaFields(formData, advancedValues);

    const response = await fetch("/api/skills", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as {
        error?: string;
        details?: string[];
      };
      setError(
        [data.error, ...(data.details ?? [])].filter(Boolean).join("; ") ||
          "Failed to save skill.",
      );
      return;
    }

    const data = (await response.json()) as { skill: { slug: string } };
    router.push(`/s/${data.skill.slug}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Create Skill
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Keep the existing public Skill page, and optionally attach richer
        persona-building evidence without changing the overall workflow.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: 2026 Multimodal Research Openings"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">URL slug</label>
          <input
            required
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              )
            }
            placeholder="xing-lab-multimodal"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Public skill profile (Markdown)
          </label>
          <textarea
            required
            value={profileMarkdown}
            onChange={(event) => setProfileMarkdown(event.target.value)}
            rows={16}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publish}
            onChange={(event) => setPublish(event.target.checked)}
          />
          Publish immediately after creation
        </label>

        <PersonaAdvancedFields
          values={advancedValues}
          onChange={updateAdvancedValue}
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Building persona..." : "Save"}
          </button>
          <Link
            href="/mentor"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
