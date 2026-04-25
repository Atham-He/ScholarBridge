import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { load } from 'cheerio';
import { cleanText, firstSentences, nowIso, safeId, uniqueBy } from '../lib/utils.mjs';

const execFileAsync = promisify(execFile);

const SUPPORTED_SHARE_HOSTS = new Set(['chatgpt.com', 'chat.openai.com']);
const USER_THINKING_PATTERNS = [
  ['requires strong baselines', /baseline|strong baseline|基线|对照组/i],
  ['requires explicit metrics', /metric|evaluation|score|指标|评估标准/i],
  ['asks for ablations or controls', /ablation|control|消融|对照实验/i],
  ['pushes for error analysis', /error analysis|failure case|debug|错误分析|失败案例|诊断/i],
  ['wants testable hypotheses', /hypothesis|testable|假设|可验证/i],
  ['decomposes broad tasks into steps', /step by step|break down|decompose|拆解|逐步|一步一步/i],
  ['cares about reproducibility', /reproduc|replicate|复现|可重复/i],
  ['cares about deployment constraints', /latency|runtime|deployment|constraint|时延|部署|约束/i]
];

const PROMPT_CATEGORY_PATTERNS = {
  researchTaste: /interesting problem|worth doing|novel|impact|taste|选题|问题价值|创新性|有意思/i,
  problemSelection: /how to choose|problem definition|scope|scenario|question|选择问题|问题定义|场景|范围/i,
  ideaGeneration: /idea|brainstorm|improve|design|novelty|generate|想法|方案|设计|改进/i,
  evidenceStandards: /baseline|metric|evaluation|ablation|evidence|proof|基线|指标|消融|证据|证明/i,
  studentEvaluation: /student|candidate|applicant|fit|interview|招生|学生|候选人|匹配/i,
  scenarioResponses: /if .* fail|what if|failure|doesn.?t work|如果.*失败|如果.*不行|失败怎么办/i,
  redFlags: /red flag|avoid|pitfall|bad sign|不要|风险|雷区/i
};

function normalizeShareUrl(rawUrl) {
  const parsed = new URL(String(rawUrl || '').trim());
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/+$/g, '');
}

function isSupportedShareUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    const pathname = parsed.pathname.replace(/\/+$/g, '');
    return SUPPORTED_SHARE_HOSTS.has(parsed.hostname.toLowerCase()) && /^\/share\/[a-z0-9-]+$/i.test(pathname);
  } catch {
    return false;
  }
}

async function pathExists(filePath) {
  try {
    await execFileAsync(filePath, ['--version'], {
      windowsHide: true,
      timeout: 5000
    });
    return true;
  } catch {
    return false;
  }
}

async function resolveChromePath(explicitPath = '') {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'google-chrome',
    'google-chrome-stable',
    'chromium-browser',
    'chromium',
    'chrome',
    'msedge',
    'microsoft-edge',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ].map((item) => String(item || '').trim()).filter(Boolean);

  for (const candidate of [...new Set(candidates)]) {
    if (await pathExists(candidate)) return candidate;
  }
  return '';
}

async function fetchRawHtml(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; ScholarBridge Persona Bot/1.0)'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch AI chat share URL: HTTP ${response.status}`);
  }
  return response.text();
}

async function renderShareHtml(url, options = {}) {
  const chromePath = await resolveChromePath(options.chromePath);
  if (chromePath) {
    const { stdout } = await execFileAsync(chromePath, [
      '--headless',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--hide-scrollbars',
      `--virtual-time-budget=${Number(options.virtualTimeBudgetMs || 8000)}`,
      '--dump-dom',
      url
    ], {
      windowsHide: true,
      timeout: Number(options.renderTimeoutMs || 90000),
      maxBuffer: 24 * 1024 * 1024
    });

    if (stdout && stdout.includes('data-message-author-role=')) {
      return stdout;
    }
  }

  const rawHtml = await fetchRawHtml(url);
  if (rawHtml.includes('data-message-author-role=')) {
    return rawHtml;
  }
  if (!chromePath) {
    throw new Error('ChatGPT share parsing requires a local Chrome/Chromium executable. Set CHROME_PATH to enable this source type.');
  }
  throw new Error('Rendered share page did not expose conversation turns. The share page may be unsupported or blocked.');
}

function extractAttachmentLabels($, messageNode) {
  return uniqueBy(
    $(messageNode)
      .find('.text-token-text-secondary span')
      .map((_, item) => cleanText($(item).text(), 120))
      .get()
      .filter(Boolean),
    (item) => item.toLowerCase()
  ).slice(0, 6);
}

function extractMessageText($, messageNode, role) {
  const node = $(messageNode);
  let text = '';
  if (role === 'assistant') {
    text = cleanText(node.find('.markdown').text(), 20000);
  } else {
    text = cleanText(node.find('.user-message-bubble-color, [overflow-wrap="anywhere"], .whitespace-pre-wrap').first().text(), 12000);
    const attachments = extractAttachmentLabels($, messageNode);
    if (attachments.length) {
      text = cleanText(`[attachments: ${attachments.join(', ')}]\n${text}`, 14000);
    }
  }

  if (!text) {
    const clone = node.clone();
    clone.find('button, svg, script, style').remove();
    text = cleanText(clone.text(), 20000);
  }
  return text;
}

export function extractAiChatShareTurnsFromRenderedHtml(html) {
  const $ = load(String(html || ''));
  const rawTitle = cleanText($('title').first().text(), 300);
  const title = rawTitle.replace(/^ChatGPT\s*-\s*/i, '').trim() || 'ChatGPT shared conversation';
  const turns = [];

  $('[data-testid^="conversation-turn-"]').each((_, turnNode) => {
    const testId = String($(turnNode).attr('data-testid') || '');
    const turnIndexMatch = testId.match(/conversation-turn-(\d+)/i);
    const turnIndex = Number(turnIndexMatch?.[1] || turns.length + 1);
    $(turnNode).find('[data-message-author-role]').each((messageIndex, messageNode) => {
      const role = cleanText($(messageNode).attr('data-message-author-role') || '', 20).toLowerCase();
      if (role !== 'user' && role !== 'assistant') return;
      const text = extractMessageText($, messageNode, role);
      if (!text) return;
      turns.push({
        id: safeId('share_turn'),
        turnIndex,
        messageIndex,
        role,
        text
      });
    });
  });

  return {
    title,
    turns
  };
}

function promptSnippets(turns, regex, limit = 8) {
  return uniqueBy(
    (turns || [])
      .filter((turn) => regex.test(turn.text))
      .map((turn) => cleanText(turn.text, 260))
      .filter(Boolean),
    (item) => item.toLowerCase()
  ).slice(0, limit);
}

function buildThinkingStyleSignals(turns) {
  const userTurns = (turns || []).filter((turn) => turn.role === 'user');
  const assistantTurns = (turns || []).filter((turn) => turn.role === 'assistant');
  const userText = userTurns.map((turn) => turn.text).join('\n');
  const assistantText = assistantTurns.map((turn) => turn.text).join('\n');

  const signals = {
    researchTaste: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.researchTaste, 8),
    problemSelection: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.problemSelection, 8),
    thinkingProcess: uniqueBy(
      userTurns.map((turn) => cleanText(turn.text, 260)).filter(Boolean),
      (item) => item.toLowerCase()
    ).slice(0, 10),
    ideaGeneration: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.ideaGeneration, 8),
    evidenceStandards: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.evidenceStandards, 8),
    studentEvaluation: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.studentEvaluation, 6),
    feedbackVoice: uniqueBy(
      assistantTurns.map((turn) => cleanText(turn.text, 220)).filter(Boolean),
      (item) => item.toLowerCase()
    ).slice(0, 6),
    scenarioResponses: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.scenarioResponses, 8),
    decisionSignals: USER_THINKING_PATTERNS
      .filter(([, pattern]) => pattern.test(`${userText}\n${assistantText}`))
      .map(([label]) => label)
      .slice(0, 8),
    redFlags: promptSnippets(userTurns, PROMPT_CATEGORY_PATTERNS.redFlags, 6),
    questionExamples: promptSnippets(userTurns, /[?？]|how|what|why|should|can|could|如何|为什么|是否|该不该/i, 8),
    styleInference: ['ai_share_url_prompt_trace'],
    styleBoundaries: [
      'Use shared AI chat records to infer prompt structure and thinking habits, not to quote them verbatim to students.'
    ]
  };

  return Object.fromEntries(
    Object.entries(signals).filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))
  );
}

function buildTranscriptContent({ title, shareUrl, turns }) {
  const lines = [
    `Shared AI chat sample for mentor thinking process.`,
    `Conversation title: ${title || 'Untitled share conversation'}.`,
    `Share URL: ${shareUrl}.`,
    `Parsed turns: ${turns.length}.`,
    '',
    ...turns.map((turn, index) => `Turn ${index + 1} [${turn.role}]: ${turn.text}`)
  ];
  return cleanText(lines.join('\n'), 120000);
}

export async function parseAiChatShareUrl(upload = {}, options = {}) {
  const rawUrl = upload.fileUrl || upload.url || '';
  if (!isSupportedShareUrl(rawUrl)) {
    throw new Error(`Unsupported AI chat share URL: ${rawUrl || 'empty'}`);
  }

  const shareUrl = normalizeShareUrl(rawUrl);
  const renderedHtml = await renderShareHtml(shareUrl, options);
  const { title, turns } = extractAiChatShareTurnsFromRenderedHtml(renderedHtml);
  if (!turns.length) {
    throw new Error(`Could not extract any conversation turns from share URL: ${shareUrl}`);
  }

  const styleSignals = buildThinkingStyleSignals(turns);
  const content = buildTranscriptContent({ title, shareUrl, turns });
  const userTurnCount = turns.filter((turn) => turn.role === 'user').length;
  const assistantTurnCount = turns.filter((turn) => turn.role === 'assistant').length;

  return {
    id: safeId('src'),
    origin: 'private',
    kind: 'ai_chat_share',
    title: title || upload.originalName || 'ChatGPT shared conversation',
    url: shareUrl,
    filePath: null,
    content,
    metadata: {
      parsedAt: nowIso(),
      sourceType: 'ai_chat_share',
      privacyLevel: 'private_ai_chat_style',
      mimeType: upload.mimeType || 'text/uri-list',
      shareUrl,
      shareHost: new URL(shareUrl).hostname,
      turnCount: turns.length,
      userTurnCount,
      assistantTurnCount,
      summary: firstSentences(content, 4),
      styleSignals
    }
  };
}
