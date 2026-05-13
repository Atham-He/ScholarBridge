"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "登录失败");
      return;
    }
    router.push(nextParam || "/browse");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="flex items-center justify-between border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] px-10 py-5 backdrop-blur-[10px]">
        <Link href="/" className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[#1A1A1A]">
          ScholarBridge
        </Link>
        <div className="flex gap-2.5">
          <Link href="/">
            <Button variant="outline" size="sm">Home</Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline" size="sm">Browse</Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline" size="sm">Profile</Button>
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center justify-center px-6 py-12">
        <section className="w-full max-w-[460px] rounded-[10px] border border-[#E0D8CC] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="mb-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#2C5F7C]">Welcome back</p>
            <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A]">
              登录 ScholarBridge
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#1A1A1A]">
              登录后可以申请项目、收藏机会，也可以发布和管理自己的研究项目。
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
                邮箱
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
                密码
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
                placeholder="请输入密码"
              />
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#1A1A1A]">
            没有账号？{" "}
            <Link href="/register" className="font-semibold text-[#2C5F7C] hover:underline">
              注册
            </Link>
          </p>
        </section>
      </main>

      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}
