import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'had', 'are', 'was', 'were',
  'will', 'would', 'can', 'could', 'should', 'into', 'onto', 'about', 'than', 'then', 'there',
  'their', 'they', 'them', 'what', 'when', 'where', 'which', 'while', 'through', 'within', 'without',
  'under', 'over', 'each', 'also', 'such', 'using', 'used', 'been', 'being', 'your', 'you', 'our',
  'ours', 'its', 'his', 'her', 'she', 'him', 'he', 'who', 'how', 'why', 'a', 'an', 'or', 'to', 'of', 'in',
  'on', 'by', 'at', 'as', 'is', 'it', 'be', 'if', 'we', 'do', 'did', 'not', 'but', 'may', 'more',
  'most', 'less', 'very', 'just', 'some', 'any', 'all', 'one', 'two', 'three',
  '研究', '工作', '以及', '一个', '可以', '我们', '他们', '进行', '通过', '对于', '如果', '因为', '这个', '那个',
  '导师', '学生', '项目', '问题', '方法', '实验', '模型', '系统', '学习', '工作流', '自己', '需要', 'signals', 'signal', 'project', 'brief', 'known', 'tends', 'values', 'asks', 'prefers', 'students', 'student', 'paper', 'papers'
]);

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function sanitizeFileName(value, fallback = 'upload') {
  const baseName = path.basename(String(value || fallback));
  const sanitized = baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180);
  return sanitized || fallback;
}

export function extensionFromMime(mimeType) {
  const normalized = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const map = new Map([
    ['text/plain', '.txt'],
    ['text/markdown', '.md'],
    ['application/pdf', '.pdf'],
    ['application/msword', '.doc'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg']
  ]);
  return map.get(normalized) || '';
}

export function safeId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function randomHex(length = 8) {
  return crypto.randomUUID().replace(/-/g, '').slice(0, Math.max(1, length));
}

export function nowIso() {
  return new Date().toISOString();
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function copyFileIntoDir(sourcePath, targetDir) {
  await ensureDir(targetDir);
  const fileName = path.basename(sourcePath);
  const targetPath = path.join(targetDir, fileName);
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}

export async function writeText(filePath, text) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, text, 'utf8');
}

export async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

export function cleanText(value, maxLength = 30000) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

export function stripHtml(html) {
  return cleanText(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  );
}

export function extractTitleFromHtml(html) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(match?.[1] || '');
}

export function tokenize(text) {
  return cleanText(text, 60000)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff#+.-]+/u)
    .filter((token) => token.length > 1)
    .filter((token) => /[a-z\u4e00-\u9fff]/u.test(token))
    .filter((token) => !STOPWORDS.has(token));
}

export function topKeywords(text, limit = 10) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token, score]) => ({ token, score }));
}

export function splitIntoSentences(text) {
  return cleanText(text, 50000)
    .split(/(?<=[。！？.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function firstSentences(text, limit = 3) {
  return splitIntoSentences(text).slice(0, limit).join(' ');
}

export function chunkText(text, options = {}) {
  const size = options.size || 1200;
  const overlap = options.overlap || 180;
  const cleaned = cleanText(text, 200000);
  if (!cleaned) return [];
  const chunks = [];
  let index = 0;
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + size);
    const slice = cleaned.slice(start, end).trim();
    if (slice) {
      chunks.push({ index, text: slice });
      index += 1;
    }
    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function overlapScore(query, candidate) {
  const q = tokenize(query);
  const c = tokenize(candidate);
  if (!q.length || !c.length) return 0;
  const freq = new Map();
  for (const token of c) freq.set(token, (freq.get(token) || 0) + 1);
  let score = 0;
  for (const token of q) {
    score += Math.min(3, freq.get(token) || 0);
  }
  return score / Math.sqrt(c.length + 8);
}

export function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

export function parseJsonLoose(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function parseLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractJsonFromText(text) {
  const content = String(text || '').trim();
  if (!content) throw new Error('Empty JSON candidate');
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = content.slice(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }
  throw new Error('No JSON object found in model response');
}

export function pickTop(items, count) {
  return items.slice(0, Math.max(0, count));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
