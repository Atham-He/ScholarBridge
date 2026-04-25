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

  return {
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
    communicationStyle: {
      voiceSummary: buildVoiceSummary(combined),
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
      topSources: pickTop(sources.map((item) => item.id), 5),
      confidenceNotes: `Generated heuristically from ${sources.length} sources and ${chunks.length} chunks.`
    }
  };
}

export async function distillPersona({ mentor, sources, chunks, llmProvider }) {
  if (llmProvider.kind === 'mock') {
    return heuristicallyDistill({ mentor, sources, chunks });
  }

  const evidencePreview = JSON.stringify(
    pickTop(sources, 10).map((item) => ({
      id: item.id,
      title: item.title,
      origin: item.origin,
      kind: item.kind,
      summary: item.metadata?.summary || firstSentences(item.content || '', 2)
    })),
    null,
    2
  );

  const prompts = buildDistillPrompts({ mentor, evidencePreview });
  const distilled = await llmProvider.generateJson(prompts);

  return {
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
    provenance: {
      sourceCount: sources.length,
      publicSourceCount: sources.filter((item) => item.origin === 'public').length,
      uploadSourceCount: sources.filter((item) => item.origin === 'upload').length,
      topSources: distilled.provenance?.topSources || pickTop(sources.map((item) => item.id), 5),
      confidenceNotes: distilled.provenance?.confidenceNotes || `LLM-distilled from ${sources.length} sources.`
    }
  };
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

function heuristicReply({ persona, retrievedChunks, message, studentProfile }) {
  const topics = (persona.researchTopics || []).slice(0, 4).map((item) => item.name).join('、');
  const projects = persona.currentProjects || [];
  const fitSignals = projects.flatMap((item) => item.fitSignals || []).slice(0, 3);
  const relevantText = retrievedChunks[0]?.text || persona.overview || '';
  const studentText = cleanText(JSON.stringify(studentProfile || {}), 2000);
  const fitScore = studentText ? Math.round(overlapScore(studentText, JSON.stringify(persona)) * 18) : null;

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
  return body;
}

export async function chatAsPersona({ persona, chunks, session, message, studentProfile, llmProvider }) {
  const history = (session?.turns || []).slice(-6).map((turn) => ({
    role: turn.role,
    message: turn.message,
    answer: turn.answer
  }));
  const query = `${message}\n${JSON.stringify(studentProfile || {})}`;
  const retrievedChunks = rankChunks(chunks, query, 6);

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
