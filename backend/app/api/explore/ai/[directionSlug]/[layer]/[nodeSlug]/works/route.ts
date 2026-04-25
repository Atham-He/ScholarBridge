import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/explore/ai/[directionSlug]/[layer]/[nodeSlug]/works - 获取研究节点的代表工作
export async function GET(
  request: Request,
  { params }: { params: Promise<{ directionSlug: string; layer: string; nodeSlug: string }> }
) {
  try {
    const { directionSlug, nodeSlug } = await params;

    const node = await db.aIResearchNode.findUnique({
      where: {
        domainSlug_slug: {
          domainSlug: directionSlug,
          slug: nodeSlug
        }
      },
      include: {
        works: {
          orderBy: { year: 'desc' }
        }
      }
    });

    if (!node) {
      return NextResponse.json(
        { error: 'Research node not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: node.works
    });
  } catch (error) {
    console.error('Error fetching works:', error);
    return NextResponse.json(
      { error: 'Failed to fetch works', success: false },
      { status: 500 }
    );
  }
}
