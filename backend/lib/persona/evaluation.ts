import type {
  EvaluationParams,
  EvaluationResult,
  LLMProvider
} from './types';
import { evaluateWithPersona } from './engine.mjs';

export class StudentEvaluationService {
  constructor(private llmProvider?: LLMProvider) {}

  async evaluate(params: EvaluationParams): Promise<EvaluationResult> {
    return (evaluateWithPersona as any)({
      persona: params.persona,
      chunks: params.chunks,
      studentProfile: params.studentProfile,
      transcript: params.transcript,
      llmProvider: this.llmProvider || null
    }) as Promise<EvaluationResult>;
  }

  async evaluateBatch(paramsArray: EvaluationParams[]): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    for (const params of paramsArray) {
      results.push(await this.evaluate(params));
    }
    return results;
  }

  getEvaluationSummary(evaluation: EvaluationResult) {
    const recommendationLabels: Record<EvaluationResult['recommendation'], string> = {
      strong_recommendation: '强烈推荐',
      recommend_interview: '建议面试',
      needs_human_review: '需要复核',
      do_not_progress: '不建议推进'
    };

    const keyStrengths: string[] = [];
    const areasForImprovement: string[] = [];
    if ((evaluation.researchFit?.score || 0) >= 75) keyStrengths.push('研究方向匹配度高');
    if ((evaluation.technicalDepth?.score || 0) >= 75) keyStrengths.push('技术深度较强');
    if ((evaluation.communication?.score || 0) >= 75) keyStrengths.push('表达清晰');
    if ((evaluation.initiative?.score || 0) >= 75) keyStrengths.push('主动性较强');
    if ((evaluation.researchFit?.score || 0) < 60) areasForImprovement.push('需要更清晰地说明研究兴趣');
    if ((evaluation.technicalDepth?.score || 0) < 60) areasForImprovement.push('需要补强技术或实验能力');
    if ((evaluation.communication?.score || 0) < 60) areasForImprovement.push('需要提升表达与研究叙述能力');
    if ((evaluation.initiative?.score || 0) < 60) areasForImprovement.push('需要更多主动推进的证据');

    return {
      overallScore: evaluation.overallScore,
      recommendation: evaluation.recommendation,
      recommendationLabel: recommendationLabels[evaluation.recommendation],
      keyStrengths,
      areasForImprovement
    };
  }
}
