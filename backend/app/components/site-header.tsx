import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/app/components/logout-button";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[var(--card)]/90 backdrop-blur dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Skill Hub
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/browse"
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            浏览导师
          </Link>
          {user?.role === "MENTOR" && (
            <>
              <Link
                href="/mentor/skills/new"
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                上传 Skill
              </Link>
              <Link
                href="/mentor"
                className="rounded-lg px-2 py-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                导师面板
              </Link>
            </>
          )}
          {user?.role === "STUDENT" && (
            <Link
              href="/student"
              className="rounded-lg px-2 py-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              学生面板
            </Link>
          )}
          {!user && (
            <>
              <Link
                href="/login"
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                注册
              </Link>
            </>
          )}
          {user && (
            <span className="hidden text-slate-500 sm:inline dark:text-slate-400">
              {user.email}
            </span>
          )}
          {user && <LogoutButton />}
        </nav>
      </div>
    </header>
  );
}
