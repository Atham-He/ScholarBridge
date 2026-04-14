import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-center text-slate-500">加载中…</p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
