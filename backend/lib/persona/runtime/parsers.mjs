import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';
import { cleanText, extensionFromMime, firstSentences, nowIso, safeId } from './lib/utils.mjs';
import { parseWechatFile } from './parsers/wechat.mjs';
import { parseMeetingFile } from './parsers/meeting.mjs';
import { parseMentorThinkingQuestionnaireFile } from './parsers/thinkingQuestionnaire.mjs';
import { parseAiChatShareUrl } from './parsers/aiChatShare.mjs';

const require = createRequire(import.meta.url);

function normalizeUpload(upload) {
  if (typeof upload === 'string') {
    return {
      path: upload,
      originalName: path.basename(upload),
      mimeType: ''
    };
  }

  return {
    path: upload?.path || upload?.filePath || '',
    originalName: upload?.originalName || upload?.originalname || path.basename(upload?.path || upload?.filePath || 'upload'),
    mimeType: upload?.mimeType || upload?.mimetype || '',
    sourceType: upload?.sourceType || upload?.kind || '',
    mentorSpeaker: upload?.mentorSpeaker || upload?.mentor_speaker || '',
    meetingSpeaker: upload?.meetingSpeaker || upload?.meeting_speaker || '',
    transcriptPath: upload?.transcriptPath || upload?.transcript_path || '',
    fileUrl: upload?.fileUrl || upload?.fileURL || upload?.url || ''
  };
}

function uploadTitle(upload) {
  return upload.originalName || path.basename(upload.path);
}

function extname(upload) {
  const originalExt = path.extname(upload.originalName || '').toLowerCase();
  if (originalExt) return originalExt;
  const pathExt = path.extname(upload.path || '').toLowerCase();
  if (pathExt) return pathExt;
  return extensionFromMime(upload.mimeType);
}

function detectMime(upload) {
  if (upload.mimeType) return upload.mimeType;
  const ext = extname(upload);
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.md') return 'text/markdown';
  return 'text/plain';
}

function baseSource(filePath, upload, kind, extraMetadata = {}) {
  return {
    id: safeId('src'),
    origin: 'upload',
    kind,
    title: uploadTitle(upload),
    filePath,
    metadata: {
      parsedAt: nowIso(),
      mimeType: detectMime(upload),
      ...extraMetadata
    }
  };
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function findZipEntry(buffer, targetName) {
  const signature = 0x04034b50;
  let offset = 0;
  while (offset + 30 < buffer.length) {
    if (buffer.readUInt32LE(offset) !== signature) {
      offset += 1;
      continue;
    }
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.slice(nameStart, nameStart + fileNameLength).toString('utf8');
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (name === targetName) {
      const data = buffer.slice(dataStart, dataEnd);
      if (compression === 0) return data;
      if (compression === 8) return zlib.inflateRawSync(data);
      throw new Error(`Unsupported ZIP compression method ${compression}`);
    }
    offset = dataEnd;
  }
  return null;
}

async function extractTextFromDocxXml(filePath) {
  const buffer = await fs.readFile(filePath);
  const xmlBuffer = findZipEntry(buffer, 'word/document.xml');
  if (!xmlBuffer) return '';
  const xml = xmlBuffer.toString('utf8');
  return cleanText(
    xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map((line) => decodeXmlEntities(line).trim())
      .filter(Boolean)
      .join('\n'),
    60000
  );
}

function decodePdfString(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function extractTextFromSimplePdf(buffer) {
  const raw = buffer.toString('latin1');
  const chunks = [];
  const literalRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let match;
  while ((match = literalRegex.exec(raw))) {
    chunks.push(decodePdfString(match[0].replace(/\)\s*Tj$/, '').slice(1)));
  }

  const arrayRegex = /\[((?:\s*\((?:\\.|[^\\)])*\)\s*-?\d*\.?\d*)+)\]\s*TJ/g;
  while ((match = arrayRegex.exec(raw))) {
    const parts = [];
    const partRegex = /\((?:\\.|[^\\)])*\)/g;
    let part;
    while ((part = partRegex.exec(match[1]))) {
      parts.push(decodePdfString(part[0].slice(1, -1)));
    }
    chunks.push(parts.join(''));
  }

  return cleanText(chunks.join('\n'), 60000);
}

async function parseTextLike(filePath, kind, upload) {
  const text = await fs.readFile(filePath, 'utf8');
  return {
    ...baseSource(filePath, upload, kind, {
      summary: firstSentences(text, 3)
    }),
    content: cleanText(text, 50000)
  };
}

async function parsePdf(filePath, upload) {
  const buffer = await fs.readFile(filePath);
  let parsed = { text: '', numpages: null, parser: 'fallback' };
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(buffer);
    parsed = { text: data.text || '', numpages: data.numpages || null, parser: 'pdf-parse' };
  } catch {
    parsed.text = extractTextFromSimplePdf(buffer);
  }
  return {
    ...baseSource(filePath, upload, 'upload_pdf', {
      pages: parsed.numpages || null,
      parser: parsed.parser,
      summary: firstSentences(parsed.text || '', 3)
    }),
    content: cleanText(parsed.text || '', 60000)
  };
}

async function parseDocx(filePath, upload) {
  let result = { value: '', parser: 'fallback' };
  try {
    const mammoth = await import('mammoth');
    const data = await mammoth.extractRawText({ path: filePath });
    result = { value: data.value || '', parser: 'mammoth' };
  } catch {
    result.value = await extractTextFromDocxXml(filePath);
  }
  return {
    ...baseSource(filePath, upload, 'upload_docx', {
      parser: result.parser,
      summary: firstSentences(result.value || '', 3)
    }),
    content: cleanText(result.value || '', 60000)
  };
}

async function parseDoc(filePath, upload) {
  const WordExtractor = require('word-extractor');
  const extractor = new WordExtractor();
  const document = await extractor.extract(filePath);
  const body = document.getBody();
  return {
    ...baseSource(filePath, upload, 'upload_doc', {
      summary: firstSentences(body || '', 3)
    }),
    content: cleanText(body || '', 60000)
  };
}

async function parseImage(filePath, llmProvider, upload) {
  const mimeType = detectMime(upload);
  const buffer = await fs.readFile(filePath);
  let description = {
    summary: `Image ${uploadTitle(upload)} was uploaded.`,
    toneSignals: [],
    notableQuotes: [],
    limitations: ['Vision model unavailable']
  };

  if (llmProvider?.supportsVision && llmProvider.kind !== 'mock') {
    try {
      description = await llmProvider.describeImage({
        system: 'You analyze uploaded screenshots or photos to support mentor persona building. Return compact JSON with summary, toneSignals, notableQuotes, and limitations.',
        user: "Describe what this image reveals about the mentor's communication style, project context, or research direction. Be conservative and do not hallucinate unreadable text.",
        mimeType,
        base64: buffer.toString('base64'),
        fileName: uploadTitle(upload)
      });
    } catch {
      // Keep placeholder summary.
    }
  } else if (llmProvider?.kind === 'mock') {
    description = await llmProvider.describeImage({ fileName: uploadTitle(upload), mimeType });
  }

  return {
    ...baseSource(filePath, upload, 'upload_image', {
      sizeBytes: buffer.byteLength,
      summary: description.summary
    }),
    content: cleanText(JSON.stringify(description, null, 2), 20000)
  };
}

export async function parseUploadFiles(filePaths, llmProvider, options = {}) {
  const docs = [];
  for (const item of filePaths || []) {
    const upload = normalizeUpload(item);
    const normalizedSourceType = String(upload.sourceType || '').toLowerCase();

    if (normalizedSourceType === 'ai_chat_share' && upload.fileUrl) {
      docs.push(await parseAiChatShareUrl(upload, {
        chromePath: options.chromePath,
        renderTimeoutMs: options.aiChatShareRenderTimeoutMs,
        virtualTimeBudgetMs: options.aiChatShareVirtualTimeBudgetMs
      }));
      continue;
    }

    if (!upload.path) continue;

    if (normalizedSourceType === 'wechat') {
      docs.push(await parseWechatFile(upload.path, upload, {
        mentorName: options.mentor?.name || options.mentorName || '',
        mentorSpeaker: upload.mentorSpeaker || options.mentorSpeaker || ''
      }));
      continue;
    }

    if (normalizedSourceType === 'meeting') {
      docs.push(await parseMeetingFile(upload.path, upload, {
        mentor: options.mentor,
        mentorName: options.mentor?.name || options.mentorName || '',
        mentorSpeaker: upload.mentorSpeaker || upload.meetingSpeaker || options.meetingSpeaker || options.mentorSpeaker || '',
        meetingSpeaker: upload.meetingSpeaker || options.meetingSpeaker || '',
        asrProvider: options.asrProvider,
        tmpDir: options.tmpDir,
        ffmpegPath: options.ffmpegPath
      }));
      continue;
    }

    if (['thinking_questionnaire', 'mentor_thinking_questionnaire', 'questionnaire'].includes(normalizedSourceType)) {
      docs.push(await parseMentorThinkingQuestionnaireFile(upload.path, upload));
      continue;
    }

    const ext = extname(upload);
    if (['.txt', '.text', '.md'].includes(ext)) {
      docs.push(await parseTextLike(upload.path, ext === '.md' ? 'upload_markdown' : 'upload_text', upload));
      continue;
    }

    if (ext === '.pdf') {
      docs.push(await parsePdf(upload.path, upload));
      continue;
    }

    if (ext === '.docx') {
      docs.push(await parseDocx(upload.path, upload));
      continue;
    }

    if (ext === '.doc') {
      docs.push(await parseDoc(upload.path, upload));
      continue;
    }

    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      docs.push(await parseImage(upload.path, llmProvider, upload));
      continue;
    }

    docs.push(await parseTextLike(upload.path, 'upload_unknown_as_text', upload));
  }
  return docs;
}
