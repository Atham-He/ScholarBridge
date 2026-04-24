import path from 'node:path';
import { loadConfig } from './runtime/config.mjs';
import { createLlmProvider } from './runtime/providers/llm.mjs';
import { createAsrProvider } from './runtime/providers/asr.mjs';
import { collectPublicSources } from './runtime/providers/public.mjs';
import { parseUploadFiles } from './runtime/parsers.mjs';
import { buildChunks } from './runtime/retrieval.mjs';
import {
  chatAsPersona,
  distillPersona,
  evaluateStudentFit,
  generateAgentCard
} from './runtime/services.mjs';

const BACKEND_ROOT_DIR = process.cwd();

function normalizeUrlForKey(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/+$/g, '').toLowerCase();
  } catch {
    return String(value || '').trim().replace(/\/+$/g, '').toLowerCase();
  }
}

function sourceKey(source) {
  if (source?.url) return `url:${normalizeUrlForKey(source.url)}`;
  if (source?.filePath) return `file:${path.resolve(source.filePath).toLowerCase()}`;
  if (source?.id) return `id:${source.id}`;
  return `fallback:${source?.origin || ''}:${source?.kind || ''}:${source?.title || ''}`;
}

function mergeSources(existingSources = [], newSources = []) {
  const merged = [];
  const seen = new Set();
  for (const source of [...existingSources, ...newSources]) {
    const key = sourceKey(source);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }
  return merged;
}

function runtimeOverrides(overrides = {}) {
  const llmProvider = String(
    overrides.llmProvider ||
    process.env.PERSONA_LLM_PROVIDER ||
    process.env.LLM_PROVIDER ||
    'mock'
  ).toLowerCase();
  const isDeepSeek = llmProvider === 'deepseek';
  const openaiApiKey = overrides.openaiApiKey ||
    process.env.OPENAI_API_KEY ||
    (isDeepSeek ? process.env.DEEPSEEK_API_KEY : '') ||
    '';

  return {
    rootDir: BACKEND_ROOT_DIR,
    dataDir: overrides.dataDir || process.env.PERSONA_ENGINE_DATA_DIR || './persona-engine-cache',
    llmProvider,
    openaiApiKey,
    openaiBaseUrl: overrides.openaiBaseUrl ||
      process.env.OPENAI_BASE_URL ||
      (isDeepSeek ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'),
    openaiModel: overrides.openaiModel ||
      process.env.OPENAI_MODEL ||
      process.env.DEEPSEEK_MODEL ||
      (isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini'),
    openaiSupportsVision: overrides.openaiSupportsVision ??
      process.env.OPENAI_SUPPORTS_VISION ??
      (isDeepSeek ? false : true),
    llmTimeoutMs: overrides.llmTimeoutMs || process.env.LLM_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || '',
    llmTextMaxTokens: overrides.llmTextMaxTokens || process.env.LLM_TEXT_MAX_TOKENS || '',
    llmJsonMaxTokens: overrides.llmJsonMaxTokens || process.env.LLM_JSON_MAX_TOKENS || '',
    llmDistillMaxTokens: overrides.llmDistillMaxTokens || process.env.LLM_DISTILL_MAX_TOKENS || '',
    distillEvidenceBudgetChars: overrides.distillEvidenceBudgetChars || process.env.DISTILL_EVIDENCE_BUDGET_CHARS || '',
    distillSourceLimit: overrides.distillSourceLimit || process.env.DISTILL_SOURCE_LIMIT || '',
    distillStyleSignalLimit: overrides.distillStyleSignalLimit || process.env.DISTILL_STYLE_SIGNAL_LIMIT || '',
    anthropicApiKey: overrides.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: overrides.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
    webSearchProvider: overrides.webSearchProvider || process.env.WEB_SEARCH_PROVIDER || 'multi',
    bingSearchApiKey: overrides.bingSearchApiKey || process.env.BING_SEARCH_API_KEY || '',
    bingSearchEndpoint: overrides.bingSearchEndpoint || process.env.BING_SEARCH_ENDPOINT || '',
    googleSearchApiKey: overrides.googleSearchApiKey || process.env.GOOGLE_SEARCH_API_KEY || '',
    googleSearchCx: overrides.googleSearchCx || process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID || '',
    maxPublicPages: overrides.maxPublicPages || process.env.MAX_PUBLIC_PAGES || '',
    maxPapers: overrides.maxPapers || process.env.MAX_PAPERS || '',
    fetchTimeoutMs: overrides.fetchTimeoutMs || process.env.FETCH_TIMEOUT_MS || '',
    asrProvider: overrides.asrProvider || process.env.ASR_PROVIDER || process.env.GLM_ASR_PROVIDER || '',
    asrApiKey: overrides.asrApiKey || process.env.ASR_API_KEY || process.env.GLM_ASR_API_KEY || '',
    asrBaseUrl: overrides.asrBaseUrl || process.env.ASR_BASE_URL || process.env.GLM_ASR_BASE_URL || '',
    asrEndpoint: overrides.asrEndpoint || process.env.ASR_ENDPOINT || process.env.GLM_ASR_ENDPOINT || '',
    asrMode: overrides.asrMode || process.env.ASR_MODE || '',
    asrModel: overrides.asrModel || process.env.ASR_MODEL || process.env.GLM_ASR_MODEL || '',
    asrLanguage: overrides.asrLanguage || process.env.ASR_LANGUAGE || '',
    asrTimeoutMs: overrides.asrTimeoutMs || process.env.ASR_TIMEOUT_MS || '',
    ffmpegPath: overrides.ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg',
    chromePath: overrides.chromePath || process.env.CHROME_PATH || process.env.GOOGLE_CHROME_BIN || ''
  };
}

async function createRuntime(overrides = {}) {
  const config = await loadConfig(runtimeOverrides(overrides));
  return {
    config,
    llmProvider: createLlmProvider(config),
    asrProvider: createAsrProvider(config)
  };
}

function mentorRecord(mentor = {}, publicUrls = []) {
  return {
    name: mentor.name || '',
    slug: mentor.slug || '',
    affiliation: mentor.affiliation || '',
    title: mentor.title || 'Professor',
    authorizedBy: mentor.authorizedBy || 'unknown',
    consentNotes: mentor.consentNotes || '',
    publicUrls: publicUrls || mentor.publicUrls || []
  };
}

function uploadDescriptors({
  uploads = [],
  wechatUploads = [],
  meetingUploads = [],
  thinkingQuestionnaireUploads = [],
  aiChatShareUploads = []
}) {
  return [
    ...uploads,
    ...wechatUploads,
    ...meetingUploads,
    ...thinkingQuestionnaireUploads,
    ...aiChatShareUploads
  ].filter((item) => item?.path || item?.fileUrl);
}

function countsForSources(sources = []) {
  return {
    sourceCount: sources.length,
    publicSourceCount: sources.filter((source) => source.origin === 'public').length,
    uploadSourceCount: sources.filter((source) => source.origin === 'upload').length,
    privateSourceCount: sources.filter((source) => source.origin === 'private').length,
    chunkCount: 0
  };
}

export async function buildPersonaArtifacts({
  mentor,
  publicUrls = [],
  uploads = [],
  wechatUploads = [],
  meetingUploads = [],
  thinkingQuestionnaireUploads = [],
  aiChatShareUploads = [],
  skipPublicSearch = false,
  disableOpenalex = false,
  mentorSpeaker = '',
  meetingSpeaker = '',
  configOverrides = {}
}) {
  const runtime = await createRuntime(configOverrides);
  const normalizedMentor = mentorRecord(mentor, publicUrls);

  const publicSources = await collectPublicSources({
    mentor: normalizedMentor,
    publicUrls,
    config: runtime.config,
    skipPublicSearch: Boolean(skipPublicSearch),
    disableOpenAlex: Boolean(disableOpenalex)
  });

  const uploadSources = await parseUploadFiles(
    uploadDescriptors({ uploads, wechatUploads, meetingUploads, thinkingQuestionnaireUploads, aiChatShareUploads }),
    runtime.llmProvider,
    {
      mentor: normalizedMentor,
      mentorSpeaker,
      meetingSpeaker,
      asrProvider: runtime.asrProvider,
      tmpDir: runtime.config.tmpDir,
      ffmpegPath: runtime.config.ffmpegPath,
      chromePath: runtime.config.chromePath
    }
  );

  const sources = [...publicSources, ...uploadSources];
  if (!sources.length) {
    throw new Error('No sources collected. Provide public URLs, uploads, or project text.');
  }

  const chunks = buildChunks(sources);
  const persona = await distillPersona({
    mentor: normalizedMentor,
    sources,
    chunks,
    llmProvider: runtime.llmProvider,
    config: runtime.config
  });
  const agentCard = generateAgentCard(persona);

  return {
    persona,
    agentCard,
    sources,
    chunks,
    llmProviderKind: runtime.llmProvider.kind,
    llmModel: runtime.llmProvider.model || runtime.config.openaiModel || runtime.config.anthropicModel || null,
    ...countsForSources(sources),
    chunkCount: chunks.length
  };
}

export async function updatePersonaArtifacts({
  mentor,
  existingSources = [],
  publicUrls = [],
  uploads = [],
  wechatUploads = [],
  meetingUploads = [],
  thinkingQuestionnaireUploads = [],
  aiChatShareUploads = [],
  skipPublicSearch = false,
  disableOpenalex = false,
  mentorSpeaker = '',
  meetingSpeaker = '',
  configOverrides = {}
}) {
  const built = await buildPersonaArtifacts({
    mentor,
    publicUrls,
    uploads,
    wechatUploads,
    meetingUploads,
    thinkingQuestionnaireUploads,
    aiChatShareUploads,
    skipPublicSearch,
    disableOpenalex,
    mentorSpeaker,
    meetingSpeaker,
    configOverrides
  });

  const sources = mergeSources(existingSources, built.sources);
  const runtime = await createRuntime(configOverrides);
  const normalizedMentor = mentorRecord(mentor, publicUrls);
  const chunks = buildChunks(sources);
  const persona = await distillPersona({
    mentor: normalizedMentor,
    sources,
    chunks,
    llmProvider: runtime.llmProvider,
    config: runtime.config
  });
  const agentCard = generateAgentCard(persona);

  return {
    persona,
    agentCard,
    sources,
    chunks,
    addedSourceCount: built.sourceCount,
    llmProviderKind: runtime.llmProvider.kind,
    llmModel: runtime.llmProvider.model || runtime.config.openaiModel || runtime.config.anthropicModel || null,
    ...countsForSources(sources),
    chunkCount: chunks.length
  };
}

export async function chatWithPersona({ persona, chunks, session, message, studentProfile, llmProvider = null, configOverrides = {} }) {
  const runtime = llmProvider ? null : await createRuntime(configOverrides);
  const provider = llmProvider || runtime.llmProvider;
  return chatAsPersona({
    persona,
    chunks,
    session,
    message,
    studentProfile,
    llmProvider: provider
  });
}

export async function evaluateWithPersona({ persona, chunks, studentProfile, transcript, llmProvider = null, configOverrides = {} }) {
  const runtime = llmProvider ? null : await createRuntime(configOverrides);
  const provider = llmProvider || runtime.llmProvider;
  return evaluateStudentFit({
    persona,
    chunks,
    studentProfile,
    transcript,
    llmProvider: provider
  });
}

export async function createRuntimeProviders(configOverrides = {}) {
  const runtime = await createRuntime(configOverrides);
  return {
    config: runtime.config,
    llmProvider: runtime.llmProvider,
    asrProvider: runtime.asrProvider
  };
}
