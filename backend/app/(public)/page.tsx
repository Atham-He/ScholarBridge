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
            <Button variant="outline" size="sm">登录</Button>
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
            ScholarBridge 是一个面向研究机会匹配的平台。它把项目发布、项目发现、申请管理、简历材料和 AI 辅助筛选放在同一个统一账号体系下，让研究者既可以参与别人的项目，也可以发布自己的项目。
          </p>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          <article className="rounded-[10px] border border-[#E0D8CC] bg-white p-6">
            <h2 className="mb-3 font-display text-[24px] font-semibold text-[#1A1A1A]">统一身份</h2>
            <p className="text-sm leading-7 text-[#1A1A1A]">
              不再把用户固定成“学生”或“导师”。同一个账号可以浏览、申请、收藏项目，也可以发布项目并处理收到的申请。
            </p>
          </article>

          <article className="rounded-[10px] border border-[#E0D8CC] bg-white p-6">
            <h2 className="mb-3 font-display text-[24px] font-semibold text-[#1A1A1A]">项目优先</h2>
            <p className="text-sm leading-7 text-[#1A1A1A]">
              Browse 页面以研究项目为核心，帮助用户先判断研究方向、要求、名额和时间，再进一步查看详情和提交申请。
            </p>
          </article>

          <article className="rounded-[10px] border border-[#E0D8CC] bg-white p-6">
            <h2 className="mb-3 font-display text-[24px] font-semibold text-[#1A1A1A]">AI 辅助筛选</h2>
            <p className="text-sm leading-7 text-[#1A1A1A]">
              项目发布者可以根据硬实力背景和项目匹配度设置权重，让系统辅助整理申请材料和简历评分。
            </p>
          </article>
        </section>

        <section className="mt-12 rounded-[10px] border border-[#E0D8CC] bg-white p-7">
          <h2 className="mb-3 font-display text-[26px] font-semibold text-[#1A1A1A]">
            当前主要页面
          </h2>
          <div className="grid gap-4 text-sm leading-7 text-[#1A1A1A] md:grid-cols-2">
            <p>
              <span className="font-semibold">Browse：</span>
              查看开放项目、阅读项目详情、收藏项目、提交或撤回申请。
            </p>
            <p>
              <span className="font-semibold">Profile：</span>
              管理个人信息、PDF 简历、收藏、申请记录，以及自己发布的项目和收到的申请。
            </p>
          </div>
        </section>
      </main>

    </div>
  );
}
