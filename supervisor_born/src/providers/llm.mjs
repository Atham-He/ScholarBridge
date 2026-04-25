import { extractJsonFromText } from '../lib/utils.mjs';

class MockLLMProvider {
  constructor() {
    this.kind = 'mock';
    this.supportsVision = false;
  }

  async generateText() {
    throw new Error('Mock provider does not use raw text generation in this code path.');
  }

  async generateJson() {
    throw new Error('Mock provider does not use raw JSON generation in this code path.');
  }

  async describeImage({ fileName, mimeType }) {
    return {
      summary: `Image ${fileName} (${mimeType}) was uploaded. Mock mode records the asset but does not inspect pixels.`,
      toneSignals: [],
      notableQuotes: [],
      limitations: ['No vision model configured']
    };
  }
}

class OpenAIProvider {
  constructor(config) {
    this.kind = config.llmProvider === 'deepseek' ? 'deepseek' : 'openai';
    this.supportsVision = Boolean(config.openaiSupportsVision);
    this.apiKey = config.openaiApiKey;
    this.baseUrl = config.openaiBaseUrl.replace(/\/$/, '');
    this.model = config.openaiModel;
  }

  async request(body) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${text}`);
    }

    return response.json();
  }

  async generateText({ system, user, temperature = 0.2 }) {
    const data = await this.request({
      model: this.model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  async generateJson({ system, user, temperature = 0.1 }) {
    const data = await this.request({
      model: this.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });

    const content = data.choices?.[0]?.message?.content?.trim() || '{}';
    return extractJsonFromText(content);
  }

  async describeImage({ system, user, mimeType, base64 }) {
    if (!this.supportsVision) {
      return {
        summary: 'Image upload recorded, but the configured OpenAI-compatible provider does not support vision.',
        toneSignals: [],
        notableQuotes: [],
        limitations: [`${this.kind}:${this.model} is configured as text-only`]
      };
    }

    const data = await this.request({
      model: this.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: user },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
          ]
        }
      ]
    });

    const content = data.choices?.[0]?.message?.content?.trim() || '{}';
    return extractJsonFromText(content);
  }
}

class AnthropicProvider {
  constructor(config) {
    this.kind = 'anthropic';
    this.supportsVision = true;
    this.apiKey = config.anthropicApiKey;
    this.model = config.anthropicModel;
  }

  async request(body) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic request failed: ${response.status} ${text}`);
    }

    return response.json();
  }

  async generateText({ system, user, temperature = 0.2 }) {
    const data = await this.request({
      model: this.model,
      max_tokens: 1200,
      temperature,
      system,
      messages: [{ role: 'user', content: user }]
    });

    return (data.content || [])
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();
  }

  async generateJson({ system, user, temperature = 0.1 }) {
    const data = await this.request({
      model: this.model,
      max_tokens: 1800,
      temperature,
      system,
      messages: [{ role: 'user', content: user }]
    });

    const content = (data.content || [])
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();
    return extractJsonFromText(content);
  }

  async describeImage({ system, user, mimeType, base64 }) {
    const mediaType = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    const data = await this.request({
      model: this.model,
      max_tokens: 1200,
      temperature: 0.1,
      system,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: user },
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
        ]
      }]
    });

    const content = (data.content || [])
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();
    return extractJsonFromText(content);
  }
}

export function createLlmProvider(config) {
  if (config.llmProvider === 'openai' || config.llmProvider === 'deepseek') {
    if (!config.openaiApiKey) {
      throw new Error(config.llmProvider === 'deepseek'
        ? 'DEEPSEEK_API_KEY or OPENAI_API_KEY is required when LLM_PROVIDER=deepseek'
        : 'OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }
    return new OpenAIProvider(config);
  }

  if (config.llmProvider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    }
    return new AnthropicProvider(config);
  }

  return new MockLLMProvider();
}
