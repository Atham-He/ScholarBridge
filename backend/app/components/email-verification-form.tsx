"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface EmailVerificationFormProps {
  email: string;
  onSuccess: (user: { id: string; email: string }) => void;
  onBack: () => void;
}

export function EmailVerificationForm({
  email,
  onSuccess,
  onBack
}: EmailVerificationFormProps) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (password !== confirmPassword) {
      setError("两次密码输入不一致");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要6位");
      setLoading(false);
      return;
    }

    const body = {
      email,
      code,
      password,
      displayName
    };

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "验证失败");
        setLoading(false);
        return;
      }

      onSuccess(data.user);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setResendLoading(false);
        return;
      }

      // Start countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      setError("网络错误，请重试");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          验证码
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="min-w-0 flex-1 rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
            placeholder="6位验证码"
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleResendCode}
            disabled={resendLoading || countdown > 0}
            className="shrink-0 px-4 py-3"
          >
            {countdown > 0 ? `${countdown}秒` : resendLoading ? "发送中..." : "重新发送"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#1A1A1A]">
          验证码已发送至 {email}，15分钟内有效
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          placeholder="至少6位密码"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          确认密码
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          placeholder="再次输入密码"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          姓名/昵称
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          placeholder="请输入您的姓名或昵称"
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          返回
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? "验证中..." : "完成注册"}
        </Button>
      </div>
    </form>
  );
}
