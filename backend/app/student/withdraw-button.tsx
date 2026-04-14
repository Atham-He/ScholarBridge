"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function withdraw() {
    if (!confirm("确定撤回该申请？撤回后将无法继续对话。")) return;
    setLoading(true);
    const res = await fetch(`/api/applications/${applicationId}/withdraw`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void withdraw()}
      disabled={loading}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {loading ? "处理中…" : "撤回申请"}
    </button>
  );
}
