/**
 * GET /api/personas
 * 列出所有可用的Personas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET handler - 列出Personas
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';
    const onlyMyPersonas = searchParams.get('onlyMyPersonas') === 'true';

    // 构建查询条件
    const where: any = {
      buildStatus: 'completed'
    };

    // 如果不是只查看自己的，只返回公开的
    if (!onlyMyPersonas) {
      where.skill = {
        OR: [
          { isPublic: true, status: 'PUBLISHED' },
          { ownerUserId: user.id }
        ]
      };
    } else {
      // 只查看自己的
      where.skill = {
        ownerUserId: user.id
      };
    }

    // 查询Personas
    const personas = await db.persona.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化响应
    const list = personas.map(persona => {
      const mentorName = persona.skill.owner.mentorProfile?.displayName || persona.skill.owner.email;
      const institution = persona.skill.owner.mentorProfile?.institution || '';

      return {
        id: persona.id,
        slug: persona.slug,
        version: persona.version,
        buildStatus: persona.buildStatus,
        mentor: {
          name: persona.personaJson.mentor.name,
          displayName: mentorName,
          institution: institution || persona.personaJson.mentor.affiliation,
          title: persona.personaJson.mentor.title
        },
        overview: persona.personaJson.overview,
        researchTopics: persona.personaJson.researchTopics || [],
        methods: persona.personaJson.methods || [],
        skill: {
          id: persona.skill.id,
          slug: persona.skill.slug,
          title: persona.skill.title,
          status: persona.skill.status,
          isPublic: persona.skill.isPublic,
          agentActive: persona.skill.agentActive
        },
        stats: {
          sourceCount: persona.sourceCount,
          chunkCount: persona.chunkCount,
          publicSourceCount: persona.publicSourceCount,
          uploadSourceCount: persona.uploadSourceCount
        },
        metadata: {
          authorizedBy: persona.authorizedBy,
          llmProvider: persona.llmProvider,
          createdAt: persona.createdAt,
          updatedAt: persona.updatedAt,
          builtAt: persona.builtAt
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        personas: list,
        count: list.length
      }
    });

  } catch (error) {
    console.error('List personas error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LIST_ERROR',
          message: '获取Persona列表失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
