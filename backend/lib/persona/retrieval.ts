/**
 * 检索服务
 * 基于词汇重叠度的简单检索实现 (v1)
 * 未来可升级为向量检索 (v2)
 */

import type { Chunk } from './types';

export class RetrievalService {
  /**
   * 计算两个字符串之间的词汇重叠度
   */
  private overlapScore(query: string, text: string): number {
    const queryTokens = this.tokenize(query);
    const textTokens = this.tokenize(text);

    if (queryTokens.length === 0 || textTokens.length === 0) {
      return 0;
    }

    // 计算交集
    const intersection = queryTokens.filter(token => textTokens.has(token));
    const intersectionSize = intersection.length;

    // Jaccard相似度: |A ∩ B| / |A ∪ B|
    const unionSize = new Set([...queryTokens, ...textTokens]).size;
    const jaccard = unionSize > 0 ? intersectionSize / unionSize : 0;

    // 同时考虑覆盖率: |A ∩ B| / |A|
    const coverage = queryTokens.length > 0 ? intersectionSize / queryTokens.length : 0;

    // 综合得分 (70% Jaccard + 30% coverage)
    return jaccard * 0.7 + coverage * 0.3;
  }

  /**
   * 分词：转换为小写，提取单词和中文词语
   */
  private tokenize(text: string): Set<string> {
    // 简单的分词实现
    // 英文：按空格和标点分词
    // 中文：按字符分词（简化版，生产环境应使用专业分词库）

    const words: string[] = [];

    // 提取英文单词
    const englishWords = text.toLowerCase().match(/[a-z]+/g) || [];
    words.push(...englishWords);

    // 提取中文字符和词语（简化版：按连续的中文字符分组）
    const chineseSegments = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    words.push(...chineseSegments);

    // 过滤停用词
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
      '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着'
    ]);

    return new Set(words.filter(word => word.length > 1 && !stopWords.has(word)));
  }

  /**
   * 对chunks进行排序并返回top-k
   */
  rankChunks(query: string, chunks: Chunk[], topK: number = 6): Chunk[] {
    if (chunks.length === 0) {
      return [];
    }

    // 计算每个chunk的得分
    const scoredChunks = chunks.map(chunk => ({
      chunk,
      score: this.overlapScore(query, chunk.text)
    }));

    // 按得分排序
    scoredChunks.sort((a, b) => b.score - a.score);

    // 返回top-k
    return scoredChunks
      .slice(0, Math.min(topK, chunks.length))
      .map(item => item.chunk);
  }

  /**
   * 批量检索：对多个查询分别检索后合并结果
   */
  rankChunksBatch(queries: string[], chunks: Chunk[], topK: number = 6): Chunk[] {
    if (queries.length === 0) {
      return this.rankChunks('', chunks, topK);
    }

    // 对每个查询进行检索
    const allResults = queries.map(query =>
      this.rankChunks(query, chunks, topK)
    );

    // 合并去重
    const uniqueChunks = new Map<string, Chunk>();
    for (const results of allResults) {
      for (const chunk of results) {
        if (!uniqueChunks.has(chunk.id)) {
          uniqueChunks.set(chunk.id, chunk);
        }
      }
    }

    // 转换为数组并按原始顺序排序（保持chunks数组的顺序）
    const chunkIds = Array.from(uniqueChunks.keys());
    const orderedChunks = chunkIds
      .map(id => uniqueChunks.get(id)!)
      .sort((a, b) => {
        const indexA = chunks.findIndex(c => c.id === a.id);
        const indexB = chunks.findIndex(c => c.id === b.id);
        return indexA - indexB;
      });

    return orderedChunks.slice(0, topK);
  }

  /**
   * 增强检索：结合query和student profile
   */
  rankChunksEnhanced(
    query: string,
    chunks: Chunk[],
    studentProfile?: Record<string, any>,
    topK: number = 6
  ): Chunk[] {
    // 基础查询
    const queries = [query];

    // 如果有学生档案，提取关键词作为额外查询
    if (studentProfile) {
      const profileText = JSON.stringify(studentProfile);
      const interests = studentProfile.interests || [];
      const experience = studentProfile.experience || [];

      queries.push(...interests);
      queries.push(...experience);
    }

    return this.rankChunksBatch(queries, chunks, topK);
  }
}

// 导出单例
export const retrievalService = new RetrievalService();

/**
 * 辅助函数：计算字符串相似度（用于评估）
 */
export function stringSimilarity(str1: string, str2: string): number {
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set(
    [...tokens1].filter(token => tokens2.has(token))
  );

  const union = new Set([...tokens1, ...tokens2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 辅助函数：提取文本中的关键词
 */
export function extractKeywords(text: string, topN: number = 10): string[] {
  const tokens = text.toLowerCase().match(/[a-z\u4e00-\u9fa5]{2,}/g) || [];

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([token]) => token);
}
