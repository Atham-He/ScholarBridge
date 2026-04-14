"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  role: "USER" | "ASSISTANT" | "MENTOR";
  content: string;
  createdAt: string;
};

type ConvMeta = {
  id: string;
  applicationId: string;
  skill: { title: string; slug: string };
  mentorName: string;
  studentName: string;
  status: string;
  viewer: "MENTOR" | "STUDENT";
  canChat: boolean;
};

export function ChatClient({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (res.status === 401) {
      router.push(`/login?next=${encodeURIComponent(`/c/${conversationId}`)}`);
      return;
    }
    if (!res.ok) {
      setError("无法加载会话");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      conversation: ConvMeta;
      messages: Msg[];
    };
    setMeta(data.conversation);
    setMessages(data.messages);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !meta?.canChat) return;
    setSending(true);
    setError(null);
    const text = input.trim();
    setInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content: text }),
    });
    setSending(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "发送失败");
      setInput(text);
      return;
    }
    const data = (await res.json()) as { message: string };
    setMessages((prev) => [
      ...prev,
      {
        id: `local-user-${Date.now()}`,
        role: "USER",
        content: text,
        createdAt: new Date().toISOString(),
      },
      {
        id: `local-asst-${Date.now()}`,
        role: "ASSISTANT",
        content: data.message,
        createdAt: new Date().toISOString(),
      },
    ]);
    router.refresh();
  }

  if (loading) {
    return (
      <p className="px-4 py-12 text-center text-slate-500">加载中…</p>
    );
  }

  if (!meta) {
    return (
      <p className="px-4 py-12 text-center text-red-600">
        {error ?? "会话不存在"}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8">
      <div className="mb-4">
        <p className="text-sm text-slate-500">
          {meta.skill.title} · 导师 {meta.mentorName}
        </p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          与分身对话
        </h1>
        {meta.viewer === "MENTOR" && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            你正以导师身份查看与学生「{meta.studentName}」的会话（只读）。
          </p>
        )}
        {meta.status === "WITHDRAWN" && (
          <p className="mt-2 text-sm text-slate-500">学生已撤回该申请。</p>
        )}
      </div>

      <div className="min-h-[320px] flex-1 space-y-4 rounded-xl border border-slate-200 bg-[var(--card)] p-4 dark:border-slate-700">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">发送第一条消息开始交流。</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "USER"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              <span className="mb-1 block text-[10px] uppercase opacity-70">
                {m.role === "USER" ? "学生" : "分身"}
              </span>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {meta.canChat ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="介绍你的背景、研究兴趣…"
            className="flex-1 rounded-xl border border-slate-300 bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "发送中…" : "发送"}
          </button>
        </form>
      ) : (
        meta.viewer === "STUDENT" && (
          <p className="mt-4 text-sm text-slate-500">该会话已不可继续发送。</p>
        )
      )}
    </div>
  );
}
