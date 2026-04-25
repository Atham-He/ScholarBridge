import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import './direction.css';

interface PageProps {
  params: Promise<{ directionSlug: string }>;
}

type LayerKey = 'theory' | 'infrastructure' | 'application';

const layerPresentation: Record<
  LayerKey,
  {
    kicker: string;
    headline: string;
    detail: string;
  }
> = {
  theory: {
    kicker: 'Theory Core',
    headline: '理论层',
    detail: '训练范式、优化机制与推理方法',
  },
  infrastructure: {
    kicker: 'System Stack',
    headline: '基础设施层',
    detail: 'serving、训练系统、数据工程与评测平台',
  },
  application: {
    kicker: 'Applied Frontier',
    headline: '应用层',
    detail: 'AI4Math、AI4Science 与算法发现等落地场景',
  },
};

const directionFeatureMedia: Record<
  string,
  {
    videoSrc?: string;
  }
> = {
  'logical-mathematical': {
    videoSrc: '/videos/logical-mathematical-overview-reasoning.mp4',
  },
};

const layerIconAssets: Partial<Record<LayerKey, string>> = {
  theory: '/icons/explore/theory-layer-icon-v2.png',
  application: '/icons/explore/application-layer-icon-v2.png',
  infrastructure: '/icons/explore/infrastructure-layer-icon-v2.png',
};

function LayerGlyph({ layerKey }: { layerKey: LayerKey }) {
  if (layerKey === 'theory') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 18L12 5L19 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 13H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (layerKey === 'infrastructure') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4.5" y="5.5" width="15" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4.5" y="14.5" width="15" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17L17.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 6.5H17.5V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 12.5C5.5 15.2614 7.73858 17.5 10.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

async function getDirectionDetails(directionSlug: string) {
  const domain = await db.aIDomain.findUnique({
    where: { slug: directionSlug },
    include: {
      researchNodes: {
        include: {
          layer: true,
          works: {
            take: 3,
            orderBy: { year: 'desc' }
          }
        },
        orderBy: [{ layerKey: 'asc' }, { createdAt: 'asc' }]
      }
    }
  });

  if (!domain) {
    return null;
  }

  const layers = await db.aIResearchLayer.findMany({
    orderBy: { order: 'asc' }
  });

  return { domain, layers };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { directionSlug } = await params;
  const data = await getDirectionDetails(directionSlug);

  if (!data) {
    return {
      title: '方向未找到 - ScholarBridge'
    };
  }

  return {
    title: `${data.domain.name} - AI专业探索`,
    description: data.domain.description,
  };
}

export default async function DirectionDetailPage({ params }: PageProps) {
  const { directionSlug } = await params;
  const data = await getDirectionDetails(directionSlug);

  if (!data) {
    notFound();
  }

  const { domain, layers } = data;
  const featuredMedia = directionFeatureMedia[domain.slug];

  return (
    <div className="direction-page" style={{ '--accent-color': domain.accentColor } as React.CSSProperties}>
      {/* Navigation */}
      <nav className="direction-nav">
        <Link href="/explore" className="direction-back-link">
          ← 返回AI专业探索
        </Link>
      </nav>

      {/* Main Content */}
      <div className="direction-content">
        <section className="direction-hero-shell">
          <div className="direction-header">
            {domain.icon && (
              <span className="direction-icon">{domain.icon}</span>
            )}
            <div className="direction-kicker">AI Domain Overview</div>
            <h1 className="direction-title">{domain.name}</h1>
            <p className="direction-subtitle">{domain.description}</p>
          </div>

          {featuredMedia?.videoSrc && (
            <div className="direction-feature-video" aria-label={`${domain.name} video`}>
              <video
                className="direction-feature-media"
                controls
                autoPlay
                muted
                loop
                preload="metadata"
                playsInline
                src={featuredMedia.videoSrc}
              />
            </div>
          )}
        </section>

        {/* Three Layer Structure */}
        {layers.map((layer) => {
          const layerNodes = domain.researchNodes.filter(
            node => node.layerKey === layer.key
          );

          if (layerNodes.length === 0) return null;

          return (
            <div key={layer.id} id={`layer-${layer.key}`} className="direction-layer">
              <div className="direction-layer-header">
                <span
                  className="direction-layer-icon"
                  style={layerIconAssets[layer.key as LayerKey]
                    ? {
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                      }
                    : undefined}
                >
                  {layerIconAssets[layer.key as LayerKey] ? (
                    <Image
                      src={layerIconAssets[layer.key as LayerKey]!}
                      alt=""
                      width={58}
                      height={58}
                      className="direction-layer-icon-image"
                      style={{ background: 'transparent' }}
                    />
                  ) : (
                    <LayerGlyph layerKey={layer.key as LayerKey} />
                  )}
                </span>
                <div>
                  <p className="direction-layer-kicker">
                    {layerPresentation[layer.key as LayerKey]?.kicker || 'Research Layer'}
                  </p>
                  <h2 className="direction-layer-title">{layer.name}</h2>
                  <p className="direction-layer-desc">{layer.description}</p>
                </div>
                <div className="direction-layer-meta">
                  <span className="direction-layer-meta-count">{layerNodes.length}</span>
                  <span className="direction-layer-meta-label">nodes</span>
                </div>
              </div>

              <div className="direction-nodes-grid">
                {layerNodes.map((node) => (
                  <Link
                    key={node.id}
                    href={`/explore/ai/${domain.slug}/${layer.key}/${node.slug}`}
                    className="direction-node-card"
                    style={{ '--accent-color': domain.accentColor } as React.CSSProperties}
                  >
                    <h3 className="direction-node-title">{node.title}</h3>
                    <p className="direction-node-summary">{node.summary}</p>

                    {node.works.length > 0 && (
                      <div className="direction-node-works">
                        <p className="direction-node-works-label">代表工作</p>
                        {node.works.slice(0, 2).map((work) => (
                          <div key={work.id} className="direction-node-work">
                            • {work.title}
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.isArray(node.tags) && node.tags.some((tag) => typeof tag === 'string') && (
                      <div className="direction-node-tags">
                        {node.tags
                          .filter((tag): tag is string => typeof tag === 'string')
                          .slice(0, 3)
                          .map((tag, index) => (
                          <span key={index} className="direction-node-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* Call to Action */}
        <div className="direction-cta">
          <h3>深入了解这个方向</h3>
          <p>选择一个研究节点，浏览相关的代表性工作，标记你感兴趣的内容</p>
          <Link
            href="/explore/ai/recommendations"
            className="direction-btn"
          >
            查看个性化推荐
          </Link>
        </div>
      </div>
    </div>
  );
}
