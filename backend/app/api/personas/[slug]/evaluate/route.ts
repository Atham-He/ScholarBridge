/**
 * POST /api/personas/[slug]/evaluate
 * 评估学生匹配度
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { StudentEvaluationService } from '@/lib/persona/evaluation';
import { createLLMProviderFromEnv } from '@/lib/persona/llm';
import type { ChatMessage } from '@/lib/persona/types';

/**
 * POST handler - 评估学生
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    const { slug } = params;

    // 解析请求体
    const body = await request.json();
    const { studentProfile, sessionId, applicationId } = body;

    if (!studentProfile || typeof studentProfile !== 'object') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PROFILE', message: '学生档案不能为空' } },
        { status: 400 }
      );
    }

    // 查找Persona
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

    // 验证权限
    const isOwner = persona.skill.ownerUserId === user.id;
    const isStudent = user.role === 'STUDENT';

    // 只有导师所有者可以评估学生，或学生可以自我评估
    if (!isOwner && !isStudent) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权执行评估' } },
        { status: 403 }
      );
    }

    // 如果提供了sessionId，获取对话历史
    let transcript: ChatMessage[] | undefined;

    if (sessionId) {
      const personaSession = await db.personaSession.findUnique({
        where: { sessionId }
      });

      if (personaSession) {
        const turns = personaSession.turnsJson as any[];
        transcript = turns.flatMap(turn => [
          { role: 'user' as const, content: turn.message },
          { role: 'assistant' as const, content: turn.answer }
        ]);
      }
    }

    // 如果提供了applicationId，也可以从conversation获取历史
    if (applicationId && !transcript) {
      const application = await db.application.findUnique({
        where: { id: applicationId },
        include: {
          conversation: {
            include: {
              messages: true
            }
          }
        }
      });

      if (application?.conversation) {
        transcript = application.conversation.messages
          .filter(m => m.role === 'USER' || m.role === 'ASSISTANT')
          .map(m => ({
            role: m.role.toLowerCase() as 'user' | 'assistant',
            content: m.content
          }));
      }
    }

    // 创建评估服务
    const llmProvider = createLLMProviderFromEnv();
    const evaluationService = new StudentEvaluationService(llmProvider);

    // 执行评估
    const evaluationResult = await evaluationService.evaluate({
      persona: persona.personaJson,
      chunks: persona.chunksJson as any[],
      studentProfile,
      transcript
    });

    // 如果提供了applicationId，保存评估结果到数据库
    if (applicationId) {
      // 检查是否已有评估结果
      const existingEvaluation = await db.personaEvaluation.findUnique({
        where: { applicationId }
      });

      if (existingEvaluation) {
        // 更新现有评估
        await db.personaEvaluation.update({
          where: { id: existingEvaluation.id },
          data: {
            overallScore: evaluationResult.overallScore,
            recommendation: evaluationResult.recommendation,
            researchFit: evaluationResult.researchFit,
            technicalDepth: evaluationResult.technicalDepth,
            communication: evaluationResult.communication,
            initiative: evaluationResult.initiative,
            summary: evaluationResult.summary,
            followUpQuestions: evaluationResult.followUpQuestions,
            evidenceQuality: evaluationResult.evidenceQuality,
            evidenceBreakdown: evaluationResult.evidenceBreakdown
          }
        });
      } else {
        // 创建新评估
        await db.personaEvaluation.create({
          data: {
            personaId: persona.id,
            applicationId,
            overallScore: evaluationResult.overallScore,
            recommendation: evaluationResult.recommendation,
            researchFit: evaluationResult.researchFit,
            technicalDepth: evaluationResult.technicalDepth,
            communication: evaluationResult.communication,
            initiative: evaluationResult.initiative,
            summary: evaluationResult.summary,
            followUpQuestions: evaluationResult.followUpQuestions,
            evidenceQuality: evaluationResult.evidenceQuality,
            evidenceBreakdown: evaluationResult.evidenceBreakdown
          }
        });
      }

      // 更新application的aiScore
      await db.application.update({
        where: { id: applicationId },
        data: {
          aiScore: evaluationResult.overallScore / 10, // 转换为1-10分制
          aiFlagNotify: evaluationResult.recommendation === 'strong_recommendation' ||
                       evaluationResult.recommendation === 'recommend_interview'
        }
      });
    }

    // 获取评估摘要
    const summary = evaluationService.getEvaluationSummary(evaluationResult);

    return NextResponse.json({
      success: true,
      data: {
        evaluation: evaluationResult,
        summary,
        persona: {
          name: persona.personaJson.mentor.name,
          slug: persona.slug
        }
      }
    });

  } catch (error) {
    console.error('Persona evaluation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message: '评估失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - 获取评估结果
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_APPLICATION_ID', message: '缺少applicationId参数' } },
        { status: 400 }
      );
    }

    // 查找Persona
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

    // 验证权限
    const isOwner = persona.skill.ownerUserId === user.id;
    const isStudent = user.role === 'STUDENT';

    if (!isOwner && !isStudent) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权访问评估结果' } },
        { status: 403 }
      );
    }

    // 查找评估结果
    const evaluation = await db.personaEvaluation.findUnique({
      where: { applicationId }
    });

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: { code: 'EVALUATION_NOT_FOUND', message: '评估结果不存在' } },
        { status: 404 }
      );
    }

    // 返回评估结果
    return NextResponse.json({
      success: true,
      data: {
        id: evaluation.id,
        overallScore: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        researchFit: evaluation.researchFit,
        technicalDepth: evaluation.technicalDepth,
        communication: evaluation.communication,
        initiative: evaluation.initiative,
        summary: evaluation.summary,
        followUpQuestions: evaluation.followUpQuestions,
        evidenceQuality: evaluation.evidenceQuality,
        createdAt: evaluation.createdAt
      }
    });

  } catch (error) {
    console.error('Get evaluation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '获取评估结果失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
