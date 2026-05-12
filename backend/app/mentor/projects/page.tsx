/**
 * 导师项目管理页面
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  researchArea: string;
  startTime: string;
  endTime?: string;
  location?: string;
  requirements?: string;
  capacity: number;
  enrolled: number;
  status: 'OPEN' | 'CLOSED' | 'COMPLETED';
  createdAt: string;
}

export default function MentorProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
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

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/mentor/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        alert('删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleToggleStatus = async (project: Project) => {
    const newStatus = project.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setProjects(projects.map(p =>
          p.id === project.id ? { ...p, status: newStatus as any } : p
        ));
      }
    } catch (error) {
      alert('更新失败');
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
          onClick={() => window.location.href = '/mentor'}
        >
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => window.location.href = '/mentor'}>Dashboard</button>
          <button className="bg-[#2C5F7C] text-white border border-[#2C5F7C] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease">Projects</button>
          <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-7xl mx-auto">
        {/* 标题和新建按钮 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.08em] uppercase text-[#2C5F7C] mb-2 font-semibold">Mentor Portal</p>
            <h2 className="font-display text-[32px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">
              我的项目
            </h2>
            <p className="text-[#1A1A1A] mt-2">管理您发布的研究项目</p>
          </div>
          <Link href="/mentor/projects/new">
            <button className="bg-[#2C5F7C] text-white border border-[#2C5F7C] px-6 py-3 rounded-lg hover:bg-[#1a4a5f] hover:border-[#1a4a5f] transition-colors font-medium">
              + 新建项目
            </button>
          </Link>
        </div>

        {/* 项目列表 */}
        {projects.length === 0 ? (
          <div className="bg-white border border-[#E0D8CC] rounded-[10px] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6B6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#1A1A1A] text-lg font-medium mb-2">还没有项目</p>
            <p className="text-[#1A1A1A] mb-6">创建您的第一个研究项目吧</p>
            <Link href="/mentor/projects/new">
              <button className="bg-[#2C5F7C] text-white border border-[#2C5F7C] px-6 py-3 rounded-lg hover:bg-[#1a4a5f] hover:border-[#1a4a5f] transition-colors font-medium">
                + 新建项目
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-[#E0D8CC] rounded-[10px] p-6 hover:border-[#2C5F7C] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-[#1A1A1A]">{project.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'OPEN'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'CLOSED'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {project.status === 'OPEN' ? '招募中' : project.status === 'CLOSED' ? '已关闭' : '已完成'}
                      </span>
                    </div>
                    <p className="text-[#1A1A1A] mb-4 line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-[#1A1A1A]">
                      <span>🔬 {project.researchArea}</span>
                      <span>📅 {project.startTime} - {project.endTime || '进行中'}</span>
                      <span>👥 {project.enrolled}/{project.capacity} 人</span>
                      {project.location && <span>📍 {project.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/mentor/projects/${project.id}`}>
                      <button className="px-4 py-2 border border-[#E0D8CC] rounded-lg bg-white hover:border-[#2C5F7C] hover:text-[#2C5F7C] transition-all text-sm text-[#1A1A1A]">
                        编辑
                      </button>
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(project)}
                      className="px-4 py-2 border border-[#E0D8CC] rounded-lg bg-white hover:border-[#2C5F7C] hover:text-[#2C5F7C] transition-all text-sm text-[#1A1A1A]"
                    >
                      {project.status === 'OPEN' ? '关闭' : '开启'}
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="px-4 py-2 border border-red-200 bg-white text-red-700 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all text-sm"
                    >
                      删除
                    </button>
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
      `}</style>
    </div>
  );
}
