import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanText, firstSentences, nowIso, safeId, uniqueBy } from '../lib/utils.mjs';
import { redactPrivateText } from '../privacy/redact.mjs';

function normalizeSpeaker(value) {
  return String(value || '')
    .replace(/[\s:：()[\]【】"'“”‘’]/g, '')
    .toLowerCase();
}

function parseDateTime(date, time) {
  const normalizedDate = String(date || '').replace(/\//g, '-');
  const normalizedTime = String(time || '00:00:00');
  const withSeconds = /^\d{1,2}:\d{2}$/.test(normalizedTime) ? `${normalizedTime}:00` : normalizedTime;
  return `${normalizedDate}T${withSeconds}+08:00`;
}

function parseMessageLine(line) {
  const patterns = [
    /^\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)[：:]\s*(.*)\s*$/,
    /^\s*\[(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+?)[：:]\s*(.*)\s*$/,
    /^\s*(.+?)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*[：:]?\s*(.*)\s*$/
  ];

  const first = line.match(patterns[0]) || line.match(patterns[1]);
  if (first) {
    return {
      time: parseDateTime(first[1], first[2]),
      speaker: first[3].trim(),
      text: first[4].trim()
    };
  }

  const third = line.match(patterns[2]);
  if (third) {
    return {
      time: parseDateTime(third[2], third[3]),
      speaker: third[1].trim(),
      text: third[4].trim()
    };
  }

  return null;
}

export function parseWechatMessages(rawText) {
  const messages = [];
  let current = null;

  for (const line of String(rawText || '').replace(/\r/g, '\n').split('\n')) {
    const parsed = parseMessageLine(line);
    if (parsed) {
      if (current) messages.push(current);
      current = parsed;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;
    if (current) {
      current.text = `${current.text}\n${trimmed}`.trim();
    }
  }

  if (current) messages.push(current);
  return messages.filter((message) => message.speaker && message.text);
}

function roleForSpeaker(speaker, options = {}) {
  const normalizedSpeaker = normalizeSpeaker(speaker);
  const explicit = normalizeSpeaker(options.mentorSpeaker);
  if (explicit && normalizedSpeaker === explicit) return 'mentor';

  const mentorName = normalizeSpeaker(options.mentorName);
  if (mentorName && normalizedSpeaker.includes(mentorName)) return 'mentor';

  const aliases = (options.mentorAliases || []).map(normalizeSpeaker).filter(Boolean);
  if (aliases.some((alias) => normalizedSpeaker === alias || normalizedSpeaker.includes(alias))) return 'mentor';

  if (/老师|教授|导师|prof|professor/i.test(String(speaker || ''))) return 'mentor';
  return 'participant';
}

function buildSpeakerStats(messages) {
  const stats = {};
  for (const message of messages) {
    const item = stats[message.speaker] || { messageCount: 0, role: message.role };
    item.messageCount += 1;
    item.role = item.role === 'mentor' || message.role === 'mentor' ? 'mentor' : message.role;
    stats[message.speaker] = item;
  }
  return stats;
}

function extractQuestionExamples(messages) {
  return uniqueBy(
    messages
      .filter((message) => message.role === 'mentor')
      .map((message) => message.text)
      .filter((text) => /[?？]|baseline|ablation|指标|实验|问题|假设|对照|评价/.test(text))
      .map((text) => cleanText(text, 180)),
    (text) => text
  ).slice(0, 8);
}

function extractFeedbackPatterns(mentorMessages) {
  const combined = mentorMessages.map((message) => message.text).join('\n');
  const patterns = [];
  if (/先|第一|首先/.test(combined)) patterns.push('经常先要求学生拆清楚问题、目标或前提。');
  if (/baseline|基线/i.test(combined)) patterns.push('会追问 baseline 是否充分，避免只展示新模型结果。');
  if (/ablation|消融/i.test(combined)) patterns.push('重视 ablation，用它判断方法贡献是否站得住。');
  if (/指标|评价|metric/i.test(combined)) patterns.push('会要求先定义评价指标，再讨论模型和实验。');
  if (/失败|不理想|negative|错误分析/i.test(combined)) patterns.push('希望学生从失败结果中做错误分析并提出下一步假设。');
  if (/下周|下一步|先做|补/.test(combined)) patterns.push('倾向把大问题拆成短周期、可验证的下一步动作。');
  return patterns.slice(0, 8);
}

function buildWechatContent({ messages, mentorMessages, options, redaction }) {
  const header = [
    `WeChat private style sample for ${options.mentorName || 'mentor'}.`,
    `Mentor speaker: ${options.mentorSpeaker || 'auto-detected'}.`,
    `Parsed messages: ${messages.length}. Mentor messages: ${mentorMessages.length}.`,
    `Redactions: ${redaction.redactionCount}.`
  ].join('\n');

  const transcript = messages.slice(0, 500).map((message) => {
    const role = message.role === 'mentor' ? '导师' : '上下文';
    return `[${message.time}] ${role}/${message.speaker}: ${message.text}`;
  }).join('\n');

  return cleanText(`${header}\n\n${transcript}`, 80000);
}

export async function parseWechatFile(filePath, upload = {}, options = {}) {
  const raw = await fs.readFile(filePath, 'utf8');
  const redaction = redactPrivateText(raw);
  const parsed = parseWechatMessages(redaction.text).map((message) => ({
    ...message,
    role: roleForSpeaker(message.speaker, {
      mentorName: options.mentorName,
      mentorSpeaker: upload.mentorSpeaker || options.mentorSpeaker,
      mentorAliases: options.mentorAliases
    })
  }));
  const mentorMessages = parsed.filter((message) => message.role === 'mentor');
  const questionExamples = extractQuestionExamples(parsed);
  const feedbackPatterns = extractFeedbackPatterns(mentorMessages);
  const timeRange = parsed.length ? {
    start: parsed[0].time,
    end: parsed[parsed.length - 1].time
  } : null;

  const content = buildWechatContent({
    messages: parsed,
    mentorMessages,
    options: {
      mentorName: options.mentorName,
      mentorSpeaker: upload.mentorSpeaker || options.mentorSpeaker
    },
    redaction
  });

  return {
    id: safeId('src'),
    origin: 'private',
    kind: 'wechat_chat',
    title: upload.originalName || path.basename(filePath),
    filePath,
    content,
    metadata: {
      parsedAt: nowIso(),
      sourceType: 'wechat',
      privacyLevel: 'private_style',
      mimeType: upload.mimeType || 'text/plain',
      mentorSpeaker: upload.mentorSpeaker || options.mentorSpeaker || '',
      speakerStats: buildSpeakerStats(parsed),
      messageCount: parsed.length,
      mentorMessageCount: mentorMessages.length,
      participantMessageCount: parsed.length - mentorMessages.length,
      timeRange,
      redactions: redaction.counts,
      summary: firstSentences(content, 3),
      styleSignals: {
        mentorExamples: mentorMessages.slice(0, 12).map((message) => cleanText(message.text, 240)),
        questionExamples,
        feedbackPatterns
      }
    }
  };
}
