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
  applicationCount: number;
  applications: ProjectApplication[];
}

interface ProjectApplication {
  id: string;
  status: string;
  coverLetter?: string | null;
  mentorFeedback?: string | null;
  createdAt: string;
  student: {
    id: string;
    email: string;
    displayName: string;
    education?: string | null;
    bioShort?: string | null;
    interests?: string[] | null;
    skills?: string[] | null;
    resumeFileName?: string | null;
    resumeSize?: number | null;
    resumeUploadedAt?: string | null;
  };
}

export default function MentorProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);

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
    } catch {
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
          p.id === project.id ? { ...p, status: newStatus } : p
        ));
      }
    } catch {
      alert('更新失败');
    }
  };

  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) || null
    : null;

  const activeApplications = selectedProject
    ? selectedProject.applications.filter((application) => application.status !== 'WITHDRAWN')
    : [];
  const selectedApplication = selectedProject && selectedApplicationId
    ? selectedProject.applications.find((application) => application.id === selectedApplicationId) || null
    : null;

  const getApplicationStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'accepted': return '已接受';
      case 'rejected': return '已拒绝';
      case 'WITHDRAWN': return '已撤回';
      default: return status;
    }
  };

  const getApplicationStatusClassName = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'accepted': return 'border-green-200 bg-green-50 text-green-800';
      case 'rejected': return 'border-red-200 bg-red-50 text-red-800';
      case 'WITHDRAWN': return 'border-[#E0D8CC] bg-[#F5F2ED] text-[#6B6B6B]';
      default: return 'border-[#E0D8CC] bg-[#F5F2ED] text-[#1A1A1A]';
    }
  };

  const formatDate = (dateValue: string) => new Date(dateValue).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formatFileSize = (size?: number | null) => {
    if (!size) {
      return '';
    }

    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const openApplicationResume = (applicationId: string) => {
    window.open(`/api/applications/${applicationId}/resume`, '_blank', 'noopener,noreferrer');
  };

  const updateApplication = async (
    application: ProjectApplication,
    status: 'pending' | 'accepted' | 'rejected',
    mentorFeedback: string | null
  ) => {
    setUpdatingApplicationId(application.id);
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(mentorFeedback !== null && { mentorFeedback }),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || '更新申请失败');
        return;
      }

      setProjects((currentProjects) => currentProjects.map((project) => {
        const existingApplication = project.applications.find((item) => item.id === application.id);
        if (!existingApplication) {
          return project;
        }

        const wasAccepted = existingApplication.status === 'accepted';
        const willAccept = status === 'accepted';
        const enrolledDelta = !wasAccepted && willAccept ? 1 : wasAccepted && !willAccept ? -1 : 0;

        return {
          ...project,
          enrolled: Math.max(0, project.enrolled + enrolledDelta),
          applications: project.applications.map((item) =>
            item.id === application.id ? { ...item, status, mentorFeedback } : item
          ),
        };
      }));
    } catch {
      alert('更新申请失败');
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const handleApplicationDecision = async (application: ProjectApplication, status: 'accepted' | 'rejected') => {
    const nextStatus = application.status === status ? 'pending' : status;
    await updateApplication(application, nextStatus, application.mentorFeedback || null);
  };

  const handleEditFeedback = async (application: ProjectApplication) => {
    if (application.status !== 'accepted' && application.status !== 'rejected') {
      alert('请先同意或拒绝该申请，再填写反馈。');
      return;
    }

    const feedback = window.prompt('填写给学生的反馈（可留空）：', application.mentorFeedback || '');
    if (feedback === null) {
      return;
    }

    await updateApplication(application, application.status as 'accepted' | 'rejected', feedback.trim() || null);
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
                      <span>📝 {project.applicationCount} 个申请</span>
                      {project.location && <span>📍 {project.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className="px-4 py-2 border border-[#E0D8CC] rounded-lg bg-white hover:border-[#2C5F7C] hover:text-[#2C5F7C] transition-all text-sm text-[#1A1A1A]"
                    >
                      查看申请
                    </button>
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

      {selectedProject && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-4 py-8"
          role="presentation"
          onClick={() => setSelectedProjectId(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="applications-title"
            className="max-h-[calc(100vh-64px)] w-full max-w-[820px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#2C5F7C]">Applications</p>
                  <h3 id="applications-title" className="font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A]">
                    {selectedProject.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#1A1A1A]">
                    {activeApplications.length} 个有效申请 · {selectedProject.applications.length} 个历史记录
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close applications"
                  className="shrink-0 rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                  onClick={() => {
                    setSelectedProjectId(null);
                    setSelectedApplicationId(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-5">
              {selectedProject.applications.length === 0 ? (
                <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-8 text-center">
                  <p className="text-sm font-semibold text-[#1A1A1A]">暂无申请</p>
                  <p className="mt-2 text-sm text-[#1A1A1A]">学生提交申请后会显示在这里。</p>
                </div>
              ) : (
                selectedProject.applications.map((application) => (
                  <article key={application.id} className="rounded border border-[#E0D8CC] bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="text-[16px] font-semibold text-[#1A1A1A]">{application.student.displayName}</h4>
                        <p className="mt-1 text-sm text-[#1A1A1A]">{application.student.email}</p>
                        {application.student.education && (
                          <p className="mt-1 text-sm text-[#1A1A1A]">{application.student.education}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <span className={`rounded border px-3 py-1 text-xs font-semibold ${getApplicationStatusClassName(application.status)}`}>
                          {getApplicationStatusText(application.status)}
                        </span>
                        <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-1 text-xs font-semibold text-[#1A1A1A]">
                          {formatDate(application.createdAt)}
                        </span>
                      </div>
                    </div>

                    {application.coverLetter && (
                      <div className="mt-4 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-3 text-sm leading-6 text-[#1A1A1A]">
                        {application.coverLetter}
                      </div>
                    )}

                    {application.mentorFeedback && (
                      <div className="mt-4 rounded border border-[#E0D8CC] bg-[#EBF3F8] p-3 text-sm leading-6 text-[#1A1A1A]">
                        <p className="mb-1 font-semibold">导师反馈</p>
                        {application.mentorFeedback}
                      </div>
                    )}

                    {application.student.bioShort && (
                      <p className="mt-4 text-sm leading-6 text-[#1A1A1A]">{application.student.bioShort}</p>
                    )}

                    <div className="mt-4 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-3 text-sm text-[#1A1A1A]">
                      <p className="font-semibold">PDF 简历</p>
                      {application.student.resumeFileName ? (
                        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <span>
                            {application.student.resumeFileName}
                            {application.student.resumeSize ? ` · ${formatFileSize(application.student.resumeSize)}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => openApplicationResume(application.id)}
                            className="rounded border border-[#2C5F7C] bg-white px-4 py-2 text-sm font-semibold text-[#2C5F7C] transition-all hover:bg-[#EBF3F8]"
                          >
                            查看简历
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2">学生暂未上传简历</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(application.student.interests || []).slice(0, 4).map((interest) => (
                        <span key={interest} className="rounded bg-[#F5F2ED] px-2 py-1 text-xs text-[#1A1A1A]">
                          {interest}
                        </span>
                      ))}
                      {(application.student.skills || []).slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded bg-[#EBF3F8] px-2 py-1 text-xs text-[#1A1A1A]">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E0D8CC] pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedApplicationId(application.id)}
                        className="rounded border border-[#E0D8CC] bg-white px-4 py-2 text-sm text-[#1A1A1A] transition-all hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                      >
                        查看学生详情
                      </button>
                      {application.status !== 'WITHDRAWN' && (
                        <>
                          {(application.status === 'accepted' || application.status === 'rejected') && (
                            <button
                              type="button"
                              disabled={updatingApplicationId === application.id}
                              onClick={() => handleEditFeedback(application)}
                              className="rounded border border-[#E0D8CC] bg-white px-4 py-2 text-sm text-[#1A1A1A] transition-all hover:border-[#2C5F7C] hover:text-[#2C5F7C] disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
                            >
                              {application.mentorFeedback ? '编辑反馈' : '填写反馈'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={updatingApplicationId === application.id}
                            onClick={() => handleApplicationDecision(application, 'accepted')}
                            className="rounded border border-green-200 bg-white px-4 py-2 text-sm text-green-800 transition-all hover:border-green-400 hover:bg-green-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
                          >
                            {updatingApplicationId === application.id ? '处理中...' : application.status === 'accepted' ? '撤销同意' : '同意'}
                          </button>
                          <button
                            type="button"
                            disabled={updatingApplicationId === application.id}
                            onClick={() => handleApplicationDecision(application, 'rejected')}
                            className="rounded border border-red-200 bg-white px-4 py-2 text-sm text-red-700 transition-all hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
                          >
                            {updatingApplicationId === application.id ? '处理中...' : application.status === 'rejected' ? '撤销拒绝' : '拒绝'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {selectedApplication && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-[rgba(26,26,26,0.38)] px-4 py-8"
          role="presentation"
          onClick={() => setSelectedApplicationId(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-detail-title"
            className="max-h-[calc(100vh-64px)] w-full max-w-[680px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#2C5F7C]">Student profile</p>
                  <h3 id="student-detail-title" className="font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A]">
                    {selectedApplication.student.displayName}
                  </h3>
                  <p className="mt-2 text-sm text-[#1A1A1A]">{selectedApplication.student.email}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close student details"
                  className="shrink-0 rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                  onClick={() => setSelectedApplicationId(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 text-sm leading-6 text-[#1A1A1A]">
              <div className="grid gap-2 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <p><span className="font-semibold">申请状态：</span>{getApplicationStatusText(selectedApplication.status)}</p>
                <p><span className="font-semibold">申请时间：</span>{formatDate(selectedApplication.createdAt)}</p>
                {selectedApplication.student.education && (
                  <p><span className="font-semibold">教育背景：</span>{selectedApplication.student.education}</p>
                )}
              </div>

              <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <p className="mb-2 font-semibold">PDF 简历</p>
                {selectedApplication.student.resumeFileName ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p>{selectedApplication.student.resumeFileName}</p>
                      <p className="mt-1 text-xs text-[#4A4A4A]">
                        {selectedApplication.student.resumeSize ? formatFileSize(selectedApplication.student.resumeSize) : '文件大小未知'}
                        {selectedApplication.student.resumeUploadedAt ? ` · 上传于 ${formatDate(selectedApplication.student.resumeUploadedAt)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openApplicationResume(selectedApplication.id)}
                      className="rounded border border-[#2C5F7C] bg-white px-4 py-2 text-sm font-semibold text-[#2C5F7C] transition-all hover:bg-[#EBF3F8]"
                    >
                      查看简历内容
                    </button>
                  </div>
                ) : (
                  <p>学生暂未上传简历</p>
                )}
              </div>

              {selectedApplication.student.bioShort && (
                <div>
                  <p className="mb-2 font-semibold">学生简介</p>
                  <p>{selectedApplication.student.bioShort}</p>
                </div>
              )}

              {selectedApplication.coverLetter && (
                <div>
                  <p className="mb-2 font-semibold">申请说明</p>
                  <div className="rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                    {selectedApplication.coverLetter}
                  </div>
                </div>
              )}

              {selectedApplication.mentorFeedback && (
                <div>
                  <p className="mb-2 font-semibold">导师反馈</p>
                  <div className="rounded border border-[#E0D8CC] bg-[#EBF3F8] p-4">
                    {selectedApplication.mentorFeedback}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 font-semibold">研究兴趣</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApplication.student.interests || []).length > 0 ? (
                      (selectedApplication.student.interests || []).map((interest) => (
                        <span key={interest} className="rounded bg-[#F5F2ED] px-2 py-1 text-xs text-[#1A1A1A]">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#1A1A1A]">未填写</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-semibold">技能</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApplication.student.skills || []).length > 0 ? (
                      (selectedApplication.student.skills || []).map((skill) => (
                        <span key={skill} className="rounded bg-[#EBF3F8] px-2 py-1 text-xs text-[#1A1A1A]">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#1A1A1A]">未填写</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedApplication.status !== 'WITHDRAWN' && (
                <div className="flex flex-wrap gap-2 border-t border-[#E0D8CC] pt-5">
                  {(selectedApplication.status === 'accepted' || selectedApplication.status === 'rejected') && (
                    <button
                      type="button"
                      disabled={updatingApplicationId === selectedApplication.id}
                      onClick={() => handleEditFeedback(selectedApplication)}
                      className="rounded border border-[#E0D8CC] bg-white px-4 py-2 text-sm text-[#1A1A1A] transition-all hover:border-[#2C5F7C] hover:text-[#2C5F7C] disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
                    >
                      {selectedApplication.mentorFeedback ? '编辑反馈' : '填写反馈'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={updatingApplicationId === selectedApplication.id}
                    onClick={() => handleApplicationDecision(selectedApplication, 'accepted')}
                    className="rounded border border-green-200 bg-white px-4 py-2 text-sm text-green-800 transition-all hover:border-green-400 hover:bg-green-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
                  >
                    {updatingApplicationId === selectedApplication.id ? '处理中...' : selectedApplication.status === 'accepted' ? '撤销同意' : '同意申请'}
                  </button>
                  <button
                    type="button"
                    disabled={updatingApplicationId === selectedApplication.id}
                    onClick={() => handleApplicationDecision(selectedApplication, 'rejected')}
                    className="rounded border border-red-200 bg-white px-4 py-2 text-sm text-red-700 transition-all hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B]"
                  >
                    {updatingApplicationId === selectedApplication.id ? '处理中...' : selectedApplication.status === 'rejected' ? '撤销拒绝' : '拒绝申请'}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}
