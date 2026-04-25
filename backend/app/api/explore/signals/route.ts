import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/explore/signals - 获取当前用户的所有兴趣标记
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const signals = await db.aIUserWorkSignal.findMany({
      where: { userId: user.id },
      include: {
        work: {
          include: {
            node: {
              include: {
                domain: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: signals
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signals', success: false },
      { status: 500 }
    );
  }
}

// POST /api/explore/signals - 标记兴趣（like/dislike/later）
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workId, signal } = body;

    if (!workId || !signal) {
      return NextResponse.json(
        { error: 'workId and signal are required', success: false },
        { status: 400 }
      );
    }

    if (!['like', 'dislike', 'later'].includes(signal)) {
      return NextResponse.json(
        { error: 'Invalid signal type', success: false },
        { status: 400 }
      );
    }

    // 验证work是否存在
    const work = await db.aIWork.findUnique({
      where: { id: workId }
    });

    if (!work) {
      return NextResponse.json(
        { error: 'Work not found', success: false },
        { status: 404 }
      );
    }

    // 使用upsert创建或更新信号
    const userSignal = await db.aIUserWorkSignal.upsert({
      where: {
        userId_workId: {
          userId: user.id,
          workId: workId
        }
      },
      update: {
        signal,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        workId,
        signal
      }
    });

    return NextResponse.json({
      success: true,
      data: userSignal
    });
  } catch (error) {
    console.error('Error creating signal:', error);
    return NextResponse.json(
      { error: 'Failed to create signal', success: false },
      { status: 500 }
    );
  }
}
