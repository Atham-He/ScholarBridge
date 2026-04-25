import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{
    directionSlug: string;
    layer: string;
    nodeSlug: string;
  }>;
}

async function getNodeDetails(params: PageProps['params']) {
  const node = await db.aIResearchNode.findUnique({
    where: {
      domainSlug_slug: {
        domainSlug: params.directionSlug,
        slug: params.nodeSlug
      }
    },
    include: {
      domain: true,
      layer: true,
      works: {
        orderBy: { year: 'desc' }
      }
    }
  });

  return node;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const node = await getNodeDetails(resolvedParams);

  if (!node) {
    return {
      title: '研究节点未找到 - ScholarBridge'
    };
  }

  return {
    title: `${node.title} - ${node.domain.name} - AI专业探索`,
    description: node.summary,
  };
}

export default async function NodeDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const node = await getNodeDetails(resolvedParams);

  if (!node) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href={`/explore/ai/${node.domain.slug}`} style={{ color: '#2C5F7C' }} className="hover:opacity-80">
            ← 返回{node.domain.shortName}
          </Link>
        </div>

        {/* Node Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {node.layer.name}
                </span>
                {node.tags && Array.isArray(node.tags) && node.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {node.title}
              </h1>
              <p className="text-xl text-gray-600">
                {node.summary}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">详细描述</h2>
            <div className="prose max-w-none text-gray-700">
              <p>{node.description}</p>
            </div>
          </div>
        </div>

        {/* Representative Works */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              代表性工作
            </h2>
            <Link
              href={`/explore/ai/${node.domain.slug}/${node.layer.key}/${node.slug}/works`}
              style={{ color: '#2C5F7C' }}
              className="hover:opacity-80 font-medium"
            >
              浏览全部 →
            </Link>
          </div>

          {node.works.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {node.works.slice(0, 4).map((work) => (
                <div
                  key={work.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {work.type}
                    </span>
                    <span className="text-sm text-gray-500">{work.year}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {work.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {work.authors} · {work.venueOrOrg}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                    {work.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <a
                      href={work.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2C5F7C' }}
                      className="hover:opacity-80 text-sm font-medium"
                    >
                      查看详情 →
                    </a>
                    {/* TODO: 添加兴趣标记按钮 */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              暂无代表性工作
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="rounded-lg shadow-lg p-8 text-center text-white" style={{ background: 'linear-gradient(135deg, #2C5F7C 0%, #1a4a6c 100%)' }}>
          <h3 className="font-bold mb-4" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 600 }}>
            对这个方向感兴趣？
          </h3>
          <p className="mb-6" style={{ fontSize: '15px', opacity: 0.9 }}>
            浏览更多相关工作，标记你感兴趣的内容，获得个性化推荐
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={`/explore/ai/${node.domain.slug}/${node.layer.key}/${node.slug}/works`}
              className="rounded-lg font-semibold transition-colors"
              style={{ background: 'white', color: '#2C5F7C', padding: '12px 24px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500 }}
            >
              浏览相关工作
            </Link>
            <Link
              href="/explore/ai/recommendations"
              className="rounded-lg font-semibold transition-colors border-2"
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: 'white', borderColor: 'white', padding: '12px 24px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500 }}
            >
              查看推荐
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
