/**
 * 学生个人信息页面
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface StudentProfile {
  displayName: string;
  bioShort?: string;
  interests?: string[];
  education?: string;
  skills?: string[];
}

interface SavedProject {
  id: string;
  project: {
    id: string;
    title: string;
    researchArea: string;
    availableSeats: number;
    mentor: {
      displayName: string;
      institution: string;
    };
  };
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>({
    displayName: '',
    bioShort: '',
    interests: [],
    education: '',
    skills: [],
  });
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 获取学生个人信息
      const profileRes = await fetch('/api/student/profile');
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile || profile);
      } else {
        // 如果未授权，重定向到首页
        router.push('/');
        return;
      }

      // 获取收藏的项目
      const savedRes = await fetch('/api/student/saved-projects');
      if (savedRes.ok) {
        const data = await savedRes.json();
        setSavedProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        alert('保存成功');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
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
          <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => router.push('/browse')}>Browse</button>
          <Button variant="gold" size="sm" onClick={handleLogout}>Sign Out</Button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-display text-[32px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">
            个人中心
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：个人信息 */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-6 mb-6">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-6">基本信息</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">姓名</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">教育背景</label>
                  <input
                    type="text"
                    value={profile.education || ''}
                    onChange={(e) => setProfile({...profile, education: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    placeholder="例如：北京大学 · 计算机科学 · 本科三年级"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">个人简介</label>
                  <textarea
                    value={profile.bioShort || ''}
                    onChange={(e) => setProfile({...profile, bioShort: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    placeholder="简单介绍一下自己的研究兴趣和经历..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    研究兴趣（用逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={profile.interests?.join(', ') || ''}
                    onChange={(e) => setProfile({...profile, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                    className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    placeholder="例如：机器学习, 计算机视觉, 自然语言处理"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    技能（用逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={profile.skills?.join(', ') || ''}
                    onChange={(e) => setProfile({...profile, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                    className="w-full px-4 py-3 border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#2C5F7C] text-[#1A1A1A]"
                    placeholder="例如：Python, PyTorch, 数据分析"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  variant="gold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          </div>

          {/* 右侧：收藏夹 */}
          <div>
            <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-6">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">收藏夹</h3>

              {savedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#1A1A1A] text-sm mb-4">还没有收藏任何项目</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/browse')}
                  >
                    去浏览项目
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedProjects.map((saved) => (
                    <div
                      key={saved.id}
                      className="border border-[#E0D8CC] rounded-lg p-3"
                    >
                      <h4 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{saved.project.title}</h4>
                      <p className="text-[12px] text-[#1A1A1A] mb-2">
                        {saved.project.mentor.displayName} · {saved.project.mentor.institution}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="bg-[#F5F2ED] text-[#1A1A1A] px-2 py-1 rounded">
                          {saved.project.researchArea}
                        </span>
                        <span className="bg-[#F5F2ED] text-[#1A1A1A] px-2 py-1 rounded">
                          {saved.project.availableSeats} seats
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}
