"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WithdrawButton({
  applicationId,
  onWithdraw,
}: {
  applicationId: string;
  onWithdraw?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function withdraw() {
    if (!confirm("确定撤回该申请？")) return;
    setLoading(true);
    const res = await fetch(`/api/applications/${applicationId}/withdraw`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      onWithdraw?.();
      router.refresh();
    } else {
      alert("撤回失败，请重试");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void withdraw()}
      disabled={loading}
      className="px-4 py-2 border border-[#E0D8CC] rounded-lg bg-white hover:border-[#2C5F7C] hover:text-[#2C5F7C] transition-all text-sm text-[#1A1A1A] disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
    >
      {loading ? "处理中..." : "撤回申请"}
    </button>
  );
}
