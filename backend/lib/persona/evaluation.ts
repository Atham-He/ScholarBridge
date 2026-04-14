/**
 * 学生评估服务
 * 基于Persona和学生信息进行多维度评估
 */

import type {
  PersonaData,
  Chunk,
  EvaluationParams,
  EvaluationResult
} from './types';
import type { LLMProvider } from './llm';
import { retrievalService } from './retrieval';
import { safeId, nowIso, cleanText, firstSentences, overlapScore, clamp } from './utils';

/**
 * 启发式关键词
 */
const INITIATIVE_KEYWORDS = [
  'implemented', 'reproduced', 'built', 'open source', 'first author',
  'benchmark', 'ablation', 'debugging', 'pipeline', 'published', 'PyTorch',
  '实验', '复现', '实现', '数据管线', '独立', '主导', '开发'
];

/**
 * 构建评估提示词
 */
function buildEvaluationPrompts(params: EvaluationParams): string[] {
  const { persona, studentProfile, transcript, retrievedChunks } = params;

  const systemPrompt = `你是一位学术导师助手，负责评估学生与导师的匹配度。

# 导师信息
- 姓名：${persona.mentor.name}
- 机构：${persona.mentor.affiliation}
- 研究方向：${(persona.researchTopics || []).map(t => t.name).join('、')}

# 评估维度
请从以下4个维度评估学生（每个维度0-100分）：

1. **researchFit** (研究匹配度)：学生的研究兴趣与导师方向的重叠程度
2. **technicalDepth** (技术深度)：学生在相关技术/方法上的掌握程度
3. **communication** (沟通能力)：学生表达清晰度和研究表述能力
4. **initiative** (主动性)：学生的自驱能力和行动证据

# 评估标准
参考导师的筛选标准：
积极信号：
- ${(persona.screeningRubric?.positiveSignals || []).map(s => s).join('\n- ')}

关注点：
- ${(persona.screeningRubric?.concerns || []).map(s => s).join('\n- ')}

# 推荐等级
基于总分给出推荐等级：
- **strong_recommendation** (82+): 强烈推荐面试
- **recommend_interview** (65-81): 建议面试
- **needs_human_review** (45-64): 需要导师复核
- **do_not_progress** (<45): 不建议推进

# 输出格式
请返回JSON格式：
{
  "researchFit": {"score": 85, "rationale": "...", "evidence": ["..."]},
  "technicalDepth": {"score": 75, "rationale": "...", "evidence": ["..."]},
  "communication": {"score": 70, "rationale": "...", "evidence": ["..."]},
  "initiative": {"score": 80, "rationale": "...", "evidence": ["..."]},
  "overallScore": 77,
  "recommendation": "recommend_interview",
  "summary": "总体评价...",
  "followUpQuestions": ["问题1", "问题2", "问题3"]
}`;

  // 构建学生信息
  const studentInfo = {
    profile: studentProfile,
    transcript: transcript || [],
    relevantEvidence: retrievedChunks.map(c => ({
      sourceId: c.sourceId,
      title: c.title,
      excerpt: cleanText(c.text, 200)
    }))
  };

  const userPrompt = `请根据以下信息评估学生与导师的匹配度：

${JSON.stringify(studentInfo, null, 2)}

请返回JSON格式的评估结果。`;

  return [systemPrompt, userPrompt];
}

/**
 * 启发式评估（用于mock模式）
 */
function heuristicEvaluation(params: EvaluationParams): Omit<EvaluationResult, 'id' | 'createdAt'> {
  const { persona, studentProfile, transcript, retrievedChunks } = params;

  // 清理数据
  const studentText = cleanText(JSON.stringify(studentProfile || {}), 6000);
  const transcriptText = cleanText(JSON.stringify(transcript || []), 6000);
  const personaText = cleanText(JSON.stringify(persona), 12000);

  // 计算研究匹配度
  const researchTopics = (persona.researchTopics || []).map(t => t.name);
  const researchFitScore = clamp(
    Math.round(overlapScore(studentText, researchTopics.join(' ')) * 100),
    0, 100
  );

  // 计算技术深度
  const technicalSignals = INITIATIVE_KEYWORDS.filter(keyword =>
    studentText.toLowerCase().includes(keyword.toLowerCase())
  );
  const technicalDepthScore = clamp(
    25 + technicalSignals.length * 10,
    0, 100
  );

  // 计算沟通能力
  const transcriptLength = transcriptText.length;
  const hasQuestions = /[?？]/.test(transcriptText);
  const communicationScore = clamp(
    30 + Math.min(50, transcriptLength / 20) + (hasQuestions ? 8 : 0),
    0, 100
  );

  // 计算主动性
  const initiativeSignals = INITIATIVE_KEYWORDS.filter(keyword =>
    (studentText + ' ' + transcriptText).toLowerCase().includes(keyword.toLowerCase())
  );
  const initiativeScore = clamp(
    20 + initiativeSignals.length * 12,
    0, 100
  );

  // 计算总分（加权平均）
  const overallScore = Math.round(
    researchFitScore * 0.35 +
    technicalDepthScore * 0.25 +
    communicationScore * 0.15 +
    initiativeScore * 0.25
  );

  // 确定推荐等级
  let recommendation: EvaluationResult['recommendation'];
  if (overallScore >= 82) {
    recommendation = 'strong_recommendation';
  } else if (overallScore >= 65) {
    recommendation = 'recommend_interview';
  } else if (overallScore >= 45) {
    recommendation = 'needs_human_review';
  } else {
    recommendation = 'do_not_progress';
  }

  return {
    researchFit: {
      score: researchFitScore,
      rationale: `研究兴趣与导师画像的 lexical overlap 为主要依据。当前关注点与 ${researchTopics.slice(0, 4).join('、') || '核心方向'} 的重叠度为 ${researchFitScore}/100。`,
      evidence: retrievedChunks.slice(0, 3).map(c => `${c.sourceId}: ${c.title}`)
    },
    technicalDepth: {
      score: technicalDepthScore,
      rationale: '根据学生描述中是否出现复现、实现、实验设计、PyTorch、数据管线等实操信号进行粗评。',
      evidence: studentProfile?.experience || []
    },
    communication: {
      score: communicationScore,
      rationale: '根据对话长度、提问清晰度、是否能围绕研究问题展开进行粗评。',
      evidence: transcriptText ? ['session transcript available'] : ['no transcript provided']
    },
    initiative: {
      score: initiativeScore,
      rationale: '根据学生是否展示独立推进、复现、调试、记录实验等行为信号进行粗评。',
      evidence: studentProfile?.experience || []
    },
    overallScore,
    recommendation,
    summary: `该评分仅用于预筛。总体上，这名学生在与 ${persona.mentor.name} 相关方向上的粗略匹配度为 ${overallScore}/100。建议导师重点核查其独立实验能力与问题定义能力。`,
    followUpQuestions: [
      '请具体讲一个你独立复现并改进过的工作。',
      '你如何设计一组最小但有说服力的 ablation？',
      '如果结果不理想，你会如何判断是问题定义还是实现细节出了问题？'
    ]
  };
}

/**
 * 学生评估服务类
 */
export class StudentEvaluationService {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * 评估学生匹配度
   */
  async evaluate(params: EvaluationParams): Promise<EvaluationResult> {
    const { persona, chunks, studentProfile, transcript } = params;

    // 检索相关证据
    const query = `${JSON.stringify(studentProfile || {})}\n${JSON.stringify(transcript || [])}`;
    const retrievedChunks = retrievalService.rankChunks(query, chunks, 6);

    let result: Omit<EvaluationResult, 'id' | 'createdAt'>;

    if (this.llmProvider.kind === 'mock') {
      // 使用启发式评估
      result = heuristicEvaluation({
        persona,
        studentProfile,
        transcript,
        retrievedChunks
      });
    } else {
      // 使用LLM评估
      const prompts = buildEvaluationPrompts({
        persona,
        studentProfile,
        transcript,
        retrievedChunks
      });

      try {
        const llmResult = await this.llmProvider.generateJson(prompts);
        result = llmResult;
      } catch (error) {
        console.error('LLM evaluation failed, using heuristic fallback:', error);
        result = heuristicEvaluation({
          persona,
          studentProfile,
          transcript,
          retrievedChunks
        });
      }
    }

    // 规范化推荐等级
    const validRecommendations: Set<EvaluationResult['recommendation']> = new Set([
      'do_not_progress',
      'needs_human_review',
      'recommend_interview',
      'strong_recommendation'
    ]);

    if (!validRecommendations.has(result.recommendation)) {
      // 根据总分确定推荐等级
      const score = result.overallScore || 0;
      if (score >= 82) {
        result.recommendation = 'strong_recommendation';
      } else if (score >= 65) {
        result.recommendation = 'recommend_interview';
      } else if (score >= 45) {
        result.recommendation = 'needs_human_review';
      } else {
        result.recommendation = 'do_not_progress';
      }
    }

    // 证据质量检查
    const hasStudentProfile = Object.keys(studentProfile || {}).length > 0;
    const hasTranscript = Array.isArray(transcript) && transcript.length > 0;
    const evidenceBackedCount = retrievedChunks.length;
    const lowEvidence = evidenceBackedCount < 2 || !hasStudentProfile;

    // 如果证据不足且推荐等级较高，降级为需要人工复核
    if (lowEvidence && ['recommend_interview', 'strong_recommendation'].includes(result.recommendation)) {
      result.recommendation = 'needs_human_review';
      result.summary = `${result.summary || ''}\n\n证据不足，因此该推荐等级已降级为人工复核。`.trim();
    }

    // 添加证据质量信息
    result.evidenceQuality = {
      evidenceBackedCount,
      hasStudentProfile,
      hasTranscript,
      lowEvidence
    };

    // 添加证据分解
    result.evidenceBreakdown = {
      evidenceBacked: retrievedChunks.slice(0, 6).map(chunk => ({
        sourceId: chunk.sourceId,
        title: chunk.title,
        chunkIndex: chunk.chunkIndex
      })),
      inferred: []
    };

    if (hasStudentProfile) {
      result.evidenceBreakdown.inferred.push('student_profile');
    }
    if (hasTranscript) {
      result.evidenceBreakdown.inferred.push('session_transcript');
    }

    // 返回完整结果
    return {
      id: safeId('eval'),
      createdAt: nowIso(),
      ...result
    };
  }

  /**
   * 批量评估多个学生
   */
  async evaluateBatch(
    paramsArray: EvaluationParams[]
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    for (const params of paramsArray) {
      try {
        const result = await this.evaluate(params);
        results.push(result);
      } catch (error) {
        console.error(`Failed to evaluate student:`, error);
        // 继续处理下一个，不中断批量处理
      }
    }

    return results;
  }

  /**
   * 获取评估摘要
   */
  getEvaluationSummary(evaluation: EvaluationResult): {
    overallScore: number;
    recommendation: EvaluationResult['recommendation'];
    recommendationLabel: string;
    keyStrengths: string[];
    areasForImprovement: string[];
  } {
    const { overallScore, recommendation, researchFit, technicalDepth, communication, initiative } = evaluation;

    // 推荐等级标签
    const recommendationLabels: Record<EvaluationResult['recommendation'], string> = {
      strong_recommendation: '强烈推荐',
      recommend_interview: '建议面试',
      needs_human_review: '需要复核',
      do_not_progress: '不建议推进'
    };

    // 关键优势
    const keyStrengths: string[] = [];
    if (researchFit.score >= 75) keyStrengths.push('研究匹配度高');
    if (technicalDepth.score >= 75) keyStrengths.push('技术基础扎实');
    if (communication.score >= 75) keyStrengths.push('沟通表达清晰');
    if (initiative.score >= 75) keyStrengths.push('主动性强');

    // 需要改进的方面
    const areasForImprovement: string[] = [];
    if (researchFit.score < 60) areasForImprovement.push('加强研究方向了解');
    if (technicalDepth.score < 60) areasForImprovement.push('提升技术深度');
    if (communication.score < 60) areasForImprovement.push('改进沟通表达');
    if (initiative.score < 60) areasForImprovement.push('展示更多主动性');

    return {
      overallScore,
      recommendation,
      recommendationLabel: recommendationLabels[recommendation],
      keyStrengths,
      areasForImprovement
    };
  }
}
