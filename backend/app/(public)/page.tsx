/**
 * 首页 - 角色选择
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface User {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.user) {
          setUser(data.user);
          if (data.user.role === 'MENTOR') {
            router.push('/mentor');
          } else if (data.user.role === 'STUDENT') {
            router.push('/browse');
          }
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2C5F7C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#1A1A1A]">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col relative z-[1]" style={{background: '#FAF8F5'}}>
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        background: 'linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px), linear-gradient(rgba(0,0,0,0.02) 1px,transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px] relative z-[10]">
        <div className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <Link href="/login">
            <Button variant="gold" size="sm">登录</Button>
          </Link>
        </div>
      </nav>

      {/* Hero区域 */}
      <div className="flex-1 flex flex-col items-center justify-center py-24 px-10 relative z-[10]">
        <div className="hero-eyebrow text-xs tracking-[0.15em] uppercase text-[#2C5F7C] mb-6 font-semibold">
          研究生与导师的桥梁
        </div>
        <h1 className="font-display text-[56px] leading-[1.15] text-[#1A1A1A] mb-6 max-w-[720px] font-semibold tracking-[-0.02em] text-center">
          连接<span style={{color: '#2C5F7C', fontStyle: 'italic'}}>研究机会</span>，开启学术之旅
        </h1>
        <p className="text-[17px] text-[#1A1A1A] max-w-[540px] leading-[1.75] mb-16 text-center font-normal">
          ScholarBridge 帮助学生发现研究机会，帮助导师找到合适的研究助理
        </p>

        {/* 角色选择卡片 */}
        <div className="grid grid-cols-2 gap-6 max-w-[720px] w-full">
          <Card
            variant="bordered"
            className="p-8 text-center cursor-pointer transition-all duration-300 ease relative overflow-hidden hover:border-[#2C5F7C] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            onClick={() => window.location.href = '/browse'}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,95,124,0.03)_0%,transparent_50%)] pointer-events-none"></div>
            <div className="text-[48px] mb-4">🎓</div>
            <h3 className="font-display text-[24px] text-[#1A1A1A] mb-3 font-semibold">我是学生</h3>
            <p className="text-[14px] text-[#1A1A1A] leading-[1.65] mb-4">
              浏览导师信息，查看研究项目，申请心仪的研究机会
            </p>
            <div className="text-[13px] text-[#2C5F7C] font-semibold">
              开始探索 →
            </div>
          </Card>

          <Card
            variant="bordered"
            className="p-8 text-center cursor-pointer transition-all duration-300 ease relative overflow-hidden hover:border-[#2C5F7C] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            onClick={() => window.location.href = '/login?role=MENTOR'}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,95,124,0.03)_0%,transparent_50%)] pointer-events-none"></div>
            <div className="text-[48px] mb-4">👨‍🏫</div>
            <h3 className="font-display text-[24px] text-[#1A1A1A] mb-3 font-semibold">我是导师</h3>
            <p className="text-[14px] text-[#1A1A1A] leading-[1.65] mb-4">
              发布研究项目，管理申请，与优秀学生建立联系
            </p>
            <div className="text-[13px] text-[#2C5F7C] font-semibold">
              进入导师端 →
            </div>
          </Card>
        </div>
      </div>

      {/* 自定义样式 */}
      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}
