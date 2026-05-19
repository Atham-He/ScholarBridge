/**
 * Profile page
 */

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { WithdrawButton } from '@/app/withdraw-button';
import { ProfileProjectPanel } from '@/app/profile/project-management-panel';
import { AppNav } from '@/components/layout/AppNav';
import { ResearchEvolutionTimeline } from '@/components/research/ResearchEvolutionTimeline';
import { ResearchInterestCloud } from '@/components/research/ResearchInterestCloud';
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
    illustrationUrl?: string | null;
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
  researchArea: string;
  startTime?: string;
  endTime?: string | null;
  location?: string | null;
  requirements?: string | null;
  illustrationUrl?: string | null;
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

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6M10 17h6" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4h12v17l-6-4-6 4z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
    </svg>
  );
}

type ActiveSection = 'profile' | 'applications' | 'saved' | 'updates' | 'projects';
type ApplicationFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn';

const normalizeApplicationStatus = (status: string) => status.toLowerCase();

const isActiveSection = (section: string | null): section is ActiveSection =>
  section === 'profile' ||
  section === 'applications' ||
  section === 'saved' ||
  section === 'updates' ||
  section === 'projects';

const getInitialActiveSection = (): ActiveSection => {
  if (typeof window === 'undefined') {
    return 'profile';
  }

  const section = new URLSearchParams(window.location.search).get('section');
  return isActiveSection(section) ? section : 'profile';
};

export default function UserProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>(getInitialActiveSection);
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
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

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3200);
  }, []);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    try {
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
        setLoadError(data.error || 'Failed to load your profile. Please try again later.');
        return;
      }

      // Fetch saved projects.
      const savedRes = await fetch('/api/saved-projects');
      if (savedRes.ok) {
        const data = await savedRes.json();
        setSavedProjects(data.projects || []);
      }

      // Fetch applications.
      const applicationsRes = await fetch('/api/applications');
      if (applicationsRes.ok) {
        const data = await applicationsRes.json();
        setApplications(data.apps || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoadError('Failed to load your profile. Please try again later.');
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
        showMessage('success', 'Profile saved.');
      } else {
        showMessage('error', 'Failed to save profile.');
      }
    } catch {
      showMessage('error', 'Failed to save profile.');
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
      showMessage('error', 'Choose a PDF resume first.');
      return;
    }

    if (selectedResumeFile.type !== 'application/pdf') {
      showMessage('error', 'Only PDF files are supported.');
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
        showMessage('error', data.error || 'Resume upload failed.');
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
      showMessage('success', 'Resume uploaded.');
    } catch {
      showMessage('error', 'Resume upload failed.');
    } finally {
      setResumeUploading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (normalizeApplicationStatus(status)) {
      case 'pending': return 'In review';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'withdrawn': return 'Withdrawn';
      default: return status;
    }
  };

  const getStatusClassName = (status: string) => {
    switch (normalizeApplicationStatus(status)) {
      case 'pending': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'accepted': return 'border-green-200 bg-green-50 text-green-800';
      case 'rejected': return 'border-red-200 bg-red-50 text-red-800';
      case 'withdrawn': return 'border-[#E0D8CC] bg-[#F5F2ED] text-[#6B6B6B]';
      default: return 'border-[#E0D8CC] bg-[#F5F2ED] text-[#1A1A1A]';
    }
  };

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
    researchArea: app.project.researchArea,
    startTime: app.project.startTime,
    endTime: app.project.endTime,
    location: app.project.location,
    requirements: app.project.requirements,
    illustrationUrl: app.project.illustrationUrl,
    capacity: app.project.capacity,
    enrolled: app.project.enrolled,
    availableSeats:
      typeof app.project.capacity === 'number' && typeof app.project.enrolled === 'number'
        ? Math.max(0, app.project.capacity - app.project.enrolled)
        : undefined,
    owner: {
      displayName: app.owner.profile?.displayName ?? app.owner.email,
      institution: app.owner.profile?.institution ?? 'Unknown',
      department: app.owner.profile?.department,
      title: app.owner.profile?.title,
      bioShort: app.owner.profile?.bioShort,
    },
  });

  const profileCompletionItems = [
    Boolean(profile.displayName),
    Boolean(profile.education),
    Boolean(profile.bioShort),
    Boolean(profile.interests?.length),
    Boolean(profile.skills?.length),
    Boolean(profile.resumeFileName),
  ];
  const profileCompletion = Math.round(
    (profileCompletionItems.filter(Boolean).length / profileCompletionItems.length) * 100,
  );
  const researchInterests = profile.interests || [];
  const pendingApplications = applications.filter((app) => normalizeApplicationStatus(app.status) === 'pending').length;
  const acceptedApplications = applications.filter((app) => normalizeApplicationStatus(app.status) === 'accepted').length;
  const rejectedApplications = applications.filter((app) => normalizeApplicationStatus(app.status) === 'rejected').length;
  const withdrawnApplications = applications.filter((app) => normalizeApplicationStatus(app.status) === 'withdrawn').length;
  const resumeLabel = profile.resumeFileName
    ? `${profile.resumeFileName}${profile.resumeSize ? ` · ${formatFileSize(profile.resumeSize)}` : ''}`
    : 'No resume uploaded';
  const savedOpportunityLabel = `${savedProjects.length} saved ${
    savedProjects.length === 1 ? 'opportunity' : 'opportunities'
  }`;
  const filteredApplications = applicationFilter === 'all'
    ? applications
    : applications.filter((app) => normalizeApplicationStatus(app.status) === applicationFilter);
  const applicationGroups = [
    {
      key: 'pending',
      label: 'In Review',
      count: applications.filter((app) => app.status === 'pending').length,
      tone: 'border-[#D8E8F2] bg-[#F3FAFD]',
    },
    {
      key: 'accepted',
      label: 'Accepted',
      count: acceptedApplications,
      tone: 'border-green-200 bg-green-50',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: rejectedApplications,
      tone: 'border-red-200 bg-red-50',
    },
    {
      key: 'withdrawn',
      label: 'Withdrawn',
      count: withdrawnApplications,
      tone: 'border-[#E0D8CC] bg-[#F5F2ED]',
    },
  ] as const;
  const recentFeedback = applications.find((app) => app.ownerFeedback)?.ownerFeedback;
  const getMatchScore = (project: ProjectDetail, index: number) => {
    const interestHit = profile.interests?.some((interest) =>
      project.researchArea.toLowerCase().includes(interest.toLowerCase()) ||
      project.title.toLowerCase().includes(interest.toLowerCase()),
    );
    return Math.min(96, Math.max(72, 92 - index * 5 + (interestHit ? 4 : 0)));
  };
  const sidebarItems: Array<{
    key: ActiveSection;
    label: string;
    icon: ReactNode;
    count?: number;
  }> = [
    { key: 'profile', label: 'Profile', icon: <ProfileIcon /> },
    { key: 'applications', label: 'Applications', icon: <DocumentIcon />, count: applications.length },
    { key: 'saved', label: 'Saved', icon: <BookmarkIcon />, count: savedProjects.length },
    { key: 'projects', label: 'Projects', icon: <GridIcon /> },
    { key: 'updates', label: 'Updates', icon: <BellIcon />, count: pendingApplications },
  ];

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <AppNav
          items={[
            { label: 'Browse', href: '/browse' },
            { label: 'Sign Out', onClick: handleLogout, variant: 'primary' },
          ]}
        />
        <main className="mx-auto max-w-3xl px-10 py-12">
          <section className="rounded-[10px] border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-[18px] font-semibold text-red-800">Failed to load profile</h2>
            <p className="mb-5 text-sm text-red-700">{loadError}</p>
            <Button variant="outline" onClick={fetchData}>Retry</Button>
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
      {/* Navigation */}
      <AppNav
        items={[
          { label: 'Browse', href: '/browse' },
          { label: 'Profile', href: '/profile', active: true },
          { label: 'Sign Out', onClick: handleLogout },
        ]}
      />

      <main className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-[#E0D8CC] bg-[#fffdf9] lg:border-b-0 lg:border-r">
          <nav className="p-3 lg:sticky lg:top-[88px] lg:p-5">
            <div className="mb-4 hidden px-2 py-3 lg:block">
              <p className="font-display text-[22px] font-semibold text-[#17120e]">Research Profile</p>
              <p className="mt-1 text-xs leading-5 text-[#6d6258]">Manage your public profile, applications, projects, and saved opportunities.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto lg:block lg:overflow-visible">
              {sidebarItems.map((item) => {
                const active = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={`Open ${item.label}`}
                    onClick={() => setActiveSection(item.key)}
                    className={[
                      'flex min-w-[150px] items-center justify-between rounded-[7px] px-3 py-3 text-left text-sm font-semibold transition-all lg:mb-1 lg:w-full lg:min-w-0',
                      active ? 'bg-[#E8F2F7] text-[#17425d]' : 'text-[#3f352d] hover:bg-[#f6f0e8]',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-3">
                      <span className={active ? 'text-[#17425d]' : 'text-[#7a6f65]'}>{item.icon}</span>
                      {item.label}
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="rounded-full bg-[#17425d] px-2 py-0.5 text-[11px] font-semibold text-white">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
          {message && (
            <div
              className={[
                'mb-4 rounded-[8px] border px-4 py-3 text-sm font-semibold',
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800',
              ].join(' ')}
            >
              {message.text}
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="space-y-5">
              <section className="rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <Avatar name={profile.displayName || 'Scholar'} size="lg" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b603b]">Profile Management</p>
                      <h1 className="mt-2 font-display text-[38px] font-semibold leading-tight text-[#17120e]">
                        Welcome back, {profile.displayName || 'Scholar'}
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B5148]">
                        Manage the public profile project owners see, then track applications and saved opportunities from one workspace.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={editingProfile ? 'Close profile editing' : 'Edit profile'}
                    onClick={() => setEditingProfile((current) => !current)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#E0D8CC] bg-white px-4 text-sm font-semibold text-[#2b241d] transition hover:border-[#8b603b]"
                  >
                    <EditIcon />
                    {editingProfile ? 'Done' : 'Edit Profile'}
                  </button>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[8px] border border-[#E0D8CC] bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">Profile Completion</p>
                        <p className="mt-1 text-[26px] font-semibold leading-none text-[#17120e]">{profileCompletion}%</p>
                      </div>
                      <div
                        className="grid h-14 w-14 place-items-center rounded-full text-xs font-semibold text-[#17425d]"
                        style={{ background: `conic-gradient(#17425d ${profileCompletion * 3.6}deg, #E6DED4 0deg)` }}
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-white">{profileCompletion}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(true)}
                      className="mt-4 text-xs font-semibold text-[#17425d] hover:underline"
                    >
                      Continue editing
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('applications')}
                    className="rounded-[8px] border border-[#E0D8CC] bg-white p-4 text-left transition hover:border-[#17425d]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">Applications</p>
                    <div className="mt-2 flex items-end gap-6">
                      <span className="text-[28px] font-semibold leading-none text-[#17120e]">{applications.length}</span>
                      <span className="text-[20px] font-semibold leading-none text-green-700">{acceptedApplications}</span>
                      <span className="text-[20px] font-semibold leading-none text-red-700">{rejectedApplications}</span>
                    </div>
                    <p className="mt-3 text-xs text-[#5B5148]">Total · accepted · rejected</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection('saved')}
                    className="rounded-[8px] border border-[#E0D8CC] bg-white p-4 text-left transition hover:border-[#17425d]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">Saved Projects</p>
                    <p className="mt-1 text-[28px] font-semibold leading-none text-[#17120e]">{savedProjects.length}</p>
                    <p className="mt-3 text-xs text-[#5B5148]">Compare shortlisted opportunities.</p>
                  </button>

                  <div className="rounded-[8px] border border-[#E0D8CC] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">Resume Status</p>
                    <div className="mt-3 flex items-start gap-3">
                      <button
                        type="button"
                        aria-label="Open resume"
                        onClick={() => profile.resumeFileName && window.open('/api/profile/resume', '_blank', 'noopener,noreferrer')}
                        className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#D8E8F2] bg-[#F3FAFD] text-[#17425d] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!profile.resumeFileName}
                      >
                        <DocumentIcon />
                      </button>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#17120e]">{profile.resumeFileName ? 'Resume ready' : 'Resume missing'}</p>
                        <p className="mt-1 truncate text-xs text-[#5B5148]">{resumeLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
                <section className="rounded-[8px] border border-[#E0D8CC] bg-white shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                  <div className="flex items-center justify-between gap-4 border-b border-[#eee6dc] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Edit basic information"
                        onClick={() => setEditingProfile((current) => !current)}
                        className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#E8F2F7] text-[#17425d] transition hover:bg-[#d7ebf5]"
                      >
                        <ProfileIcon />
                      </button>
                      <div>
                        <h2 className="text-[18px] font-semibold text-[#17120e]">Public Profile</h2>
                        <p className="mt-1 text-sm text-[#5B5148]">The information project owners see when reviewing your applications.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>

                  {!editingProfile ? (
                    <div className="p-5">
                      <div className="grid gap-5 md:grid-cols-4">
                        {[
                          ['Name', profile.displayName || 'Not set'],
                          ['Education', profile.education || 'Not set'],
                          ['Focus', profile.interests?.[0] || 'Not set'],
                          ['Skills', `${profile.skills?.length || 0} listed`],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a8178]">{label}</p>
                            <p className="mt-2 text-sm font-semibold text-[#17120e]">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 border-t border-[#eee6dc] pt-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a8178]">Research Interests</p>
                        <div className="mt-3">
                          <ResearchInterestCloud
                            areas={researchInterests}
                            emptyText="No research interests listed."
                            onAdd={() => setEditingProfile(true)}
                          />
                        </div>
                      </div>

                      <div className="mt-5 border-t border-[#eee6dc] pt-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a8178]">Bio</p>
                        <p className="mt-2 text-sm leading-6 text-[#5B5148]">
                          {profile.bioShort || 'Add a short bio so project owners can quickly understand your research direction.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-semibold text-[#17120e]">
                          Name
                          <input
                            type="text"
                            value={profile.displayName}
                            onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
                            className="h-11 rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] px-3 text-sm font-medium text-[#17120e] outline-none transition focus:border-[#17425d] focus:bg-white"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold text-[#17120e]">
                          Education
                          <input
                            type="text"
                            value={profile.education || ''}
                            onChange={(event) => setProfile({ ...profile, education: event.target.value })}
                            className="h-11 rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] px-3 text-sm font-medium text-[#17120e] outline-none transition focus:border-[#17425d] focus:bg-white"
                            placeholder="MIT · Computer Science · Master 1"
                          />
                        </label>
                      </div>
                      <label className="grid gap-2 text-sm font-semibold text-[#17120e]">
                        Short Bio
                        <textarea
                          value={profile.bioShort || ''}
                          onChange={(event) => setProfile({ ...profile, bioShort: event.target.value })}
                          rows={3}
                          className="resize-none rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] px-3 py-3 text-sm font-medium leading-6 text-[#17120e] outline-none transition focus:border-[#17425d] focus:bg-white"
                          placeholder="Summarize your research interests and project experience."
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-semibold text-[#17120e]">
                          Research Interests
                          <input
                            type="text"
                            value={profile.interests?.join(', ') || ''}
                            onChange={(event) => setProfile({ ...profile, interests: event.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                            className="h-11 rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] px-3 text-sm font-medium text-[#17120e] outline-none transition focus:border-[#17425d] focus:bg-white"
                            placeholder="Reinforcement Learning, Robotics"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold text-[#17120e]">
                          Skills
                          <input
                            type="text"
                            value={profile.skills?.join(', ') || ''}
                            onChange={(event) => setProfile({ ...profile, skills: event.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                            className="h-11 rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] px-3 text-sm font-medium text-[#17120e] outline-none transition focus:border-[#17425d] focus:bg-white"
                            placeholder="Python, PyTorch, Data Analysis"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-[8px] border border-[#E0D8CC] bg-white shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                  <div className="border-b border-[#eee6dc] px-5 py-4">
                    <h2 className="text-[18px] font-semibold text-[#17120e]">Next Actions</h2>
                    <p className="mt-1 text-sm text-[#5B5148]">Recommended steps based on your current profile.</p>
                  </div>
                  <div className="divide-y divide-[#eee6dc]">
                    {[
                      {
                        title: profile.resumeFileName ? 'Resume is ready' : 'Upload resume',
                        detail: profile.resumeFileName ? resumeLabel : 'A PDF resume helps project owners screen faster.',
                        action: profile.resumeFileName ? 'Open' : 'Choose',
                        onClick: () => profile.resumeFileName
                          ? window.open('/api/profile/resume', '_blank', 'noopener,noreferrer')
                          : setActiveSection('profile'),
                      },
                      {
                        title: savedProjects.length ? 'Review saved opportunities' : 'Save opportunities',
                        detail: savedOpportunityLabel,
                        action: savedProjects.length ? 'Review' : 'Browse',
                        onClick: () => savedProjects.length ? setActiveSection('saved') : router.push('/browse'),
                      },
                      {
                        title: applications.length ? 'Track applications' : 'Apply to projects',
                        detail: `${pendingApplications} in review · ${withdrawnApplications} withdrawn`,
                        action: applications.length ? 'Track' : 'Browse',
                        onClick: () => applications.length ? setActiveSection('applications') : router.push('/browse'),
                      },
                    ].map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={item.onClick}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#fffdf9]"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[#17120e]">{item.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-[#5B5148]">{item.detail}</span>
                        </span>
                        <span className="rounded-[7px] border border-[#E0D8CC] bg-white px-3 py-2 text-xs font-semibold text-[#17425d]">
                          {item.action}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <section className="rounded-[8px] border border-[#E0D8CC] bg-white p-5 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#17120e]">Resume</h2>
                    <p className="mt-1 text-sm text-[#5B5148]">{resumeLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label="View resume"
                      onClick={() => profile.resumeFileName && window.open('/api/profile/resume', '_blank', 'noopener,noreferrer')}
                      disabled={!profile.resumeFileName}
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#E0D8CC] bg-white px-4 text-sm font-semibold text-[#2b241d] disabled:opacity-50"
                    >
                      <DocumentIcon />
                      View
                    </button>
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-[#E0D8CC] bg-white px-4 text-sm font-semibold text-[#2b241d] hover:border-[#8b603b]">
                      <DownloadIcon />
                      Choose PDF
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        onChange={(event) => setSelectedResumeFile(event.target.files?.[0] || null)}
                      />
                    </label>
                    <Button variant="gold" onClick={handleResumeUpload} disabled={resumeUploading || !selectedResumeFile}>
                      {resumeUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-[8px] border border-[#E0D8CC] bg-white p-5 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <div className="mb-4">
                  <h2 className="text-[18px] font-semibold text-[#17120e]">Research Evolution</h2>
                  <p className="mt-1 text-sm text-[#5B5148]">A compact timeline view for representative research themes and work samples.</p>
                </div>
                <ResearchEvolutionTimeline compact />
              </section>
            </div>
          )}

          {activeSection === 'applications' && (
            <div className="space-y-5">
              <section className="rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b603b]">Application Tracking</p>
                    <h1 className="mt-2 font-display text-[38px] font-semibold leading-tight text-[#17120e]">Applications Workspace</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B5148]">
                      Track every application by stage and keep owner feedback visible beside the board.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => showMessage('success', 'Application records are ready to export when CSV support is connected.')}
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#E0D8CC] bg-white px-4 text-sm font-semibold text-[#2b241d] transition hover:border-[#8b603b]"
                  >
                    <DownloadIcon />
                    Export Records
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 border-b border-[#eee6dc] pb-3">
                  {[
                    ['all', 'All', applications.length],
                    ['pending', 'In Review', pendingApplications],
                    ['accepted', 'Accepted', acceptedApplications],
                    ['rejected', 'Rejected', rejectedApplications],
                    ['withdrawn', 'Withdrawn', withdrawnApplications],
                  ].map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setApplicationFilter(key as ApplicationFilter)}
                      className={[
                        'rounded-t-[8px] border-b-2 px-4 py-2 text-sm font-semibold transition',
                        applicationFilter === key
                          ? 'border-[#17425d] bg-[#E8F2F7] text-[#17425d]'
                          : 'border-transparent text-[#5B5148] hover:bg-white',
                      ].join(' ')}
                    >
                      {label} <span className="ml-2">{count}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
                <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  {applicationGroups.map((group) => {
                    const groupApplications = filteredApplications.filter((app) => normalizeApplicationStatus(app.status) === group.key);
                    const visibleApplications = applicationFilter === 'all'
                      ? applications.filter((app) => normalizeApplicationStatus(app.status) === group.key)
                      : groupApplications;
                    return (
                      <div key={group.key} className={`rounded-[8px] border p-4 ${group.tone}`}>
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-[16px] font-semibold text-[#17120e]">{group.label}</h2>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#5B5148]">{group.count}</span>
                        </div>
                        <div className="space-y-3">
                          {visibleApplications.length ? visibleApplications.map((app) => (
                            <article
                              key={app.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedProject(getApplicationProjectDetail(app))}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedProject(getApplicationProjectDetail(app));
                                }
                              }}
                              className="cursor-pointer rounded-[8px] border border-[#E0D8CC] bg-white p-4 shadow-[0_1px_2px_rgba(60,42,27,0.04)] transition hover:border-[#17425d]"
                            >
                              <h3 className="text-sm font-semibold leading-5 text-[#17120e]">{app.project.title}</h3>
                              <p className="mt-2 text-xs leading-5 text-[#5B5148]">
                                {app.owner.profile?.displayName ?? app.owner.email} · {app.owner.profile?.institution ?? 'Unknown'}
                              </p>
                              <p className="mt-1 text-xs text-[#8a8178]">Applied {new Date(app.createdAt).toLocaleDateString('en-US')}</p>
                              <div className="mt-3 flex items-center justify-between gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClassName(app.status)}`}>
                                  {getStatusText(app.status)}
                                </span>
                                {normalizeApplicationStatus(app.status) === 'pending' && (
                                  <span onClick={(event) => event.stopPropagation()}>
                                    <WithdrawButton applicationId={app.id} onWithdraw={fetchData} />
                                  </span>
                                )}
                              </div>
                            </article>
                          )) : (
                            <div className="rounded-[8px] border border-dashed border-[#D8CABC] bg-white/70 p-5 text-center text-sm text-[#5B5148]">
                              No applications in this stage.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>

                <aside className="space-y-4">
                  <section className="rounded-[8px] border border-[#E0D8CC] bg-white p-5 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                    <h2 className="text-[16px] font-semibold text-[#17120e]">Owner Feedback</h2>
                    <div className="mt-4 flex items-start gap-3">
                      <Avatar name="Prof. Jane Chen" size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-[#17120e]">Latest review note</p>
                        <p className="mt-2 text-sm leading-6 text-[#5B5148]">
                          {recentFeedback || 'No owner feedback yet. Feedback will appear here after reviews.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[8px] border border-[#E0D8CC] bg-white p-5 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[16px] font-semibold text-[#17120e]">Resume Preview</h2>
                      <button
                        type="button"
                        aria-label="Open resume preview"
                        disabled={!profile.resumeFileName}
                        onClick={() => profile.resumeFileName && window.open('/api/profile/resume', '_blank', 'noopener,noreferrer')}
                        className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#E0D8CC] text-[#17425d] disabled:opacity-50"
                      >
                        <DocumentIcon />
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#5B5148]">{resumeLabel}</p>
                  </section>
                </aside>
              </div>
            </div>
          )}

          {activeSection === 'saved' && (
            <div className="space-y-5">
              <section className="rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b603b]">Saved Opportunities</p>
                    <h1 className="mt-2 font-display text-[38px] font-semibold leading-tight text-[#17120e]">Saved Research Center</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B5148]">
                      Compare shortlisted opportunities by fit, timeline, seats, and owner.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompareMode((current) => !current)}
                      className={[
                        'inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition',
                        compareMode ? 'border-[#17425d] bg-[#17425d] text-white' : 'border-[#E0D8CC] bg-white text-[#2b241d] hover:border-[#8b603b]',
                      ].join(' ')}
                    >
                      <GridIcon />
                      Compare
                    </button>
                    <select
                      aria-label="Sort saved projects"
                      className="h-10 rounded-[8px] border border-[#E0D8CC] bg-white px-3 text-sm font-semibold text-[#2b241d] outline-none"
                    >
                      <option>Recently saved</option>
                      <option>Highest match</option>
                      <option>Deadline soon</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Toggle grid view"
                      onClick={() => showMessage('success', 'Grid view is active.')}
                      className="grid h-10 w-10 place-items-center rounded-[8px] border border-[#E0D8CC] bg-white text-[#17425d]"
                    >
                      <GridIcon />
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {savedProjects.length ? savedProjects.map((saved, index) => {
                    const score = getMatchScore(saved.project, index);
                    return (
                      <article key={saved.id} className="rounded-[8px] border border-[#E0D8CC] bg-white p-4 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-[16px] font-semibold leading-6 text-[#17120e]">{saved.project.title}</h2>
                            <p className="mt-1 text-xs text-[#5B5148]">{saved.project.owner.displayName} · {saved.project.owner.institution}</p>
                          </div>
                          <button
                            type="button"
                            aria-label="Open saved project details"
                            onClick={() => setSelectedProject(saved.project)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#E0D8CC] text-[#17425d]"
                          >
                            <BookmarkIcon />
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#F3FAFD] px-2.5 py-1 text-[11px] font-semibold text-[#17425d]">{saved.project.researchArea}</span>
                          <span className="rounded-full bg-[#F5F2ED] px-2.5 py-1 text-[11px] font-semibold text-[#5B5148]">{getSeatsLabel(saved.project)}</span>
                          <span className="rounded-full bg-[#F5F2ED] px-2.5 py-1 text-[11px] font-semibold text-[#5B5148]">{saved.project.location || 'Flexible'}</span>
                        </div>
                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#5B5148]">
                            <span>Match</span>
                            <span>{score}%</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-[#E6DED4]">
                            <div className="h-1.5 rounded-full bg-[#17425d]" style={{ width: `${score}%` }} />
                          </div>
                          <p className="mt-2 text-xs text-[#5B5148]">
                            {score >= 88 ? 'Strong alignment with your interests.' : 'Related research direction.'}
                          </p>
                        </div>
                        <div className="mt-5 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedProject(saved.project)}>Details</Button>
                          <Button variant="outline" size="sm" onClick={() => showMessage('success', 'Saved project kept in your shortlist.')}>Keep</Button>
                        </div>
                      </article>
                    );
                  }) : (
                    <div className="rounded-[8px] border border-dashed border-[#D8CABC] bg-white px-5 py-10 text-center md:col-span-2 xl:col-span-3">
                      <p className="text-sm text-[#5B5148]">No saved opportunities yet.</p>
                      <Button className="mt-4" variant="gold" onClick={() => router.push('/browse')}>Browse Projects</Button>
                    </div>
                  )}
                </section>

                <aside className="rounded-[8px] border border-[#E0D8CC] bg-white p-5 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                  <h2 className="text-[16px] font-semibold text-[#17120e]">Comparison Summary</h2>
                  <p className="mt-1 text-sm text-[#5B5148]">{compareMode ? 'Compare mode is active.' : 'Turn on compare mode to evaluate saved projects.'}</p>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Research fit', 4],
                      ['Skill match', 4],
                      ['Location fit', 3],
                      ['Timeline', 4],
                    ].map(([label, rating]) => (
                      <div key={label as string} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-[#5B5148]">{label}</span>
                        <span className="flex text-[#d69b2d]">
                          {[0, 1, 2, 3, 4].map((star) => (
                            <button
                              key={star}
                              type="button"
                              aria-label={`${label as string} rating ${star + 1}`}
                              onClick={() => showMessage('success', `${label as string} comparison rating selected.`)}
                              className="rounded-sm transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#17425d]"
                            >
                              <StarIcon filled={star < Number(rating)} />
                            </button>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button className="mt-5 w-full" variant="gold" onClick={() => showMessage('success', 'Comparison details are ready.')}>View Comparison</Button>
                </aside>
              </div>
            </div>
          )}

          {activeSection === 'projects' && (
            <div className="space-y-5">
              <section className="rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b603b]">Project Workspace</p>
                    <h1 className="mt-2 font-display text-[38px] font-semibold leading-tight text-[#17120e]">Project Management</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B5148]">
                      Publish research opportunities, upload project illustrations, and review incoming applications from the same profile workspace.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveSection('profile')}>Back to Profile</Button>
                </div>
              </section>

              <section className="rounded-[8px] border border-[#E0D8CC] bg-white p-5 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
                <ProfileProjectPanel />
              </section>
            </div>
          )}

          {activeSection === 'updates' && (
            <section className="rounded-[8px] border border-[#E0D8CC] bg-white p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b603b]">Updates</p>
              <h1 className="mt-2 font-display text-[38px] font-semibold leading-tight text-[#17120e]">
                Notification Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B5148]">
                Application updates and owner messages will be collected here.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => setActiveSection('profile')}>Back to Profile</Button>
            </section>
          )}
        </div>
      </main>

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
            className="max-h-[calc(100vh-64px)] w-full max-w-[1040px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
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

              {selectedProject.owner.bioShort && (
                <div>
                  <p className="mb-2 font-semibold">Owner focus</p>
                  <p>{selectedProject.owner.bioShort}</p>
                </div>
              )}

              <ResearchEvolutionTimeline compact />
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
