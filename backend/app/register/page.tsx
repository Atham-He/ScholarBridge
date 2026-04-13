"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailVerificationForm } from "@/app/components/email-verification-form";

type Role = "MENTOR" | "STUDENT";
type Step = "email" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [role, setRole] = useState<Role>("STUDENT");
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
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setLoading(false);
        return;
      }

      setStep("verify");
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  function handleVerificationSuccess(user: any) {
    // Redirect based on role
    if (user.role === "MENTOR") {
      router.push("/mentor/skills/new");
    } else {
      router.push("/browse");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            注册 ScholarBridge
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {step === "email" && "选择您的角色并输入邮箱开始注册"}
            {step === "verify" && "请输入验证码完成注册"}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  我要注册为
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`flex-1 py-3 px-4 border rounded-lg text-center ${
                      role === "STUDENT"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    👤 学生
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("MENTOR")}
                    className={`flex-1 py-3 px-4 border rounded-lg text-center ${
                      role === "MENTOR"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    👨‍🏫 导师
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400"
              >
                {loading ? "发送中..." : "发送验证码"}
              </button>

              <p className="text-center text-sm text-slate-600">
                已有账号？{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-500">
                  立即登录
                </Link>
              </p>
            </form>
          )}

          {step === "verify" && (
            <EmailVerificationForm
              email={email}
              role={role}
              onSuccess={handleVerificationSuccess}
              onBack={() => setStep("email")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
