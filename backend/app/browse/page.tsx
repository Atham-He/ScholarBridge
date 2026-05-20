/**
 * Browse page - project-first applicant discovery.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppNav } from '@/components/layout/AppNav';
import { ResearchEvolutionTimeline } from '@/components/research/ResearchEvolutionTimeline';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ProjectOpportunity {
  id: string;
  title: string;
  description: string;
  researchArea: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  requirements?: string | null;
  illustrationUrl?: string | null;
  capacity: number;
  enrolled: number;
  availableSeats: number;
  owner: {
    id: string;
    slug: string;
    displayName: string;
    institution: string;
    department?: string | null;
    title?: string | null;
    bioShort?: string | null;
    researchAreas: string[];
    initials: string;
  };
}

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AppliedApplication {
  id: string;
  status: string;
  ownerFeedback?: string | null;
}

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  tone: ToastTone;
  message: string;
}

const projectImageByTitle: Record<string, string> = {
  'Research Intern — Multi-Agent Systems': '/images/projects/multi-agent-systems-card.png',
  'PhD — AI Safety Research': '/images/projects/ai-safety-research-card.png',
};

const fallbackProjectImages = [
  '/images/projects/multi-agent-systems-card.png',
  '/images/projects/ai-safety-research-card.png',
  '/images/landing-generated-scene-v4-full.png',
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      <circle cx="11" cy="11" r="6.5" />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d="M6.5 4.75A1.75 1.75 0 0 1 8.25 3h7.5a1.75 1.75 0 0 1 1.75 1.75V21L12 17.6 6.5 21V4.75Z" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M7 3.75v3M17 3.75v3M4.75 9.25h14.5M6.5 5.5h11A1.75 1.75 0 0 1 19.25 7.25v10.5A1.75 1.75 0 0 1 17.5 19.5h-11a1.75 1.75 0 0 1-1.75-1.75V7.25A1.75 1.75 0 0 1 6.5 5.5Z" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M18.25 10.25c0 4.55-6.25 9.75-6.25 9.75s-6.25-5.2-6.25-9.75a6.25 6.25 0 1 1 12.5 0Z" />
      <circle cx="12" cy="10.25" r="2.1" />
    </svg>
  );
}

function getProjectImage(project: ProjectOpportunity, index: number) {
  return project.illustrationUrl || projectImageByTitle[project.title] || fallbackProjectImages[index % fallbackProjectImages.length];
}

export default function BrowsePage() {
  const [projects, setProjects] = useState<ProjectOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pendingCancelProjectId, setPendingCancelProjectId] = useState<string | null>(null);
  const [appliedApplications, setAppliedApplications] = useState<Record<string, AppliedApplication>>({});
  const [applyingProjectId, setApplyingProjectId] = useState<string | null>(null);
  const [cancellingProjectId, setCancellingProjectId] = useState<string | null>(null);
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchUser();
  }, []);

  useEffect(() => {
    if (!selectedProjectId && !pendingCancelProjectId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProjectId(null);
        setPendingCancelProjectId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId, pendingCancelProjectId]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ message, tone });
  };

  const redirectToLogin = (action: string) => {
    showToast(`Please sign in to ${action}. Redirecting to login...`, 'info');
    window.setTimeout(() => {
      window.location.href = `/login?next=${encodeURIComponent('/browse')}`;
    }, 900);
  };

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setUser(data.user);
      if (data.user) {
        fetchSavedProjects();
        fetchApplications();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchSavedProjects = async () => {
    try {
      const response = await fetch('/api/saved-projects');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const projectIds = (data.projects || []).map((saved: { project: { id: string } }) => saved.project.id);
      setSavedProjectIds(new Set(projectIds));
    } catch (error) {
      console.error('Failed to fetch saved projects:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const activeApplications = (data.apps || []).reduce(
        (current: Record<string, AppliedApplication>, app: { id: string; projectId: string; status: string; ownerFeedback?: string | null }) => {
          if (app.status !== 'WITHDRAWN') {
            current[app.projectId] = {
              id: app.id,
              status: app.status,
              ownerFeedback: app.ownerFeedback || null,
            };
          }
          return current;
        },
        {}
      );
      setAppliedApplications(activeApplications);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      showToast('Failed to load projects. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      showToast('Sign out failed. Please try again later.', 'error');
    }
  };

  const handleApply = async (projectId: string) => {
    if (!user) {
      redirectToLogin('apply');
      return;
    }

    setApplyingProjectId(projectId);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.application?.id) {
          setAppliedApplications((current) => ({
            ...current,
            [projectId]: {
              id: data.application.id,
              status: data.application.status,
              ownerFeedback: data.application.ownerFeedback || null,
            },
          }));
        }
        showToast('Application submitted. Track it from your profile.', 'success');
        return;
      }

      const data = await response.json();
      if (response.status === 409) {
        fetchApplications();
      }
      showToast(data.error || 'Application failed. Please try again later.', 'error');
    } catch {
      showToast('Application failed. Please try again later.', 'error');
    } finally {
      setApplyingProjectId(null);
    }
  };

  const handleCancelApply = (projectId: string) => {
    const application = appliedApplications[projectId];
    if (!application) {
      return;
    }

    setPendingCancelProjectId(projectId);
  };

  const confirmCancelApply = async () => {
    if (!pendingCancelProjectId) {
      return;
    }

    const application = appliedApplications[pendingCancelProjectId];
    if (!application) {
      setPendingCancelProjectId(null);
      return;
    }

    setCancellingProjectId(pendingCancelProjectId);
    try {
      const response = await fetch(`/api/applications/${application.id}/withdraw`, {
        method: 'POST',
      });

      if (response.ok) {
        setAppliedApplications((current) => {
          const next = { ...current };
          delete next[pendingCancelProjectId];
          return next;
        });
        showToast('Application withdrawn.', 'success');
        setPendingCancelProjectId(null);
        return;
      }

      const data = await response.json().catch(() => ({}));
      showToast(data.error || 'Failed to withdraw application. Please try again later.', 'error');
    } catch {
      showToast('Failed to withdraw application. Please try again later.', 'error');
    } finally {
      setCancellingProjectId(null);
    }
  };

  const handleToggleSave = async (projectId: string) => {
    if (!user) {
      redirectToLogin('save projects');
      return;
    }

    const isSaved = savedProjectIds.has(projectId);

    try {
      const response = await fetch(
        isSaved ? `/api/saved-projects?projectId=${encodeURIComponent(projectId)}` : '/api/saved-projects',
        {
          method: isSaved ? 'DELETE' : 'POST',
          headers: isSaved ? undefined : { 'Content-Type': 'application/json' },
          body: isSaved ? undefined : JSON.stringify({ projectId }),
        }
      );

      if (response.ok) {
        setSavedProjectIds((current) => {
          const next = new Set(current);
          if (isSaved) {
            next.delete(projectId);
          } else {
            next.add(projectId);
          }
          return next;
        });
        showToast(isSaved ? 'Removed from saved projects.' : 'Saved to your projects.', 'success');
        return;
      }

      if (response.status === 401) {
        redirectToLogin('save projects');
        return;
      }

      const data = await response.json().catch(() => ({}));
      showToast(data.error || 'Failed to update saved state. Please try again later.', 'error');
    } catch {
      showToast('Failed to update saved state. Please try again later.', 'error');
    }
  };

  const researchAreas = useMemo(
    () => Array.from(new Set(projects.map((project) => project.researchArea))).filter(Boolean),
    [projects]
  );

  const locations = useMemo(
    () => Array.from(new Set(projects.map((project) => project.location).filter((location): location is string => Boolean(location)))),
    [projects]
  );

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = !normalizedQuery ||
      project.title.toLowerCase().includes(normalizedQuery) ||
      project.description.toLowerCase().includes(normalizedQuery) ||
      project.researchArea.toLowerCase().includes(normalizedQuery) ||
      project.owner.displayName.toLowerCase().includes(normalizedQuery) ||
      project.owner.institution.toLowerCase().includes(normalizedQuery);

    const matchesArea = !selectedArea || project.researchArea === selectedArea;
    const matchesLocation = !selectedLocation || project.location === selectedLocation;
    const matchesOpenSeats = !openOnly || project.availableSeats > 0;

    return matchesSearch && matchesArea && matchesLocation && matchesOpenSeats;
  }), [openOnly, projects, searchQuery, selectedArea, selectedLocation]);

  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) || null
    : null;

  const pendingCancelProject = pendingCancelProjectId
    ? projects.find((project) => project.id === pendingCancelProjectId) || null
    : null;

  const getApplicationButtonState = (project: ProjectOpportunity) => {
    const application = appliedApplications[project.id];
    const status = application?.status;
    const isFinalDecision = status === 'accepted' || status === 'rejected';

    return {
      application,
      isFinalDecision,
      disabled:
        project.availableSeats <= 0 ||
        applyingProjectId === project.id ||
        cancellingProjectId === project.id ||
        isFinalDecision,
      label:
        cancellingProjectId === project.id
          ? 'Withdrawing...'
          : status === 'accepted'
            ? 'Accepted'
            : status === 'rejected'
              ? 'Rejected'
              : application
                ? 'Withdraw'
                : applyingProjectId === project.id
                  ? 'Applying...'
                  : project.availableSeats <= 0
                    ? 'Full'
                    : 'Apply Now',
    };
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedArea(null);
    setSelectedLocation(null);
    setOpenOnly(false);
    showToast('Filters reset.', 'info');
  };

  const getToastClassName = (tone: ToastTone) => {
    switch (tone) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-[#A8D0E8] bg-[#EBF3F8] text-[#2C5F7C]';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#2C5F7C] border-t-transparent"></div>
          <p className="text-[#1A1A1A]">Loading research opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A]">
      <AppNav
        items={user ? [
          { label: 'Discover', href: '/browse', active: true },
          { label: 'Profile', href: '/profile' },
          { label: 'Sign Out', onClick: handleLogout },
        ] : [
          { label: 'Discover', href: '/browse', active: true },
          { label: 'Sign In', href: '/login' },
        ]}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10">
        <section className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#2C5F7C]">Research Portal</p>
              <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A] sm:text-[38px]">
                Curated Research Opportunities
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Handpicked projects from leading labs and project owners, designed for fast research-fit decisions.
              </p>
            </div>
            <span className="w-fit rounded border border-[#E0D8CC] bg-white px-3 py-2 text-xs font-semibold text-[#1A1A1A]">
              {filteredProjects.length} projects
            </span>
          </div>
        </section>

        <section className="mb-6 grid gap-3 rounded-[8px] border border-[#E0D8CC] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:grid-cols-[minmax(280px,1fr)_170px_170px_auto_auto]">
          <label className="relative block">
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Search projects, topics, project owners..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded border border-[#E0D8CC] bg-[#FFFEFB] px-4 pr-10 text-sm text-[#1A1A1A] outline-none transition-all placeholder:text-[#6B6B6B] focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
            />
          </label>
          <select
            aria-label="Select research area"
            value={selectedArea || ''}
            onChange={(event) => setSelectedArea(event.target.value || null)}
            className="h-11 rounded border border-[#E0D8CC] bg-[#FFFEFB] px-3 text-sm text-[#1A1A1A] outline-none transition-all focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          >
            <option value="">All Fields</option>
            {researchAreas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <select
            aria-label="Select location"
            value={selectedLocation || ''}
            onChange={(event) => setSelectedLocation(event.target.value || null)}
            className="h-11 rounded border border-[#E0D8CC] bg-[#FFFEFB] px-3 text-sm text-[#1A1A1A] outline-none transition-all focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <Button variant="outline" className="h-11" onClick={resetFilters}>Reset</Button>
          <Button
            variant={openOnly ? 'gold' : 'outline'}
            className="h-11"
            onClick={() => setOpenOnly((value) => !value)}
          >
            Seats Available
          </Button>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project, index) => {
            const applicationButton = getApplicationButtonState(project);
            const isSaved = savedProjectIds.has(project.id);
            const isFull = project.availableSeats <= 0;
            const projectImage = getProjectImage(project, index);

            return (
              <article
                key={project.id}
                className="group overflow-hidden rounded-[8px] border border-[#E0D8CC] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 ease hover:border-[#8d633f] hover:shadow-[0_12px_26px_rgba(60,42,27,0.10)]"
              >
                <div className="relative aspect-video overflow-hidden border-b border-[#E0D8CC] bg-[#E8E1D6]">
                  <img
                    src={projectImage}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 ease group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,26,26,0.06),rgba(26,26,26,0.08)_42%,rgba(26,26,26,0.28))]" />
                  <div className="absolute left-4 top-4 right-14 flex flex-wrap gap-2">
                    <Badge variant={isFull ? 'gold' : 'green'} dot>{isFull ? 'Full' : 'Open'}</Badge>
                    <span className="rounded border border-white/70 bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1A1A1A] shadow-[0_4px_14px_rgba(26,26,26,0.08)] backdrop-blur-sm">
                      {project.availableSeats}/{project.capacity} seats
                    </span>
                    <span className="rounded border border-white/70 bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#2C5F7C] shadow-[0_4px_14px_rgba(26,26,26,0.08)] backdrop-blur-sm">
                      {project.researchArea}
                    </span>
                  </div>
                  <button
                    type="button"
                    title={isSaved ? 'Remove saved project' : 'Save project'}
                    aria-label={isSaved ? 'Remove saved project' : 'Save project'}
                    className={`absolute right-4 top-4 grid h-9 w-9 shrink-0 place-items-center rounded border shadow-[0_4px_14px_rgba(26,26,26,0.08)] backdrop-blur-sm transition-all ${isSaved ? 'border-[#8b603b] bg-[#8b603b] text-white' : 'border-white/70 bg-white/90 text-[#5f534a] hover:border-[#8b603b] hover:text-[#8b603b]'}`}
                    onClick={() => handleToggleSave(project.id)}
                  >
                    <BookmarkIcon filled={isSaved} />
                  </button>
                </div>

                <div className="bg-[#FFFEFB] px-4 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Link
                      href={`/profiles/${project.owner.slug}`}
                      title={`View ${project.owner.displayName}'s profile`}
                      aria-label={`View ${project.owner.displayName}'s profile`}
                      className="mt-0.5 shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[#FFFEFB] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#8b603b]"
                    >
                      <Avatar
                        name={project.owner.displayName}
                        size="sm"
                        className="overflow-hidden rounded-full"
                      />
                    </Link>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1A1A1A]">{project.owner.displayName}</p>
                      <h2 className="mt-1 line-clamp-2 text-[16px] font-semibold leading-snug text-[#1A1A1A]">
                        {project.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-[#5B5148]">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <LocationIcon />
                          <span className="truncate">{project.location || 'Location pending'}</span>
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <CalendarIcon />
                          <span className="truncate">{project.startTime} to {project.endTime || 'Ongoing'}</span>
                        </span>
                      </div>
                      {project.description && (
                        <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#5B5148]">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant={applicationButton.application ? 'outline' : 'gold'}
                      size="sm"
                      className="w-full min-w-0 px-3 text-[12px] sm:min-w-0 sm:px-3 sm:text-[12px]"
                      disabled={applicationButton.disabled}
                      onClick={() => applicationButton.application ? handleCancelApply(project.id) : handleApply(project.id)}
                    >
                      {applicationButton.label}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full min-w-0 px-3 text-[12px] sm:min-w-0 sm:px-3 sm:text-[12px]"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {filteredProjects.length === 0 && (
          <div className="rounded-[8px] border border-[#E0D8CC] bg-white py-16 text-center">
            <p className="text-sm text-[#1A1A1A]">No projects match your filters.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={resetFilters}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      {selectedProject && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(26,26,26,0.32)] px-4 py-8"
          role="presentation"
          onClick={() => setSelectedProjectId(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-details-title"
            className="max-h-[calc(100vh-64px)] w-full max-w-[1040px] overflow-y-auto rounded-[8px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant={selectedProject.availableSeats <= 0 ? 'gold' : 'green'} dot>
                    {selectedProject.availableSeats <= 0 ? 'Full' : 'Open'}
                  </Badge>
                  <h3 id="project-details-title" className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1A1A]">
                    {selectedProject.title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close project details"
                  className="shrink-0 rounded border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] transition-all duration-200 ease hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                  onClick={() => setSelectedProjectId(null)}
                >
                  Close
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#1A1A1A]">
                <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2">
                  {selectedProject.availableSeats}/{selectedProject.capacity} seats
                </span>
                <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2">
                  {selectedProject.researchArea}
                </span>
                <span className="rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2">
                  {selectedProject.startTime} to {selectedProject.endTime || 'Ongoing'}
                </span>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 text-sm leading-6 text-[#1A1A1A]">
              <div className="flex items-start gap-3 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <Avatar name={selectedProject.owner.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A1A1A]">{selectedProject.owner.displayName}</p>
                  <p className="text-xs leading-5 text-[#1A1A1A]">
                    {[selectedProject.owner.title, selectedProject.owner.department, selectedProject.owner.institution].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 font-semibold">Project Overview</p>
                <p>{selectedProject.description}</p>
              </div>

              <div className="grid gap-2 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <p><span className="font-semibold">Timeline:</span> {selectedProject.startTime} to {selectedProject.endTime || 'Ongoing'}</p>
                {selectedProject.location && (
                  <p><span className="font-semibold">Location:</span> {selectedProject.location}</p>
                )}
                <p><span className="font-semibold">Research Area:</span> {selectedProject.researchArea}</p>
              </div>

              <div>
                <p className="mb-2 font-semibold">Requirements</p>
                <p>{selectedProject.requirements || 'No formal requirements listed yet.'}</p>
              </div>

              {appliedApplications[selectedProject.id]?.ownerFeedback && (
                <div className="rounded border border-[#A8D0E8] bg-[#EBF3F8] p-4">
                  <p className="mb-2 font-semibold">Owner Feedback</p>
                  <p>{appliedApplications[selectedProject.id].ownerFeedback}</p>
                </div>
              )}

              {selectedProject.owner.bioShort && (
                <div>
                  <p className="mb-2 font-semibold">Owner Focus</p>
                  <p>{selectedProject.owner.bioShort}</p>
                </div>
              )}

              <ResearchEvolutionTimeline compact />
            </div>

            <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[#E0D8CC] bg-white px-6 py-5">
              {(() => {
                const applicationButton = getApplicationButtonState(selectedProject);

                return (
                  <Button
                    variant={applicationButton.application ? 'outline' : 'gold'}
                    disabled={applicationButton.disabled}
                    onClick={() => applicationButton.application ? handleCancelApply(selectedProject.id) : handleApply(selectedProject.id)}
                  >
                    {applicationButton.label}
                  </Button>
                );
              })()}
              <Button
                variant="ghost"
                onClick={() => handleToggleSave(selectedProject.id)}
              >
                {savedProjectIds.has(selectedProject.id) ? 'Remove Saved' : 'Save Project'}
              </Button>
            </div>
          </section>
        </div>
      )}

      {pendingCancelProject && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-[rgba(26,26,26,0.34)] px-4 py-8"
          role="presentation"
          onClick={() => setPendingCancelProjectId(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-application-title"
            className="w-full max-w-[420px] rounded-[8px] border border-[#E0D8CC] bg-white p-6 shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="cancel-application-title" className="text-lg font-semibold text-[#1A1A1A]">Withdraw Application?</h3>
            <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
              You are about to withdraw your application for &quot;{pendingCancelProject.title}&quot;. You can apply again later if seats remain open.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingCancelProjectId(null)}>Cancel</Button>
              <Button variant="gold" onClick={confirmCancelApply} disabled={cancellingProjectId === pendingCancelProject.id}>
                {cancellingProjectId === pendingCancelProject.id ? 'Withdrawing...' : 'Confirm Withdraw'}
              </Button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 top-20 z-[300] w-[calc(100vw-32px)] max-w-sm sm:right-6">
          <div className={`rounded-[8px] border px-4 py-3 text-sm font-medium shadow-[0_12px_28px_rgba(26,26,26,0.12)] ${getToastClassName(toast.tone)}`}>
            {toast.message}
          </div>
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
