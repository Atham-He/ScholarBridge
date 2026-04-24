import path from 'node:path';

let dotenvLoaded = false;

function optionalBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

export async function loadConfig(overrides = {}) {
  if (!dotenvLoaded) {
    try {
      const dotenv = await import('dotenv');
      dotenv.config();
    } catch {
      // Optional dependency for local convenience.
    }
    dotenvLoaded = true;
  }

  const cwd = overrides.rootDir || process.cwd();
  const dataDir = path.resolve(cwd, overrides.dataDir || process.env.DATA_DIR || './data');
  const llmProvider = (overrides.llmProvider || process.env.LLM_PROVIDER || 'mock').toLowerCase();
  const isDeepSeek = llmProvider === 'deepseek';
  const defaultLlmTimeoutMs = isDeepSeek ? 180000 : 60000;
  const asrApiKey = overrides.asrApiKey || process.env.ASR_API_KEY || process.env.GLM_ASR_API_KEY || '';
  const asrProvider = (overrides.asrProvider || process.env.ASR_PROVIDER || process.env.GLM_ASR_PROVIDER || (asrApiKey ? 'glm' : 'mock')).toLowerCase();

  return {
    rootDir: cwd,
    dataDir,
    tmpDir: path.join(dataDir, 'tmp'),
    port: Number(overrides.port || process.env.PORT || 3000),
    llmProvider,
    openaiApiKey: overrides.openaiApiKey || process.env.OPENAI_API_KEY || (isDeepSeek ? process.env.DEEPSEEK_API_KEY : '') || '',
    openaiBaseUrl: overrides.openaiBaseUrl || process.env.OPENAI_BASE_URL || (isDeepSeek ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'),
    openaiModel: overrides.openaiModel || process.env.OPENAI_MODEL || (isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini'),
    openaiSupportsVision: optionalBoolean(overrides.openaiSupportsVision ?? process.env.OPENAI_SUPPORTS_VISION, !isDeepSeek),
    llmTimeoutMs: Number(overrides.llmTimeoutMs || process.env.LLM_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || defaultLlmTimeoutMs),
    llmTextMaxTokens: Number(overrides.llmTextMaxTokens || process.env.LLM_TEXT_MAX_TOKENS || process.env.OPENAI_TEXT_MAX_TOKENS || 1400),
    llmJsonMaxTokens: Number(overrides.llmJsonMaxTokens || process.env.LLM_JSON_MAX_TOKENS || process.env.OPENAI_JSON_MAX_TOKENS || 1800),
    llmDistillMaxTokens: Number(overrides.llmDistillMaxTokens || process.env.LLM_DISTILL_MAX_TOKENS || 2200),
    distillEvidenceBudgetChars: Number(overrides.distillEvidenceBudgetChars || process.env.DISTILL_EVIDENCE_BUDGET_CHARS || (isDeepSeek ? 16000 : 22000)),
    distillSourceLimit: Number(overrides.distillSourceLimit || process.env.DISTILL_SOURCE_LIMIT || 24),
    distillStyleSignalLimit: Number(overrides.distillStyleSignalLimit || process.env.DISTILL_STYLE_SIGNAL_LIMIT || 6),
    anthropicApiKey: overrides.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: overrides.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
    webSearchProvider: (overrides.webSearchProvider || process.env.WEB_SEARCH_PROVIDER || 'multi').toLowerCase(),
    bingSearchApiKey: overrides.bingSearchApiKey || process.env.BING_SEARCH_API_KEY || '',
    bingSearchEndpoint: overrides.bingSearchEndpoint || process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search',
    googleSearchApiKey: overrides.googleSearchApiKey || process.env.GOOGLE_SEARCH_API_KEY || '',
    googleSearchCx: overrides.googleSearchCx || process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID || '',
    maxPublicPages: Number(overrides.maxPublicPages || process.env.MAX_PUBLIC_PAGES || 6),
    maxPapers: Number(overrides.maxPapers || process.env.MAX_PAPERS || 8),
    fetchTimeoutMs: Number(overrides.fetchTimeoutMs || process.env.FETCH_TIMEOUT_MS || 15000),
    asrProvider,
    asrApiKey,
    asrBaseUrl: overrides.asrBaseUrl || process.env.ASR_BASE_URL || process.env.GLM_ASR_BASE_URL || 'https://llmapi.paratera.com',
    asrEndpoint: overrides.asrEndpoint || process.env.ASR_ENDPOINT || process.env.GLM_ASR_ENDPOINT || '',
    asrMode: overrides.asrMode || process.env.ASR_MODE || 'openai-multipart',
    asrModel: overrides.asrModel || process.env.ASR_MODEL || process.env.GLM_ASR_MODEL || 'GLM-ASR-2512',
    asrLanguage: overrides.asrLanguage || process.env.ASR_LANGUAGE || '',
    asrTimeoutMs: Number(overrides.asrTimeoutMs || process.env.ASR_TIMEOUT_MS || 120000),
    ffmpegPath: overrides.ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg',
    chromePath: overrides.chromePath || process.env.CHROME_PATH || process.env.GOOGLE_CHROME_BIN || ''
  };
}
