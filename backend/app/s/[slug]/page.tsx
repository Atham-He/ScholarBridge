import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StartChatButton } from "@/app/s/[slug]/start-chat-button";
import "./skill-detail.css";

type Props = { params: Promise<{ slug: string }> };

export default async function SkillPublicPage(props: Props) {
  const { slug } = await props.params;
  const skill = await db.skill.findUnique({
    where: { slug },
    include: {
      owner: { include: { mentorProfile: true } },
      projects: {
        take: 3,
        orderBy: { sortOrder: 'asc' }
      }
    },
  });

  if (!skill || skill.status !== "PUBLISHED" || !skill.isPublic) {
    notFound();
  }

  const user = await getCurrentUser();
  const initials = skill.owner.mentorProfile?.displayName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'M';

  return (
    <div className="skill-detail-page">
      {/* Navigation */}
      <nav className="skill-detail-nav">
        <Link href="/browse" className="skill-detail-back-link">
          ← 返回导师列表
        </Link>
      </nav>

      {/* Main Content */}
      <div className="skill-detail-content">
        {/* Header Section */}
        <div className="skill-detail-header">
          <div className="skill-detail-eyebrow">Research Mentor Profile</div>
          <h1 className="skill-detail-title">{skill.title}</h1>

          {/* Mentor Info */}
          <div className="skill-detail-mentor-info">
            <div className="skill-detail-avatar">
              {initials}
            </div>
            <div className="skill-detail-mentor-text">
              <p className="skill-detail-institution">
                {skill.owner.mentorProfile?.institution}
                {skill.owner.mentorProfile?.department && ` · ${skill.owner.mentorProfile.department}`}
              </p>
              <p className="skill-detail-name">
                {skill.owner.mentorProfile?.title && `${skill.owner.mentorProfile.title} · `}
                {skill.owner.mentorProfile?.displayName}
              </p>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {skill.owner.mentorProfile?.bioShort && (
          <div className="skill-detail-section">
            <h2 className="skill-detail-section-title">导师简介</h2>
            <p className="skill-detail-bio">{skill.owner.mentorProfile.bioShort}</p>
          </div>
        )}

        {/* Research Description */}
        <div className="skill-detail-section">
          <h2 className="skill-detail-section-title">研究方向</h2>
          <div className="skill-detail-description">
            <pre className="skill-detail-markdown">{skill.profileMarkdown}</pre>
          </div>
        </div>

        {/* Projects */}
        {skill.projects && skill.projects.length > 0 && (
          <div className="skill-detail-section">
            <h2 className="skill-detail-section-title">代表性项目</h2>
            <div className="skill-detail-projects">
              {skill.projects.map((project) => (
                <div key={project.id} className="skill-detail-project">
                  <h3 className="skill-detail-project-title">{project.title}</h3>
                  {project.description && (
                    <p className="skill-detail-project-desc">{project.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="skill-detail-cta">
          <div className="skill-detail-cta-left">
            <StartChatButton
              skillId={skill.id}
              slug={skill.slug}
              isStudent={user?.role === "STUDENT"}
              isMentor={user?.role === "MENTOR"}
              isOwner={user?.id === skill.ownerUserId}
            />
          </div>
          <div className="skill-detail-cta-right">
            <Link href="/browse" className="skill-detail-cta-back">
              浏览其他导师 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
