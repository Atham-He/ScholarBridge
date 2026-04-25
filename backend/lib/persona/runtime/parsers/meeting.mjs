import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { cleanText, ensureDir, firstSentences, nowIso, safeId, uniqueBy } from '../lib/utils.mjs';

const TRANSCRIPT_EXTS = new Set(['.txt', '.text', '.md', '.srt', '.vtt']);
const AUDIO_EXTS = new Set(['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.webm']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.wmv', '.mpeg', '.mpg', '.webm']);

function normalizeSpeaker(value) {
  return String(value || '')
    .replace(/[\s:：()[\]【】"'“”‘’]/g, '')
    .toLowerCase();
}

function timeToSeconds(value) {
  const normalized = String(value || '').replace(',', '.').trim();
  const [timePart, msPart = '0'] = normalized.split('.');
  const parts = timePart.split(':').map((item) => Number(item));
  if (parts.some((item) => Number.isNaN(item))) return 0;
  const ms = Number(`0.${msPart.padEnd(3, '0').slice(0, 3)}`) || 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2] + ms;
  if (parts.length === 2) return parts[0] * 60 + parts[1] + ms;
  return parts[0] + ms;
}

function formatSeconds(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  return [hours, minutes, secs].map((item) => String(item).padStart(2, '0')).join(':');
}

function parseTimeRange(line) {
  const match = String(line || '').match(/(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?)/);
  if (!match) return null;
  return {
    start: timeToSeconds(match[1]),
    end: timeToSeconds(match[2])
  };
}

function parseSpeakerText(text) {
  const cleaned = cleanText(String(text || '').replace(/<[^>]+>/g, ' '), 4000);
  const match = cleaned.match(/^([^:：\n]{1,48})[:：]\s*([\s\S]+)$/);
  if (!match) return { speaker: '', text: cleaned };
  return {
    speaker: match[1].trim(),
    text: cleanText(match[2], 4000)
  };
}

function parseSrtOrVtt(rawText) {
  const blocks = String(rawText || '')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length);

  const segments = [];
  for (const block of blocks) {
    const lines = block.filter((line) => !/^WEBVTT/i.test(line) && !/^NOTE\b/i.test(line));
    const timeIndex = lines.findIndex((line) => parseTimeRange(line));
    if (timeIndex < 0) continue;
    const range = parseTimeRange(lines[timeIndex]);
    const textLines = lines.slice(timeIndex + 1);
    const parsed = parseSpeakerText(textLines.join('\n'));
    if (!parsed.text) continue;
    segments.push({
      index: segments.length,
      start: range.start,
      end: range.end,
      speaker: parsed.speaker,
      text: parsed.text
    });
  }
  return segments;
}

function parseLineTranscript(rawText) {
  const segments = [];
  let current = null;

  function pushCurrent() {
    if (current?.text) {
      current.index = segments.length;
      segments.push(current);
    }
    current = null;
  }

  for (const rawLine of String(rawText || '').replace(/\r/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      pushCurrent();
      continue;
    }

    const timed = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?)\]?\s*(.*)$/);
    if (timed) {
      pushCurrent();
      const parsed = parseSpeakerText(timed[2]);
      current = {
        start: timeToSeconds(timed[1]),
        end: 0,
        speaker: parsed.speaker,
        text: parsed.text
      };
      continue;
    }

    const speakerLine = parseSpeakerText(line);
    if (speakerLine.speaker && speakerLine.text) {
      pushCurrent();
      current = {
        start: 0,
        end: 0,
        speaker: speakerLine.speaker,
        text: speakerLine.text
      };
      continue;
    }

    if (current) {
      current.text = cleanText(`${current.text}\n${line}`, 4000);
    } else {
      current = {
        start: 0,
        end: 0,
        speaker: '',
        text: line
      };
    }
  }

  pushCurrent();
  return segments.map((segment, index) => ({ ...segment, index }));
}

export function parseMeetingTranscriptText(rawText) {
  const text = cleanText(rawText, 120000);
  if (!text) return [];
  const timed = /-->/m.test(text) ? parseSrtOrVtt(text) : [];
  const segments = timed.length ? timed : parseLineTranscript(text);
  return segments.map((segment, index) => ({
    ...segment,
    index,
    text: cleanText(segment.text, 4000)
  })).filter((segment) => segment.text);
}

function roleForSpeaker(speaker, options = {}) {
  const normalizedSpeaker = normalizeSpeaker(speaker);
  if (!normalizedSpeaker) return 'unknown';

  const explicit = normalizeSpeaker(options.mentorSpeaker);
  if (explicit && normalizedSpeaker === explicit) return 'mentor';

  const mentorName = normalizeSpeaker(options.mentorName);
  if (mentorName && (normalizedSpeaker === mentorName || normalizedSpeaker.includes(mentorName))) return 'mentor';

  if (/老师|教授|导师|主讲|prof|professor|pi/i.test(String(speaker || ''))) return 'mentor';
  return 'participant';
}

function buildSpeakerStats(segments) {
  const stats = {};
  for (const segment of segments) {
    const speaker = segment.speaker || 'unknown';
    const item = stats[speaker] || { segmentCount: 0, role: segment.role };
    item.segmentCount += 1;
    item.role = item.role === 'mentor' || segment.role === 'mentor' ? 'mentor' : segment.role;
    stats[speaker] = item;
  }
  return stats;
}

function extractQuestionExamples(segments) {
  return uniqueBy(
    segments
      .map((segment) => segment.text)
      .filter((text) => /[?？]|why|how|baseline|ablation|metric|experiment|hypothesis|control|为什么|怎么|指标|实验|假设|对照|消融/i.test(text))
      .map((text) => cleanText(text, 220)),
    (text) => text
  ).slice(0, 10);
}

function extractCritiquePatterns(segments) {
  const combined = segments.map((segment) => segment.text).join('\n');
  const patterns = [];
  if (/problem|question|motivation|贡献|问题|动机/i.test(combined)) {
    patterns.push('Asks students to clarify the research question, motivation, and claimed contribution before discussing models.');
  }
  if (/baseline|基线/i.test(combined)) {
    patterns.push('Checks whether baselines are strong enough before accepting a new method claim.');
  }
  if (/ablation|消融/i.test(combined)) {
    patterns.push('Uses ablation studies to separate real method contribution from implementation details.');
  }
  if (/metric|evaluation|指标|评估/i.test(combined)) {
    patterns.push('Requires clear evaluation metrics and comparison settings.');
  }
  if (/failure|error analysis|negative|失败|错误分析|负结果/i.test(combined)) {
    patterns.push('Treats failed experiments as evidence for diagnosis and next hypotheses.');
  }
  if (/next week|next step|下周|下一步|先做/i.test(combined)) {
    patterns.push('Turns broad ideas into short-cycle, testable next steps.');
  }
  if (/mechanism|why|原理|机制|为什么/i.test(combined)) {
    patterns.push('Pushes for mechanism-level explanations rather than only empirical wins.');
  }
  return patterns.slice(0, 10);
}

function extractPresentationExpectations(segments) {
  const combined = segments.map((segment) => segment.text).join('\n');
  const expectations = [];
  if (/one slide|first slide|第一页|一页|先说/i.test(combined)) {
    expectations.push('Start with the problem, hypothesis, and decision needed from the meeting.');
  }
  if (/table|figure|curve|表格|曲线|图/i.test(combined)) {
    expectations.push('Present compact tables or curves with enough context to explain the result.');
  }
  if (/baseline|ablation|metric|基线|消融|指标/i.test(combined)) {
    expectations.push('Report baseline, ablation, and metrics together instead of isolated scores.');
  }
  if (/todo|next step|下周|下一步|计划/i.test(combined)) {
    expectations.push('End with concrete next actions and a verification plan.');
  }
  return expectations.slice(0, 8);
}

function extractIdeaPatterns(segments) {
  const combined = segments.map((segment) => segment.text).join('\n');
  const patterns = [];
  if (/hypothesis|assumption|假设/i.test(combined)) patterns.push('Frames new ideas as testable hypotheses.');
  if (/simple|minimum|最小|简单/i.test(combined)) patterns.push('Prefers a minimal experiment before scaling the idea.');
  if (/mechanism|原理|机制/i.test(combined)) patterns.push('Looks for mechanism-level novelty, not only benchmark improvement.');
  if (/failure|negative|失败|负结果/i.test(combined)) patterns.push('Uses failures to generate the next research question.');
  return patterns.slice(0, 8);
}

function buildMeetingContent({ segments, mentorSegments, upload, options, asrMetadata, inputKind }) {
  const header = [
    `Group meeting style sample for ${options.mentorName || 'mentor'}.`,
    `Input kind: ${inputKind}.`,
    `Mentor speaker: ${options.mentorSpeaker || 'auto-detected or unavailable'}.`,
    `Parsed segments: ${segments.length}. Mentor-attributed segments: ${mentorSegments.length}.`,
    asrMetadata?.provider ? `ASR provider: ${asrMetadata.provider}; model: ${asrMetadata.model || 'unknown'}.` : ''
  ].filter(Boolean).join('\n');

  const transcript = segments.slice(0, 800).map((segment) => {
    const role = segment.role === 'mentor' ? 'mentor' : segment.role === 'participant' ? 'participant' : 'unknown';
    const time = segment.start || segment.end ? `[${formatSeconds(segment.start)}] ` : '';
    const speaker = segment.speaker ? `${segment.speaker}` : 'unknown';
    return `${time}${role}/${speaker}: ${segment.text}`;
  }).join('\n');

  return cleanText(`${header}\n\n${transcript}`, 120000);
}

function sourceFromSegments({ filePath, upload, options, rawSegments, inputKind, asrMetadata = null }) {
  const segments = rawSegments.map((segment) => ({
    ...segment,
    role: roleForSpeaker(segment.speaker, options)
  }));
  const mentorSegments = segments.filter((segment) => segment.role === 'mentor');
  const styleSegments = mentorSegments.length ? mentorSegments : segments;
  const styleInference = mentorSegments.length ? 'speaker-attributed' : 'whole-transcript';
  const content = buildMeetingContent({
    segments,
    mentorSegments,
    upload,
    options,
    asrMetadata,
    inputKind
  });

  return {
    id: safeId('src'),
    origin: 'private',
    kind: 'meeting_transcript',
    title: upload.originalName || path.basename(filePath),
    filePath,
    content,
    metadata: {
      parsedAt: nowIso(),
      sourceType: 'meeting',
      privacyLevel: 'private_meeting_style',
      inputKind,
      mimeType: upload.mimeType || '',
      mentorSpeaker: upload.mentorSpeaker || options.mentorSpeaker || '',
      speakerStats: buildSpeakerStats(segments),
      segmentCount: segments.length,
      mentorSegmentCount: mentorSegments.length,
      durationSeconds: Math.max(0, ...segments.map((segment) => Number(segment.end || segment.start || 0))),
      styleInference,
      asr: asrMetadata,
      summary: firstSentences(content, 3),
      styleSignals: {
        mentorExamples: styleSegments.slice(0, 14).map((segment) => cleanText(segment.text, 260)),
        questionExamples: extractQuestionExamples(styleSegments),
        critiquePatterns: extractCritiquePatterns(styleSegments),
        presentationExpectations: extractPresentationExpectations(styleSegments),
        ideaPatterns: extractIdeaPatterns(styleSegments),
        styleInference
      }
    }
  };
}

function runFfmpeg(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(options.ffmpegPath || 'ffmpeg', args, {
      windowsHide: true
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg failed with code ${code}: ${cleanText(stderr, 500)}`));
    });
  });
}

async function extractAudioFromVideo(filePath, options = {}) {
  const tmpDir = options.tmpDir || os.tmpdir();
  await ensureDir(tmpDir);
  const audioPath = path.join(tmpDir, `${safeId('meeting_audio')}.wav`);
  await runFfmpeg([
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    filePath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    audioPath
  ], options);
  return audioPath;
}

function normalizeAsrSegments(asrResult) {
  if (Array.isArray(asrResult?.segments) && asrResult.segments.length) {
    return asrResult.segments.map((segment, index) => ({
      index,
      start: Number(segment.start || 0),
      end: Number(segment.end || 0),
      speaker: segment.speaker || '',
      text: cleanText(segment.text || '', 4000)
    })).filter((segment) => segment.text);
  }
  return parseMeetingTranscriptText(asrResult?.text || '');
}

export async function parseMeetingFile(filePath, upload = {}, options = {}) {
  const ext = path.extname(upload.originalName || filePath || '').toLowerCase() || path.extname(filePath || '').toLowerCase();
  const parserOptions = {
    mentorName: options.mentorName || options.mentor?.name || '',
    mentorSpeaker: upload.mentorSpeaker || upload.meetingSpeaker || options.mentorSpeaker || options.meetingSpeaker || ''
  };

  if (TRANSCRIPT_EXTS.has(ext)) {
    const raw = await fs.readFile(filePath, 'utf8');
    return sourceFromSegments({
      filePath,
      upload,
      options: parserOptions,
      rawSegments: parseMeetingTranscriptText(raw),
      inputKind: 'transcript'
    });
  }

  if (!AUDIO_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) {
    throw new Error(`Unsupported meeting input type: ${ext || 'unknown'}`);
  }

  const asrProvider = options.asrProvider;
  if (!asrProvider) {
    throw new Error('Meeting media parsing requires an ASR provider');
  }

  let audioPath = filePath;
  let cleanupPath = '';
  if (VIDEO_EXTS.has(ext)) {
    audioPath = await extractAudioFromVideo(filePath, {
      tmpDir: options.tmpDir,
      ffmpegPath: options.ffmpegPath
    });
    cleanupPath = audioPath;
  }

  try {
    const asrResult = await asrProvider.transcribe({
      audioPath,
      fileUrl: upload.fileUrl || upload.url || '',
      transcriptPath: upload.transcriptPath || ''
    });
    return sourceFromSegments({
      filePath,
      upload,
      options: parserOptions,
      rawSegments: normalizeAsrSegments(asrResult),
      inputKind: VIDEO_EXTS.has(ext) ? 'video' : 'audio',
      asrMetadata: asrResult.metadata || { provider: asrProvider.kind || 'unknown' }
    });
  } finally {
    if (cleanupPath) {
      await fs.rm(cleanupPath, { force: true }).catch(() => {});
    }
  }
}
