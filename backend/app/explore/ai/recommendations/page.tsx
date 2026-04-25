import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '个性化推荐 - ScholarBridge',
  description: '基于你的兴趣获得AI方向、研究节点和导师的个性化推荐',
};

export default async function RecommendationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/explore/ai/recommendations');
  }

  // 获取推荐数据
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/explore/recommendations`, {
    cache: 'no-store'
  });

  const result = await response.json();
  const recommendations = result.success ? result.data : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/explore" style={{ color: '#2C5F7C' }} className="hover:opacity-80">
            ← 返回AI专业探索
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            你的个性化推荐
          </h1>
          <p className="text-xl text-gray-600">
            基于你标记的兴趣工作，我们为你推荐以下方向和导师
          </p>
        </div>

        {!recommendations || recommendations.domains.length === 0 ? (
          /* No Recommendations */
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              还没有推荐数据
            </h2>
            <p className="text-gray-600 mb-8">
              标记更多感兴趣的工作来获得个性化推荐
            </p>
            <Link
              href="/explore/ai/logical-mathematical"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              开始探索
            </Link>
          </div>
        ) : (
          <>
            {/* Domain Recommendations */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                推荐方向
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendations.domains.map((domain: any) => (
                  <div key={domain.domainId} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {domain.domainId}
                      </h3>
                      <div className="text-2xl font-bold text-blue-600">
                        {(domain.score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="space-y-2">
                      {domain.reasons.map((reason: string, index: number) => (
                        <p key={index} className="text-sm text-gray-600">
                          • {reason}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Node Recommendations */}
            {recommendations.nodes.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  推荐研究节点
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.nodes.map((node: any) => (
                    <div key={node.nodeId} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          {node.nodeId}
                        </h3>
                        <div className="text-xl font-bold text-blue-600">
                          {(node.score * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="space-y-2">
                        {node.reasons.map((reason: string, index: number) => (
                          <p key={index} className="text-sm text-gray-600">
                            • {reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Route */}
            {recommendations.route && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg shadow-lg p-8 mb-8" style={{ background: 'linear-gradient(135deg, #E8F4F8 0%, #D1E8F0 100%)' }}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  推荐学习路线
                </h2>
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {recommendations.route.title}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {recommendations.route.description}
                  </p>
                  <div className="space-y-4">
                    {recommendations.route.steps.map((step: any) => (
                      <div key={step.order} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {step.order}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="rounded-lg shadow-lg p-8 text-center text-white" style={{ background: 'linear-gradient(135deg, #2C5F7C 0%, #1a4a6c 100%)' }}>
              <h3 className="font-bold mb-4" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 600 }}>
                找到感兴趣的方向了吗？
              </h3>
              <p className="mb-6" style={{ fontSize: '15px', opacity: 0.9 }}>
                浏览导师地图，找到与你兴趣匹配的导师
              </p>
              <Link
                href="/browse"
                className="inline-block rounded-lg font-semibold transition-colors"
                style={{ background: 'white', color: '#2C5F7C', padding: '12px 24px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500 }}
              >
                浏览导师地图
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
