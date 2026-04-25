import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanText, firstSentences, nowIso, safeId, uniqueBy } from '../lib/utils.mjs';
import {
  MENTOR_THINKING_QUESTIONNAIRE_VERSION,
  questionById,
  requiredMentorThinkingQuestionIds
} from '../questionnaires/mentorThinking.mjs';

function categoryFromId(id) {
  return String(id || '').split('.')[0] || 'general';
}

function stripAnswerPrefix(value) {
  return cleanText(String(value || '')
    .replace(/\n##\s+[\s\S]*$/m, '')
    .replace(/^Required:\s*(yes|no)\s*$/gim, '')
    .replace(/^Guidance:\s*.*$/gim, '')
    .replace(/^Answer:\s*/i, '')
    .trim(), 8000);
}

function parseMarkdownQuestionnaire(rawText) {
  const text = String(rawText || '').replace(/\r/g, '\n');
  const headingRegex = /^###\s+\[([a-zA-Z0-9_.-]+)\]\s*(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(text))) {
    headings.push({
      id: match[1],
      prompt: cleanText(match[2], 1000),
      start: match.index,
      bodyStart: headingRegex.lastIndex
    });
  }

  const answers = [];
  for (let index = 0; index < headings.length; index += 1) {
    const item = headings[index];
    const end = headings[index + 1]?.start ?? text.length;
    const body = stripAnswerPrefix(text.slice(item.bodyStart, end));
    const known = questionById(item.id);
    answers.push({
      id: item.id,
      section: categoryFromId(item.id),
      prompt: known?.prompt || item.prompt,
      required: Boolean(known?.required),
      answer: body
    });
  }
  return answers.filter((item) => item.answer && !/^不适用$|^n\/a$/i.test(item.answer.trim()));
}

function parseJsonQuestionnaire(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return [];
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const items = Array.isArray(data) ? data : Object.entries(data.answers || data).map(([id, value]) => ({
    id,
    answer: typeof value === 'string' ? value : value?.answer,
    prompt: value?.prompt
  }));

  return items
    .map((item) => {
      const known = questionById(item.id);
      return {
        id: item.id,
        section: categoryFromId(item.id),
        prompt: known?.prompt || item.prompt || '',
        required: Boolean(known?.required),
        answer: cleanText(item.answer || '', 8000)
      };
    })
    .filter((item) => item.id && item.answer);
}

export function parseMentorThinkingQuestionnaireText(rawText) {
  const jsonAnswers = parseJsonQuestionnaire(rawText);
  return jsonAnswers.length ? jsonAnswers : parseMarkdownQuestionnaire(rawText);
}

function answersBySection(answers, sectionId) {
  return answers.filter((answer) => answer.section === sectionId && answer.answer);
}

function answerSnippets(items, limit = 8) {
  return uniqueBy(
    items.map((item) => cleanText(`${item.id}: ${item.answer}`, 420)).filter(Boolean),
    (item) => item
  ).slice(0, limit);
}

function keywordSignals(answers, patterns) {
  const hits = [];
  for (const answer of answers) {
    for (const [label, regex] of patterns) {
      if (regex.test(answer.answer)) hits.push(label);
    }
  }
  return [...new Set(hits)];
}

function buildStyleSignals(answers) {
  const taste = answersBySection(answers, 'taste');
  const process = answersBySection(answers, 'process');
  const idea = answersBySection(answers, 'idea');
  const evidence = answersBySection(answers, 'evidence');
  const student = answersBySection(answers, 'student');
  const voice = answersBySection(answers, 'voice');
  const scenario = answersBySection(answers, 'scenario');

  return {
    researchTaste: answerSnippets(taste, 10),
    problemSelection: answerSnippets(process.filter((item) => /selection|literature|first_principles|tradeoffs/.test(item.id)), 8),
    thinkingProcess: answerSnippets(process, 10),
    ideaGeneration: answerSnippets(idea, 10),
    evidenceStandards: answerSnippets(evidence, 10),
    studentEvaluation: answerSnippets(student, 10),
    feedbackVoice: answerSnippets(voice, 6),
    scenarioResponses: answerSnippets(scenario, 10),
    decisionSignals: keywordSignals(answers, [
      ['requires strong baselines', /baseline|基线/i],
      ['requires ablation evidence', /ablation|消融/i],
      ['requires error analysis', /error analysis|错误分析|失败案例/i],
      ['prioritizes hypothesis clarity', /hypothesis|假设|问题定义|motivation|动机/i],
      ['uses minimum viable experiments', /minimum|最小|first experiment|第一个实验/i],
      ['tracks reproducibility', /reproduc|复现|seed|config|log|记录/i]
    ]),
    redFlags: answerSnippets(answers.filter((item) => /red_flags|bad_problem|weak_baseline/.test(item.id)), 8)
  };
}

function buildQuestionnaireContent({ answers, upload }) {
  const lines = [
    `Mentor thinking process and research taste questionnaire: ${upload.originalName || 'questionnaire'}.`,
    `Parsed answers: ${answers.length}.`,
    '',
    ...answers.map((item) => [
      `### [${item.id}] ${item.prompt}`,
      item.answer
    ].join('\n'))
  ];
  return cleanText(lines.join('\n\n'), 120000);
}

export async function parseMentorThinkingQuestionnaireFile(filePath, upload = {}) {
  const raw = await fs.readFile(filePath, 'utf8');
  const answers = parseMentorThinkingQuestionnaireText(raw);
  const requiredIds = requiredMentorThinkingQuestionIds();
  const answeredIds = new Set(answers.map((answer) => answer.id));
  const answeredRequiredIds = requiredIds.filter((id) => answeredIds.has(id));
  const styleSignals = buildStyleSignals(answers);
  const content = buildQuestionnaireContent({ answers, upload });

  return {
    id: safeId('src'),
    origin: 'private',
    kind: 'mentor_thinking_questionnaire',
    title: upload.originalName || path.basename(filePath),
    filePath,
    content,
    metadata: {
      parsedAt: nowIso(),
      sourceType: 'thinking_questionnaire',
      privacyLevel: 'private_thinking_style',
      questionnaireVersion: MENTOR_THINKING_QUESTIONNAIRE_VERSION,
      mimeType: upload.mimeType || 'text/plain',
      answerCount: answers.length,
      requiredQuestionCount: requiredIds.length,
      answeredRequiredCount: answeredRequiredIds.length,
      completionRate: requiredIds.length ? answeredRequiredIds.length / requiredIds.length : 0,
      missingRequiredIds: requiredIds.filter((id) => !answeredIds.has(id)),
      summary: firstSentences(content, 4),
      styleSignals
    }
  };
}
