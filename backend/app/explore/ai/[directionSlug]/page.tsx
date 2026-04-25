import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import './direction.css';

interface PageProps {
  params: Promise<{ directionSlug: string }>;
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
        orderBy: { layerKey: 'asc' }
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
        {/* Header */}
        <div className="direction-header">
          {domain.icon && (
            <span className="direction-icon">{domain.icon}</span>
          )}
          <h1 className="direction-title">{domain.name}</h1>
          <p className="direction-subtitle">{domain.description}</p>
        </div>

        {/* Three Layer Structure */}
        {layers.map((layer) => {
          const layerNodes = domain.researchNodes.filter(
            node => node.layerKey === layer.key
          );

          if (layerNodes.length === 0) return null;

          return (
            <div key={layer.id} className="direction-layer">
              <div className="direction-layer-header">
                {layer.icon && (
                  <span className="direction-layer-icon">{layer.icon}</span>
                )}
                <div>
                  <h2 className="direction-layer-title">{layer.name}</h2>
                  <p className="direction-layer-desc">{layer.description}</p>
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

                    {node.tags && Array.isArray(node.tags) && node.tags.length > 0 && (
                      <div className="direction-node-tags">
                        {node.tags.slice(0, 3).map((tag: string, index: number) => (
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
