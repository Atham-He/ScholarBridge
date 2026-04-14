"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewSkillForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [profileMarkdown, setProfileMarkdown] = useState(
    ["## 研究方向", "- NLP / LLM", "", "## 招募偏好", "- 必须有：Python", "", "## 常见问题", "Q: 是否接受转专业？", "A: 视背景而定。"].join(
      "\n",
    ),
  );
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, profileMarkdown, publish }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; details?: string[] };
      setError(
        [data.error, ...(data.details ?? [])].filter(Boolean).join("；") ||
          "保存失败",
      );
      return;
    }
    const data = (await res.json()) as { skill: { slug: string } };
    router.push(`/s/${data.skill.slug}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        新建 Skill
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        使用 Markdown
        编写导师资料；发布后学生会看到公开页并可发起对话。
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium">标题</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：2026 秋 · NLP 课题组"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            URL slug（小写、连字符）
          </label>
          <input
            required
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
            }
            placeholder="zhang-lab-nlp"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">导师资料（Markdown）</label>
          <textarea
            required
            value={profileMarkdown}
            onChange={(e) => setProfileMarkdown(e.target.value)}
            rows={16}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-[var(--card)] px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-blue-500 dark:border-slate-600"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          创建后立即公开发布
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "保存中…" : "保存"}
          </button>
          <Link
            href="/mentor"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
