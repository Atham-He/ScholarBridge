/**
 * Persona构建服务
 * 整合公开信息搜集、文件解析、证据切块、Persona蒸馏等功能
 */

import { randomBytes } from 'crypto';
import type {
  MentorInput,
  PersonaData,
  Source,
  Chunk,
  BuildPersonaParams,
  BuildPersonaResult
} from './types';
import type { LLMProvider } from './llm';
import { safeId } from './utils';
import { parseFile, cleanParsedText, type UploadedFile } from './file-parser';
import { getPublicSearchService } from './public-search';

/**
 * 生成唯一的persona slug
 */
function generateSlug(name: string, affiliation: string): string {
  const base = `${name}-${affiliation}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const randomSuffix = randomBytes(4).toString('hex');
  return `${base}-${randomSuffix}`;
}

/**
 * 清理文本
 */
function cleanText(text: string, maxLength: number = 60000): string {
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
function firstSentences(text: string, count: number = 3): string {
  const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, count).join('。') + (sentences.length > count ? '。' : '');
}

/**
 * 获取前N个关键词
 */
function topKeywords(text: string, count: number = 16): Array<{ token: string; count: number }> {
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
 * 猜测研究方法
 */
function guessMethods(text: string): string[] {
  const methodHints = [
    'representation learning', 'multimodal learning', 'graph learning',
    'language models', 'computer vision', 'reinforcement learning',
    'causal inference', 'optimization', 'ablation studies',
    'self-supervised learning', 'generative models', '表征学习',
    '多模态', '自监督', '深度学习', '强化学习', '因果推断'
  ];

  const normalized = text.toLowerCase();
  return methodHints.filter(hint => normalized.includes(hint.toLowerCase())).slice(0, 8);
}

/**
 * 构建默认项目
 */
function defaultProjects(topics: Array<{ name: string }>, methods: string[]): Array<{
  title: string;
  summary: string;
  requiredSkills: string[];
  fitSignals: string[];
}> {
  const title = topics[0] ? `${topics[0].name} 方向探索` : '开放式研究项目';
  return [{
    title,
    summary: `围绕 ${topics.slice(0, 3).map(t => t.name).join('、') || '当前研究方向'} 展开，强调问题定义、实验设计与批判性分析。`,
    requiredSkills: methods.slice(0, 4),
    fitSignals: ['能独立读论文', '能快速做基线', '能清楚解释实验设计']
  }];
}

/**
 * 基于启发式蒸馏Persona
 */
function heuristicallyDistill({
  mentor,
  sources,
  chunks
}: {
  mentor: MentorInput & { slug: string };
  sources: Source[];
  chunks: Chunk[];
}): PersonaData {
  // 合并所有源文本
  const combined = sources
    .map(source => `${source.title}\n${source.content}`)
    .join('\n\n');

  const keywords = topKeywords(combined, 16);
  const methods = guessMethods(combined);

  // 生成研究主题
  const topicSeeds = [
    ...methods,
    ...keywords.map(k => k.token)
  ];
  const topics = [...new Set(topicSeeds)]
    .slice(0, 8)
    .map((name, index) => ({
      name,
      confidence: Math.max(0.3, 0.92 - index * 0.08),
      evidence: sources.slice(0, 3).map(s => s.id)
    }));

  // 生成项目
  const projectHints = combined.match(/(project|screening|looking for|招募|招生|筛选)/gi);
  const projects = (projectHints && projectHints.length > 0)
    ? [{
        title: '研究项目',
        summary: combined.substring(0, 200) + '...',
        requiredSkills: methods.slice(0, 4),
        fitSignals: ['能复现现有工作', '有较强实验设计意识']
      }]
    : defaultProjects(topics, methods);

  return {
    version: '0.1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mentor: {
      name: mentor.name,
      slug: mentor.slug,
      affiliation: mentor.affiliation,
      title: mentor.title || 'Professor',
      homepage: mentor.publicUrls?.[0] || ''
    },
    authorization: {
      authorized: true,
      authorizedBy: mentor.authorizedBy,
      consentNotes: mentor.consentNotes || ''
    },
    overview: firstSentences(combined, 4) || `${mentor.name} 从事 ${topics.map(t => t.name).join('、')} 等方向的研究。`,
    researchTopics: topics,
    methods,
    currentProjects: projects,
    communicationStyle: {
      voiceSummary: '学术风格，注重问题定义和方法选择',
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
        '你如何设计一组最小但有说服力的 ablation？',
        '你为什么对这个方向感兴趣？'
      ]
    },
    screeningRubric: {
      hardRequirements: [],
      positiveSignals: [
        '能独立复现论文',
        '能清楚解释实验为何有效',
        '有实验记录与 ablation 习惯'
      ],
      concerns: [
        '只谈结果，不谈机制',
        '对实验设计和失败案例缺乏反思',
        '缺乏独立推进能力'
      ]
    },
    guardrails: [
      '必须始终声明自己是授权 AI 分身',
      '不能替导师做最终录取决定',
      '不能披露未公开项目信息',
      '不能承诺 funding、offer 或 authorship'
    ],
    provenance: {
      sourceCount: sources.length,
      publicSourceCount: sources.filter(s => s.origin === 'public').length,
      uploadSourceCount: sources.filter(s => s.origin === 'upload').length,
      topSources: sources.slice(0, 5).map(s => s.id),
      confidenceNotes: `Generated heuristically from ${sources.length} sources and ${chunks.length} chunks.`
    }
  };
}

/**
 * 使用LLM蒸馏Persona
 */
async function llmDistill({
  mentor,
  sources,
  llmProvider
}: {
  mentor: MentorInput & { slug: string };
  sources: Source[];
  llmProvider: LLMProvider;
}): Promise<Partial<PersonaData>> {
  // 构建证据预览
  const evidencePreview = JSON.stringify(
    sources.slice(0, 10).map(source => ({
      id: source.id,
      title: source.title,
      origin: source.origin,
      kind: source.kind,
      summary: source.metadata?.summary || firstSentences(source.content || '', 2)
    })),
    null,
    2
  );

  // 构建蒸馏提示词
  const systemPrompt = `你是一个学术导师画像构建助手。你的任务是根据导师的研究资料，生成一个结构化的导师画像（persona）。

请返回一个JSON对象，包含以下字段：
{
  "overview": "导师研究概述（2-3句话）",
  "researchTopics": [{"name": "主题名", "confidence": 0.8, "evidence": ["source_id"]}],
  "methods": ["方法1", "方法2"],
  "currentProjects": [{
    "title": "项目名称",
    "summary": "项目描述",
    "requiredSkills": ["技能1"],
    "fitSignals": ["信号1"]
  }],
  "communicationStyle": {
    "voiceSummary": "说话风格描述",
    "doSay": ["应该说的"],
    "avoid": ["应该避免的"]
  },
  "mentorshipStyle": {
    "expectations": ["期望1"],
    "preferredStudents": ["偏好的学生类型"],
    "screeningQuestions": ["筛选问题"]
  },
  "screeningRubric": {
    "hardRequirements": ["硬性要求"],
    "positiveSignals": ["积极信号"],
    "concerns": ["关注点"]
  }
}`;

  const userPrompt = `请根据以下证据资料，为导师 ${mentor.name} (${mentor.affiliation}) 构建画像：

${evidencePreview}

请返回JSON格式的画像。`;

  try {
    const distilled = await llmProvider.generateJson([systemPrompt, userPrompt]);
    return distilled;
  } catch (error) {
    console.error('LLM distillation failed, falling back to heuristic:', error);
    throw error;
  }
}

/**
 * 将源文本切块
 */
function chunkSources(sources: Source[], targetLength: number = 1200, overlap: number = 180): Chunk[] {
  const chunks: Chunk[] = [];

  for (const source of sources) {
    const text = source.content;
    if (!text || text.length === 0) continue;

    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + targetLength, text.length);
      const chunkText = text.substring(start, end);

      chunks.push({
        id: `${source.id}_chunk_${chunkIndex}`,
        sourceId: source.id,
        title: source.title,
        origin: source.origin,
        kind: source.kind,
        url: source.url,
        chunkIndex,
        text: chunkText
      });

      chunkIndex++;
      start = end - overlap;
    }
  }

  return chunks;
}

/**
 * 生成Agent Card
 */
function generateAgentCard(persona: PersonaData): string {
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
${(persona.researchTopics || []).map(t => `- ${t.name}`).join('\n')}

## Methods
${(persona.methods || []).map(m => `- ${m}`).join('\n')}

## Current projects
${(persona.currentProjects || []).map(p => `- ${p.title}: ${p.summary}`).join('\n')}

## Screening rubric
### Hard requirements
${(persona.screeningRubric?.hardRequirements || []).map(r => `- ${r}`).join('\n')}

### Positive signals
${(persona.screeningRubric?.positiveSignals || []).map(s => `- ${s}`).join('\n')}

### Concerns
${(persona.screeningRubric?.concerns || []).map(c => `- ${c}`).join('\n')}

## Guardrails
${(persona.guardrails || []).map(g => `- ${g}`).join('\n')}

## Provenance
Top sources: ${(persona.provenance?.topSources || []).join(', ')}
Built at: ${persona.createdAt}
`;
}

/**
 * Persona构建器类
 */
export class PersonaBuilder {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * 构建Persona
   */
  async build(params: BuildPersonaParams): Promise<BuildPersonaResult> {
    const {
      mentor,
      publicUrls = [],
      uploads = [],
      projectText = '',
      skipPublicSearch = false,
      disableOpenalex = false
    } = params;

    // 生成slug
    const slug = generateSlug(mentor.name, mentor.affiliation);

    // 收集源
    const sources: Source[] = [];

    // 1. 公共搜索（如果启用）
    if (!skipPublicSearch) {
      try {
        const publicSearch = getPublicSearchService();
        const searchResults = await publicSearch.gatherPublicMaterials({
          name: mentor.name,
          affiliation: mentor.affiliation,
          enableWebSearch: true,
          enableOpenAlex: !disableOpenalex,
          maxWebResults: 5,
          maxAcademicResults: 10,
          fetchContent: true  // 抓取网页内容
        });

        sources.push(...searchResults.academicResults);
        console.log(`Public search found ${searchResults.sourceCount} sources`);
      } catch (error) {
        console.warn('Public search failed, continuing with uploads only:', error);
      }
    }

    // 解析上传文件
    for (const upload of uploads) {
      const parsed = await parseFile(upload, this.llmProvider);

      if (parsed.success && parsed.content) {
        // 清理解析的文本
        const cleanedContent = cleanParsedText(parsed.content);

        sources.push({
          id: safeId('src'),
          origin: 'upload',
          kind: this.getUploadKind(upload.mimeType),
          title: upload.name,
          content: cleanedContent,
          url: upload.path,
          metadata: {
            summary: parsed.content ? parsed.content.substring(0, 200) : undefined,
            ...parsed.metadata
          }
        });
      } else {
        console.warn(`Failed to parse ${upload.name}: ${parsed.error}`);
        // 添加为错误源
        sources.push({
          id: safeId('src'),
          origin: 'upload',
          kind: 'upload_text',
          title: `[Error] ${upload.name}`,
          content: `[Failed to parse ${upload.name}: ${parsed.error}]`
        });
      }
    }

    // 2. 解析上传文件
    for (const upload of uploads) {
      const parsed = await parseFile(upload, this.llmProvider);

      if (parsed.success && parsed.content) {
        // 清理解析的文本
        const cleanedContent = cleanParsedText(parsed.content);

        sources.push({
          id: safeId('src'),
          origin: 'upload',
          kind: this.getUploadKind(upload.mimeType),
          title: upload.name,
          content: cleanedContent,
          url: upload.path,
          metadata: {
            summary: parsed.content ? parsed.content.substring(0, 200) : undefined,
            ...parsed.metadata
          }
        });
      } else {
        console.warn(`Failed to parse ${upload.name}: ${parsed.error}`);
        // 添加为错误源
        sources.push({
          id: safeId('src'),
          origin: 'upload',
          kind: 'upload_text',
          title: `[Error] ${upload.name}`,
          content: `[Failed to parse ${upload.name}: ${parsed.error}]`
        });
      }
    }

    // 3. 添加projectText作为额外的源
    if (projectText) {
      sources.push({
        id: safeId('src'),
        origin: 'upload',
        kind: 'upload_text',
        title: 'Project Description',
        content: projectText
      });
    }

    if (sources.length === 0) {
      throw new Error('No valid sources found. Please provide files or project text.');
    }

    // 切块
    const chunks = chunkSources(sources);

    // 蒸馏Persona
    let persona: PersonaData;

    try {
      if (this.llmProvider.kind === 'mock') {
        // 使用启发式蒸馏
        persona = heuristicallyDistill({
          mentor: { ...mentor, slug },
          sources,
          chunks
        });
      } else {
        // 使用LLM蒸馏
        const llmResult = await llmDistill({
          mentor: { ...mentor, slug },
          sources,
          llmProvider: this.llmProvider
        });

        // 合并基础字段
        persona = {
          version: '0.1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mentor: {
            name: mentor.name,
            slug,
            affiliation: mentor.affiliation,
            title: mentor.title || 'Professor',
            homepage: publicUrls[0] || ''
          },
          authorization: {
            authorized: true,
            authorizedBy: mentor.authorizedBy,
            consentNotes: mentor.consentNotes || ''
          },
          ...llmResult,
          provenance: {
            sourceCount: sources.length,
            publicSourceCount: sources.filter(s => s.origin === 'public').length,
            uploadSourceCount: sources.filter(s => s.origin === 'upload').length,
            topSources: sources.slice(0, 5).map(s => s.id),
            confidenceNotes: `LLM-distilled from ${sources.length} sources.`
          }
        } as PersonaData;
      }
    } catch (error) {
      console.error('LLM distillation failed, using heuristic fallback:', error);
      persona = heuristicallyDistill({
        mentor: { ...mentor, slug },
        sources,
        chunks
      });
    }

    // 生成Agent Card
    const agentCard = generateAgentCard(persona);

    return {
      slug,
      persona,
      agentCard,
      sources,
      chunks,
      sourceCount: sources.length,
      chunkCount: chunks.length,
      publicSourceCount: sources.filter(s => s.origin === 'public').length,
      uploadSourceCount: sources.filter(s => s.origin === 'upload').length
    };
  }

  /**
   * 根据MIME类型确定源类型
   */
  private getUploadKind(mimeType: string): 'upload_text' | 'upload_document' | 'upload_image' {
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return 'upload_text';
    } else if (mimeType.startsWith('image/')) {
      return 'upload_image';
    } else {
      return 'upload_document';
    }
  }
}

/**
 * 工具函数：生成安全ID
 */
export function safeId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}
