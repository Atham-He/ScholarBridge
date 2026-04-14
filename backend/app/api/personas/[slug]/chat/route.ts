/**
 * POST /api/personas/[slug]/chat
 * 与Persona对话
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PersonaChatService } from '@/lib/persona/chat';
import { createLLMProviderFromEnv } from '@/lib/persona/llm';
import type { ChatTurn } from '@/lib/persona/types';
import { nowIso } from '@/lib/persona/utils';

/**
 * POST handler - 与Persona对话
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
    const { message, sessionId, studentProfile } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_MESSAGE', message: '消息内容不能为空' } },
        { status: 400 }
      );
    }

    // 查找Persona
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

    // 检查权限：公开Persona或所有者可以使用
    const isOwner = persona.skill.ownerUserId === user.id;
    const isPublic = persona.skill.isPublic && persona.skill.status === 'PUBLISHED';
    const isStudent = user.role === 'STUDENT';

    if (!isPublic && !isOwner) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权使用此Persona' } },
        { status: 403 }
      );
    }

    // 只有学生可以发起聊天（除非是所有者测试）
    if (!isStudent && !isOwner) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '只有学生可以与Persona对话' } },
        { status: 403 }
      );
    }

    // 获取或创建会话
    let personaSession;

    if (sessionId) {
      personaSession = await db.personaSession.findUnique({
        where: { sessionId }
      });
    }

    if (!personaSession) {
      // 创建新会话
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 如果没有提供studentProfile，使用用户信息构建
      const profile = studentProfile || {
        name: user.studentProfile?.displayName || user.email.split('@')[0],
        background: user.studentProfile?.backgroundBrief
      };

      personaSession = await db.personaSession.create({
        data: {
          personaId: persona.id,
          sessionId: newSessionId,
          turnsJson: [],
          studentProfile: profile,
          messageCount: 0
        }
      });
    }

    // 解析会话历史
    const turns: ChatTurn[] = personaSession.turnsJson as ChatTurn[];

    // 创建聊天服务
    const llmProvider = createLLMProviderFromEnv();
    const chatService = new PersonaChatService(llmProvider);

    // 执行聊天
    const chatResponse = await chatService.chat({
      persona: persona.personaJson,
      chunks: persona.chunksJson as any[],
      message,
      studentProfile: personaSession.studentProfile as any,
      session: { turns }
    });

    // 添加新的对话轮次
    const newTurn: ChatTurn = {
      role: 'user',
      message,
      answer: chatResponse.answer,
      citations: chatResponse.citations,
      retrievedChunks: chatResponse.retrievedChunks,
      timestamp: nowIso()
    };

    turns.push(newTurn);

    // 更新会话
    await db.personaSession.update({
      where: { id: personaSession.id },
      data: {
        turnsJson: turns,
        messageCount: turns.length,
        lastMessageAt: new Date()
      }
    });

    // 返回响应
    return NextResponse.json({
      success: true,
      data: {
        sessionId: personaSession.sessionId,
        answer: chatResponse.answer,
        citations: chatResponse.citations,
        retrievedChunksCount: chatResponse.retrievedChunks.length,
        messageCount: turns.length,
        persona: {
          name: persona.personaJson.mentor.name,
          slug: persona.slug
        }
      }
    });

  } catch (error) {
    console.error('Persona chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: '对话失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - 获取会话历史
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
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_SESSION_ID', message: '缺少sessionId参数' } },
        { status: 400 }
      );
    }

    // 查找Persona
    const persona = await db.persona.findUnique({
      where: { slug }
    });

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona不存在' } },
        { status: 404 }
      );
    }

    // 查找会话
    const personaSession = await db.personaSession.findUnique({
      where: { sessionId }
    });

    if (!personaSession) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: '会话不存在' } },
        { status: 404 }
      );
    }

    // 验证权限
    const isOwner = user.id === persona.skill.ownerUserId;
    // 简化：允许会话创建者访问（通过检查会话中的studentProfile匹配）

    if (!isOwner) {
      // 这里可以添加更复杂的权限检查
      // 目前简单处理：允许访问
    }

    const turns = personaSession.turnsJson as ChatTurn[];

    return NextResponse.json({
      success: true,
      data: {
        sessionId: personaSession.sessionId,
        turns,
        messageCount: turns.length,
        studentProfile: personaSession.studentProfile,
        lastMessageAt: personaSession.lastMessageAt,
        createdAt: personaSession.createdAt
      }
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '获取会话历史失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
