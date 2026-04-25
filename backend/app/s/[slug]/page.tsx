import Link from "next/link";
import { notFound } from "next/navigation";
import { StartChatButton } from "@/app/s/[slug]/start-chat-button";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import "./skill-detail.css";

type Props = { params: Promise<{ slug: string }> };

export default async function SkillPublicPage(props: Props) {
  const { slug } = await props.params;
  const skill = await db.skill.findUnique({
    where: { slug },
    include: {
      owner: { include: { mentorProfile: true } },
      persona: true,
      projects: {
        take: 3,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!skill || skill.status !== "PUBLISHED" || !skill.isPublic) {
    notFound();
  }

  const user = await getCurrentUser();
  const isOwner = user?.id === skill.ownerUserId;
  const initials =
    skill.owner.mentorProfile?.displayName
      ?.split(" ")
      .map((name: string) => name[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "M";
  const introVideoUrl = skill.owner.mentorProfile?.introVideoUrl;
  const introVideoPosterUrl = skill.owner.mentorProfile?.introVideoPosterUrl;
  const scholarUrl = skill.owner.mentorProfile?.scholarUrl;
  const openRolesCount = skill.projects.filter((project) => project.status === "OPEN").length;

  return (
    <div className="skill-detail-page">
      <nav className="skill-detail-nav">
        <Link href="/browse" className="skill-detail-back-link">
          Back to mentors
        </Link>
      </nav>

      <div className="skill-detail-content">
        <div className="skill-detail-header">
          <div className="skill-detail-eyebrow">Research Mentor Profile</div>
          <h1 className="skill-detail-title">{skill.title}</h1>

          <div className="skill-detail-mentor-info">
            <div className="skill-detail-avatar">{initials}</div>
            <div className="skill-detail-mentor-text">
              <p className="skill-detail-institution">
                {skill.owner.mentorProfile?.institution}
                {skill.owner.mentorProfile?.department &&
                  ` / ${skill.owner.mentorProfile.department}`}
              </p>
              <p className="skill-detail-name">
                {skill.owner.mentorProfile?.title &&
                  `${skill.owner.mentorProfile.title} / `}
                {skill.owner.mentorProfile?.displayName}
              </p>
            </div>
          </div>

          <div className="skill-detail-header-video">
            <h2 className="skill-detail-inline-title">导师介绍视频</h2>
            {introVideoUrl ? (
              <div className="skill-detail-video-shell">
                <video
                  className="skill-detail-video"
                  controls
                  preload="metadata"
                  poster={introVideoPosterUrl ?? undefined}
                >
                  <source src={introVideoUrl} type="video/mp4" />
                  当前浏览器不支持视频播放。
                </video>
              </div>
            ) : (
              <div className="skill-detail-video-placeholder">
                <p className="skill-detail-video-placeholder-title">视频位已预留</p>
                <p className="skill-detail-video-placeholder-copy">
                  当前导师 Profile 已支持介绍视频字段，后续接入视频资源后会在这里展示。
                </p>
              </div>
            )}
          </div>

          <div className="skill-detail-stats">
            <div className="skill-detail-stat-card">
              <div className="skill-detail-stat-label">h-index</div>
              <div className="skill-detail-stat-value">
                {skill.hIndex != null ? skill.hIndex : "—"}
              </div>
            </div>
            <div className="skill-detail-stat-card">
              <div className="skill-detail-stat-label">i10-index</div>
              <div className="skill-detail-stat-value">
                {skill.i10Index != null ? skill.i10Index : "—"}
              </div>
            </div>
            <div className="skill-detail-stat-card">
              <div className="skill-detail-stat-label">Citations</div>
              <div className="skill-detail-stat-value">
                {skill.citationsDisplay ?? "—"}
              </div>
            </div>
            <div className="skill-detail-stat-card">
              <div className="skill-detail-stat-label">Open Roles</div>
              <div className="skill-detail-stat-value">
                {openRolesCount}
              </div>
            </div>
          </div>

          {scholarUrl && (
            <div className="skill-detail-links">
              <a
                href={scholarUrl}
                target="_blank"
                rel="noreferrer"
                className="skill-detail-link-chip"
              >
                Google Scholar ↗
              </a>
            </div>
          )}
        </div>

        {skill.owner.mentorProfile?.bioShort && (
          <div className="skill-detail-section">
            <h2 className="skill-detail-section-title">Mentor Bio</h2>
            <p className="skill-detail-bio">
              {skill.owner.mentorProfile.bioShort}
            </p>
          </div>
        )}

        <div className="skill-detail-section">
          <h2 className="skill-detail-section-title">Research Direction</h2>
          <div className="skill-detail-description">
            <pre className="skill-detail-markdown">{skill.profileMarkdown}</pre>
          </div>
        </div>

        {skill.projects && skill.projects.length > 0 && (
          <div className="skill-detail-section">
            <h2 className="skill-detail-section-title">Representative Projects</h2>
            <div className="skill-detail-projects">
              {skill.projects.map((project) => (
                <div key={project.id} className="skill-detail-project">
                  <h3 className="skill-detail-project-title">{project.title}</h3>
                  {project.description && (
                    <p className="skill-detail-project-desc">
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="skill-detail-cta">
          <div className="skill-detail-cta-left">
            <StartChatButton
              skillId={skill.id}
              slug={skill.slug}
              isStudent={user?.role === "STUDENT"}
              isMentor={user?.role === "MENTOR"}
              isOwner={isOwner}
            />
          </div>
          <div className="skill-detail-cta-right">
            {isOwner && skill.persona && (
              <Link
                href={`/mentor/skills/${skill.slug}/persona`}
                className="skill-detail-cta-back"
              >
                Update persona evidence
              </Link>
            )}
            <Link href="/browse" className="skill-detail-cta-back">
              Browse other mentors
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
