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
    anthropicApiKey: overrides.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: overrides.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
    webSearchProvider: (overrides.webSearchProvider || process.env.WEB_SEARCH_PROVIDER || 'multi').toLowerCase(),
    bingSearchApiKey: overrides.bingSearchApiKey || process.env.BING_SEARCH_API_KEY || '',
    bingSearchEndpoint: overrides.bingSearchEndpoint || process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search',
    googleSearchApiKey: overrides.googleSearchApiKey || process.env.GOOGLE_SEARCH_API_KEY || '',
    googleSearchCx: overrides.googleSearchCx || process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID || '',
    maxPublicPages: Number(overrides.maxPublicPages || process.env.MAX_PUBLIC_PAGES || 6),
    maxPapers: Number(overrides.maxPapers || process.env.MAX_PAPERS || 8),
    fetchTimeoutMs: Number(overrides.fetchTimeoutMs || process.env.FETCH_TIMEOUT_MS || 15000)
  };
}
