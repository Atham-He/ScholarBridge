"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="rounded-lg border border-[#E0D8CC] bg-white px-3 py-1.5 text-sm font-medium text-[#1A1A1A] hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
    >
      Sign Out
    </button>
  );
}
