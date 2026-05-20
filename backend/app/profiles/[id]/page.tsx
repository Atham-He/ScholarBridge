'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppNav } from '@/components/layout/AppNav';
import { ProfilePanel } from '@/components/layout/ProfileFrame';
import { ResearchEvolutionTimeline } from '@/components/research/ResearchEvolutionTimeline';
import { ResearchInterestCloud } from '@/components/research/ResearchInterestCloud';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ProfileProject {
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
}

interface PublicProfile {
  id: string;
  displayName: string;
  institution: string;
  department?: string | null;
  title?: string | null;
  bioShort?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  researchAreas: string[];
  openProjectCount: number;
  openSeats: number;
  projects: ProfileProject[];
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 18h4l4-12 4 12h4" />
      <path d="M4 18h16" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h10" />
      <path d="M7 4v4M12 10v4M17 16v4" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex min-w-[150px] items-center gap-3 rounded-[7px] px-3 py-3 text-sm font-semibold text-[#3f352d] transition hover:bg-[#f6f0e8] hover:text-[#17425d] lg:w-full lg:min-w-0"
    >
      <span className="text-[#7a6f65]">{icon}</span>
      {label}
    </a>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setError(null);
      try {
        const response = await fetch(`/api/profiles/${params.id}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || 'Profile not found.');
          return;
        }
        setProfileData(data.profile);
      } catch {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#8b603b] border-t-transparent" />
          <p className="text-[#17120e]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <AppNav items={[{ label: 'Discover', href: '/browse' }]} />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <ProfilePanel title="Profile unavailable">
            <p className="text-sm leading-6 text-[#5B5148]">{error || 'Profile not found.'}</p>
            <Button className="mt-5" variant="outline" onClick={() => router.push('/browse')}>
              Back to Discover
            </Button>
          </ProfilePanel>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[#FAF8F5]">
      <AppNav items={[{ label: 'Discover', href: '/browse' }, { label: 'Public Profile', active: true }]} />
      <main className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#E0D8CC] bg-[#fffdf9] lg:border-b-0 lg:border-r">
          <nav className="p-3 lg:sticky lg:top-[88px] lg:p-5">
            <div className="mb-4 rounded-[8px] border border-[#E0D8CC] bg-white p-4">
              <div className="flex items-start gap-3">
                <Avatar name={profileData.displayName} size="lg" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b603b]">Public Profile</p>
                  <h2 className="mt-1 text-[18px] font-semibold leading-6 text-[#17120e]">{profileData.displayName}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#5B5148]">
                    {[profileData.department, profileData.institution].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[7px] border border-[#eee6dc] bg-[#fffdf9] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a8178]">Projects</p>
                  <p className="mt-1 text-[20px] font-semibold leading-none text-[#17120e]">{profileData.openProjectCount}</p>
                </div>
                <div className="rounded-[7px] border border-[#eee6dc] bg-[#fffdf9] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a8178]">Seats</p>
                  <p className="mt-1 text-[20px] font-semibold leading-none text-[#17120e]">{profileData.openSeats}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto lg:block lg:overflow-visible">
              <SidebarLink href="#overview" icon={<ProfileIcon />} label="Overview" />
              <SidebarLink href="#timeline" icon={<TimelineIcon />} label="Research Timeline" />
              <SidebarLink href="#focus" icon={<FocusIcon />} label="Research Focus" />
              <SidebarLink href="#opportunities" icon={<ProjectsIcon />} label="Opportunities" />
              <button
                type="button"
                onClick={() => router.push('/browse')}
                className="flex min-w-[150px] items-center gap-3 rounded-[7px] px-3 py-3 text-left text-sm font-semibold text-[#3f352d] transition hover:bg-[#f6f0e8] hover:text-[#17425d] lg:mt-2 lg:w-full lg:min-w-0"
              >
                <span className="text-[#7a6f65]"><BackIcon /></span>
                Back to Discover
              </button>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
          <section id="overview" className="scroll-mt-28 rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 gap-4">
                <Avatar name={profileData.displayName} size="lg" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b603b]">Public Profile</p>
                  <h1 className="mt-2 font-display text-[38px] font-semibold leading-tight text-[#17120e]">{profileData.displayName}</h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#17120e]">
                    {[profileData.title, profileData.department, profileData.institution].filter(Boolean).join(' · ')}
                  </p>
                  {profileData.bioShort && <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B5148]">{profileData.bioShort}</p>}
                </div>
              </div>
              <Button variant="outline" onClick={() => router.push('/browse')}>
                Browse Projects
              </Button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                ['Open Projects', profileData.openProjectCount],
                ['Open Seats', profileData.openSeats],
                ['Fields', profileData.researchAreas.length || '-'],
                ['Location', profileData.location || 'Flexible'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] border border-[#eee6dc] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a8178]">{label}</p>
                  <p className="mt-1 text-[24px] font-semibold leading-none text-[#17120e]">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div id="timeline" className="scroll-mt-28">
            <ResearchEvolutionTimeline className="mt-5" compact />
          </div>

          <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[0.9fr_1.3fr]">
            <div id="focus" className="h-full scroll-mt-28">
              <ProfilePanel
                title="Research Focus"
                description="Areas this profile is actively recruiting for."
                className="h-full"
                bodyClassName="flex flex-col"
              >
                <div className="flex-1">
                  <ResearchInterestCloud
                    areas={profileData.researchAreas}
                    projectAreas={profileData.projects.map((project) => project.researchArea)}
                  />
                </div>
                <div className="mt-auto grid gap-2 border-t border-[#eee6dc] pt-4 text-sm leading-6 text-[#5B5148]">
                  {profileData.contactEmail && <p><span className="font-semibold text-[#17120e]">Email:</span> {profileData.contactEmail}</p>}
                  {profileData.website && (
                    <p>
                      <span className="font-semibold text-[#17120e]">Website:</span>{' '}
                      <a className="font-semibold text-[#8b603b] hover:underline" href={profileData.website} target="_blank" rel="noreferrer">
                        {profileData.website}
                      </a>
                    </p>
                  )}
                </div>
              </ProfilePanel>
            </div>

            <div id="opportunities" className="h-full scroll-mt-28">
              <ProfilePanel
                title="Open Research Opportunities"
                description="Current projects from this profile."
                className="h-full"
                bodyClassName="flex flex-col"
              >
                <div className="grid gap-3">
                  {profileData.projects.length === 0 ? (
                    <p className="text-sm text-[#5B5148]">No open projects right now.</p>
                  ) : profileData.projects.map((project) => (
                    <article key={project.id} className="rounded-[8px] border border-[#eee6dc] bg-[#fffdf9] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Badge variant={project.availableSeats > 0 ? 'green' : 'gold'}>
                            {project.availableSeats > 0 ? 'Open' : 'Full'}
                          </Badge>
                          <h3 className="mt-3 text-[17px] font-semibold text-[#17120e]">{project.title}</h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5B5148]">{project.description}</p>
                          <p className="mt-2 text-xs font-medium text-[#5B5148]">
                            {project.location || 'Location pending'} · {project.startTime} to {project.endTime || 'Ongoing'} · {project.availableSeats}/{project.capacity} seats
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push('/browse')}>
                          View
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </ProfilePanel>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
