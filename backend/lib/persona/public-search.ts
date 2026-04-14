/**
 * 公共信息搜索服务
 * 整合Web搜索和OpenAlex学术搜索
 * 用于Persona构建时的公开资料搜集
 */

import { safeId } from './utils';
import type { Source } from './types';
import { getSearchService, type StandardizedSearchResult } from './web-search';
import { getOpenAlexClient, type OpenAlexAuthor } from './openalex';
import * as cheerio from 'cheerio';

/**
 * 搜索结果
 */
export interface PublicSearchResult {
  webResults: StandardizedSearchResult[];
  academicResults: Source[];
  author: OpenAlexAuthor | null;
  sourceCount: number;
}

/**
 * 内容抓取选项
 */
export interface FetchOptions {
  timeout?: number;
  maxLength?: number;
  followRedirects?: boolean;
}

/**
 * 公共搜索服务
 */
export class PublicSearchService {
  private webSearch = getSearchService();
  private openAlex = getOpenAlexClient();

  /**
   * 搜集导师的公开资料
   */
  async gatherPublicMaterials(params: {
    name: string;
    affiliation?: string;
    searchStrategy?: 'multi' | 'bing' | 'google' | 'duckduckgo';
    enableWebSearch?: boolean;
    enableOpenAlex?: boolean;
    maxWebResults?: number;
    maxAcademicResults?: number;
    fetchContent?: boolean;
  }): Promise<PublicSearchResult> {
    const {
      name,
      affiliation,
      searchStrategy = 'multi',
      enableWebSearch = true,
      enableOpenAlex = true,
      maxWebResults = 10,
      maxAcademicResults = 10,
      fetchContent = false
    } = params;

    const sources: Source[] = [];
    let author: OpenAlexAuthor | null = null;

    // 1. Web搜索
    let webResults: StandardizedSearchResult[] = [];
    if (enableWebSearch) {
      try {
        const query = this.webSearch.buildMentorSearchQuery(name, affiliation);
        webResults = await this.webSearch.searchMerged(query, maxWebResults, searchStrategy);

        console.log(`Found ${webResults.length} web results for ${name}`);
      } catch (error) {
        console.warn('Web search failed:', error);
      }
    }

    // 2. OpenAlex学术搜索
    if (enableOpenAlex) {
      try {
        const academicData = await this.openAlex.getAuthorResearchMaterials(
          name,
          affiliation,
          maxAcademicResults
        );

        author = academicData.author;
        sources.push(...academicData.sources);

        console.log(`Found ${academicData.sources.length} academic works for ${name}`);
      } catch (error) {
        console.warn('OpenAlex search failed:', error);
      }
    }

    // 3. 抓取Web内容
    if (fetchContent && webResults.length > 0) {
      const webSources = await this.fetchWebSources(webResults, {
        timeout: 10000,
        maxLength: 50000
      });
      sources.push(...webSources);
    }

    return {
      webResults,
      academicResults: sources,
      author,
      sourceCount: sources.length
    };
  }

  /**
   * 从搜索结果中抓取内容
   */
  private async fetchWebSources(
    results: StandardizedSearchResult[],
    options: FetchOptions = {}
  ): Promise<Source[]> {
    const {
      timeout = 10000,
      maxLength = 50000
    } = options;

    // 限制并发数量
    const concurrency = 3;
    const chunks: StandardizedSearchResult[][] = [];

    for (let i = 0; i < results.length; i += concurrency) {
      chunks.push(results.slice(i, i + concurrency));
    }

    const sources: Source[] = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(result =>
        this.fetchSingleSource(result, timeout, maxLength)
      );

      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          sources.push(result.value);
        }
      });
    }

    return sources;
  }

  /**
   * 抓取单个网页内容
   */
  private async fetchSingleSource(
    result: StandardizedSearchResult,
    timeout: number,
    maxLength: number
  ): Promise<Source | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(result.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ScholarBridge/1.0; +https://scholarbridge.edu)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Failed to fetch ${result.url}: ${response.status}`);
        return null;
      }

      const html = await response.text();

      // 使用cheerio解析HTML
      const $ = cheerio.load(html);

      // 移除脚本和样式
      $('script, style, nav, footer, header, iframe').remove();

      // 提取主要内容
      let content = '';

      // 尝试常见的内容容器
      const contentSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.content',
        '#content',
        '.post-content',
        '.entry-content',
        'body'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }

      // 清理内容
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // 限制长度
      if (content.length > maxLength) {
        content = content.substring(0, maxLength);
      }

      if (content.length < 100) {
        console.warn(`Content too short for ${result.url}`);
        return null;
      }

      return {
        id: safeId('web'),
        origin: 'public',
        kind: 'webpage',
        title: result.title || $('title').text() || 'Untitled',
        url: result.url,
        content,
        metadata: {
          fetchedAt: new Date().toISOString(),
          provider: result.source,
          snippet: result.snippet
        }
      };
    } catch (error) {
      console.warn(`Error fetching ${result.url}:`, error);
      return null;
    }
  }

  /**
   * 仅搜索（不抓取内容）
   */
  async searchOnly(params: {
    name: string;
    affiliation?: string;
    searchStrategy?: 'multi' | 'bing' | 'google' | 'duckduckgo';
    maxResults?: number;
  }): Promise<{
    webResults: StandardizedSearchResult[];
    author: OpenAlexAuthor | null;
  }> {
    const { name, affiliation, searchStrategy = 'multi', maxResults = 10 } = params;

    let webResults: StandardizedSearchResult[] = [];
    let author: OpenAlexAuthor | null = null;

    // Web搜索
    try {
      const query = this.webSearch.buildMentorSearchQuery(name, affiliation);
      webResults = await this.webSearch.searchMerged(query, maxResults, searchStrategy);
    } catch (error) {
      console.warn('Web search failed:', error);
    }

    // OpenAlex搜索（仅查找作者）
    try {
      author = await this.openAlex.findAuthorByName(name, affiliation);
    } catch (error) {
      console.warn('OpenAlex search failed:', error);
    }

    return {
      webResults,
      author
    };
  }
}

/**
 * 创建全局公共搜索服务实例
 */
let globalPublicSearchService: PublicSearchService | null = null;

export function getPublicSearchService(): PublicSearchService {
  if (!globalPublicSearchService) {
    globalPublicSearchService = new PublicSearchService();
  }
  return globalPublicSearchService;
}
