/**
 * File upload helpers for multipart/form-data parsing in Next.js API routes.
 */

export interface UploadedFile {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  path?: string;
}

/**
 * Parses multipart/form-data.
 * This is intentionally lightweight; production deployments should use
 * a dedicated parser such as formidable or multer.
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

  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type');
  }

  const boundary = `--${boundaryMatch[1]}`;
  const buffer = await request.arrayBuffer();
  const text = Buffer.from(buffer).toString('latin1');

  const parts = text.split(boundary);
  const fields: Record<string, string | string[]> = {};
  const files: UploadedFile[] = [];

  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part.trim()) continue;

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headersText = part.substring(0, headerEnd);
    const content = part.substring(headerEnd + 4);

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

    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const filenameMatch = disposition.match(/filename="([^"]+)"/i);

    if (!nameMatch) continue;

    const fieldName = nameMatch[1];

    if (filenameMatch) {
      const filename = filenameMatch[1];
      const contentType = headers['content-type'] || 'application/octet-stream';

      const fileContent = content.endsWith('\r\n') ? content.slice(0, -2) : content;
      const buffer = Buffer.from(fileContent, 'latin1');

      files.push({
        name: filename,
        mimeType: contentType,
        size: buffer.length,
        buffer
      });
    } else {
      const value = content.endsWith('\r\n') ? content.slice(0, -2) : content;

      if (fields[fieldName]) {
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
 * Extracts uploaded files from FormData.
 */
export async function extractFilesFromFormData(formData: FormData): Promise<UploadedFile[]> {
  const files: UploadedFile[] = [];

  for (const value of formData.values()) {
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
 * Validates uploaded files.
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
 * Normalizes parsed form fields.
 */
export function normalizeFields(fields: Record<string, string | string[]>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else if (Array.isArray(value)) {
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
