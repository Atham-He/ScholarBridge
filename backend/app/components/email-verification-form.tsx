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
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
        setError(data.error || "Verification failed.");
        setLoading(false);
        return;
      }

      onSuccess(data.user);
    } catch {
      setError("Network error. Please try again.");
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
        setError(data.error || "Failed to resend code.");
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
      setError("Network error. Please try again.");
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
          Verification code
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="min-w-0 flex-1 rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
            placeholder="6-digit code"
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleResendCode}
            disabled={resendLoading || countdown > 0}
            className="shrink-0 px-4 py-3"
          >
            {countdown > 0 ? `${countdown}s` : resendLoading ? "Sending..." : "Resend"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#1A1A1A]">
          A verification code was sent to {email}. It expires in 15 minutes.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          placeholder="At least 6 characters"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          Confirm password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          placeholder="Enter your password again"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1A1A1A]">
          Name / display name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border border-[#E0D8CC] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-all duration-200 ease placeholder:text-[#4A4A4A] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          placeholder="Enter your name or display name"
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
          Back
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Verifying..." : "Complete registration"}
        </Button>
      </div>
    </form>
  );
}
