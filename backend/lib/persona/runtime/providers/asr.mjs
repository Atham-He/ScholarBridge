import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanText } from '../lib/utils.mjs';

function trimSlash(value) {
  return String(value || '').replace(/\/+$/g, '');
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  const map = new Map([
    ['.wav', 'audio/wav'],
    ['.mp3', 'audio/mpeg'],
    ['.m4a', 'audio/mp4'],
    ['.aac', 'audio/aac'],
    ['.flac', 'audio/flac'],
    ['.ogg', 'audio/ogg'],
    ['.webm', 'audio/webm']
  ]);
  return map.get(ext) || 'application/octet-stream';
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeSegments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => ({
      index,
      start: Number(item.start ?? item.start_time ?? item.begin ?? 0) || 0,
      end: Number(item.end ?? item.end_time ?? item.finish ?? 0) || 0,
      speaker: item.speaker || item.role || '',
      text: cleanText(item.text || item.transcript || item.content || '', 1000)
    }))
    .filter((item) => item.text);
}

function extractText(data, fallbackText = '') {
  if (!data || typeof data !== 'object') return cleanText(fallbackText, 120000);
  const direct = data.text || data.transcript || data.result?.text || data.data?.text || '';
  if (direct) return cleanText(direct, 120000);

  const segments = normalizeSegments(data.segments || data.result?.segments || data.data?.segments);
  if (segments.length) return cleanText(segments.map((item) => item.text).join('\n'), 120000);
  return cleanText(fallbackText, 120000);
}

function extractSegments(data) {
  if (!data || typeof data !== 'object') return [];
  return normalizeSegments(data.segments || data.result?.segments || data.data?.segments);
}

function responseMetadata(data, provider, model, endpoint) {
  return {
    provider,
    model,
    endpoint,
    usage: data?.usage || null,
    task: data?.task || data?.id || null
  };
}

async function readResponse(response) {
  const text = await response.text();
  const data = parseJsonLoose(text);
  return { text, data };
}

class MockAsrProvider {
  constructor(config = {}) {
    this.kind = 'mock';
    this.model = config.asrModel || 'mock-asr';
  }

  async transcribe({ audioPath, transcriptPath }) {
    if (transcriptPath) {
      const text = await fs.readFile(transcriptPath, 'utf8');
      return {
        text,
        segments: [],
        metadata: {
          provider: this.kind,
          model: this.model,
          mode: 'sidecar-transcript'
        }
      };
    }

    return {
      text: [
        `Mock ASR transcript for ${path.basename(audioPath || 'meeting-media')}.`,
        'Configure ASR_PROVIDER=glm and ASR_API_KEY to transcribe real meeting videos or audio files.'
      ].join('\n'),
      segments: [],
      metadata: {
        provider: this.kind,
        model: this.model,
        mode: 'mock'
      }
    };
  }
}

class GlmAsrProvider {
  constructor(config = {}) {
    this.kind = 'glm-asr';
    this.apiKey = config.asrApiKey;
    this.baseUrl = trimSlash(config.asrBaseUrl || 'https://llmapi.paratera.com');
    this.model = config.asrModel || 'GLM-ASR-2512';
    this.endpoint = config.asrEndpoint || '';
    this.mode = String(config.asrMode || 'openai-multipart').toLowerCase();
    this.timeoutMs = Number(config.asrTimeoutMs || 120000);
    this.language = config.asrLanguage || '';
  }

  defaultMultipartEndpoints() {
    if (this.endpoint) return [this.endpoint];
    return [
      `${this.baseUrl}/v1/audio/transcriptions`,
      `${this.baseUrl}/audio/transcriptions`
    ];
  }

  defaultUrlJsonEndpoint() {
    return this.endpoint || `${this.baseUrl}/bigmodel/api/paas/v4/audio/transcriptions`;
  }

  async postMultipart(audioPath, endpoint) {
    const buffer = await fs.readFile(audioPath);
    const form = new FormData();
    form.append('model', this.model);
    form.append('response_format', 'json');
    if (this.language) form.append('language', this.language);
    form.append('file', new Blob([buffer], { type: mimeFromPath(audioPath) }), path.basename(audioPath));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`
      },
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    const { text, data } = await readResponse(response);
    if (!response.ok) {
      throw new Error(`ASR multipart request failed: ${response.status} ${cleanText(text, 400)}`);
    }
    return {
      text: extractText(data, text),
      segments: extractSegments(data),
      metadata: responseMetadata(data, this.kind, this.model, endpoint)
    };
  }

  async postUrlJson(fileUrl) {
    const endpoint = this.defaultUrlJsonEndpoint();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        file: fileUrl
      }),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    const { text, data } = await readResponse(response);
    if (!response.ok) {
      throw new Error(`ASR URL request failed: ${response.status} ${cleanText(text, 400)}`);
    }
    return {
      text: extractText(data, text),
      segments: extractSegments(data),
      metadata: responseMetadata(data, this.kind, this.model, endpoint)
    };
  }

  async transcribe({ audioPath, fileUrl }) {
    if (!this.apiKey) {
      throw new Error('ASR_API_KEY or GLM_ASR_API_KEY is required when ASR_PROVIDER=glm');
    }

    if (this.mode === 'glm-url-json') {
      if (!fileUrl) throw new Error('ASR mode glm-url-json requires a public file URL');
      return this.postUrlJson(fileUrl);
    }

    if (audioPath) {
      let lastError = null;
      for (const endpoint of this.defaultMultipartEndpoints()) {
        try {
          return await this.postMultipart(audioPath, endpoint);
        } catch (error) {
          lastError = error;
          if (this.endpoint) break;
        }
      }
      throw lastError || new Error('ASR multipart request failed');
    }

    if (fileUrl) {
      return this.postUrlJson(fileUrl);
    }

    throw new Error('ASR transcription requires audioPath or fileUrl');
  }
}

export function createAsrProvider(config = {}) {
  const provider = String(config.asrProvider || 'mock').toLowerCase();
  if (['glm', 'glm-asr', 'glm_asr', 'zhipu', 'paratera'].includes(provider)) {
    return new GlmAsrProvider(config);
  }
  return new MockAsrProvider(config);
}
