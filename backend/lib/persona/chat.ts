import type {
  ChatParams,
  ChatResponse,
  ChatTurn,
  LLMProvider
} from './types';
import { chatWithPersona } from './engine.mjs';

export class PersonaChatService {
  constructor(private llmProvider?: LLMProvider) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    const result = await (chatWithPersona as any)({
      persona: params.persona,
      chunks: params.chunks,
      session: params.session,
      message: params.message,
      studentProfile: params.studentProfile,
      llmProvider: this.llmProvider || null
    });

    return {
      answer: result.answer,
      citations: result.citations || [],
      retrievedChunks: (result.retrievedChunks || []) as any[]
    };
  }

  createSession(sessionId: string, studentProfile?: Record<string, any>) {
    return {
      sessionId,
      turns: [] as ChatTurn[],
      studentProfile,
      createdAt: new Date().toISOString()
    };
  }

  addTurn(session: { turns: ChatTurn[] }, message: string, response: ChatResponse): ChatTurn {
    const turn: ChatTurn = {
      role: 'user',
      message,
      answer: response.answer,
      citations: response.citations,
      retrievedChunks: response.retrievedChunks.map((chunk) => ({
        sourceId: chunk.sourceId,
        title: chunk.title,
        chunkIndex: chunk.chunkIndex
      })),
      timestamp: new Date().toISOString()
    };
    session.turns.push(turn);
    return turn;
  }

  getSessionSummary(session: { turns: ChatTurn[] }) {
    return {
      messageCount: session.turns.length,
      lastMessageAt: session.turns.length ? session.turns[session.turns.length - 1].timestamp || null : null,
      topicsDiscussed: []
    };
  }
}
