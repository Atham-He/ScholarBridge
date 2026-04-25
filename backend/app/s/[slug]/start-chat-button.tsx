"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function start(e: React.MouseEvent) {
    e.preventDefault();
    console.log('Button clicked!', { isStudent, isMentor, isOwner, loading });
    setError(null);

    // 未登录状态 - 跳转到登录页
    if (!isStudent && !isMentor) {
      console.log('Not logged in, redirecting to login...');
      window.location.href = `/login?next=${encodeURIComponent(`/s/${slug}`)}`;
      return;
    }

    // 导师账号
    if (isMentor) {
      setError("当前为导师账号，请使用学生账号登录");
      return;
    }

    // 学生账号 - 但不能和自己对话
    if (isOwner) {
      setError("不能与自己的 Skill 对话");
      return;
    }

    // 学生账号 - 创建对话
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

  // 导师自己的技能
  if (isOwner) {
    return (
      <p className="text-sm" style={{ color: '#6B6B6B' }}>
        这是你的 Skill。学生登录后可从「浏览导师」进入对话。
      </p>
    );
  }

  // 判断按钮文字
  const getButtonText = () => {
    if (loading) return "正在创建会话…";

    // 未登录 - 显示吸引人的文字
    if (!isStudent && !isMentor) {
      return "与导师分身对话";
    }

    // 导师账号
    if (isMentor) {
      return "请使用学生账号";
    }

    // 学生账号
    return "与导师分身对话";
  };

  // 未登录状态 - 使用 Link 组件确保导航工作
  if (!isStudent && !isMentor) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`}
        className="start-chat-button"
        style={{
          display: 'inline-block',
          background: 'white',
          color: '#2C5F7C',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FAF8F5';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {getButtonText()}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={mounted ? (loading || isMentor) : false}
        className="start-chat-button"
        style={{
          background: 'white',
          color: '#2C5F7C',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          cursor: mounted && (loading || isMentor) ? 'not-allowed' : 'pointer',
          opacity: mounted && (loading || isMentor) ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!loading && !isMentor && mounted) {
            e.currentTarget.style.background = '#FAF8F5';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {getButtonText()}
      </button>
      {error && (
        <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  );
}
