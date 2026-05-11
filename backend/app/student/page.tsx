/**
 * 学生申请管理页面
 */

'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WithdrawButton } from "@/app/student/withdraw-button";
import { Button } from "@/components/ui/Button";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/student/applications');
      if (response.ok) {
        const data = await response.json();
        setApps(data.apps || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "待审核";
      case "accepted": return "已接受";
      case "rejected": return "已拒绝";
      case "WITHDRAWN": return "已撤回";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "WITHDRAWN": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2C5F7C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#1A1A1A]">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] overflow-y-auto">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px]">
        <div
          className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer"
          onClick={() => router.push('/')}
        >
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn text-[#1A1A1A]" onClick={() => router.push('/browse')}>Browse</button>
          <Button variant="gold" size="sm" onClick={handleLogout}>Sign Out</Button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <p className="text-xs tracking-[0.08em] uppercase text-[#2C5F7C] mb-2 font-semibold">Student Portal</p>
          <h2 className="font-display text-[32px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">
            我的申请
          </h2>
          <p className="text-[#1A1A1A] mt-2">管理你的项目申请；可随时撤回申请</p>
        </div>

        {/* 申请列表 */}
        {apps.length === 0 ? (
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#1A1A1A] text-lg font-medium mb-2">还没有申请任何项目</p>
            <p className="text-[#1A1A1A] mb-6">去浏览导师，找到你感兴趣的研究机会</p>
            <Link href="/browse">
              <button className="bg-[#2C5F7C] text-white px-6 py-3 rounded-lg hover:bg-[#1a4a5f] transition-colors font-medium">
                浏览导师
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-[#E0D8CC] rounded-[10px] p-6 hover:border-[#2C5F7C] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-[#1A1A1A]">{app.project.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusText(app.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-[#1A1A1A] text-sm">
                        <span className="font-medium">导师：</span>
                        {app.mentor.mentorProfile?.displayName ?? app.mentor.email}
                      </p>
                      <p className="text-[#1A1A1A] text-sm">
                        <span className="font-medium">学校：</span>
                        {app.mentor.mentorProfile?.institution ?? '未知'}
                      </p>
                      <p className="text-[#1A1A1A] text-sm">
                        <span className="font-medium">研究方向：</span>
                        {app.project.researchArea}
                      </p>
                      <p className="text-[#1A1A1A] text-sm">
                        <span className="font-medium">申请时间：</span>
                        {new Date(app.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {app.status !== "WITHDRAWN" && app.status !== "rejected" && (
                      <WithdrawButton applicationId={app.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
        .nav-btn {
          @apply bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C];
        }
        .nav-btn.active {
          @apply bg-[#2C5F7C] text-white border-[#2C5F7C];
        }
      `}</style>
    </div>
  );
}
