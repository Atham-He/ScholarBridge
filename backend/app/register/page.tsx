"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailVerificationForm } from "@/app/components/email-verification-form";
import { Button } from "@/components/ui/Button";

type Step = "email" | "verify";
type RegisteredUser = {
  id: string;
  email: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setLoading(false);
        return;
      }

      setStep("verify");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  function handleVerificationSuccess(_user: RegisteredUser) {
    router.push("/browse");
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
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#2C5F7C]">Create account</p>
            <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A]">
              注册 ScholarBridge
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#1A1A1A]">
              {step === "email" && "输入邮箱，开始发现、申请或发布研究机会。"}
              {step === "verify" && "输入验证码并设置账号信息，完成注册。"}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-5">
              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "发送中..." : "发送验证码"}
              </Button>

              <p className="text-center text-sm text-[#1A1A1A]">
                已有账号？{" "}
                <Link href="/login" className="font-semibold text-[#2C5F7C] hover:underline">
                  立即登录
                </Link>
              </p>
            </form>
          )}

          {step === "verify" && (
            <EmailVerificationForm
              email={email}
              onSuccess={handleVerificationSuccess}
              onBack={() => setStep("email")}
            />
          )}
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
