"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PersonaAdvancedFields } from "@/app/mentor/skills/persona-advanced-fields";
import {
  appendAdvancedPersonaFields,
  createEmptyAdvancedPersonaValues,
  type AdvancedPersonaValues,
} from "@/app/mentor/skills/persona-form-data";

type Props = {
  personaSlug: string;
  initialName: string;
  initialAffiliation: string;
  initialTitle: string;
};

type UpdateResult = {
  slug: string;
  sourceCount: number;
  chunkCount: number;
  publicSourceCount: number;
  uploadSourceCount: number;
  privateSourceCount: number;
  addedSourceCount?: number;
};

export function PersonaUpdateForm({
  personaSlug,
  initialName,
  initialAffiliation,
  initialTitle,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [affiliation, setAffiliation] = useState(initialAffiliation);
  const [title, setTitle] = useState(initialTitle);
  const [advancedValues, setAdvancedValues] = useState<AdvancedPersonaValues>(
    createEmptyAdvancedPersonaValues(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UpdateResult | null>(null);

  function updateAdvancedValue<K extends keyof AdvancedPersonaValues>(
    key: K,
    value: AdvancedPersonaValues[K],
  ) {
    setAdvancedValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("affiliation", affiliation);
    formData.set("title", title);
    appendAdvancedPersonaFields(formData, advancedValues);

    const response = await fetch(
      `/api/personas/${encodeURIComponent(personaSlug)}/update`,
      {
        method: "POST",
        body: formData,
      },
    );

    setLoading(false);

    const data = (await response.json()) as {
      success?: boolean;
      data?: UpdateResult;
      error?: { message?: string; details?: string };
    };

    if (!response.ok || !data.success || !data.data) {
      setError(
        data.error?.details || data.error?.message || "Failed to update persona.",
      );
      return;
    }

    setResult(data.data);
    setAdvancedValues(createEmptyAdvancedPersonaValues());
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Affiliation</label>
          <input
            value={affiliation}
            onChange={(event) => setAffiliation(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>
      </div>

      <PersonaAdvancedFields
        values={advancedValues}
        onChange={updateAdvancedValue}
        defaultOpen
        summary="Append new persona evidence"
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
          Update complete. Sources: {result.sourceCount}, chunks:{" "}
          {result.chunkCount}, added this round: {result.addedSourceCount ?? 0}.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Updating persona..." : "Update Persona"}
        </button>
      </div>
    </form>
  );
}
