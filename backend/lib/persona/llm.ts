/**
 * LLM提供商实现
 * 支持 mock, openai, anthropic, deepseek
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { LLMProvider, LLMProviderKind } from './types';

// ============= Mock Provider (用于开发测试) =============

export class MockProvider implements LLMProvider {
  kind = 'mock' as const;

  async generateText(prompts: string[]): Promise<string> {
    // 返回模拟响应
    return 'This is a mock response for development testing.';
  }

  async generateJson(prompts: string[]): Promise<any> {
    // 返回模拟的JSON响应
    return {
      overview: 'Mock persona overview',
      researchTopics: [
        { name: 'Machine Learning', confidence: 0.8, evidence: ['mock_source_1'] }
      ],
      methods: ['deep learning', 'neural networks'],
      currentProjects: [{
        title: 'Mock Project',
        summary: 'A mock research project',
        requiredSkills: ['Python', 'PyTorch'],
        fitSignals: ['programming experience']
      }]
    };
  }
}

// ============= Anthropic Provider =============

export class AnthropicProvider implements LLMProvider {
  kind = 'anthropic' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-haiku-latest') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateText(prompts: string[]): Promise<string> {
    try {
      const systemPrompt = prompts[0] || '';
      const userMessages = prompts.slice(1);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: userMessages.map(msg => ({
          role: 'user' as const,
          content: msg
        }))
      });

      return message.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n')
        .trim();
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Failed to generate text with Anthropic: ${error}`);
    }
  }

  async generateJson(prompts: string[]): Promise<any> {
    try {
      const systemPrompt = prompts[0] || '';
      const userMessages = prompts.slice(1);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: userMessages.map(msg => ({
          role: 'user' as const,
          content: msg
        })),
        // 启用结构化输出（如果Claude版本支持）
      });

      const text = message.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n')
        .trim();

      // 尝试解析JSON
      try {
        return JSON.parse(text);
      } catch {
        // 如果返回的不是纯JSON，尝试提取JSON部分
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
        throw new Error('Response does not contain valid JSON');
      }
    } catch (error) {
      console.error('Anthropic JSON generation error:', error);
      throw new Error(`Failed to generate JSON with Anthropic: ${error}`);
    }
  }

  async generateVision(image: Buffer, prompt: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [{
          role: 'user' as const,
          content: [
            {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/png' as const,
                data: image.toString('base64')
              }
            },
            {
              type: 'text' as const,
              text: prompt
            }
          ]
        }]
      });

      return message.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n')
        .trim();
    } catch (error) {
      console.error('Anthropic vision API error:', error);
      throw new Error(`Failed to analyze image with Anthropic: ${error}`);
    }
  }
}

// ============= OpenAI Provider (兼容DeepSeek等) =============

export class OpenAIProvider implements LLMProvider {
  kind: LLMProviderKind;
  private client: OpenAI;
  private model: string;

  constructor(provider: 'openai' | 'deepseek', apiKey: string, model: string) {
    this.kind = provider;
    const baseURL = provider === 'deepseek'
      ? 'https://api.deepseek.com/v1'
      : undefined;

    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async generateText(prompts: string[]): Promise<string> {
    try {
      const systemPrompt = prompts[0] || '';
      const userMessages = prompts.slice(1);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...userMessages.map(msg => ({
            role: 'user' as const,
            content: msg
          }))
        ],
        max_tokens: 4000
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error(`${this.kind} API error:`, error);
      throw new Error(`Failed to generate text with ${this.kind}: ${error}`);
    }
  }

  async generateJson(prompts: string[]): Promise<any> {
    try {
      const systemPrompt = prompts[0] || '';
      const userMessages = prompts.slice(1);

      const response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...userMessages.map(msg => ({
            role: 'user' as const,
            content: msg
          }))
        ],
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error(`${this.kind} JSON generation error:`, error);
      throw new Error(`Failed to generate JSON with ${this.kind}: ${error}`);
    }
  }

  async generateVision(image: Buffer, prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{
          role: 'user' as const,
          content: [
            {
              type: 'image_url' as const,
              image_url: {
                url: `data:image/png;base64,${image.toString('base64')}`
              }
            },
            {
              type: 'text' as const,
              text: prompt
            }
          ]
        }],
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error(`${this.kind} vision API error:`, error);
      throw new Error(`Failed to analyze image with ${this.kind}: ${error}`);
    }
  }
}

// ============= 工厂函数 =============

export interface LLMProviderConfig {
  provider: LLMProviderKind;
  apiKey?: string;
  model?: string;
}

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  const { provider, apiKey, model } = config;

  switch (provider) {
    case 'anthropic':
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required for anthropic provider');
      }
      return new AnthropicProvider(apiKey, model);

    case 'openai':
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for openai provider');
      }
      return new OpenAIProvider('openai', apiKey, model || 'gpt-4o-mini');

    case 'deepseek':
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is required for deepseek provider');
      }
      return new OpenAIProvider('deepseek', apiKey, model || 'deepseek-chat');

    case 'mock':
      return new MockProvider();

    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

// 从环境变量创建provider
export function createLLMProviderFromEnv(): LLMProvider {
  const provider = (process.env.PERSONA_LLM_PROVIDER || 'mock') as LLMProviderKind;

  const config: LLMProviderConfig = { provider };

  switch (provider) {
    case 'anthropic':
      config.apiKey = process.env.ANTHROPIC_API_KEY;
      config.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
      break;

    case 'openai':
      config.apiKey = process.env.OPENAI_API_KEY;
      config.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      break;

    case 'deepseek':
      config.apiKey = process.env.DEEPSEEK_API_KEY;
      config.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      break;

    case 'mock':
      // mock不需要额外配置
      break;
  }

  return createLLMProvider(config);
}
