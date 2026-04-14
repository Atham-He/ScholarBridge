/**
 * Persona聊天服务
 * 基于检索增强生成(RAG)的聊天实现
 */

import type {
  PersonaData,
  Chunk,
  ChatParams,
  ChatResponse,
  ChatTurn
} from './types';
import type { LLMProvider } from './llm';
import { retrievalService } from './retrieval';
import { firstSentences, cleanText } from './utils';

/**
 * 构建聊天提示词
 */
function buildChatPrompts(params: ChatParams): string[] {
  const { persona, retrievedChunks, session, message, studentProfile } = params;

  const systemPrompt = `你是一位授权的AI导师分身，不是导师本人。

# 身份声明
你必须始终明确声明自己是"${persona.mentor.name}导师的授权AI分身"，而不是导师本人。

# 导师信息
- 姓名：${persona.mentor.name}
- 机构：${persona.mentor.affiliation}
- 职称：${persona.mentor.title}

# 研究方向
${(persona.researchTopics || []).map(t => `- ${t.name}`).join('\n')}

# 研究方法
${(persona.methods || []).map(m => `- ${m}`).join('\n')}

# 当前项目
${(persona.currentProjects || []).map(p => `- **${p.title}**: ${p.summary}`).join('\n')}

# 说话风格
${persona.communicationStyle?.voiceSummary || '学术风格，注重问题定义和方法选择'}

# 应该做的
${(persona.communicationStyle?.doSay || []).map(s => `- ${s}`).join('\n')}

# 应该避免的
${(persona.communicationStyle?.avoid || []).map(s => `- ${s}`).join('\n')}

# 筛选标准
积极信号：
- ${(persona.screeningRubric?.positiveSignals || []).map(s => s).join('\n  - ')}

关注点：
- ${(persona.screeningRubric?.concerns || []).map(s => s).join('\n  - ')}

# 安全规则
${(persona.guardrails || []).map(g => `- ${g}`).join('\n')}

# 回答指南
1. 基于以下证据资料回答问题，不要编造信息
2. 如果证据不足，明确说明不确定性
3. 保持学术、专业的语气
4. 对学生的问题给予建设性反馈
5. 不做关于录取、经费或署名的承诺

# 相关证据资料
${retrievedChunks.map((chunk, i) => `## 证据 ${i + 1}: ${chunk.title}\n${chunk.text.substring(0, 500)}...`).join('\n\n')}`;

  // 构建对话历史
  const historyMessages = (session?.turns || [])
    .slice(-6) // 限制历史记录数量
    .flatMap(turn => [
      { role: 'user', content: turn.message },
      { role: 'assistant', content: turn.answer }
    ]);

  // 学生档案信息
  let studentContext = '';
  if (studentProfile && Object.keys(studentProfile).length > 0) {
    studentContext = `\n\n# 当前学生信息\n${JSON.stringify(studentProfile, null, 2)}`;
  }

  const userPrompt = `学生的问题：${message}${studentContext}

请基于导师的研究方向和证据资料，给出专业、建设性的回答。`;

  return [systemPrompt, ...historyMessages.map(m => m.content), userPrompt];
}

/**
 * 启发式聊天回复（用于mock模式）
 */
function heuristicReply(params: ChatParams): string {
  const { persona, retrievedChunks, message, studentProfile } = params;

  const topics = (persona.researchTopics || []).slice(0, 4).map(t => t.name).join('、');
  const projects = persona.currentProjects || [];
  const fitSignals = projects.flatMap(p => p.fitSignals || []).slice(0, 3);
  const relevantText = retrievedChunks[0]?.text || persona.overview || '';

  let body = `我是 ${persona.mentor.name} 的授权 AI 分身，不是导师本人。我会基于已授权材料回答你的问题。\n\n`;
  body += `从目前资料看，这位导师的核心研究主题主要集中在：${topics || '当前资料不足以稳定判断具体主题'}。\n\n`;
  body += `针对你的问题「${message}」，我会先从研究问题与方法匹配来判断，而不是只看表面的"热门方向"。当前最相关的证据显示：${firstSentences(relevantText, 2) || '暂无足够证据。'}\n\n`;

  if (studentProfile && Object.keys(studentProfile).length > 0) {
    body += `结合你提供的背景，我会重点看三件事：研究兴趣是否与当前方向重叠、是否有独立实现/复现实验的证据、是否能把问题表述清楚。`;
    body += `\n\n如果你想提高进一步面试的概率，可以优先准备：${fitSignals.join('、') || '一段清晰的问题陈述、一项可复现的实验记录、对失败结果的反思'}。`;
  } else {
    body += `如果你希望我判断你是否适合加入该方向，建议补充你的背景、研究兴趣、复现实验经历和最想解决的问题。`;
  }

  body += `\n\n证据依据：${retrievedChunks.slice(0, 4).map(c => `${c.sourceId}: ${c.title}`).join('；') || '当前主要依据为 persona 概览。'}`;

  return body;
}

/**
 * Persona聊天服务类
 */
export class PersonaChatService {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * 与Persona对话
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    const { persona, chunks, message, studentProfile } = params;

    // 检索相关证据
    const query = `${message}\n${JSON.stringify(studentProfile || {})}`;
    const retrievedChunks = retrievalService.rankChunks(query, chunks, 6);

    let answer: string;

    if (this.llmProvider.kind === 'mock') {
      // 使用启发式回复
      answer = heuristicReply({
        persona,
        retrievedChunks,
        message,
        studentProfile
      });
    } else {
      // 使用LLM生成回复
      const prompts = buildChatPrompts({
        persona,
        retrievedChunks,
        session: params.session,
        message,
        studentProfile
      });

      try {
        answer = await this.llmProvider.generateText(prompts);
      } catch (error) {
        console.error('LLM chat failed, using heuristic fallback:', error);
        answer = heuristicReply({
          persona,
          retrievedChunks,
          message,
          studentProfile
        });
      }
    }

    // 清理回复
    answer = cleanText(answer, 10000);

    return {
      answer,
      citations: retrievedChunks.map(chunk => ({
        sourceId: chunk.sourceId,
        title: chunk.title
      })),
      retrievedChunks
    };
  }

  /**
   * 创建聊天会话
   */
  createSession(sessionId: string, studentProfile?: Record<string, any>): {
    sessionId: string;
    turns: ChatTurn[];
    studentProfile?: Record<string, any>;
    createdAt: string;
  } {
    return {
      sessionId,
      turns: [],
      studentProfile,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 添加对话轮次
   */
  addTurn(
    session: { turns: ChatTurn[] },
    message: string,
    response: ChatResponse
  ): ChatTurn {
    const turn: ChatTurn = {
      role: 'user',
      message,
      answer: response.answer,
      citations: response.citations,
      retrievedChunks: response.retrievedChunks,
      timestamp: new Date().toISOString()
    };

    session.turns.push(turn);
    return turn;
  }

  /**
   * 获取会话摘要
   */
  getSessionSummary(session: { turns: ChatTurn[] }): {
    messageCount: number;
    lastMessageAt: string | null;
    topicsDiscussed: string[];
  } {
    const { turns } = session;

    return {
      messageCount: turns.length,
      lastMessageAt: turns.length > 0 ? turns[turns.length - 1].timestamp : null,
      topicsDiscussed: this.extractTopics(turns)
    };
  }

  /**
   * 从对话中提取讨论主题
   */
  private extractTopics(turns: ChatTurn[]): string[] {
    // 简单实现：从用户消息中提取关键词
    const allMessages = turns.map(t => t.message).join(' ');

    // 提取英文和中文词汇
    const words = allMessages.match(/[a-zA-Z\u4e00-\u9fa5]{2,}/g) || [];

    // 统计词频
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // 返回出现频率最高的5个词
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
}
