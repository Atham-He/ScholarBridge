import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/explore - 获取所有AI方向
export async function GET() {
  try {
    const domains = await db.aIDomain.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { researchNodes: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: domains
    });
  } catch (error) {
    console.error('Error fetching explore domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains', success: false },
      { status: 500 }
    );
  }
}
