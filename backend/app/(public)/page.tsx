/**
 * 首页：项目介绍
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative z-[1]" style={{ background: "#FAF8F5" }}>
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          background:
            "linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px), linear-gradient(rgba(0,0,0,0.02) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px] relative z-[10]">
        <div className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <Button variant="gold" size="sm">Home</Button>
          <Link href="/browse">
            <Button variant="outline" size="sm">Browse</Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline" size="sm">Profile</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-[10] mx-auto flex w-full max-w-6xl flex-1 flex-col px-10 py-20">
        <section className="max-w-3xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-[#2C5F7C]">
            Research Opportunity Network
          </p>
          <h1 className="font-display mb-6 text-[56px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#1A1A1A]">
            ScholarBridge
          </h1>
          <p className="max-w-2xl text-[18px] leading-[1.8] text-[#1A1A1A]">
            ScholarBridge is a research opportunity matching platform. It brings project publishing, discovery,
            application management, resume materials, and AI-assisted screening into one unified account system,
            so researchers can both join other projects and publish their own.
          </p>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          <article className="rounded-[10px] border border-[#E0D8CC] bg-white p-6">
            <h2 className="mb-3 font-display text-[24px] font-semibold text-[#1A1A1A]">Unified Identity</h2>
            <p className="text-sm leading-7 text-[#1A1A1A]">
              Users are no longer locked into a single role like "student" or "mentor." One account can browse,
              apply for, and save projects, while also publishing projects and managing incoming applications.
            </p>
          </article>

          <article className="rounded-[10px] border border-[#E0D8CC] bg-white p-6">
            <h2 className="mb-3 font-display text-[24px] font-semibold text-[#1A1A1A]">Project First</h2>
            <p className="text-sm leading-7 text-[#1A1A1A]">
              The Browse page is centered on research projects, helping users assess research area, requirements,
              capacity, and timeline before exploring details and applying.
            </p>
          </article>

          <article className="rounded-[10px] border border-[#E0D8CC] bg-white p-6">
            <h2 className="mb-3 font-display text-[24px] font-semibold text-[#1A1A1A]">AI-Assisted Screening</h2>
            <p className="text-sm leading-7 text-[#1A1A1A]">
              Project owners can weight academic strength and project fit to help the system organize applications
              and score resumes.
            </p>
          </article>
        </section>

        <section className="mt-12 rounded-[10px] border border-[#E0D8CC] bg-white p-7">
          <h2 className="mb-3 font-display text-[26px] font-semibold text-[#1A1A1A]">
            Main Pages
          </h2>
          <div className="grid gap-4 text-sm leading-7 text-[#1A1A1A] md:grid-cols-2">
            <p>
              <span className="font-semibold">Browse:</span>
              Discover open projects, review details, save opportunities, and submit or withdraw applications.
            </p>
            <p>
              <span className="font-semibold">Profile:</span>
              Manage personal information, PDF resume, saved projects, application history, and the projects and
              incoming applications you own.
            </p>
          </div>
        </section>
      </main>

    </div>
  );
}
