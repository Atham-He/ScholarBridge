/**
 * 导师工作台 - 极简版
 * 功能：基础信息编辑 + 项目统计
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface MentorProfile {
  displayName: string;
  institution: string;
  department?: string;
  title?: string;
  bioShort?: string;
  location?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  researchAreas?: string[];
}

interface ProjectStats {
  total: number;
  open: number;
  closed: number;
  totalEnrolled: number;
}

export default function MentorDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/mentor/profile'),
        fetch('/api/mentor/stats'),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showMessage('error', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetch('/api/mentor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      showMessage('success', '保存成功');
    } catch (error) {
      showMessage('error', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: keyof MentorProfile, value: any) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

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

  return (
    <div className="min-h-screen bg-[#FAF8F5] overflow-y-auto">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px] sticky top-0 z-50">
        <div
          className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="nav-btn active text-[#1A1A1A]">Dashboard</button>
          <button className="nav-btn text-[#1A1A1A]" onClick={() => window.location.href = '/mentor/projects'}>Projects</button>
          <button className="nav-btn text-[#1A1A1A]" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <p className="text-xs tracking-[0.08em] uppercase text-[#2C5F7C] mb-2 font-semibold">Mentor Portal</p>
          <h2 className="font-display text-[32px] mb-2 font-semibold text-[#1A1A1A] tracking-[-0.02em]">
            Welcome, {profile?.displayName || 'Mentor'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基础信息编辑 */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-6">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-6">基础信息</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">姓名</label>
                    <input
                      type="text"
                      value={profile?.displayName || ''}
                      onChange={(e) => updateProfile('displayName', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">学校</label>
                    <input
                      type="text"
                      value={profile?.institution || ''}
                      onChange={(e) => updateProfile('institution', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">院系</label>
                    <input
                      type="text"
                      value={profile?.department || ''}
                      onChange={(e) => updateProfile('department', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">职称</label>
                    <input
                      type="text"
                      value={profile?.title || ''}
                      onChange={(e) => updateProfile('title', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">联系电话</label>
                    <input
                      type="text"
                      value={profile?.phone || ''}
                      onChange={(e) => updateProfile('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-1">联系邮箱</label>
                    <input
                      type="email"
                      value={profile?.contactEmail || ''}
                      onChange={(e) => updateProfile('contactEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">个人网站</label>
                  <input
                    type="url"
                    value={profile?.website || ''}
                    onChange={(e) => updateProfile('website', e.target.value)}
                    className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">简介</label>
                  <textarea
                    value={profile?.bioShort || ''}
                    onChange={(e) => updateProfile('bioShort', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">研究方向（用逗号分隔）</label>
                  <input
                    type="text"
                    value={profile?.researchAreas?.join(', ') || ''}
                    onChange={(e) => updateProfile('researchAreas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    placeholder="例如：Machine Learning, Computer Vision, NLP"
                  />
                </div>

                {message && (
                  <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="gold"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存更改'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：项目统计 */}
          <div>
            <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-6 mb-6">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">项目统计</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#1A1A1A]">总项目数</span>
                  <span className="text-[24px] font-bold text-[#1A1A1A]">{stats?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1A1A1A]">招募中</span>
                  <span className="text-[24px] font-bold text-green-600">{stats?.open || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1A1A1A]">已招学生</span>
                  <span className="text-[24px] font-bold text-[#2C5F7C]">{stats?.totalEnrolled || 0}</span>
                </div>
              </div>

              <Button
                variant="gold"
                className="w-full mt-6"
                onClick={() => window.location.href = '/mentor/projects'}
              >
                管理项目
              </Button>
            </div>

            <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-6">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">快捷操作</h3>
              <div className="space-y-3">
                <button
                  className="w-full text-left px-4 py-3 border border-[#E0D8CC] rounded-lg hover:border-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)] transition-all"
                  onClick={() => window.location.href = '/mentor/projects/new'}
                >
                  <div className="font-medium text-[#1A1A1A]">+ 新建项目</div>
                  <div className="text-sm text-[#1A1A1A]">发布新的研究项目</div>
                </button>
                <button
                  className="w-full text-left px-4 py-3 border border-[#E0D8CC] rounded-lg hover:border-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)] transition-all"
                  onClick={() => window.location.href = '/browse'}
                >
                  <div className="font-medium text-[#1A1A1A]">浏览导师</div>
                  <div className="text-sm text-[#1A1A1A]">查看其他导师</div>
                </button>
              </div>
            </div>
          </div>
        </div>
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
