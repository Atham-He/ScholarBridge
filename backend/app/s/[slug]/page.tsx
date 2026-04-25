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
