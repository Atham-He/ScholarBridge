"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  skillId: string;
  slug: string;
  isStudent: boolean;
  isMentor: boolean;
  isOwner: boolean;
};

export function StartChatButton({
  skillId,
  slug,
  isStudent,
  isMentor,
  isOwner,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    if (isMentor) {
      setError("当前为导师账号，请用学生账号登录后再发起对话。");
      return;
    }
    if (!isStudent) {
      router.push(`/login?next=${encodeURIComponent(`/s/${slug}`)}`);
      return;
    }
    if (isOwner) {
      setError("不能与自己的 Skill 对话");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId }),
    });
    setLoading(false);
    const data = (await res.json()) as {
      error?: string;
      conversationId?: string | null;
    };
    if (!res.ok) {
      setError(data.error ?? "无法发起对话");
      return;
    }
    if (data.conversationId) {
      router.push(`/c/${data.conversationId}`);
      router.refresh();
    } else {
      setError("未创建会话，请重试");
    }
  }

  if (isOwner) {
    return (
      <p className="text-sm text-slate-500">
        这是你的 Skill。学生登录后可从「浏览导师」进入对话。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void start()}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading
          ? "正在创建会话…"
          : isMentor
            ? "请使用学生账号"
            : isStudent
              ? "与导师分身对话"
              : "登录学生账号后对话"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
