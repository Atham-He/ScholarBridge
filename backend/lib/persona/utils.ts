/**
 * Persona服务工具函数
 */

import { randomBytes } from 'crypto';

/**
 * 生成安全ID
 */
export function safeId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 生成ISO格式时间戳
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 清理文本
 */
export function cleanText(text: string, maxLength: number = 60000): string {
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  return cleaned;
}

/**
 * 提取前N个句子
 */
export function firstSentences(text: string, count: number = 3): string {
  const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, count).join('。') + (sentences.length > count ? '。' : '');
}

/**
 * 将文本分割成句子
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/[。！？.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * 计算数组平均值
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * 限制数值范围
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 从数组中随机选取N个元素
 */
export function pickTop<T>(array: T[], n: number): T[] {
  return array.slice(0, Math.min(n, array.length));
}

/**
 * 计算词汇重叠度（用于检索）
 */
export function overlapScore(query: string, text: string): number {
  const queryTokens = new Set(
    query.toLowerCase().match(/[a-z\u4e00-\u9fa5]{2,}/g) || []
  );
  const textTokens = new Set(
    text.toLowerCase().match(/[a-z\u4e00-\u9fa5]{2,}/g) || []
  );

  if (queryTokens.size === 0 || textTokens.size === 0) {
    return 0;
  }

  const intersection = new Set(
    [...queryTokens].filter(token => textTokens.has(token))
  );

  const union = new Set([...queryTokens, ...textTokens]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 提取前N个关键词
 */
export function topKeywords(
  text: string,
  count: number = 16
): Array<{ token: string; count: number }> {
  const tokens = text.toLowerCase().match(/[a-z\u4e00-\u9fa5]{2,}/g) || [];

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([token, count]) => ({ token, count }));
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const waitTime = backoff ? delayMs * attempt : delayMs;
        console.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  throw lastError!;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse<T = any>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: 'iso' | 'readable' = 'iso'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'iso') {
    return d.toISOString();
  }

  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 16): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .substring(0, length);
}
