import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import './explore.css';

export const metadata: Metadata = {
  title: 'AI专业探索 - ScholarBridge',
  description: '探索人工智能各研究方向，了解AI专业的各个领域',
};

async function getExploreDomains() {
  const domains = await db.aIDomain.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { researchNodes: true }
      }
    }
  });
  return domains;
}

export default async function ExplorePage() {
  const domains = await getExploreDomains();

  return (
    <div className="explore-page">
      {/* Navigation */}
      <nav className="explore-nav">
        <Link href="/" className="explore-logo">
          ScholarBridge <span>/ AI Exploration</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="explore-content">
        {/* Hero Section */}
        <div className="explore-hero">
          <div className="explore-eyebrow">Discover Your AI Research Path</div>
          <h1 className="explore-title">
            Explore <em>Intelligence</em>,<br />Find Your Path
          </h1>
          <p className="explore-subtitle">
            了解人工智能专业的各个研究方向，找到你感兴趣的领域，开始你的AI学术之旅
          </p>
        </div>

        {/* Introduction */}
        <div className="explore-intro">
          <h2>什么是AI专业？</h2>
          <p>
            人工智能（AI）是一个跨学科领域，结合了计算机科学、数学、认知科学等多个学科的知识。
            在ScholarBridge的AI专业探索中，我们将AI分为8个主要方向，每个方向都包含理论、基础设施和应用三个层次。
          </p>
          <p>
            通过浏览不同的研究方向和代表性工作，你可以找到自己感兴趣的领域，并获得个性化的导师推荐。
          </p>
        </div>

        {/* Intelligence Domains Grid */}
        <div className="explore-grid">
          {domains.map((domain, index) => (
            <Link
              key={domain.id}
              href={`/explore/ai/${domain.slug}`}
              className="explore-card"
              style={{
                '--accent-color': domain.accentColor,
                '--accent-light': domain.accentColor,
                '--animation-delay': `${0.2 + index * 0.1}s`
              } as React.CSSProperties}
            >
              {domain.icon && (
                <span className="explore-card-icon">{domain.icon}</span>
              )}
              <h3 className="explore-card-title">{domain.shortName}</h3>
              <p className="explore-card-desc">{domain.description}</p>
              <div className="explore-card-meta">
                <span>{domain._count.researchNodes} 个研究方向</span>
                <span className="explore-card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Call to Action */}
        <div className="explore-cta">
          <h3>开始探索你的AI兴趣</h3>
          <p>
            选择一个方向，浏览相关的研究工作和代表性成果，标记你感兴趣的内容
          </p>
          <div className="explore-cta-buttons">
            <Link
              href="/explore/ai/logical-mathematical"
              className="explore-btn explore-btn-primary"
            >
              从逻辑数理智能开始
            </Link>
            <Link
              href="/browse"
              className="explore-btn explore-btn-secondary"
            >
              浏览导师地图
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
