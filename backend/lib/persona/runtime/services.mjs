import { average, clamp, cleanText, firstSentences, nowIso, overlapScore, pickTop, safeId, splitIntoSentences, topKeywords } from './lib/utils.mjs';
import { buildChatPrompts, buildDistillPrompts, buildEvaluationPrompts } from './prompts.mjs';
import { rankChunks } from './retrieval.mjs';

const METHOD_HINTS = [
  'representation learning', 'multimodal learning', 'graph learning', 'language models',
  'computer vision', 'reinforcement learning', 'causal inference', 'optimization',
  'ablation studies', 'benchmarking', 'self-supervised learning', 'generative models',
  'bayesian modeling', 'scientific machine learning', 'robustness', 'reproducibility',
  '表征学习', '多模态', '自监督', '鲁棒性', '因果推断', '生成模型', '实验设计'
];

const INITIATIVE_KEYWORDS = ['implemented', 'reproduced', 'built', 'open source', 'first author', 'benchmark', 'ablation', 'debugging', 'pipeline', 'published', 'PyTorch', '实验', '复现', '实现', '数据管线'];

function buildCombinedText(sources) {
  return (sources || [])
    .map((source) => `${source.title}\n${source.content}`)
    .join('\n\n');
}

function asList(value, limit = 20) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => Array.isArray(item) ? item : [item])
      .map((item) => typeof item === 'string' ? item : JSON.stringify(item))
      .map((item) => cleanText(item, 600))
      .filter(Boolean)
      .slice(0, limit);
  }
  if (value == null || value === '') return [];
  if (typeof value === 'string') return [cleanText(value, 600)].filter(Boolean);
  return [cleanText(JSON.stringify(value), 600)].filter(Boolean);
}

function normalizeCommunicationStyle(style = {}) {
  const normalized = { ...style };
  normalized.doSay = asList(normalized.doSay);
  normalized.avoid = asList(normalized.avoid);

  if (normalized.chatStyle && typeof normalized.chatStyle === 'object') {
    normalized.chatStyle = {
      ...normalized.chatStyle,
      typicalOpeners: asList(normalized.chatStyle.typicalOpeners),
      typicalQuestions: asList(normalized.chatStyle.typicalQuestions),
      feedbackPatterns: asList(normalized.chatStyle.feedbackPatterns),
      styleBoundaries: asList(normalized.chatStyle.styleBoundaries)
    };
  }

  if (normalized.meetingStyle && typeof normalized.meetingStyle === 'object') {
    normalized.meetingStyle = {
      ...normalized.meetingStyle,
      mentorExamples: asList(normalized.meetingStyle.mentorExamples),
      typicalQuestions: asList(normalized.meetingStyle.typicalQuestions),
      critiquePatterns: asList(normalized.meetingStyle.critiquePatterns),
      presentationExpectations: asList(normalized.meetingStyle.presentationExpectations),
      ideaPatterns: asList(normalized.meetingStyle.ideaPatterns),
      styleBoundaries: asList(normalized.meetingStyle.styleBoundaries)
    };
  }

  if (normalized.thinkingStyle && typeof normalized.thinkingStyle === 'object') {
    normalized.thinkingStyle = {
      ...normalized.thinkingStyle,
      researchTaste: asList(normalized.thinkingStyle.researchTaste),
      problemSelection: asList(normalized.thinkingStyle.problemSelection),
      thinkingProcess: asList(normalized.thinkingStyle.thinkingProcess),
      ideaGeneration: asList(normalized.thinkingStyle.ideaGeneration),
      evidenceStandards: asList(normalized.thinkingStyle.evidenceStandards),
      studentEvaluation: asList(normalized.thinkingStyle.studentEvaluation),
      feedbackVoice: asList(normalized.thinkingStyle.feedbackVoice),
      scenarioResponses: asList(normalized.thinkingStyle.scenarioResponses),
      decisionSignals: asList(normalized.thinkingStyle.decisionSignals),
      redFlags: asList(normalized.thinkingStyle.redFlags),
      styleBoundaries: asList(normalized.thinkingStyle.styleBoundaries)
    };
  }

  if (normalized.styleGuide && typeof normalized.styleGuide === 'object') {
    normalized.styleGuide = {
      ...normalized.styleGuide,
      signatureTone: asList(normalized.styleGuide.signatureTone),
      responseHabits: asList(normalized.styleGuide.responseHabits),
      questionHabits: asList(normalized.styleGuide.questionHabits),
      critiqueHabits: asList(normalized.styleGuide.critiqueHabits),
      wordingPriorities: asList(normalized.styleGuide.wordingPriorities),
      wordingAvoid: asList(normalized.styleGuide.wordingAvoid),
      boundaryReminders: asList(normalized.styleGuide.boundaryReminders)
    };
  }

  return normalized;
}

function normalizeResearchTaste(value) {
  if (!value || typeof value !== 'object') return value;
  return {
    ...value,
    preferredProblems: asList(value.preferredProblems),
    redFlags: asList(value.redFlags),
    decisionSignals: asList(value.decisionSignals)
  };
}

function normalizeThinkingProcess(value) {
  if (!value || typeof value !== 'object') return value;
  const normalized = {
    ...value,
    problemSelection: asList(value.problemSelection),
    ideaGeneration: asList(value.ideaGeneration),
    evidenceStandards: asList(value.evidenceStandards),
    studentEvaluation: asList(value.studentEvaluation),
    scenarioResponses: asList(value.scenarioResponses)
  };

  if (normalized.reasoningPlaybook && typeof normalized.reasoningPlaybook === 'object') {
    normalized.reasoningPlaybook = {
      ...normalized.reasoningPlaybook,
      responseOrder: asList(normalized.reasoningPlaybook.responseOrder),
      ideaEvaluation: asList(normalized.reasoningPlaybook.ideaEvaluation),
      evidenceChecklist: asList(normalized.reasoningPlaybook.evidenceChecklist),
      studentScreening: asList(normalized.reasoningPlaybook.studentScreening),
      failureDiagnosis: asList(normalized.reasoningPlaybook.failureDiagnosis),
      nextStepRules: asList(normalized.reasoningPlaybook.nextStepRules)
    };
  }

  return normalized;
}

function uniqueCleanList(items, limit = 8, maxLength = 240) {
  const seen = new Set();
  const result = [];
  for (const item of asList(items, limit * 4)) {
    const cleaned = cleanText(item, maxLength);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) break;
  };
  return result;
}

export function buildCommunicationStyleGuide(persona = {}) {
  const communicationStyle = persona.communicationStyle || {};
  const chatStyle = communicationStyle.chatStyle || {};
  const meetingStyle = communicationStyle.meetingStyle || {};
  const thinkingStyle = communicationStyle.thinkingStyle || {};
  const researchTaste = persona.researchTaste || {};

  return {
    signatureTone: uniqueCleanList([
      communicationStyle.voiceSummary,
      chatStyle.directness === 'high' ? 'Respond directly and push the student to be concrete.' : '',
      chatStyle.directness === 'medium' ? 'Be direct but still explanatory when the student is confused.' : '',
      'Sound like a PI in office hours or group meeting, not a generic assistant.',
      ...(communicationStyle.doSay || [])
    ], 6, 220),
    responseHabits: uniqueCleanList([
      'Start with a judgment, then narrow the problem.',
      ...(chatStyle.feedbackPatterns || []),
      ...(meetingStyle.presentationExpectations || []),
      ...(meetingStyle.critiquePatterns || []),
      ...(thinkingStyle.problemSelection || [])
    ], 8, 220),
    questionHabits: uniqueCleanList([
      ...(chatStyle.typicalQuestions || []),
      ...(meetingStyle.typicalQuestions || []),
      ...(persona.mentorshipStyle?.screeningQuestions || []),
      ...(persona.thinkingProcess?.studentEvaluation || [])
    ], 8, 220),
    critiqueHabits: uniqueCleanList([
      ...(meetingStyle.critiquePatterns || []),
      ...(persona.thinkingProcess?.evidenceStandards || []),
      ...(researchTaste.redFlags || [])
    ], 8, 220),
    wordingPriorities: uniqueCleanList([
      'Prefer problem, baseline, metric, hypothesis, evidence, and next step over vague encouragement.',
      ...(thinkingStyle.decisionSignals || []),
      ...(researchTaste.decisionSignals || [])
    ], 8, 220),
    wordingAvoid: uniqueCleanList([
      ...(communicationStyle.avoid || []),
      'Avoid generic praise without a technical reason.',
      'Avoid polished but content-light summaries.'
    ], 6, 220),
    boundaryReminders: uniqueCleanList([
      ...(chatStyle.styleBoundaries || []),
      ...(meetingStyle.styleBoundaries || []),
      ...(thinkingStyle.styleBoundaries || [])
    ], 6, 220)
  };
}

export function buildReasoningPlaybook(persona = {}) {
  const thinkingProcess = persona.thinkingProcess || {};
  const researchTaste = persona.researchTaste || {};
  const communicationStyle = persona.communicationStyle || {};
  const meetingStyle = communicationStyle.meetingStyle || {};
  const thinkingStyle = communicationStyle.thinkingStyle || {};
  const mentorshipStyle = persona.mentorshipStyle || {};
  const screeningRubric = persona.screeningRubric || {};

  return {
    responseOrder: uniqueCleanList([
      'Clarify the concrete scenario and exact research question first.',
      ...(thinkingProcess.problemSelection || []),
      ...(meetingStyle.presentationExpectations || []),
      'Ask for the baseline, metric, and testable hypothesis before discussing novelty.',
      'End with one minimum experiment or next verification step.'
    ], 8, 220),
    ideaEvaluation: uniqueCleanList([
      ...(researchTaste.preferredProblems || []),
      ...(researchTaste.decisionSignals || []),
      ...(thinkingProcess.ideaGeneration || []),
      ...(thinkingStyle.ideaGeneration || [])
    ], 8, 220),
    evidenceChecklist: uniqueCleanList([
      ...(thinkingProcess.evidenceStandards || []),
      ...(meetingStyle.presentationExpectations || []),
      ...(meetingStyle.critiquePatterns || []),
      ...(thinkingStyle.evidenceStandards || [])
    ], 8, 220),
    studentScreening: uniqueCleanList([
      ...(thinkingProcess.studentEvaluation || []),
      ...(mentorshipStyle.expectations || []),
      ...(screeningRubric.positiveSignals || []),
      ...(screeningRubric.concerns || []).map((item) => `Watch for concern: ${item}`)
    ], 8, 220),
    failureDiagnosis: uniqueCleanList([
      'Use failures to diagnose the next hypothesis, not only to reject the idea.',
      ...(thinkingProcess.scenarioResponses || []),
      ...(meetingStyle.ideaPatterns || []),
      ...(researchTaste.redFlags || [])
    ], 8, 220),
    nextStepRules: uniqueCleanList([
      'Reduce broad ideas into short-cycle, testable next steps.',
      ...(thinkingProcess.ideaGeneration || []),
      ...(meetingStyle.presentationExpectations || []),
      ...(meetingStyle.critiquePatterns || [])
    ], 8, 220)
  };
}

function attachDerivedPersonaGuides(persona = {}) {
  const base = { ...persona };
  const nextThinkingProcess = base.thinkingProcess && typeof base.thinkingProcess === 'object'
    ? normalizeThinkingProcess({
        ...base.thinkingProcess,
        reasoningPlaybook: buildReasoningPlaybook(base)
      })
    : base.thinkingProcess;

  const nextPersona = {
    ...base,
    ...(nextThinkingProcess ? { thinkingProcess: nextThinkingProcess } : {})
  };

  return {
    ...nextPersona,
    communicationStyle: normalizeCommunicationStyle({
      ...(nextPersona.communicationStyle || {}),
      styleGuide: buildCommunicationStyleGuide(nextPersona)
    })
  };
}

const PRIVATE_STYLE_KINDS = new Set(['wechat_chat', 'meeting_transcript', 'mentor_thinking_questionnaire', 'ai_chat_share']);
const STYLE_SIGNAL_KEY_PRIORITY = [
  'researchTaste',
  'decisionSignals',
  'evidenceStandards',
  'ideaGeneration',
  'problemSelection',
  'thinkingProcess',
  'studentEvaluation',
  'scenarioResponses',
  'redFlags',
  'feedbackVoice',
  'mentorExamples',
  'typicalQuestions',
  'questionExamples',
  'feedbackPatterns',
  'critiquePatterns',
  'presentationExpectations',
  'ideaPatterns',
  'styleInference',
  'styleBoundaries'
];

function sourceKindCounts(sources = []) {
  const counts = {};
  for (const source of sources) {
    const key = `${source.origin || 'unknown'}:${source.kind || 'unknown'}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function distillSourcePriority(source) {
  if (source.origin === 'private' && source.kind === 'mentor_thinking_questionnaire') return 0;
  if (source.origin === 'private' && source.kind === 'ai_chat_share') return 1;
  if (source.origin === 'private' && source.kind === 'meeting_transcript') return 2;
  if (source.origin === 'private' && source.kind === 'wechat_chat') return 3;
  if (source.kind === 'author_profile') return 4;
  if (source.kind === 'webpage') return 5;
  if (source.kind === 'scholar_profile_hint') return 6;
  if (source.origin === 'upload') return 7;
  if (source.kind === 'paper') return 8;
  return 9;
}

function compactList(items, { limit = 6, itemChars = 360 } = {}) {
  return asList(items, limit)
    .map((item) => cleanText(item, itemChars))
    .filter(Boolean);
}

function compactStyleSignals(value, options = {}, depth = 0) {
  if (!value || depth > 2) return undefined;
  if (Array.isArray(value)) {
    const compacted = compactList(value, {
      limit: options.listLimit || 6,
      itemChars: options.itemChars || 220
    });
    return compacted.length ? compacted : undefined;
  }
  if (typeof value !== 'object') {
    const text = cleanText(value, options.itemChars || 320);
    return text || undefined;
  }

  const result = {};
  const entries = Object.entries(value)
    .sort(([left], [right]) => {
      const leftIndex = STYLE_SIGNAL_KEY_PRIORITY.indexOf(left);
      const rightIndex = STYLE_SIGNAL_KEY_PRIORITY.indexOf(right);
      return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex) || left.localeCompare(right);
    });
  const maxChars = Number(options.maxChars || 2400);
  for (const [key, nested] of entries) {
    const compacted = compactStyleSignals(nested, options, depth + 1);
    if (compacted == null || (Array.isArray(compacted) && !compacted.length)) continue;
    const candidate = { ...result, [key]: compacted };
    if (depth === 0 && JSON.stringify(candidate).length > maxChars && Object.keys(result).length) continue;
    result[key] = compacted;
  }
  return Object.keys(result).length ? result : undefined;
}

function manifestSource(source) {
  return {
    id: source.id,
    title: cleanText(source.title || '', 180),
    origin: source.origin || '',
    kind: source.kind || '',
    url: source.url || undefined
  };
}

function compactSourceForDistill(source, options = {}) {
  const summary = cleanText(source.metadata?.summary || firstSentences(source.content || '', 3), options.summaryChars || 800);
  const excerpt = cleanText(firstSentences(source.content || '', 5) || source.content || '', options.excerptChars || 1200);
  const item = {
    ...manifestSource(source),
    contentLength: String(source.content || '').length,
    summary
  };

  if (excerpt && excerpt !== summary) {
    item.excerpt = excerpt;
  }

  if (PRIVATE_STYLE_KINDS.has(source.kind)) {
    const styleSignals = compactStyleSignals(source.metadata?.styleSignals, {
      listLimit: options.styleSignalLimit || 6,
      itemChars: 220,
      maxChars: options.styleSignalMaxChars || 2400
    });
    if (styleSignals) item.styleSignals = styleSignals;
  }

  if (source.metadata?.asr) {
    item.asr = {
      provider: source.metadata.asr.provider,
      model: source.metadata.asr.model,
      segmentCount: source.metadata.asr.segmentCount
    };
  }

  if (source.metadata?.outboundScholarUrls?.length) {
    item.outboundScholarUrls = compactList(source.metadata.outboundScholarUrls, { limit: 4, itemChars: 220 });
  }

  return item;
}

export function buildDistillEvidencePreview({ mentor, sources = [], chunks = [], options = {} }) {
  const maxChars = Math.max(4000, Number(options.maxChars || 22000));
  const sourceLimit = Math.max(4, Number(options.sourceLimit || 24));
  const styleSignalLimit = Math.max(2, Number(options.styleSignalLimit || 6));
  const ordered = (sources || [])
    .map((source, index) => ({ source, index }))
    .sort((a, b) => distillSourcePriority(a.source) - distillSourcePriority(b.source) || a.index - b.index);

  const payload = {
    evidencePolicy: 'budgeted_compact_preview_with_full_source_manifest',
    mentor: {
      name: mentor?.name || '',
      affiliation: mentor?.affiliation || '',
      title: mentor?.title || ''
    },
    sourceCount: sources.length,
    chunkCount: chunks.length,
    sourceKindCounts: sourceKindCounts(sources),
    sources: [],
    omittedSourceManifest: []
  };

  for (const { source } of ordered) {
    const compacted = compactSourceForDistill(source, {
      styleSignalLimit,
      styleSignalMaxChars: PRIVATE_STYLE_KINDS.has(source.kind) ? 2400 : 1200,
      summaryChars: 520,
      excerptChars: PRIVATE_STYLE_KINDS.has(source.kind) ? 560 : 760
    });

    const candidate = {
      ...payload,
      sources: [...payload.sources, compacted]
    };
    const candidateText = JSON.stringify(candidate, null, 2);
    if (payload.sources.length < sourceLimit && candidateText.length <= maxChars) {
      payload.sources.push(compacted);
    } else {
      payload.omittedSourceManifest.push(manifestSource(source));
    }
  }

  let preview = JSON.stringify(payload, null, 2);
  while (preview.length > maxChars && payload.sources.length > 1) {
    const removed = payload.sources.pop();
    payload.omittedSourceManifest.unshift(manifestSource(removed));
    preview = JSON.stringify(payload, null, 2);
  }

  if (preview.length > maxChars && payload.omittedSourceManifest.length > 40) {
    const omittedCount = payload.omittedSourceManifest.length;
    payload.omittedSourceManifest = [
      ...payload.omittedSourceManifest.slice(0, 30),
      { omittedCount: omittedCount - 30, note: 'Additional source ids omitted from prompt for size control.' }
    ];
    preview = JSON.stringify(payload, null, 2);
  }

  return {
    preview,
    stats: {
      policy: payload.evidencePolicy,
      previewChars: preview.length,
      sourceCount: sources.length,
      chunkCount: chunks.length,
      includedSourceCount: payload.sources.length,
      omittedSourceCount: Math.max(0, sources.length - payload.sources.length),
      sourceKindCounts: payload.sourceKindCounts
    }
  };
}

function likelyRetriableDistillError(error) {
  const message = String(error?.message || error || '');
  if (/401|403|invalid api key|authentication|permission/i.test(message)) return false;
  return /timed out|timeout|abort|429|rate limit|500|502|503|504|temporarily|overload|no json|empty json|unexpected end|unexpected token/i.test(message);
}

function compactErrorMessage(error) {
  return cleanText(String(error?.message || error || 'unknown error'), 500);
}

function privateStyleSources(sources) {
  return (sources || []).filter((source) => source.origin === 'private' && source.kind === 'wechat_chat');
}

function inferChatStyle(sources) {
  const styleSources = privateStyleSources(sources);
  const mentorExamples = [];
  const questionExamples = [];
  const feedbackPatterns = [];
  let mentorMessageCount = 0;
  let messageCount = 0;

  for (const source of styleSources) {
    const signals = source.metadata?.styleSignals || {};
    mentorMessageCount += Number(source.metadata?.mentorMessageCount || 0);
    messageCount += Number(source.metadata?.messageCount || 0);
    mentorExamples.push(...(signals.mentorExamples || []));
    questionExamples.push(...(signals.questionExamples || []));
    feedbackPatterns.push(...(signals.feedbackPatterns || []));
  }

  if (!styleSources.length) return null;
  const combined = `${mentorExamples.join('\n')}\n${questionExamples.join('\n')}\n${feedbackPatterns.join('\n')}`;
  return {
    sourceCount: styleSources.length,
    messageCount,
    mentorMessageCount,
    directness: /先|别急|必须|需要|补|不够|重做/.test(combined) ? 'high' : 'medium',
    typicalOpeners: [...new Set(mentorExamples
      .map((text) => String(text || '').split(/[，。,.;；\n]/u)[0])
      .filter((text) => text.length >= 2)
      .slice(0, 6))],
    typicalQuestions: [...new Set(questionExamples)].slice(0, 8),
    feedbackPatterns: [...new Set(feedbackPatterns)].slice(0, 8),
    styleBoundaries: [
      'Use private chat records only to learn communication patterns and feedback habits.',
      'Do not quote private chat content as factual disclosure to students.'
    ]
  };
}

function privateMeetingSources(sources) {
  return (sources || []).filter((source) => source.origin === 'private' && source.kind === 'meeting_transcript');
}

function inferMeetingStyle(sources) {
  const styleSources = privateMeetingSources(sources);
  const mentorExamples = [];
  const questionExamples = [];
  const critiquePatterns = [];
  const presentationExpectations = [];
  const ideaPatterns = [];
  let segmentCount = 0;
  let mentorSegmentCount = 0;

  for (const source of styleSources) {
    const signals = source.metadata?.styleSignals || {};
    segmentCount += Number(source.metadata?.segmentCount || 0);
    mentorSegmentCount += Number(source.metadata?.mentorSegmentCount || 0);
    mentorExamples.push(...(signals.mentorExamples || []));
    questionExamples.push(...(signals.questionExamples || []));
    critiquePatterns.push(...(signals.critiquePatterns || []));
    presentationExpectations.push(...(signals.presentationExpectations || []));
    ideaPatterns.push(...(signals.ideaPatterns || []));
  }

  if (!styleSources.length) return null;
  return {
    sourceCount: styleSources.length,
    segmentCount,
    mentorSegmentCount,
    styleInference: mentorSegmentCount > 0 ? 'speaker-attributed' : 'whole-transcript',
    mentorExamples: [...new Set(mentorExamples)].slice(0, 8),
    typicalQuestions: [...new Set(questionExamples)].slice(0, 10),
    critiquePatterns: [...new Set(critiquePatterns)].slice(0, 10),
    presentationExpectations: [...new Set(presentationExpectations)].slice(0, 8),
    ideaPatterns: [...new Set(ideaPatterns)].slice(0, 8),
    styleBoundaries: [
      'Use group meeting records to learn critique style, presentation expectations, research taste, and idea-generation habits.',
      'Do not reveal private meeting content or attribute confidential student details.'
    ]
  };
}

function privateThinkingQuestionnaireSources(sources) {
  return (sources || []).filter((source) => source.origin === 'private' && source.kind === 'mentor_thinking_questionnaire');
}

function privateAiChatShareSources(sources) {
  return (sources || []).filter((source) => source.origin === 'private' && source.kind === 'ai_chat_share');
}

function inferThinkingStyle(sources) {
  const styleSources = [
    ...privateThinkingQuestionnaireSources(sources),
    ...privateAiChatShareSources(sources)
  ];
  if (!styleSources.length) return null;

  const merged = {
    researchTaste: [],
    problemSelection: [],
    thinkingProcess: [],
    ideaGeneration: [],
    evidenceStandards: [],
    studentEvaluation: [],
    feedbackVoice: [],
    scenarioResponses: [],
    decisionSignals: [],
    redFlags: []
  };
  let answerCount = 0;
  let completionRate = 0;
  let shareTurnCount = 0;
  let shareUserTurnCount = 0;

  for (const source of styleSources) {
    const signals = source.metadata?.styleSignals || {};
    answerCount += Number(source.metadata?.answerCount || 0);
    completionRate += Number(source.metadata?.completionRate || 0);
    shareTurnCount += Number(source.metadata?.turnCount || 0);
    shareUserTurnCount += Number(source.metadata?.userTurnCount || 0);
    for (const key of Object.keys(merged)) {
      merged[key].push(...(signals[key] || []));
    }
  }

  const unique = (items, limit) => [...new Set((items || []).map((item) => cleanText(item, 500)).filter(Boolean))].slice(0, limit);
  return {
    sourceCount: styleSources.length,
    answerCount,
    averageCompletionRate: styleSources.length ? completionRate / styleSources.length : 0,
    shareTurnCount,
    shareUserTurnCount,
    researchTaste: unique(merged.researchTaste, 12),
    problemSelection: unique(merged.problemSelection, 10),
    thinkingProcess: unique(merged.thinkingProcess, 12),
    ideaGeneration: unique(merged.ideaGeneration, 12),
    evidenceStandards: unique(merged.evidenceStandards, 12),
    studentEvaluation: unique(merged.studentEvaluation, 10),
    feedbackVoice: unique(merged.feedbackVoice, 8),
    scenarioResponses: unique(merged.scenarioResponses, 12),
    decisionSignals: unique(merged.decisionSignals, 10),
    redFlags: unique(merged.redFlags, 10),
    styleBoundaries: [
      'Use questionnaire answers and shared AI chats to model the mentor thinking process, research taste, and idea-generation preferences.',
      'Do not treat the questionnaire as a promise of admission, authorship, funding, or final decision authority.'
    ]
  };
}

function guessMethods(text) {
  const normalized = String(text || '').toLowerCase();
  return METHOD_HINTS.filter((item) => normalized.includes(item.toLowerCase())).slice(0, 8);
}

function extractProjectHints(text) {
  const lines = cleanText(text, 60000).split(/\n+/);
  const signals = [];
  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (/(project|screening|desired signals|looking for|招募|筛选|招生|screening questions)/i.test(normalized)) {
      signals.push(line.trim());
    }
  }
  return signals.slice(0, 10);
}

function buildVoiceSummary(text) {
  const sentences = splitIntoSentences(text).slice(0, 20);
  const avgLen = average(sentences.map((s) => s.length));
  const hasHedges = /maybe|perhaps|likely|suggest|consider|可能|建议|也许/i.test(text);
  const hasDirectives = /should|must|need to|prefer|expects|应该|需要|倾向/i.test(text);
  const descriptors = [];
  descriptors.push(avgLen > 120 ? '偏长句、解释型' : '偏短句、直接型');
  if (hasHedges) descriptors.push('审慎');
  if (hasDirectives) descriptors.push('明确要求');
  descriptors.push('学术风格');
  return descriptors.join('，');
}

function defaultProjects(topics, methods) {
  const title = topics[0] ? `${topics[0].name} 方向探索` : '开放式研究项目';
  return [{
    title,
    summary: `围绕 ${topics.slice(0, 3).map((item) => item.name).join('、') || '当前研究方向'} 展开，强调问题定义、实验设计与批判性分析。`,
    requiredSkills: methods.slice(0, 4),
    fitSignals: ['能独立读论文', '能快速做基线', '能清楚解释实验设计']
  }];
}

function inferRubric(text, methods) {
  const projectHints = extractProjectHints(text);
  return {
    hardRequirements: projectHints.filter((line) => /should|must|comfortable|需要|必须/i.test(line)).slice(0, 5),
    positiveSignals: [
      '能独立复现论文',
      '能清楚解释实验为何有效',
      '有实验记录与 ablation 习惯',
      ...methods.slice(0, 2).map((item) => `对 ${item} 有实际经验`)
    ].slice(0, 6),
    concerns: [
      '只谈结果，不谈机制',
      '对实验设计和失败案例缺乏反思',
      '缺乏独立推进能力'
    ]
  };
}

function heuristicallyDistill({ mentor, sources, chunks }) {
  const combined = buildCombinedText(sources);
  const chatStyle = inferChatStyle(sources);
  const meetingStyle = inferMeetingStyle(sources);
  const thinkingStyle = inferThinkingStyle(sources);
  const keywordList = topKeywords(combined, 16);
  const methods = guessMethods(combined);
  const topicSeeds = [...methods, ...keywordList.map((item) => item.token)];
  const topics = [...new Set(topicSeeds)]
    .slice(0, 8)
    .map((name, index) => ({
      name,
      confidence: clamp(0.92 - index * 0.08, 0.3, 0.92),
      evidence: pickTop((sources || []).map((source) => source.id), 3)
    }));
  const projectHints = extractProjectHints(combined);
  const projects = projectHints.length
    ? [{
        title: projectHints[0].replace(/^#+\s*/, '').slice(0, 80),
        summary: projectHints.slice(0, 4).join('；'),
        requiredSkills: methods.slice(0, 4),
        fitSignals: ['能复现现有工作', '有较强实验设计意识', '能清晰表达研究动机']
      }]
    : defaultProjects(topics, methods);

  return attachDerivedPersonaGuides({
    version: '0.1.0',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    mentor: {
      name: mentor.name,
      slug: mentor.slug,
      affiliation: mentor.affiliation || '',
      title: mentor.title || 'Professor',
      homepage: mentor.publicUrls?.[0] || ''
    },
    authorization: {
      authorized: true,
      authorizedBy: mentor.authorizedBy || 'unknown',
      consentNotes: mentor.consentNotes || ''
    },
    overview: firstSentences(combined, 4) || `${mentor.name} works on ${topics.map((item) => item.name).join(', ')}.`,
    researchTopics: topics,
    methods,
    currentProjects: projects,
    ...(thinkingStyle ? {
      researchTaste: {
        preferredProblems: thinkingStyle.researchTaste,
        redFlags: thinkingStyle.redFlags,
        decisionSignals: thinkingStyle.decisionSignals
      },
      thinkingProcess: {
        problemSelection: thinkingStyle.problemSelection,
        ideaGeneration: thinkingStyle.ideaGeneration,
        evidenceStandards: thinkingStyle.evidenceStandards,
        studentEvaluation: thinkingStyle.studentEvaluation,
        scenarioResponses: thinkingStyle.scenarioResponses
      }
    } : {}),
    communicationStyle: {
      voiceSummary: buildVoiceSummary(combined),
      ...(chatStyle ? { chatStyle } : {}),
      ...(meetingStyle ? { meetingStyle } : {}),
      ...(thinkingStyle ? { thinkingStyle } : {}),
      doSay: [
        '先说研究问题，再说方法选择',
        '对不确定性保持透明',
        '强调实验设计与机制解释'
      ],
      avoid: [
        '不做未经证据支持的承诺',
        '不承诺录取、经费或署名'
      ]
    },
    mentorshipStyle: {
      expectations: [
        '能独立读文献并提出问题',
        '能较快实现基线并记录实验',
        '对失败案例有反思'
      ],
      preferredStudents: [
        '自驱型',
        '表达清楚',
        '有复现或工程落地经验'
      ],
      screeningQuestions: [
        '你最近独立推进过什么研究问题？',
        '你如何设计 ablation？',
        '你为什么对这个方向感兴趣？'
      ]
    },
    screeningRubric: inferRubric(combined, methods),
    personalInterests: [],
    guardrails: [
      '必须始终声明自己是授权 AI 分身',
      '不能替导师做最终录取决定',
      '不能披露未公开项目信息',
      '不能承诺 funding、offer 或 authorship'
    ],
    provenance: {
      sourceCount: sources.length,
      publicSourceCount: sources.filter((item) => item.origin === 'public').length,
      uploadSourceCount: sources.filter((item) => item.origin === 'upload').length,
      privateSourceCount: sources.filter((item) => item.origin === 'private').length,
      topSources: pickTop(sources.map((item) => item.id), 5),
      confidenceNotes: `Generated heuristically from ${sources.length} sources and ${chunks.length} chunks.`
    }
  });
}

export async function distillPersona({ mentor, sources, chunks, llmProvider, config = {} }) {
  if (llmProvider.kind === 'mock') {
    return heuristicallyDistill({ mentor, sources, chunks });
  }

  const chatStyle = inferChatStyle(sources);
  const meetingStyle = inferMeetingStyle(sources);
  const thinkingStyle = inferThinkingStyle(sources);
  const baseOptions = {
    maxChars: Number(config.distillEvidenceBudgetChars || llmProvider.distillEvidenceBudgetChars || 22000),
    sourceLimit: Number(config.distillSourceLimit || llmProvider.distillSourceLimit || 24),
    styleSignalLimit: Number(config.distillStyleSignalLimit || llmProvider.distillStyleSignalLimit || 6)
  };
  const retryOptions = {
    maxChars: Math.max(6000, Math.floor(baseOptions.maxChars * 0.55)),
    sourceLimit: Math.max(8, Math.floor(baseOptions.sourceLimit * 0.55)),
    styleSignalLimit: Math.max(3, Math.floor(baseOptions.styleSignalLimit * 0.6))
  };
  const attempts = [baseOptions, retryOptions];
  let distilled = null;
  let evidenceStats = null;
  let lastError = null;
  let attemptCount = 0;

  for (const options of attempts) {
    attemptCount += 1;
    const evidencePreview = buildDistillEvidencePreview({ mentor, sources, chunks, options });
    evidenceStats = evidencePreview.stats;
    const prompts = buildDistillPrompts({ mentor, evidencePreview: evidencePreview.preview });
    try {
      distilled = await llmProvider.generateJson({
        ...prompts,
        maxTokens: Number(config.llmDistillMaxTokens || llmProvider.distillMaxTokens || llmProvider.jsonMaxTokens || 2200)
      });
      break;
    } catch (error) {
      lastError = error;
      if (!likelyRetriableDistillError(error) || attemptCount >= attempts.length) {
        break;
      }
    }
  }

  if (!distilled) {
    if (!likelyRetriableDistillError(lastError)) {
      throw lastError;
    }
    const fallback = heuristicallyDistill({ mentor, sources, chunks });
    fallback.provenance = {
      ...(fallback.provenance || {}),
      confidenceNotes: `LLM distillation failed after ${attemptCount} attempt(s), so the persona was generated heuristically from local evidence. Last error: ${compactErrorMessage(lastError)}`,
      llmDistillation: {
        status: 'fallback',
        provider: llmProvider.kind,
        attempts: attemptCount,
        lastError: compactErrorMessage(lastError),
        evidencePreview: evidenceStats
      }
    };
    return fallback;
  }
  const researchTaste = normalizeResearchTaste(distilled.researchTaste || (thinkingStyle ? {
    preferredProblems: thinkingStyle.researchTaste,
    redFlags: thinkingStyle.redFlags,
    decisionSignals: thinkingStyle.decisionSignals
  } : undefined));
  const thinkingProcess = normalizeThinkingProcess(distilled.thinkingProcess || (thinkingStyle ? {
    problemSelection: thinkingStyle.problemSelection,
    ideaGeneration: thinkingStyle.ideaGeneration,
    evidenceStandards: thinkingStyle.evidenceStandards,
    studentEvaluation: thinkingStyle.studentEvaluation,
    scenarioResponses: thinkingStyle.scenarioResponses
  } : undefined));
  const communicationStyle = normalizeCommunicationStyle({
    ...(distilled.communicationStyle || {}),
    ...(chatStyle && !distilled.communicationStyle?.chatStyle ? { chatStyle } : {}),
    ...(meetingStyle && !distilled.communicationStyle?.meetingStyle ? { meetingStyle } : {}),
    ...(thinkingStyle && !distilled.communicationStyle?.thinkingStyle ? { thinkingStyle } : {})
  });

  return attachDerivedPersonaGuides({
    version: '0.1.0',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    mentor: {
      name: mentor.name,
      slug: mentor.slug,
      affiliation: mentor.affiliation || '',
      title: mentor.title || 'Professor',
      homepage: mentor.publicUrls?.[0] || ''
    },
    authorization: {
      authorized: true,
      authorizedBy: mentor.authorizedBy || 'unknown',
      consentNotes: mentor.consentNotes || ''
    },
    ...distilled,
    ...(researchTaste ? { researchTaste } : {}),
    ...(thinkingProcess ? { thinkingProcess } : {}),
    communicationStyle,
    provenance: {
      sourceCount: sources.length,
      publicSourceCount: sources.filter((item) => item.origin === 'public').length,
      uploadSourceCount: sources.filter((item) => item.origin === 'upload').length,
      privateSourceCount: sources.filter((item) => item.origin === 'private').length,
      topSources: distilled.provenance?.topSources || pickTop(sources.map((item) => item.id), 5),
      confidenceNotes: distilled.provenance?.confidenceNotes || `LLM-distilled from ${sources.length} sources.`,
      llmDistillation: {
        status: 'ok',
        provider: llmProvider.kind,
        attempts: attemptCount,
        evidencePreview: evidenceStats
      }
    }
  });
}

export function generateAgentCard(persona) {
  return `# ${persona.mentor.name} — Agent Card

## Identity
This agent is an **authorized AI twin** of ${persona.mentor.name}, not the literal human.
Affiliation: ${persona.mentor.affiliation}
Title: ${persona.mentor.title}

## Mission
- Explain the mentor's research directions and projects.
- Help students understand whether there may be a research fit.
- Collect structured student signals for mentor review.

## Voice
${persona.communicationStyle?.voiceSummary || 'Measured and research-oriented'}

## Private chat style
${persona.communicationStyle?.chatStyle
    ? [
      `Directness: ${persona.communicationStyle.chatStyle.directness || 'unknown'}`,
      `Typical questions: ${(persona.communicationStyle.chatStyle.typicalQuestions || []).join('; ')}`,
      `Feedback patterns: ${(persona.communicationStyle.chatStyle.feedbackPatterns || []).join('; ')}`
    ].join('\n')
    : 'No private chat style sample available.'}

## Group meeting style
${persona.communicationStyle?.meetingStyle
    ? [
      `Style inference: ${persona.communicationStyle.meetingStyle.styleInference || 'unknown'}`,
      `Meeting questions: ${(persona.communicationStyle.meetingStyle.typicalQuestions || []).join('; ')}`,
      `Critique patterns: ${(persona.communicationStyle.meetingStyle.critiquePatterns || []).join('; ')}`,
      `Presentation expectations: ${(persona.communicationStyle.meetingStyle.presentationExpectations || []).join('; ')}`,
      `Idea patterns: ${(persona.communicationStyle.meetingStyle.ideaPatterns || []).join('; ')}`
    ].join('\n')
    : 'No group meeting style sample available.'}

## Research taste
${persona.researchTaste
    ? [
      `Preferred problems: ${(persona.researchTaste.preferredProblems || []).join('; ')}`,
      `Decision signals: ${(persona.researchTaste.decisionSignals || []).join('; ')}`,
      `Red flags: ${(persona.researchTaste.redFlags || []).join('; ')}`
    ].join('\n')
    : 'No mentor thinking questionnaire available.'}

## Thinking process
${persona.thinkingProcess
    ? [
      `Problem selection: ${(persona.thinkingProcess.problemSelection || []).join('; ')}`,
      `Idea generation: ${(persona.thinkingProcess.ideaGeneration || []).join('; ')}`,
      `Evidence standards: ${(persona.thinkingProcess.evidenceStandards || []).join('; ')}`,
      `Student evaluation: ${(persona.thinkingProcess.studentEvaluation || []).join('; ')}`
    ].join('\n')
    : 'No explicit thinking-process sample available.'}

## Key research topics
${(persona.researchTopics || []).map((item) => `- ${item.name}`).join('\n')}

## Methods
${(persona.methods || []).map((item) => `- ${item}`).join('\n')}

## Current projects
${(persona.currentProjects || []).map((project) => `- ${project.title}: ${project.summary}`).join('\n')}

## Screening rubric
### Hard requirements
${(persona.screeningRubric?.hardRequirements || []).map((item) => `- ${item}`).join('\n')}

### Positive signals
${(persona.screeningRubric?.positiveSignals || []).map((item) => `- ${item}`).join('\n')}

### Concerns
${(persona.screeningRubric?.concerns || []).map((item) => `- ${item}`).join('\n')}

## Guardrails
${(persona.guardrails || []).map((item) => `- ${item}`).join('\n')}

## Provenance
Top sources: ${(persona.provenance?.topSources || []).join(', ')}
`;
}

function formatEvidenceList(retrievedChunks) {
  return (retrievedChunks || [])
    .slice(0, 4)
    .map((chunk) => `${chunk.sourceId}: ${chunk.title}`)
    .join('；');
}

const CHAT_STYLE_KIND_PRIORITY = ['mentor_thinking_questionnaire', 'ai_chat_share', 'meeting_transcript', 'wechat_chat'];

function chatChunkScore(chunk, query) {
  let score = overlapScore(query, `${chunk.title}\n${chunk.text}`);
  if (chunk.origin === 'private') score += 0.05;
  if (chunk.kind === 'mentor_thinking_questionnaire') score += 0.65;
  if (chunk.kind === 'ai_chat_share') score += 0.55;
  if (chunk.kind === 'meeting_transcript') score += 0.45;
  if (chunk.kind === 'wechat_chat') score += 0.3;
  return score;
}

export function selectChatChunks(chunks, query, limit = 6) {
  const general = rankChunks(chunks, query, Math.max(limit * 3, 12));
  const selected = [];
  const add = (chunk, score = chunk?.score) => {
    if (!chunk || selected.some((item) => item.id === chunk.id)) return;
    selected.push({
      ...chunk,
      score: Number(score ?? overlapScore(query, `${chunk.title}\n${chunk.text}`)) || 0
    });
  };

  general.slice(0, Math.min(4, limit)).forEach((chunk) => add(chunk, chunk.score));

  for (const kind of CHAT_STYLE_KIND_PRIORITY) {
    const candidate = [...(chunks || [])]
      .filter((chunk) => chunk.kind === kind)
      .map((chunk) => ({ ...chunk, score: chatChunkScore(chunk, query) }))
      .sort((a, b) => b.score - a.score)
      .at(0);
    if (candidate) add(candidate, candidate.score);
    if (selected.length >= limit) break;
  }

  for (const chunk of general) {
    add(chunk, chunk.score);
    if (selected.length >= limit) break;
  }

  return selected.slice(0, limit);
}

function heuristicReply({ persona, retrievedChunks, message, studentProfile }) {
  const topics = (persona.researchTopics || []).slice(0, 4).map((item) => item.name).join('、');
  const projects = persona.currentProjects || [];
  const fitSignals = projects.flatMap((item) => item.fitSignals || []).slice(0, 3);
  const relevantText = retrievedChunks[0]?.text || persona.overview || '';
  const studentText = cleanText(JSON.stringify(studentProfile || {}), 2000);
  const fitScore = studentText ? Math.round(overlapScore(studentText, JSON.stringify(persona)) * 18) : null;
  const chatStyle = persona.communicationStyle?.chatStyle;
  const meetingStyle = persona.communicationStyle?.meetingStyle;
  const thinkingStyle = persona.communicationStyle?.thinkingStyle;

  let body = `我是 ${persona.mentor.name} 的授权 AI 分身，不是导师本人。我会基于已授权材料回答你的问题。\n\n`;
  body += `从目前资料看，这位导师的核心研究主题主要集中在：${topics || '当前资料不足以稳定判断具体主题'}。\n\n`;
  body += `针对你的问题「${message}」，我会先从研究问题与方法匹配来判断，而不是只看表面的“热门方向”。当前最相关的证据显示：${firstSentences(relevantText, 2) || '暂无足够证据。'}\n\n`;

  if (studentProfile && Object.keys(studentProfile).length) {
    body += `结合你提供的背景，我会重点看三件事：研究兴趣是否与当前方向重叠、是否有独立实现/复现实验的证据、是否能把问题表述清楚。`;
    if (fitScore != null) {
      body += ` 基于你当前信息的粗略匹配度大约在 ${fitScore}/100 左右，这只是预估，不是最终判断。`;
    }
    body += `\n\n如果你想提高进一步面试的概率，可以优先准备：${fitSignals.join('、') || '一段清晰的问题陈述、一项可复现的实验记录、对失败结果的反思'}。`;
  } else {
    body += `如果你希望我判断你是否适合加入该方向，建议补充你的背景、研究兴趣、复现实验经历和最想解决的问题。`;
  }

  body += `\n\n证据依据：${formatEvidenceList(retrievedChunks) || '当前主要依据为 persona 概览。'}`;
  if (chatStyle?.feedbackPatterns?.length || chatStyle?.typicalQuestions?.length) {
    body += `\n\n导师私有聊天风格信号：我会优先沿用这些反馈习惯：${(chatStyle.feedbackPatterns || []).slice(0, 2).join('；') || '先澄清问题，再要求证据'}。`;
    body += ` 可继续追问：${(chatStyle.typicalQuestions || []).slice(0, 2).join('；') || '你的 baseline 和评价指标是什么？'}。`;
  }

  if (meetingStyle?.critiquePatterns?.length || meetingStyle?.presentationExpectations?.length) {
    body += `\n\nGroup meeting style signals: I will push for ${(meetingStyle.critiquePatterns || []).slice(0, 2).join('; ') || 'clear evidence and testable next steps'}.`;
    body += ` Presentation expectation: ${(meetingStyle.presentationExpectations || []).slice(0, 2).join('; ') || 'start from the problem and end with the next verification plan'}.`;
  }
  if (thinkingStyle?.ideaGeneration?.length || thinkingStyle?.evidenceStandards?.length) {
    body += `\n\nMentor thinking/taste signals: I will evaluate ideas through ${(thinkingStyle.decisionSignals || []).slice(0, 3).join(', ') || 'problem value, hypothesis clarity, and evidence quality'}.`;
    body += ` For idea development, use ${(thinkingStyle.ideaGeneration || []).slice(0, 2).join('; ') || 'a minimum experiment and failure analysis'}.`;
  }

  return body;
}

export async function chatAsPersona({ persona, chunks, session, message, studentProfile, llmProvider }) {
  const history = (session?.turns || []).slice(-6).map((turn) => ({
    role: turn.role,
    message: turn.message,
    answer: turn.answer
  }));
  const query = `${message}\n${JSON.stringify(studentProfile || {})}`;
  const retrievedChunks = selectChatChunks(chunks, query, 6);

  if (llmProvider.kind === 'mock') {
    return {
      answer: heuristicReply({ persona, retrievedChunks, message, studentProfile }),
      citations: retrievedChunks.map((item) => ({ sourceId: item.sourceId, title: item.title })),
      retrievedChunks
    };
  }

  const prompts = buildChatPrompts({
    persona,
    retrievedChunks,
    sessionHistory: history,
    message,
    studentProfile
  });

  const answer = await llmProvider.generateText(prompts);
  return {
    answer,
    citations: retrievedChunks.map((item) => ({ sourceId: item.sourceId, title: item.title })),
    retrievedChunks
  };
}

function heuristicScore(text, against) {
  return clamp(Math.round(overlapScore(text, against) * 20), 0, 100);
}

function countSignals(text, keywords) {
  const lower = String(text || '').toLowerCase();
  return keywords.filter((item) => lower.includes(item.toLowerCase())).length;
}

function labelRecommendation(overall) {
  if (overall >= 82) return 'strong_recommendation';
  if (overall >= 65) return 'recommend_interview';
  if (overall >= 45) return 'needs_human_review';
  return 'do_not_progress';
}

const RECOMMENDATIONS = new Set([
  'do_not_progress',
  'needs_human_review',
  'recommend_interview',
  'strong_recommendation'
]);

function hasTranscriptEvidence(transcript) {
  if (Array.isArray(transcript)) return transcript.length > 0;
  return cleanText(JSON.stringify(transcript || {}), 2000).length > 20;
}

function hasStudentEvidence(studentProfile) {
  return cleanText(JSON.stringify(studentProfile || {}), 2000).length > 20;
}

function normalizeEvaluationReport(report, { retrievedChunks, studentProfile, transcript }) {
  const normalized = { ...report };
  if (!RECOMMENDATIONS.has(normalized.recommendation)) {
    normalized.recommendation = labelRecommendation(Number(normalized.overallScore || 0));
  }

  const evidenceBacked = (retrievedChunks || []).slice(0, 6).map((chunk) => ({
    sourceId: chunk.sourceId,
    title: chunk.title,
    chunkIndex: chunk.chunkIndex
  }));
  const inferred = [];
  if (hasStudentEvidence(studentProfile)) inferred.push('student_profile');
  if (hasTranscriptEvidence(transcript)) inferred.push('session_transcript');

  const lowEvidence = evidenceBacked.length < 2 || !hasStudentEvidence(studentProfile);
  if (lowEvidence && ['recommend_interview', 'strong_recommendation'].includes(normalized.recommendation)) {
    normalized.recommendation = 'needs_human_review';
    normalized.summary = `${normalized.summary || ''}\n\nEvidence is limited, so this recommendation was downgraded for human review.`.trim();
  }

  normalized.evidenceQuality = {
    evidenceBackedCount: evidenceBacked.length,
    hasStudentProfile: hasStudentEvidence(studentProfile),
    hasTranscript: hasTranscriptEvidence(transcript),
    lowEvidence
  };
  normalized.evidenceBreakdown = {
    evidenceBacked,
    inferred
  };

  return normalized;
}

function heuristicEvaluation({ persona, studentProfile, transcript, retrievedChunks }) {
  const studentText = cleanText(JSON.stringify(studentProfile || {}), 6000);
  const transcriptText = cleanText(JSON.stringify(transcript || {}), 6000);
  const personaText = cleanText(JSON.stringify(persona || {}), 12000);

  const researchFit = heuristicScore(studentText, JSON.stringify((persona.researchTopics || []).map((item) => item.name)));
  const technicalDepth = clamp(25 + countSignals(studentText, INITIATIVE_KEYWORDS) * 10, 0, 100);
  const communication = clamp(30 + Math.min(50, transcriptText.length / 20) + (/\?|？/.test(transcriptText) ? 8 : 0), 0, 100);
  const initiative = clamp(20 + countSignals(`${studentText}\n${transcriptText}`, INITIATIVE_KEYWORDS) * 12, 0, 100);
  const overallScore = Math.round((researchFit * 0.35) + (technicalDepth * 0.25) + (communication * 0.15) + (initiative * 0.25));

  return {
    researchFit: {
      score: researchFit,
      rationale: `研究兴趣与导师画像的 lexical overlap 为主要依据。当前关注点与 ${(persona.researchTopics || []).slice(0, 4).map((item) => item.name).join('、') || '核心方向'} 的重叠度为 ${researchFit}/100。`,
      evidence: retrievedChunks.slice(0, 3).map((item) => `${item.sourceId}: ${item.title}`)
    },
    technicalDepth: {
      score: technicalDepth,
      rationale: '根据学生描述中是否出现复现、实现、实验设计、PyTorch、数据管线等实操信号进行粗评。',
      evidence: studentProfile?.experience || []
    },
    communication: {
      score: communication,
      rationale: '根据对话长度、提问清晰度、是否能围绕研究问题展开进行粗评。',
      evidence: transcriptText ? ['session transcript available'] : ['no transcript provided']
    },
    initiative: {
      score: initiative,
      rationale: '根据学生是否展示独立推进、复现、调试、记录实验等行为信号进行粗评。',
      evidence: studentProfile?.experience || []
    },
    overallScore,
    recommendation: labelRecommendation(overallScore),
    summary: `该评分仅用于预筛。总体上，这名学生在与 ${persona.mentor.name} 相关方向上的粗略匹配度为 ${overallScore}/100。建议导师重点核查其独立实验能力与问题定义能力。`,
    followUpQuestions: [
      '请具体讲一个你独立复现并改进过的工作。',
      '你如何设计一组最小但有说服力的 ablation？',
      '如果结果不理想，你会如何判断是问题定义还是实现细节出了问题？'
    ]
  };
}

export async function evaluateStudentFit({ persona, chunks, studentProfile, transcript, llmProvider }) {
  const query = `${JSON.stringify(studentProfile || {})}\n${JSON.stringify(transcript || [])}`;
  const retrievedChunks = rankChunks(chunks, query, 6);

  if (llmProvider.kind === 'mock') {
    return normalizeEvaluationReport({
      id: safeId('eval'),
      createdAt: nowIso(),
      ...heuristicEvaluation({ persona, studentProfile, transcript, retrievedChunks })
    }, { retrievedChunks, studentProfile, transcript });
  }

  const prompts = buildEvaluationPrompts({ persona, studentProfile, transcript, retrievedChunks });
  const data = await llmProvider.generateJson(prompts);
  return normalizeEvaluationReport({
    id: safeId('eval'),
    createdAt: nowIso(),
    ...data
  }, { retrievedChunks, studentProfile, transcript });
}
