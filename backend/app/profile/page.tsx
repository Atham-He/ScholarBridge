/**
 * 个人中心
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WithdrawButton } from '@/app/withdraw-button';
import { ProfileProjectPanel } from '@/app/profile/project-management-panel';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface UserProfile {
  displayName: string;
  bioShort?: string;
  interests?: string[];
  education?: string;
  skills?: string[];
  resumeFileName?: string | null;
  resumeMimeType?: string | null;
  resumeSize?: number | null;
  resumeUploadedAt?: string | null;
}

interface SavedProject {
  id: string;
  project: ProjectDetail;
}

interface ApplicationSummary {
  id: string;
  projectId: string;
  status: string;
  ownerFeedback?: string | null;
  createdAt: string;
  project: {
    id: string;
    title: string;
    description?: string;
    researchArea: string;
    startTime?: string;
    endTime?: string | null;
    location?: string | null;
    requirements?: string | null;
    capacity?: number;
    enrolled?: number;
  };
  owner: {
    email: string;
    profile?: {
      displayName?: string | null;
      institution?: string | null;
      department?: string | null;
      title?: string | null;
      bioShort?: string | null;
    } | null;
  };
}

interface ProjectDetail {
  id: string;
  title: string;
  description?: string;
  ownerFeedback?: string | null;
  researchArea: string;
  startTime?: string;
  endTime?: string | null;
  location?: string | null;
  requirements?: string | null;
  capacity?: number;
  enrolled?: number;
  availableSeats?: number;
  status?: string;
  owner: {
    displayName: string;
    institution: string;
    department?: string | null;
    title?: string | null;
    bioShort?: string | null;
  };
}

export default function UserProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    bioShort: '',
    interests: [],
    education: '',
    skills: [],
    resumeFileName: null,
    resumeMimeType: null,
    resumeSize: null,
    resumeUploadedAt: null,
  });
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    try {
      // 获取个人信息
      const profileRes = await fetch('/api/profile');
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile || {
          displayName: '',
          bioShort: '',
          interests: [],
          education: '',
          skills: [],
          resumeFileName: null,
          resumeMimeType: null,
          resumeSize: null,
          resumeUploadedAt: null,
        });
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        router.replace(`/login?next=${encodeURIComponent('/profile')}`);
        return;
      } else {
        const data = await profileRes.json().catch(() => ({}));
        setLoadError(data.error || '加载个人信息失败，请稍后重试');
        return;
      }

      // 获取收藏的项目
      const savedRes = await fetch('/api/saved-projects');
      if (savedRes.ok) {
        const data = await savedRes.json();
        setSavedProjects(data.projects || []);
      }

      // 获取我的申请
      const applicationsRes = await fetch('/api/applications');
      if (applicationsRes.ok) {
        const data = await applicationsRes.json();
        setApplications(data.apps || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoadError('加载个人信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        alert('保存成功');
      } else {
        alert('保存失败');
      }
    } catch {
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

  const handleResumeUpload = async () => {
    if (!selectedResumeFile) {
      alert('请先选择 PDF 简历');
      return;
    }

    if (selectedResumeFile.type !== 'application/pdf') {
      alert('只支持上传 PDF 文件');
      return;
    }

    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', selectedResumeFile);

      const response = await fetch('/api/profile/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error || '上传失败');
        return;
      }

      setProfile((current) => ({
        ...current,
        resumeFileName: data.resume?.resumeFileName || selectedResumeFile.name,
        resumeMimeType: data.resume?.resumeMimeType || selectedResumeFile.type,
        resumeSize: data.resume?.resumeSize || selectedResumeFile.size,
        resumeUploadedAt: data.resume?.resumeUploadedAt || new Date().toISOString(),
      }));
      setSelectedResumeFile(null);
      alert('简历上传成功');
    } catch {
      alert('上传失败');
    } finally {
      setResumeUploading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'accepted': return '已接受';
      case 'rejected': return '已拒绝';
      case 'WITHDRAWN': return '已撤回';
      default: return status;
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'accepted': return 'border-green-200 bg-green-50 text-green-800';
      case 'rejected': return 'border-red-200 bg-red-50 text-red-800';
      case 'WITHDRAWN': return 'border-[#E0D8CC] bg-[#F5F2ED] text-[#6B6B6B]';
      default: return 'border-[#E0D8CC] bg-[#F5F2ED] text-[#1A1A1A]';
    }
  };

  const toggleSection = (section: 'profile' | 'saved' | 'applications' | 'projects') => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const getSectionButtonClassName = (expanded: boolean) =>
    [
      'flex w-full items-center justify-between rounded-[10px] border border-[#E0D8CC] bg-white px-6 py-5 text-left transition-all duration-200 ease hover:border-[#2C5F7C]',
      expanded ? 'border-[#2C5F7C]' : '',
    ].join(' ');

  const getSeatsLabel = (project: ProjectDetail) => {
    if (typeof project.availableSeats === 'number' && typeof project.capacity === 'number') {
      return `${project.availableSeats}/${project.capacity} seats`;
    }

    if (typeof project.capacity === 'number' && typeof project.enrolled === 'number') {
      return `${Math.max(0, project.capacity - project.enrolled)}/${project.capacity} seats`;
    }

    return 'Seats not listed';
  };

  const formatFileSize = (size?: number | null) => {
    if (!size) {
      return '';
    }

    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const getApplicationProjectDetail = (app: ApplicationSummary): ProjectDetail => ({
    id: app.project.id || app.projectId,
    title: app.project.title,
    description: app.project.description,
    ownerFeedback: app.ownerFeedback,
    researchArea: app.project.researchArea,
    startTime: app.project.startTime,
    endTime: app.project.endTime,
    location: app.project.location,
    requirements: app.project.requirements,
    capacity: app.project.capacity,
    enrolled: app.project.enrolled,
    availableSeats:
      typeof app.project.capacity === 'number' && typeof app.project.enrolled === 'number'
        ? Math.max(0, app.project.capacity - app.project.enrolled)
        : undefined,
    owner: {
      displayName: app.owner.profile?.displayName ?? app.owner.email,
      institution: app.owner.profile?.institution ?? '未知',
      department: app.owner.profile?.department,
      title: app.owner.profile?.title,
      bioShort: app.owner.profile?.bioShort,
    },
  });

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px]">
          <div
            className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer"
            onClick={() => router.push('/')}
          >
            ScholarBridge
          </div>
          <div className="flex gap-2.5">
            <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => router.push('/')}>Home</button>
            <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => router.push('/browse')}>Browse</button>
            <button className="bg-[#2C5F7C] text-white border border-[#2C5F7C] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease">Profile</button>
            <Button variant="gold" size="sm" onClick={handleLogout}>Sign Out</Button>
          </div>
        </nav>
        <main className="mx-auto max-w-3xl px-10 py-12">
          <section className="rounded-[10px] border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-[18px] font-semibold text-red-800">个人中心加载失败</h2>
            <p className="mb-5 text-sm text-red-700">{loadError}</p>
            <Button variant="outline" onClick={fetchData}>重新加载</Button>
          </section>
        </main>
        <style jsx>{`
          .font-display {
            font-family: 'Cormorant Garamond', serif;
          }
        `}</style>
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
          <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => router.push('/')}>Home</button>
          <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]" onClick={() => router.push('/browse')}>Browse</button>
          <button className="bg-[#2C5F7C] text-white border border-[#2C5F7C] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease">Profile</button>
          <Button variant="gold" size="sm" onClick={handleLogout}>Sign Out</Button>
        </div>
      </nav>

      <div className="py-8 px-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-display text-[32px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">
            个人中心
          </h2>
        </div>

        <div className="space-y-4">
          <section>
            <button
              type="button"
              className={getSectionButtonClassName(Boolean(expandedSections.profile))}
              onClick={() => toggleSection('profile')}
            >
              <span>
                <span className="block text-[18px] font-semibold text-[#1A1A1A]">基本信息</span>
                <span className="mt-1 block text-sm text-[#1A1A1A]">姓名、教育背景、简介、兴趣和技能</span>
              </span>
              <span className="text-[20px] font-semibold text-[#2C5F7C]">{expandedSections.profile ? '-' : '+'}</span>
            </button>

            {expandedSections.profile && (
              <div className="mt-3 bg-white border border-[#E0D8CC] rounded-[10px] p-6">
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

                  <div className="rounded-lg border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">PDF 简历</p>
                        <p className="mt-1 text-sm text-[#1A1A1A]">
                          {profile.resumeFileName
                            ? `${profile.resumeFileName}${profile.resumeSize ? ` · ${formatFileSize(profile.resumeSize)}` : ''}`
                            : '还没有上传简历'}
                        </p>
                        {profile.resumeUploadedAt && (
                          <p className="mt-1 text-xs text-[#4A4A4A]">
                            上传时间：{new Date(profile.resumeUploadedAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                      {profile.resumeFileName && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('/api/profile/resume', '_blank', 'noopener,noreferrer')}
                        >
                          查看简历
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => setSelectedResumeFile(event.target.files?.[0] || null)}
                        className="w-full rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm text-[#1A1A1A] file:mr-4 file:rounded file:border-0 file:bg-[#2C5F7C] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                      />
                      <Button
                        variant="outline"
                        onClick={handleResumeUpload}
                        disabled={resumeUploading || !selectedResumeFile}
                      >
                        {resumeUploading ? '上传中...' : '上传简历'}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-[#4A4A4A]">仅支持 PDF，最大 10MB。上传后会保存到数据库。</p>
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
            )}
          </section>

          <section>
            <button
              type="button"
              className={getSectionButtonClassName(Boolean(expandedSections.saved))}
              onClick={() => toggleSection('saved')}
            >
              <span>
                <span className="block text-[18px] font-semibold text-[#1A1A1A]">我的收藏</span>
                <span className="mt-1 block text-sm text-[#1A1A1A]">{savedProjects.length} 个收藏项目</span>
              </span>
              <span className="text-[20px] font-semibold text-[#2C5F7C]">{expandedSections.saved ? '-' : '+'}</span>
            </button>

            {expandedSections.saved && (
              <div className="mt-3 bg-white border border-[#E0D8CC] rounded-[10px] p-6">
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
                      <button
                        key={saved.id}
                        type="button"
                        className="w-full text-left border border-[#E0D8CC] rounded-lg p-3 transition-all duration-200 ease hover:border-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] focus:outline-none focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
                        onClick={() => setSelectedProject(saved.project)}
                      >
                        <h4 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{saved.project.title}</h4>
                        <p className="text-[12px] text-[#1A1A1A] mb-2">
                          {saved.project.owner.displayName} · {saved.project.owner.institution}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <span className="bg-[#F5F2ED] text-[#1A1A1A] px-2 py-1 rounded">
                            {saved.project.researchArea}
                          </span>
                          <span className="bg-[#F5F2ED] text-[#1A1A1A] px-2 py-1 rounded">
                            {saved.project.availableSeats} seats
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <button
              type="button"
              className={getSectionButtonClassName(Boolean(expandedSections.applications))}
              onClick={() => toggleSection('applications')}
            >
              <span>
                <span className="block text-[18px] font-semibold text-[#1A1A1A]">我的申请</span>
                <span className="mt-1 block text-sm text-[#1A1A1A]">{applications.length} 条申请记录</span>
              </span>
              <span className="text-[20px] font-semibold text-[#2C5F7C]">{expandedSections.applications ? '-' : '+'}</span>
            </button>

            {expandedSections.applications && (
              <div className="mt-3 bg-white border border-[#E0D8CC] rounded-[10px] p-6">
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#1A1A1A] text-sm mb-4">还没有申请任何项目</p>
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
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer border border-[#E0D8CC] rounded-lg p-4 transition-all duration-200 ease hover:border-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] focus:outline-none focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
                        onClick={() => setSelectedProject(getApplicationProjectDetail(app))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedProject(getApplicationProjectDetail(app));
                          }
                        }}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h4 className="text-[16px] font-semibold text-[#1A1A1A]">{app.project.title}</h4>
                              <span className={`rounded border px-3 py-1 text-xs font-semibold ${getStatusClassName(app.status)}`}>
                                {getStatusText(app.status)}
                              </span>
                            </div>
                            <div className="grid gap-1 text-sm text-[#1A1A1A]">
                              <p><span className="font-semibold">发布者：</span>{app.owner.profile?.displayName ?? app.owner.email}</p>
                              <p><span className="font-semibold">学校：</span>{app.owner.profile?.institution ?? '未知'}</p>
                              <p><span className="font-semibold">研究方向：</span>{app.project.researchArea}</p>
                              <p><span className="font-semibold">申请时间：</span>{new Date(app.createdAt).toLocaleDateString('zh-CN')}</p>
                            </div>
                          </div>

                          {app.status === 'pending' && (
                            <div onClick={(event) => event.stopPropagation()}>
                              <WithdrawButton applicationId={app.id} onWithdraw={fetchData} />
                            </div>
                          )}
                        </div>

                        {app.ownerFeedback && (
                          <div className="mt-4 rounded border border-[#E0D8CC] bg-[#EBF3F8] p-3 text-sm leading-6 text-[#1A1A1A]">
                            <p className="mb-1 font-semibold">发布者反馈：</p>
                            {app.ownerFeedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <button
              type="button"
              className={getSectionButtonClassName(Boolean(expandedSections.projects))}
              onClick={() => toggleSection('projects')}
            >
              <span>
                <span className="block text-[18px] font-semibold text-[#1A1A1A]">我的项目</span>
                <span className="mt-1 block text-sm text-[#1A1A1A]">发布项目、查看申请、处理反馈和 AI 简历评分</span>
              </span>
              <span className="text-[20px] font-semibold text-[#2C5F7C]">{expandedSections.projects ? '-' : '+'}</span>
            </button>

            {expandedSections.projects && (
              <div className="mt-3 bg-white border border-[#E0D8CC] rounded-[10px] p-6">
                <ProfileProjectPanel />
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedProject && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-4 py-8"
          role="presentation"
          onClick={() => setSelectedProject(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-project-details-title"
            className="max-h-[calc(100vh-64px)] w-full max-w-[720px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant={(selectedProject.availableSeats ?? 1) <= 0 ? 'gold' : 'green'}>
                    {(selectedProject.availableSeats ?? 1) <= 0 ? 'Full' : 'Open'}
                  </Badge>
                  <h3 id="profile-project-details-title" className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A]">
                    {selectedProject.title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close project details"
                  className="shrink-0 rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                  onClick={() => setSelectedProject(null)}
                >
                  Close
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#1A1A1A]">
                <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2">
                  {getSeatsLabel(selectedProject)}
                </span>
                <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2">
                  {selectedProject.researchArea}
                </span>
                {selectedProject.startTime && (
                  <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2">
                    {selectedProject.startTime} - {selectedProject.endTime || 'Ongoing'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 text-sm leading-6 text-[#1A1A1A]">
              <div className="flex items-start gap-3 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <Avatar name={selectedProject.owner.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A1A1A]">{selectedProject.owner.displayName}</p>
                  <p className="text-xs leading-5 text-[#1A1A1A]">
                    {[selectedProject.owner.title, selectedProject.owner.department, selectedProject.owner.institution].filter(Boolean).join(' - ')}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 font-semibold">Project overview</p>
                <p>{selectedProject.description || 'No project description listed yet.'}</p>
              </div>

              <div className="grid gap-2 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                {selectedProject.startTime && (
                  <p><span className="font-semibold">Timeline:</span> {selectedProject.startTime} - {selectedProject.endTime || 'Ongoing'}</p>
                )}
                {selectedProject.location && (
                  <p><span className="font-semibold">Location:</span> {selectedProject.location}</p>
                )}
                <p><span className="font-semibold">Research area:</span> {selectedProject.researchArea}</p>
              </div>

              <div>
                <p className="mb-2 font-semibold">Requirements</p>
                <p>{selectedProject.requirements || 'No formal requirements listed yet.'}</p>
              </div>

              {selectedProject.ownerFeedback && (
                <div className="rounded border border-[#E0D8CC] bg-[#EBF3F8] p-4">
                  <p className="mb-2 font-semibold">发布者反馈</p>
                  <p>{selectedProject.ownerFeedback}</p>
                </div>
              )}

              {selectedProject.owner.bioShort && (
                <div>
                  <p className="mb-2 font-semibold">Mentor focus</p>
                  <p>{selectedProject.owner.bioShort}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#E0D8CC] px-6 py-5">
              <Button
                variant="outline"
                onClick={() => router.push('/browse')}
              >
                Browse projects
              </Button>
              <Button
                variant="gold"
                onClick={() => setSelectedProject(null)}
              >
                Close
              </Button>
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
