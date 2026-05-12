/**
 * Browse page - project-first student discovery.
 */

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
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
  capacity: number;
  enrolled: number;
  availableSeats: number;
  mentor: {
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
  role: string;
  displayName: string;
}

interface AppliedApplication {
  id: string;
  status: string;
}

export default function BrowsePage() {
  const [projects, setProjects] = useState<ProjectOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [appliedApplications, setAppliedApplications] = useState<Record<string, AppliedApplication>>({});
  const [applyingProjectId, setApplyingProjectId] = useState<string | null>(null);
  const [cancellingProjectId, setCancellingProjectId] = useState<string | null>(null);
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchUser();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProjectId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setUser(data.user);
      if (data.user?.role === 'STUDENT') {
        fetchSavedProjects();
        fetchApplications();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchSavedProjects = async () => {
    try {
      const response = await fetch('/api/student/saved-projects');
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
      const response = await fetch('/api/student/applications');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const activeApplications = (data.apps || []).reduce(
        (current: Record<string, AppliedApplication>, app: { id: string; projectId: string; status: string }) => {
          if (app.status !== 'WITHDRAWN') {
            current[app.projectId] = { id: app.id, status: app.status };
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
    }
  };

  const handleApply = async (projectId: string) => {
    if (!user) {
      alert('Please log in to apply. You will return to Browse after login.');
      window.location.href = `/login?next=${encodeURIComponent('/browse')}`;
      return;
    }

    setApplyingProjectId(projectId);
    try {
      const response = await fetch('/api/student/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.application?.id) {
          setAppliedApplications((current) => ({
            ...current,
            [projectId]: { id: data.application.id, status: data.application.status },
          }));
        }
        return;
      }

      const data = await response.json();
      if (response.status === 409) {
        fetchApplications();
      }
      alert(data.error || 'Application failed');
    } catch {
      alert('Application failed');
    } finally {
      setApplyingProjectId(null);
    }
  };

  const handleCancelApply = async (projectId: string) => {
    const application = appliedApplications[projectId];
    if (!application) {
      return;
    }

    if (!confirm('Cancel this application?')) {
      return;
    }

    setCancellingProjectId(projectId);
    try {
      const response = await fetch(`/api/applications/${application.id}/withdraw`, {
        method: 'POST',
      });

      if (response.ok) {
        setAppliedApplications((current) => {
          const next = { ...current };
          delete next[projectId];
          return next;
        });
        return;
      }

      const data = await response.json().catch(() => ({}));
      alert(data.error || 'Failed to cancel application');
    } catch {
      alert('Failed to cancel application');
    } finally {
      setCancellingProjectId(null);
    }
  };

  const handleToggleSave = async (projectId: string) => {
    if (!user) {
      alert('Please log in to save projects. You will return to Browse after login.');
      window.location.href = `/login?next=${encodeURIComponent('/browse')}`;
      return;
    }

    const isSaved = savedProjectIds.has(projectId);
    const response = await fetch(
      isSaved ? `/api/student/saved-projects?projectId=${encodeURIComponent(projectId)}` : '/api/student/saved-projects',
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
      return;
    }

    if (response.status === 401) {
      alert('Please log in to save projects. You will return to Browse after login.');
      window.location.href = `/login?next=${encodeURIComponent('/browse')}`;
      return;
    }

    const data = await response.json().catch(() => ({}));
    alert(data.error || 'Failed to update saved project');
  };

  const filteredProjects = projects.filter((project) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = !normalizedQuery ||
      project.title.toLowerCase().includes(normalizedQuery) ||
      project.description.toLowerCase().includes(normalizedQuery) ||
      project.researchArea.toLowerCase().includes(normalizedQuery) ||
      project.mentor.displayName.toLowerCase().includes(normalizedQuery) ||
      project.mentor.institution.toLowerCase().includes(normalizedQuery);

    const matchesArea = !selectedArea || project.researchArea === selectedArea;
    const matchesOpenSeats = !openOnly || project.availableSeats > 0;

    return matchesSearch && matchesArea && matchesOpenSeats;
  });

  const getFilterChipClassName = (active: boolean) =>
    [
      'rounded-full border py-[7px] px-4 text-[13px] font-medium transition-all duration-200 ease',
      active
        ? 'border-[#2C5F7C] bg-[#2C5F7C] text-white'
        : 'border-[#E0D8CC] bg-white text-[#1A1A1A] hover:border-[#2C5F7C] hover:text-[#2C5F7C]'
    ].join(' ');

  const researchAreas = Array.from(new Set(projects.map((project) => project.researchArea))).slice(0, 8);
  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) || null
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#2C5F7C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#1A1A1A]">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px]">
        <div className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer" onClick={() => window.location.href = '/'}>
          ScholarBridge
        </div>
        <div className="flex gap-2.5">
          <button className="bg-[#2C5F7C] text-white border border-[#2C5F7C] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease font-family-body">Discover</button>
          {user ? (
            <>
              <button className="bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease font-family-body hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]" onClick={() => window.location.href = '/student/profile'}>Profile</button>
              <Button variant="gold" size="sm" onClick={handleLogout}>Sign Out</Button>
            </>
          ) : (
            <Button variant="gold" size="sm" onClick={() => window.location.href = '/login'}>Sign In</Button>
          )}
        </div>
      </nav>

      <main className="py-8 px-10 max-w-7xl mx-auto">
        <section className="mb-8">
          <p className="text-xs tracking-[0.08em] uppercase text-[#2C5F7C] mb-2 font-semibold">Student Portal</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-[32px] mb-2 font-semibold text-[#1A1A1A] tracking-[-0.02em]">
                Discover Research Opportunities
              </h2>
              <p className="text-[14px] text-[#1A1A1A] max-w-3xl">
                Start with open projects, then use each mentor profile as context for research fit.
              </p>
            </div>
            <div className="flex gap-3 text-sm text-[#1A1A1A]">
              <span className="rounded border border-[#E0D8CC] bg-white px-3 py-2">{filteredProjects.length} projects</span>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col gap-3 lg:flex-row">
          <input
            type="text"
            placeholder="Search by project, research area, mentor, or institution..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="flex-1 py-[11px] px-4 border border-[#E0D8CC] rounded text-[14px] text-[#1A1A1A] placeholder:text-[#4A4A4A] font-family-body outline-none transition-all duration-200 ease bg-white focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
          />
          <Button variant="gold">Search</Button>
          <Button
            variant={openOnly ? 'gold' : 'outline'}
            onClick={() => setOpenOnly((value) => !value)}
          >
            Seats Available
          </Button>
        </section>

        <section className="flex gap-2.5 flex-wrap mb-7">
          <button
            className={getFilterChipClassName(selectedArea === null)}
            onClick={() => setSelectedArea(null)}
          >
            All Fields
          </button>
          {researchAreas.map((area) => (
            <button
              key={area}
              className={getFilterChipClassName(selectedArea === area)}
              onClick={() => setSelectedArea(area)}
            >
              {area}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
          {filteredProjects.map((project) => {
            const isApplied = Boolean(appliedApplications[project.id]);
            const isSaved = savedProjectIds.has(project.id);
            const isFull = project.availableSeats <= 0;

            return (
              <article
                key={project.id}
                className="bg-white border border-[#E0D8CC] rounded-[10px] p-6 transition-all duration-200 ease hover:border-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Badge variant={isFull ? 'gold' : 'green'}>{isFull ? 'Full' : 'Open'}</Badge>
                    <h3 className="mt-3 text-[20px] font-semibold leading-snug text-[#1A1A1A]">{project.title}</h3>
                  </div>
                  <span className="shrink-0 rounded border border-[#E0D8CC] bg-[#F5F2ED] px-3 py-2 text-xs font-semibold text-[#1A1A1A]">
                    {project.availableSeats}/{project.capacity} seats
                  </span>
                </div>

                <p className="mb-4 line-clamp-3 text-sm leading-6 text-[#1A1A1A]">{project.description}</p>

                <div className="mb-5 grid gap-2 text-sm text-[#1A1A1A]">
                  <span>Research area: {project.researchArea}</span>
                  <span>Timeline: {project.startTime} - {project.endTime || 'Ongoing'}</span>
                  {project.location && <span>Location: {project.location}</span>}
                </div>

                <div className="mb-5 flex items-start gap-3 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-3">
                  <Avatar name={project.mentor.displayName} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1A1A1A]">{project.mentor.displayName}</p>
                    <p className="text-xs leading-5 text-[#1A1A1A]">
                      {[project.mentor.title, project.mentor.department, project.mentor.institution].filter(Boolean).join(' - ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={isApplied ? 'outline' : 'gold'}
                    disabled={
                      isFull ||
                      applyingProjectId === project.id ||
                      cancellingProjectId === project.id
                    }
                    onClick={() => isApplied ? handleCancelApply(project.id) : handleApply(project.id)}
                  >
                    {cancellingProjectId === project.id
                      ? 'Cancelling...'
                      : isApplied
                        ? 'Cancel apply'
                        : applyingProjectId === project.id
                          ? 'Applying...'
                          : isFull
                            ? 'Full'
                            : 'Apply'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    View details
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleToggleSave(project.id)}
                  >
                    {isSaved ? '已收藏' : '收藏'}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        {filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#1A1A1A] text-[14px]">No projects found matching your criteria.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setSelectedArea(null);
                setOpenOnly(false);
              }}
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
            className="max-h-[calc(100vh-64px)] w-full max-w-[720px] overflow-y-auto rounded-[10px] border border-[#E0D8CC] bg-white shadow-[0_18px_48px_rgba(26,26,26,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#E0D8CC] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant={selectedProject.availableSeats <= 0 ? 'gold' : 'green'}>
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
                  {selectedProject.startTime} - {selectedProject.endTime || 'Ongoing'}
                </span>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 text-sm leading-6 text-[#1A1A1A]">
              <div className="flex items-start gap-3 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <Avatar name={selectedProject.mentor.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A1A1A]">{selectedProject.mentor.displayName}</p>
                  <p className="text-xs leading-5 text-[#1A1A1A]">
                    {[selectedProject.mentor.title, selectedProject.mentor.department, selectedProject.mentor.institution].filter(Boolean).join(' - ')}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 font-semibold">Project overview</p>
                <p>{selectedProject.description}</p>
              </div>

              <div className="grid gap-2 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4">
                <p><span className="font-semibold">Timeline:</span> {selectedProject.startTime} - {selectedProject.endTime || 'Ongoing'}</p>
                {selectedProject.location && (
                  <p><span className="font-semibold">Location:</span> {selectedProject.location}</p>
                )}
                <p><span className="font-semibold">Research area:</span> {selectedProject.researchArea}</p>
              </div>

              <div>
                <p className="mb-2 font-semibold">Requirements</p>
                <p>{selectedProject.requirements || 'No formal requirements listed yet.'}</p>
              </div>

              {selectedProject.mentor.bioShort && (
                <div>
                  <p className="mb-2 font-semibold">Mentor focus</p>
                  <p>{selectedProject.mentor.bioShort}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#E0D8CC] px-6 py-5">
              <Button
                variant={appliedApplications[selectedProject.id] ? 'outline' : 'gold'}
                disabled={
                  selectedProject.availableSeats <= 0 ||
                  applyingProjectId === selectedProject.id ||
                  cancellingProjectId === selectedProject.id
                }
                onClick={() => appliedApplications[selectedProject.id] ? handleCancelApply(selectedProject.id) : handleApply(selectedProject.id)}
              >
                {cancellingProjectId === selectedProject.id
                  ? 'Cancelling...'
                  : appliedApplications[selectedProject.id]
                    ? 'Cancel apply'
                    : applyingProjectId === selectedProject.id
                      ? 'Applying...'
                      : selectedProject.availableSeats <= 0
                        ? 'Full'
                        : 'Apply'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleToggleSave(selectedProject.id)}
              >
                {savedProjectIds.has(selectedProject.id) ? '已收藏' : '收藏'}
              </Button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .font-display {
          font-family: 'Cormorant Garamond', serif;
        }
        .font-family-body {
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
    </div>
  );
}
