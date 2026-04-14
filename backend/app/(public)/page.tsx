/**
 * Landing页面 - 首页
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative z-[1]" style={{background: '#FAF8F5'}}>
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        background: 'linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px), linear-gradient(rgba(0,0,0,0.02) 1px,transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px] relative z-[10]">
        <div className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer relative">
          ScholarBridge
          <span className="text-[#6B6B6B] text-xs font-family-body ml-2.5 opacity-50 font-normal">/ AI-Powered Research Matching</span>
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease font-family-body hover:border-[#2C5F7C] hover:text-[#2C5F7C]">
            Browse Mentors
          </button>
          <Link href="/login">
            <Button variant="gold" size="sm">Mentor Portal</Button>
          </Link>
        </div>
      </nav>

      {/* Hero区域 */}
      <div className="flex-1 flex flex-col items-center justify-center py-24 px-10 relative z-[10]">
        <div className="hero-eyebrow text-xs tracking-[0.15em] uppercase text-[#2C5F7C] mb-6 font-semibold">
          Research Mentorship, Reimagined
        </div>
        <h1 className="font-display text-[56px] leading-[1.15] text-[#1A1A1A] mb-6 max-w-[720px] font-semibold tracking-[-0.02em] text-center">
          Connect with <em style={{color: '#2C5F7C', fontStyle: 'italic'}}>research mentors</em> through intelligent conversation
        </h1>
        <p className="text-[17px] text-[#6B6B6B] max-w-[540px] leading-[1.75] mb-14 text-center font-normal">
          ScholarBridge helps students discover meaningful research opportunities. Each mentor&apos;s work is synthesized into an AI agent that can answer questions, assess fit, and facilitate genuine connections.
        </p>

        {/* 角色选择卡片 */}
        <div className="grid grid-cols-2 gap-6 max-w-[720px] w-full mb-16">
          <Card
            variant="bordered"
            className="p-8 text-left cursor-pointer transition-all duration-300 ease relative overflow-hidden hover:border-[#2C5F7C] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            onClick={() => window.location.href = '/browse'}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,95,124,0.03)_0%,transparent_50%)] pointer-events-none"></div>
            <div className="text-[32px] mb-4">🎓</div>
            <h3 className="font-display text-[20px] text-[#1A1A1A] mb-2.5 font-semibold">I&apos;m a Student</h3>
            <p className="text-[14px] text-[#6B6B6B] leading-[1.65]">
              Discover mentors aligned with your research interests and chat with their AI agents before applying.
            </p>
            <div className="mt-5.5 text-[13px] text-[#2C5F7C] font-semibold flex items-center gap-1.5 tracking-[0.02em]">
              Explore Mentors <span>→</span>
            </div>
          </Card>

          <Card
            variant="bordered"
            className="p-8 text-left cursor-pointer transition-all duration-300 ease relative overflow-hidden hover:border-[#2C5F7C] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            onClick={() => window.location.href = '/login'}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,95,124,0.03)_0%,transparent_50%)] pointer-events-none"></div>
            <div className="text-[32px] mb-4">🔬</div>
            <h3 className="font-display text-[20px] text-[#1A1A1A] mb-2.5 font-semibold">I&apos;m a Researcher</h3>
            <p className="text-[14px] text-[#6B6B6B] leading-[1.65]">
              Connect your Google Scholar profile and let your AI agent handle initial screening and inquiries.
            </p>
            <div className="mt-5.5 text-[13px] text-[#2C5F7C] font-semibold flex items-center gap-1.5 tracking-[0.02em]">
              Set Up Your Agent <span>→</span>
            </div>
          </Card>
        </div>

        {/* 特性展示 */}
        <div className="grid grid-cols-3 gap-6 max-w-[800px] w-full pb-20">
          <Card variant="bordered" className="p-6 text-center transition-all duration-300 ease hover:border-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-[rgba(44,95,124,0.08)] mx-auto mb-3.5 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#2C5F7C" strokeWidth="1.5"/>
                <path d="M8 5v4l2.5 1.5" stroke="#2C5F7C" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h4 className="text-[15px] text-[#1A1A1A] mb-2 font-semibold font-family-body">Auto-Profile Analysis</h4>
            <p className="text-[13px] text-[#6B6B6B] leading-[1.6]">
              AI reads your publications and distills your research identity into a living agent.
            </p>
          </Card>

          <Card variant="bordered" className="p-6 text-center transition-all duration-300 ease hover:border-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-[rgba(44,95,124,0.08)] mx-auto mb-3.5 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M8 3l5 5-5 5" stroke="#2C5F7C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4 className="text-[15px] text-[#1A1A1A] mb-2 font-semibold font-family-body">Intelligent Screening</h4>
            <p className="text-[13px] text-[#6B6B6B] leading-[1.6]">
              Your agent handles initial conversations, saving you hours of repetitive correspondence.
            </p>
          </Card>

          <Card variant="bordered" className="p-6 text-center transition-all duration-300 ease hover:border-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-[rgba(44,95,124,0.08)] mx-auto mb-3.5 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="#2C5F7C" strokeWidth="1.5"/>
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="#2C5F7C" strokeWidth="1.5"/>
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="#2C5F7C" strokeWidth="1.5"/>
                <rect x="9" y="9" width="5" height="5" rx="1" stroke="#2C5F7C" strokeWidth="1.5"/>
              </svg>
            </div>
            <h4 className="text-[15px] text-[#1A1A1A] mb-2 font-semibold font-family-body">Project Listings</h4>
            <p className="text-[13px] text-[#6B6B6B] leading-[1.6]">
              Post open positions and past research so students can find the perfect fit.
            </p>
          </Card>
        </div>
      </div>

      {/* 自定义样式 */}
      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
        .font-family-body {
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
    </div>
  );
}
