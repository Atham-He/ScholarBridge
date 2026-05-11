/**
 * Browse page - project-first student discovery.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
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
  agent: {
    active: boolean;
  };
}

interface User {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

export default function BrowsePage() {
  const [projects, setProjects] = useState<ProjectOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [appliedProjectIds, setAppliedProjectIds] = useState<Set<string>>(new Set());
  const [applyingProjectId, setApplyingProjectId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
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
      window.location.href = '/login';
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
        setAppliedProjectIds((current) => new Set(current).add(projectId));
        return;
      }

      const data = await response.json();
      if (response.status === 409) {
        setAppliedProjectIds((current) => new Set(current).add(projectId));
      }
      alert(data.error || 'Application failed');
    } catch {
      alert('Application failed');
    } finally {
      setApplyingProjectId(null);
    }
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

  const researchAreas = Array.from(new Set(projects.map((project) => project.researchArea))).slice(0, 8);

  const representedMentors = useMemo(() => {
    const mentors = new Map<string, ProjectOpportunity['mentor'] & { projectCount: number }>();
    projects.forEach((project) => {
      const existing = mentors.get(project.mentor.id);
      if (existing) {
        existing.projectCount += 1;
      } else {
        mentors.set(project.mentor.id, { ...project.mentor, projectCount: 1 });
      }
    });
    return Array.from(mentors.values()).slice(0, 4);
  }, [projects]);

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
          <button className="nav-btn active text-[#1A1A1A]">Discover</button>
          {user ? (
            <>
              <button className="nav-btn text-[#1A1A1A]" onClick={() => window.location.href = '/student/profile'}>Profile</button>
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
                Start with open projects, then use each mentor profile and AI agent as context for research fit.
              </p>
            </div>
            <div className="flex gap-3 text-sm text-[#1A1A1A]">
              <span className="rounded border border-[#E0D8CC] bg-white px-3 py-2">{filteredProjects.length} projects</span>
              <span className="rounded border border-[#E0D8CC] bg-white px-3 py-2">{representedMentors.length} mentors</span>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col gap-3 lg:flex-row">
          <input
            type="text"
            placeholder="Search by project, research area, mentor, or institution..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="flex-1 py-[11px] px-4 border border-[#E0D8CC] rounded text-[14px] font-family-body outline-none transition-all duration-200 ease bg-white focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]"
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
            className={`filter-chip ${selectedArea === null ? 'filter-chip-active' : ''}`}
            onClick={() => setSelectedArea(null)}
          >
            All Fields
          </button>
          {researchAreas.map((area) => (
            <button
              key={area}
              className={`filter-chip ${selectedArea === area ? 'filter-chip-active' : ''}`}
              onClick={() => setSelectedArea(area)}
            >
              {area}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
          {filteredProjects.map((project) => {
            const isExpanded = selectedProjectId === project.id;
            const isApplied = appliedProjectIds.has(project.id);
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
                    {project.agent.active && (
                      <div className="mt-2">
                        <Badge variant="green" dot>Agent Active</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mb-5 rounded border border-[#E0D8CC] bg-[#FAF8F5] p-4 text-sm leading-6 text-[#1A1A1A]">
                    <p className="font-semibold">Requirements</p>
                    <p className="mt-1">{project.requirements || 'No formal requirements listed yet.'}</p>
                    {project.mentor.bioShort && (
                      <>
                        <p className="mt-4 font-semibold">Mentor focus</p>
                        <p className="mt-1">{project.mentor.bioShort}</p>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="gold"
                    disabled={isApplied || isFull || applyingProjectId === project.id}
                    onClick={() => handleApply(project.id)}
                  >
                    {isApplied ? 'Applied' : applyingProjectId === project.id ? 'Applying...' : isFull ? 'Full' : 'Apply'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedProjectId(isExpanded ? null : project.id)}
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled
                  >
                    Chat Agent
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

        {representedMentors.length > 0 && (
          <section className="mt-12 border-t border-[#E0D8CC] pt-8">
            <div className="mb-5">
              <h3 className="font-display text-[24px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">Mentors represented</h3>
              <p className="mt-1 text-sm text-[#1A1A1A]">Browse mentors as context after you find a promising project.</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {representedMentors.map((mentor) => (
                <div key={mentor.id} className="flex items-start gap-3 rounded border border-[#E0D8CC] bg-white p-4">
                  <Avatar name={mentor.displayName} size="sm" />
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{mentor.displayName}</p>
                    <p className="text-xs leading-5 text-[#1A1A1A]">{mentor.institution}</p>
                    <p className="mt-2 text-xs text-[#1A1A1A]">{mentor.projectCount} open project{mentor.projectCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

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
        .filter-chip {
          @apply rounded-full border border-[#E0D8CC] bg-white py-[7px] px-4 text-[13px] font-medium text-[#1A1A1A] transition-all duration-200 ease;
        }
        .filter-chip-active {
          @apply border-[#2C5F7C] bg-[#2C5F7C] text-white;
        }
      `}</style>
    </div>
  );
}
