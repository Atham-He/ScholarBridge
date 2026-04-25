import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/explore/ai/[directionSlug] - 获取方向详情（三层结构、研究节点）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ directionSlug: string }> }
) {
  try {
    const { directionSlug } = await params;

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
      return NextResponse.json(
        { error: 'Domain not found', success: false },
        { status: 404 }
      );
    }

    // 获取所有研究层用于三层结构展示
    const layers = await db.aIResearchLayer.findMany({
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        domain,
        layers,
        // 按层分组节点
        nodesByLayer: layers.map(layer => ({
          ...layer,
          nodes: domain.researchNodes.filter(node => node.layerKey === layer.key)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching direction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch direction details', success: false },
      { status: 500 }
    );
  }
}
