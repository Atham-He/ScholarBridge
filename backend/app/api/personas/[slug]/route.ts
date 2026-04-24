/**
 * GET /api/personas/[slug]
 * 获取Persona详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET handler - 获取Persona详情
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
            owner: {
              include: {
                mentorProfile: true
              }
            }
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

    if (!isOwner && !isPublic && user.role !== 'MENTOR') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权访问此Persona' } },
        { status: 403 }
      );
    }

    // 返回Persona数据（根据权限返回不同详细程度）
    const responseData = {
      id: persona.id,
      slug: persona.slug,
      version: persona.version,
      buildStatus: persona.buildStatus,
      persona: persona.personaJson,
      agentCard: persona.agentCard,
      // 详细的源数据只对所有者开放
      sources: isOwner ? persona.sourcesJson : undefined,
      chunks: isOwner ? persona.chunksJson : undefined,
      // 元数据
      sourceCount: persona.sourceCount,
      chunkCount: persona.chunkCount,
      privateSourceCount: (persona as any).privateSourceCount || 0,
      authorizedBy: persona.authorizedBy,
      llmProvider: persona.llmProvider,
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
      builtAt: persona.builtAt,
      // 关联的Skill信息
      skill: {
        id: persona.skill.id,
        slug: persona.skill.slug,
        title: persona.skill.title,
        status: persona.skill.status,
        agentActive: persona.skill.agentActive
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Persona fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '获取Persona失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
