import { NextResponse } from 'next/server';
import { syncExploreData } from '@/lib/explore/sync';

// POST /api/explore/sync - 同步数据到数据库（需要管理员权限）
export async function POST(request: Request) {
  try {
    // TODO: 添加管理员权限检查
    const body = await request.json();
    const { force = false } = body;

    const stats = await syncExploreData({ force });

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error syncing explore data:', error);
    return NextResponse.json(
      { error: 'Failed to sync data', success: false },
      { status: 500 }
    );
  }
}
