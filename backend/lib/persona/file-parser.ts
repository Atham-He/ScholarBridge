/**
 * 文件解析工具
 * 支持PDF、DOCX、图片、文本文件的解析
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import type { LLMProvider } from './llm';

/**
 * 上传的文件信息
 */
export interface UploadedFile {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  path?: string;
}

/**
 * 解析结果
 */
export interface ParseResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    pageCount?: number;
    createdAt?: string;
  };
}

/**
 * 文件大小限制（10MB）
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 允许的MIME类型
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp'
];

/**
 * 验证文件
 */
export function validateFile(file: UploadedFile): { valid: boolean; error?: string } {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  // 检查MIME类型
  if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.mimeType}`
    };
  }

  return { valid: true };
}

/**
 * 生成安全的文件名
 */
function generateSafeFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
  const random = randomBytes(8).toString('hex');
  return `${base}_${random}${ext}`;
}

/**
 * 保存文件到磁盘
 */
export async function saveFile(
  file: UploadedFile,
  uploadDir: string = './uploads'
): Promise<string> {
  // 确保上传目录存在
  await fs.mkdir(uploadDir, { recursive: true });

  // 生成安全的文件名
  const safeName = generateSafeFilename(file.name);
  const filePath = path.join(uploadDir, safeName);

  // 保存文件
  await fs.writeFile(filePath, file.buffer);

  return filePath;
}

/**
 * 解析PDF文件
 */
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdfParse(buffer);

    // 提取文本内容
    let content = data.text.trim();

    // 清理文本
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (content.length === 0) {
      return {
        success: false,
        error: 'PDF contains no extractable text'
      };
    }

    return {
      success: true,
      content,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        pageCount: data.numpages
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse PDF'
    };
  }
}

/**
 * 解析DOCX文件
 */
export async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    let content = result.value.trim();

    // 清理文本
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (content.length === 0) {
      return {
        success: false,
        error: 'DOCX contains no extractable text'
      };
    }

    // 检查是否有解析错误
    if (result.messages.length > 0) {
      const warnings = result.messages
        .filter(m => m.type === 'warning')
        .map(m => m.message)
        .join('; ');
      console.warn(`DOCX parsing warnings: ${warnings}`);
    }

    return {
      success: true,
      content
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse DOCX'
    };
  }
}

/**
 * 解析文本文件
 */
export async function parseText(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  try {
    const content = buffer.toString('utf-8').trim();

    if (content.length === 0) {
      return {
        success: false,
        error: 'Text file is empty'
      };
    }

    return {
      success: true,
      content,
      metadata: {
        title: mimeType === 'text/markdown' ? 'Markdown Document' : 'Text Document'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse text file'
    };
  }
}

/**
 * 解析图片（使用Vision LLM）
 */
export async function parseImage(
  buffer: Buffer,
  mimeType: string,
  llmProvider?: LLMProvider
): Promise<ParseResult> {
  try {
    // 如果有支持vision的LLM，使用它
    if (llmProvider?.generateVision) {
      const description = await llmProvider.generateVision(
        buffer,
        'Please describe the content of this image in detail. Focus on:\n' +
        '1. Any visible text (transcribe it fully)\n' +
        '2. Diagrams, charts, or figures (describe their structure and content)\n' +
        '3. Key information or data points\n' +
        '4. Context or purpose of the image\n\n' +
        'Provide a comprehensive description that captures all important information.'
      );

      return {
        success: true,
        content: description,
        metadata: {
          title: 'Image Description'
        }
      };
    } else {
      return {
        success: false,
        error: 'No vision-capable LLM available for image parsing'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse image'
    };
  }
}

/**
 * 主解析函数：根据MIME类型路由到相应的解析器
 */
export async function parseFile(
  file: UploadedFile,
  llmProvider?: LLMProvider
): Promise<ParseResult> {
  // 验证文件
  const validation = validateFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const { mimeType, buffer } = file;

  try {
    // 根据MIME类型选择解析器
    if (mimeType === 'application/pdf') {
      return await parsePDF(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return await parseDOCX(buffer);
    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return await parseText(buffer, mimeType);
    } else if (mimeType.startsWith('image/')) {
      return await parseImage(buffer, mimeType, llmProvider);
    } else {
      return {
        success: false,
        error: `Unsupported MIME type: ${mimeType}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * 批量解析多个文件
 */
export async function parseFiles(
  files: UploadedFile[],
  llmProvider?: LLMProvider
): Promise<Map<string, ParseResult>> {
  const results = new Map<string, ParseResult>();

  await Promise.all(
    files.map(async (file) => {
      const result = await parseFile(file, llmProvider);
      results.set(file.name, result);
    })
  );

  return results;
}

/**
 * 清理解析后的文本（通用处理）
 */
export function cleanParsedText(text: string, maxLength: number = 100000): string {
  let cleaned = text
    // 统一换行符
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 移除过长的空白行
    .replace(/\n{3,}/g, '\n\n')
    // 统一空格
    .replace(/\s+/g, ' ')
    // 移除首尾空白
    .trim();

  // 限制长度
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    // 尝试在句子边界截断
    const lastSentence = Math.max(
      cleaned.lastIndexOf('.'),
      cleaned.lastIndexOf('!'),
      cleaned.lastIndexOf('?'),
      cleaned.lastIndexOf('。'),
      cleaned.lastIndexOf('！'),
      cleaned.lastIndexOf('？')
    );
    if (lastSentence > maxLength * 0.8) {
      cleaned = cleaned.substring(0, lastSentence + 1);
    }
  }

  return cleaned;
}

/**
 * 从解析结果中提取摘要
 */
export function extractSummary(content: string, maxLength: number = 500): string {
  const sentences = content.match(/[^.!?。！？]+[.!?。！？]*/g) || [];
  let summary = '';

  for (const sentence of sentences) {
    if ((summary + sentence).length <= maxLength) {
      summary += sentence;
    } else {
      break;
    }
  }

  return summary.trim() || content.substring(0, maxLength);
}
