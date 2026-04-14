/**
 * POST /api/personas/[slug]/update
 * 更新现有Persona
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PersonaBuilder } from '@/lib/persona/builder';
import { PersonaChatService } from '@/lib/persona/chat';
import { createLLMProviderFromEnv } from '@/lib/persona/llm';
import type { Source, Chunk } from '@/lib/persona/types';
import { chunkSources } from '@/lib/persona/builder';
import { safeId } from '@/lib/persona/utils';

/**
 * POST handler - 更新Persona
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 验证用户身份
    const user = await getCurrentUser();
    if (!user || user.role !== 'MENTOR') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '需要导师权限' } },
        { status: 401 }
      );
    }

    const { slug } = params;

    // 查找现有Persona
    const existingPersona = await db.persona.findUnique({
      where: { slug },
      include: {
        skill: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!existingPersona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona不存在' } },
        { status: 404 }
      );
    }

    // 验证权限
    if (existingPersona.skill.ownerUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权更新此Persona' } },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();

    const {
      publicUrls = [],
      projectText,
      // 新的文件上传（暂时不支持，后续实现）
      uploads = []
    } = body;

    // 获取现有的sources和chunks
    const existingSources: Source[] = existingPersona.sourcesJson as Source[];
    const existingChunks: Chunk[] = existingPersona.chunksJson as Chunk[];

    // 创建新的sources
    const newSources: Source[] = [...existingSources];
    const sourceIds = new Set(existingSources.map(s => s.id));

    // 添加projectText作为新的源
    if (projectText) {
      const projectSource: Source = {
        id: safeId('src'),
        origin: 'upload',
        kind: 'upload_text',
        title: 'Updated Project Description',
        content: projectText
      };
      newSources.push(projectSource);
      sourceIds.add(projectSource.id);
    }

    // TODO: 处理上传文件
    // for (const upload of uploads) {
    //   const content = await parseUpload(upload);
    //   if (content && !sourceIds.has(content.id)) {
    //     newSources.push(content);
    //   }
    // }

    if (newSources.length === existingSources.length && !projectText && uploads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NO_UPDATE', message: '没有提供新的更新内容' }
        },
        { status: 400 }
      );
    }

    // 重新切块
    const newChunks = chunkSources(newSources);

    // 重新蒸馏Persona
    const llmProvider = createLLMProviderFromEnv();
    const builder = new PersonaBuilder(llmProvider);

    // 构建更新参数
    const updateParams = {
      mentor: {
        name: existingPersona.personaJson.mentor.name,
        affiliation: existingPersona.personaJson.mentor.affiliation,
        title: existingPersona.personaJson.mentor.title,
        authorizedBy: existingPersona.authorizedBy,
        consentNotes: existingPersona.consentNotes || undefined,
        publicUrls: [...(existingPersona.personaJson.mentor.homepage ? [existingPersona.personaJson.mentor.homepage] : []), ...publicUrls]
      },
      publicUrls,
      projectText,
      uploads: []
    };

    // 重新构建（使用现有的sources）
    // 这里我们简化处理，直接更新字段而不完全重新构建
    let updatedPersonaJson = existingPersona.personaJson;

    // 如果有新的项目描述，更新overview
    if (projectText) {
      updatedPersonaJson = {
        ...updatedPersonaJson,
        overview: projectText.substring(0, 500) + '...'
      };
    }

    // 生成新的agent card
    const agentCard = `# ${updatedPersonaJson.mentor.name} — Agent Card

## Identity
This agent is an **authorized AI twin** of ${updatedPersonaJson.mentor.name}, not the literal human.
Affiliation: ${updatedPersonaJson.mentor.affiliation}
Title: ${updatedPersonaJson.mentor.title}

## Mission
- Explain the mentor's research directions and projects.
- Help students understand whether there may be a research fit.
- Collect structured student signals for mentor review.

## Last Updated
${new Date().toISOString()}

${updatedPersonaJson.overview ? `## Overview\n${updatedPersonaJson.overview}\n` : ''}

## Key research topics
${(updatedPersonaJson.researchTopics || []).map((t: any) => `- ${t.name}`).join('\n')}

## Methods
${(updatedPersonaJson.methods || []).map((m: string) => `- ${m}`).join('\n')}
`;

    // 更新数据库记录
    const updatedPersona = await db.persona.update({
      where: { id: existingPersona.id },
      data: {
        personaJson: updatedPersonaJson,
        agentCard,
        sourcesJson: newSources,
        chunksJson: newChunks,
        inputJson: {
          ...existingPersona.inputJson,
          ...updateParams,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date(),
        sourceCount: newSources.length,
        chunkCount: newChunks.length,
        uploadSourceCount: newSources.filter(s => s.origin === 'upload').length
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        personaId: updatedPersona.id,
        slug: updatedPersona.slug,
        sourceCount: newSources.length,
        chunkCount: newChunks.length,
        addedSourceCount: newSources.length - existingSources.length,
        message: 'Persona更新成功'
      }
    });

  } catch (error) {
    console.error('Persona update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Persona更新失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
