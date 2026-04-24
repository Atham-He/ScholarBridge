/**
 * 导师工作台 - ScholarBridge 设计风格
 *
 * 包含：指标卡片、申请列表、快捷操作
 */

'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface DashboardMetrics {
  pendingApplications: number;
  conversationsThisWeek: number;
  openPositions: number;
  avgAiScorePercent: number | null;
}

interface Skill {
  id: string;
  slug: string;
  title: string;
  openPositions: number;
  agentActive: boolean;
}

interface Application {
  id: string;
  status: string;
  statusLabelZh: string;
  aiScore: number | null;
  matchScorePercent: number | null;
  aiFlagNotify: boolean;
  lastMessageAt: string | null;
  skill: { slug: string; title: string };
  studentName: string;
  studentBackground: string | null;
  conversationId: string | null;
}

export default function MentorDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [metricsRes, appsRes] = await Promise.all([
        fetch('/api/mentor/dashboard'),
        fetch('/api/mentor/applications'),
      ]);

      const metricsData = await metricsRes.json();
      const appsData = await appsRes.json();

      if (metricsData.metrics) setMetrics(metricsData.metrics);
      if (metricsData.skills) setSkills(metricsData.skills);
      if (appsData.applications) setApplications(appsData.applications);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): 'gold' | 'blue' | 'green' | 'red' => {
    switch (status) {
      case 'CHATTING': return 'gold';
      case 'UNDER_REVIEW': return 'blue';
      case 'INTERVIEW_SCHEDULED': return 'green';
      case 'ACCEPTED': return 'green';
      case 'REJECTED': return 'red';
      case 'WITHDRAWN': return 'red';
      default: return 'gold';
    }
  };

  const formatLastMessage = (dateStr: string | null): string => {
    if (!dateStr) return '暂无消息';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2C5F7C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#6B6B6B]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px] sticky top-0 z-50">
        <div
          className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn active">Dashboard</button>
          <button className="nav-btn" onClick={() => window.location.href = '/mentor/skills/new'}>My Skills</button>
          <Button variant="gold" size="sm" onClick={() => window.location.href = '/'}>View Site</Button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-7xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8">
          <p className="text-xs tracking-[0.08em] uppercase text-[#2C5F7C] mb-2 font-semibold">Mentor Portal</p>
          <h2 className="font-display text-[32px] mb-2 font-semibold text-[#1A1A1A] tracking-[-0.02em]">
            Welcome Back, Mentor
          </h2>
          <p className="text-[14px] text-[#6B6B6B]">
            Manage your research skills, review student applications, and track conversations.
          </p>
        </div>

        {/* 指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* 待处理申请 */}
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-5 hover:border-[#2C5F7C] transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#EBF3F8] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2C5F7C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <Badge variant={metrics?.pendingApplications && metrics.pendingApplications > 0 ? 'gold' : 'blue'}>
                {metrics?.pendingApplications && metrics.pendingApplications > 0 ? 'Action Needed' : 'On Track'}
              </Badge>
            </div>
            <p className="text-[28px] font-bold text-[#1A1A1A] mb-1">{metrics?.pendingApplications ?? 0}</p>
            <p className="text-[13px] text-[#6B6B6B]">Pending Applications</p>
          </div>

          {/* 本周对话 */}
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-5 hover:border-[#2C5F7C] transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2D7A4F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <p className="text-[28px] font-bold text-[#1A1A1A] mb-1">{metrics?.conversationsThisWeek ?? 0}</p>
            <p className="text-[13px] text-[#6B6B6B]">Conversations This Week</p>
          </div>

          {/* 开放职位 */}
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-5 hover:border-[#2C5F7C] transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#F5EDE0] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#8B6914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              {skills.length > 0 && (
                <Badge variant={skills.some(s => s.openPositions > 0) ? 'gold' : 'blue'}>
                  {skills.filter(s => s.openPositions > 0).length} Active
                </Badge>
              )}
            </div>
            <p className="text-[28px] font-bold text-[#1A1A1A] mb-1">{metrics?.openPositions ?? 0}</p>
            <p className="text-[13px] text-[#6B6B6B]">Open Positions</p>
          </div>

          {/* 平均匹配分 */}
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-5 hover:border-[#2C5F7C] transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#EBF3F8] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2C5F7C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <p className="text-[28px] font-bold text-[#1A1A1A] mb-1">
              {metrics?.avgAiScorePercent != null ? `${metrics.avgAiScorePercent}%` : '—'}
            </p>
            <p className="text-[13px] text-[#6B6B6B]">Avg. AI Match Score</p>
          </div>
        </div>

        {/* 快捷操作和我的技能 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* 快捷操作 */}
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-5">
            <h3 className="text-[16px] font-semibold text-[#1A1A1A] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#E0D8CC] hover:border-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)] transition-all duration-200 text-left"
                onClick={() => window.location.href = '/mentor/skills/new'}
              >
                <div className="w-9 h-9 rounded-lg bg-[#EBF3F8] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#2C5F7C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#1A1A1A]">Create New Skill</p>
                  <p className="text-[12px] text-[#6B6B6B]">Add a research area</p>
                </div>
              </button>

              <button
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#E0D8CC] hover:border-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)] transition-all duration-200 text-left"
                onClick={() => window.location.href = '/browse'}
              >
                <div className="w-9 h-9 rounded-lg bg-[#E8F5EE] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#2D7A4F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#1A1A1A]">Browse Mentors</p>
                  <p className="text-[12px] text-[#6B6B6B]">Explore other mentors</p>
                </div>
              </button>

              <button
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#E0D8CC] hover:border-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)] transition-all duration-200 text-left"
                onClick={() => window.location.href = '/mentor'}
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5EDE0] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#8B6914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#1A1A1A]">View Analytics</p>
                  <p className="text-[12px] text-[#6B6B6B]">Track performance</p>
                </div>
              </button>
            </div>
          </div>

          {/* 我的技能列表 */}
          <div className="lg:col-span-2 bg-white border border-[#E0D8CC] rounded-[10px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[#1A1A1A]">My Skills</h3>
              <button
                className="text-[13px] text-[#2C5F7C] hover:underline font-medium"
                onClick={() => window.location.href = '/mentor/skills/new'}
              >
                + New Skill
              </button>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#6B6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <p className="text-[14px] text-[#6B6B6B] mb-3">No skills created yet</p>
                <Button variant="gold" size="sm" onClick={() => window.location.href = '/mentor/skills/new'}>
                  Create Your First Skill
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {skills.map(skill => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#E0D8CC] hover:border-[#2C5F7C] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#EBF3F8] flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#2C5F7C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#1A1A1A]">{skill.title}</p>
                        <p className="text-[12px] text-[#6B6B6B]">
                          {skill.openPositions} open position{skill.openPositions !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {skill.agentActive && <Badge variant="green" dot>Agent Active</Badge>}
                      <button
                        className="text-[12px] py-2 px-3 rounded border border-[#E0D8CC] bg-transparent text-[#6B6B6B] font-medium transition-all duration-200 hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                        onClick={() => window.location.href = `/s/${skill.slug}`}
                      >
                        View →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 申请列表 */}
        <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[16px] font-semibold text-[#1A1A1A]">Recent Applications</h3>
            <span className="text-[13px] text-[#6B6B6B]">{applications.length} total</span>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#6B6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-[14px] text-[#6B6B6B] mb-3">No applications yet</p>
              <p className="text-[12px] text-[#6B6B6B]">Share your skill links with students to receive applications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 10).map(app => (
                <div
                  key={app.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-[#E0D8CC] hover:border-[#2C5F7C] transition-all duration-200"
                >
                  <Avatar name={app.studentName} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[14px] font-semibold text-[#1A1A1A] truncate">{app.studentName}</p>
                      {app.aiFlagNotify && (
                        <Badge variant="gold" dot>Priority</Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6B6B6B] truncate">
                      {app.studentBackground || `${app.skill.title} · ${app.statusLabelZh}`}
                    </p>
                  </div>

                  <div className="hidden md:block text-right">
                    <p className="text-[13px] font-medium text-[#1A1A1A]">{app.skill.title}</p>
                    <p className="text-[11px] text-[#6B6B6B]">{formatLastMessage(app.lastMessageAt)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusVariant(app.status)}>
                      {app.statusLabelZh}
                    </Badge>

                    {app.matchScorePercent != null && (
                      <div className="text-right">
                        <p className="text-[12px] font-medium text-[#1A1A1A]">{app.matchScorePercent}%</p>
                        <p className="text-[10px] text-[#6B6B6B]">match</p>
                      </div>
                    )}

                    {app.conversationId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/c/${app.conversationId}`}
                      >
                        Chat
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {applications.length > 10 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/mentor/applications'}>
                View All Applications →
              </Button>
            </div>
          )}
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
        .nav-btn {
          @apply bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease font-family-body hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)];
        }
        .nav-btn.active {
          @apply bg-[#2C5F7C] text-white border-[#2C5F7C];
        }
      `}</style>
    </div>
  );
}
