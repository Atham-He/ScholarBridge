/**
 * GET /api/personas/[slug]/agent-card
 * 获取Persona的Agent Card
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET handler - 获取Agent Card
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 验证用户身份
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const { slug } = await params;

    // 查询Persona
    const persona = await db.persona.findUnique({
      where: { slug },
      include: {
        skill: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona不存在' } },
        { status: 404 }
      );
    }

    // 检查权限：公开Persona或所有者可以查看
    const isOwner = persona.skill.ownerUserId === user.id;
    const isPublic = persona.skill.isPublic && persona.skill.status === 'PUBLISHED';

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权访问此Agent Card' } },
        { status: 403 }
      );
    }

    // 返回Agent Card（Markdown格式）
    const personaJson = persona.personaJson as any;

    return NextResponse.json({
      success: true,
      data: {
        slug: persona.slug,
        agentCard: persona.agentCard,
        persona: {
          name: personaJson?.mentor?.name || '',
          affiliation: personaJson?.mentor?.affiliation || '',
          title: personaJson?.mentor?.title || '',
          overview: personaJson?.overview || ''
        },
        skill: {
          id: persona.skill.id,
          slug: persona.skill.slug,
          title: persona.skill.title,
          agentActive: persona.skill.agentActive,
          agentIntro: persona.skill.agentIntro
        },
        metadata: {
          version: persona.version,
          buildStatus: persona.buildStatus,
          sourceCount: persona.sourceCount,
          chunkCount: persona.chunkCount,
          authorizedBy: persona.authorizedBy,
          llmProvider: persona.llmProvider,
          createdAt: persona.createdAt,
          updatedAt: persona.updatedAt,
          builtAt: persona.builtAt
        }
      }
    });

  } catch (error) {
    console.error('Get agent card error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '获取Agent Card失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
