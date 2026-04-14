/**
 * Web搜索服务
 * 支持多种搜索提供商：Bing, Google, DuckDuckGo
 * 用于自动搜集导师的公开资料
 */

import type { PublicSearchResult } from './types';

/**
 * 搜索提供商配置
 */
export interface SearchProviderConfig {
  apiKey?: string;
  endpoint?: string;
  cx?: string; // For Google Custom Search
}

/**
 * 搜索结果标准化格式
 */
export interface StandardizedSearchResult {
  url: string;
  title: string;
  snippet: string;
  source: 'bing' | 'google' | 'duckduckgo';
  publishedDate?: string;
  author?: string;
}

/**
 * Bing搜索提供商
 */
export class BingSearchProvider {
  private apiKey: string;
  private endpoint = 'https://api.bing.microsoft.com/v7.0/search';

  constructor(config: SearchProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Bing API key is required');
    }
    this.apiKey = config.apiKey;
  }

  async search(query: string, count: number = 10): Promise<StandardizedSearchResult[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', count.toString());
    url.searchParams.set('safeSearch', 'Strict');

    const response = await fetch(url.toString(), {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Bing search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.webPages?.value || []).map((item: any) => ({
      url: item.url,
      title: item.name,
      snippet: item.snippet,
      source: 'bing' as const
    }));
  }
}

/**
 * Google搜索提供商
 */
export class GoogleSearchProvider {
  private apiKey: string;
  private cx: string;
  private endpoint = 'https://www.googleapis.com/customsearch/v1';

  constructor(config: SearchProviderConfig) {
    if (!config.apiKey || !config.cx) {
      throw new Error('Google API key and CX are required');
    }
    this.apiKey = config.apiKey;
    this.cx = config.cx;
  }

  async search(query: string, count: number = 10): Promise<StandardizedSearchResult[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('cx', this.cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', count.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.items || []).map((item: any) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet,
      source: 'google' as const
    }));
  }
}

/**
 * DuckDuckGo搜索提供商 (无需API key)
 */
export class DuckDuckGoSearchProvider {
  private endpoint = 'https://html.duckduckgo.com/html/';

  async search(query: string, count: number = 10): Promise<StandardizedSearchResult[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set('q', query);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScholarBridge/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }

    const html = await response.text();

    // 解析HTML结果 (简化版，实际应使用cheerio)
    const results: StandardizedSearchResult[] = [];

    // DuckDuckGo HTML解析逻辑
    // 注意：这是一个简化的实现，实际应该使用更强大的HTML解析
    const resultRegex = /<a[^>]*class="result__url"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>.*?<a[^>]*class="result__title"[^>]*>([^<]+)<\/a>.*?<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/gs;

    let match;
    let found = 0;
    while ((match = resultRegex.exec(html)) !== null && found < count) {
      results.push({
        url: match[1],
        title: match[3],
        snippet: match[4].replace(/<[^>]+>/g, ''),
        source: 'duckduckgo'
      });
      found++;
    }

    return results;
  }
}

/**
 * 多提供商搜索服务
 */
export class WebSearchService {
  private providers: Map<string, BingSearchProvider | GoogleSearchProvider | DuckDuckGoSearchProvider>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Bing
    if (process.env.BING_SEARCH_API_KEY) {
      this.providers.set('bing', new BingSearchProvider({
        apiKey: process.env.BING_SEARCH_API_KEY
      }));
    }

    // Google
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
      this.providers.set('google', new GoogleSearchProvider({
        apiKey: process.env.GOOGLE_SEARCH_API_KEY,
        cx: process.env.GOOGLE_SEARCH_CX
      }));
    }

    // DuckDuckGo (总是可用，无需API key)
    this.providers.set('duckduckgo', new DuckDuckGoSearchProvider());
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 使用指定提供商搜索
   */
  async searchWithProvider(
    provider: string,
    query: string,
    count: number = 10
  ): Promise<StandardizedSearchResult[]> {
    const searchProvider = this.providers.get(provider);

    if (!searchProvider) {
      throw new Error(`Search provider '${provider}' is not available`);
    }

    return searchProvider.search(query, count);
  }

  /**
   * 使用所有可用提供商搜索
   */
  async searchAll(
    query: string,
    count: number = 10
  ): Promise<Map<string, StandardizedSearchResult[]>> {
    const results = new Map<string, StandardizedSearchResult[]>();

    const searchPromises = Array.from(this.providers.entries()).map(
      async ([name, provider]) => {
        try {
          const results = await provider.search(query, count);
          return [name, results];
        } catch (error) {
          console.warn(`Search with ${name} failed:`, error);
          return [name, []];
        }
      }
    );

    const settled = await Promise.all(searchPromises);
    settled.forEach(([name, results]) => {
      results.set(name as string, results as StandardizedSearchResult[]);
    });

    return results;
  }

  /**
   * 合并多个提供商的结果并去重
   */
  async searchMerged(
    query: string,
    count: number = 10,
    strategy: 'multi' | 'bing' | 'google' | 'duckduckgo' = 'multi'
  ): Promise<StandardizedSearchResult[]> {
    if (strategy === 'multi') {
      const allResults = await this.searchAll(query, Math.ceil(count / this.providers.size));

      // 合并结果
      const merged: StandardizedSearchResult[] = [];
      const seenUrls = new Set<string>();

      for (const results of allResults.values()) {
        for (const result of results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            merged.push(result);

            if (merged.length >= count) {
              break;
            }
          }
        }
        if (merged.length >= count) {
          break;
        }
      }

      return merged;
    } else {
      return this.searchWithProvider(strategy, query, count);
    }
  }

  /**
   * 构建导师搜索查询
   */
  buildMentorSearchQuery(name: string, affiliation?: string): string {
    const terms = [];

    // 添加名字
    terms.push(`"${name}"`);

    // 添加机构
    if (affiliation) {
      terms.push(affiliation);
    }

    // 添加学术相关关键词
    terms.push('research', 'publications', 'scholar');

    return terms.join(' ');
  }
}

/**
 * 创建全局搜索服务实例
 */
let globalSearchService: WebSearchService | null = null;

export function getSearchService(): WebSearchService {
  if (!globalSearchService) {
    globalSearchService = new WebSearchService();
  }
  return globalSearchService;
}
