/**
 * 文件上传处理工具
 * 用于Next.js API Routes中的multipart/form-data解析
 */

import { Readable } from 'stream';

export interface UploadedFile {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  path?: string;
}

/**
 * 解析multipart/form-data
 * 注意: 这是一个简化的实现，生产环境建议使用formidable或multer
 */
export async function parseMultipartFormData(
  request: Request
): Promise<{
  fields: Record<string, string | string[]>;
  files: UploadedFile[];
}> {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data');
  }

  // 获取boundary
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type');
  }

  const boundary = `--${boundaryMatch[1]}`;
  const buffer = await request.arrayBuffer();
  const text = Buffer.from(buffer).toString('latin1'); // 使用latin1保留二进制数据

  const parts = text.split(boundary);
  const fields: Record<string, string | string[]> = {};
  const files: UploadedFile[] = [];

  // 跳过第一个和最后一个（空的部分）
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part.trim()) continue;

    // 分离headers和content
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headersText = part.substring(0, headerEnd);
    const content = part.substring(headerEnd + 4);

    // 解析headers
    const headers: Record<string, string> = {};
    const headerLines = headersText.split('\r\n');
    for (const line of headerLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headers[name] = value;
      }
    }

    // 解析Content-Disposition
    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const filenameMatch = disposition.match(/filename="([^"]+)"/i);

    if (!nameMatch) continue;

    const fieldName = nameMatch[1];

    if (filenameMatch) {
      // 这是一个文件上传
      const filename = filenameMatch[1];
      const contentType = headers['content-type'] || 'application/octet-stream';

      // 将content转换回Buffer
      // 移除末尾的\r\n
      const fileContent = content.endsWith('\r\n') ? content.slice(0, -2) : content;
      const buffer = Buffer.from(fileContent, 'latin1');

      files.push({
        name: filename,
        mimeType: contentType,
        size: buffer.length,
        buffer
      });
    } else {
      // 这是一个普通字段
      const value = content.endsWith('\r\n') ? content.slice(0, -2) : content;

      if (fields[fieldName]) {
        // 如果字段已存在，转换为数组
        if (Array.isArray(fields[fieldName])) {
          (fields[fieldName] as string[]).push(value);
        } else {
          fields[fieldName] = [fields[fieldName] as string, value];
        }
      } else {
        fields[fieldName] = value;
      }
    }
  }

  return { fields, files };
}

/**
 * 从FormData中提取文件
 */
export async function extractFilesFromFormData(formData: FormData): Promise<UploadedFile[]> {
  const files: UploadedFile[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.push({
        name: value.name,
        mimeType: value.type || 'application/octet-stream',
        size: value.size || buffer.length,
        buffer
      });
    }
  }

  return files;
}

/**
 * 验证上传的文件
 */
export function validateUploadFiles(files: UploadedFile[], maxSize: number = 10 * 1024 * 1024): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push('No files uploaded');
  }

  if (files.length > 10) {
    errors.push('Too many files (maximum 10)');
  }

  for (const file of files) {
    if (file.size > maxSize) {
      errors.push(`File ${file.name} exceeds size limit of ${maxSize / 1024 / 1024}MB`);
    }

    const allowedTypes = [
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

    if (!allowedTypes.includes(file.mimeType)) {
      errors.push(`File ${file.name} has unsupported type: ${file.mimeType}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 将字段转换为预期的类型
 */
export function normalizeFields(fields: Record<string, string | string[]>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(fields)) {
    // 尝试解析JSON值
    if (typeof value === 'string') {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else if (Array.isArray(value)) {
      // 如果是数组，尝试解析每个元素
      result[key] = value.map(v => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } else {
      result[key] = value;
    }
  }

  return result;
}
