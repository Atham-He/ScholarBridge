/**
 * OpenAlex API集成
 * 用于获取学术作者的出版物信息
 * OpenAlex是一个开放的学术引用数据库
 */

import type { Source } from './types';

/**
 * OpenAlex作者信息
 */
export interface OpenAlexAuthor {
  id: string;
  display_name: string;
  orcid?: string;
  last_known_institution?: {
    display_name: string;
    country_code: string;
  };
  works_api_url: string;
  works_count: number;
  cited_by_count: number;
  h_index: number;
  i10_index: number;
  summary_stats?: {
    twoYearMeanCitedness: number;
    h_index: number;
    i10_index: number;
  };
}

/**
 * OpenAlex作品信息
 */
export interface OpenAlexWork {
  id: string;
  title: string;
  publication_year: number;
  type: string;
  cited_by_count: number;
  primary_location?: {
    source?: {
      display_name: string;
      type: string;
      is_oa: boolean;
    };
  };
  authorships: Array<{
    author: {
      display_name: string;
      orcid?: string;
    };
    institutions?: Array<{
      display_name: string;
    }>;
  }>;
  open_access?: {
    is_oa: boolean;
    oa_url?: string;
  };
  best_oa_location?: {
    pdf_url?: string;
    landing_page_url?: string;
  };
  abstract?: string;  // 仅在包含abstract参数时返回
}

/**
 * OpenAlex搜索参数
 */
export interface OpenAlexSearchParams {
  mailto?: string; // OpenAlex要求提供email用于Polite Pool
  filter?: string[];
  sort?: string;
  per_page?: number;
  page?: number;
}

/**
 * OpenAlex API客户端
 */
export class OpenAlexClient {
  private baseUrl = 'https://api.openalex.org';
  private mailto: string;
  private userAgent: string;

  constructor(config: { mailto?: string } = {}) {
    this.mailto = config.mailto || process.env.OPENALEX_EMAIL || 'noreply@scholarbridge.edu';
    this.userAgent = `ScholarBridge/1.0 (mailto:${this.mailto})`;
  }

  /**
   * 构建API URL
   */
  private buildUrl(endpoint: string, params: OpenAlexSearchParams = {}): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // 添加User-Agent
    url.searchParams.set('mailto', this.mailto);

    // 添加filter
    if (params.filter && params.filter.length > 0) {
      url.searchParams.set('filter', params.filter.join(','));
    }

    // 添加sort
    if (params.sort) {
      url.searchParams.set('sort', params.sort);
    }

    // 添加per-page
    if (params.per_page) {
      url.searchParams.set('per-page', params.per_page.toString());
    }

    // 添加page
    if (params.page) {
      url.searchParams.set('page', params.page.toString());
    }

    return url.toString();
  }

  /**
   * 执行API请求
   */
  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 搜索作者
   */
  async searchAuthors(
    query: string,
    params: OpenAlexSearchParams = {}
  ): Promise<{ results: OpenAlexAuthor[]; meta: any }> {
    const url = this.buildUrl('/authors', {
      ...params,
      filter: params.filter || []
    });

    // 添加搜索过滤器
    const searchUrl = new URL(url);
    searchUrl.searchParams.set('search', query);

    return this.request(searchUrl.toString());
  }

  /**
   * 获取作者信息
   */
  async getAuthor(authorId: string): Promise<OpenAlexAuthor> {
    const url = this.buildUrl(`/authors/${authorId}`);
    return this.request<{ results: OpenAlexAuthor[] }>(url).then(data => data.results[0]);
  }

  /**
   * 获取作者的出版物
   */
  async getAuthorWorks(
    authorId: string,
    params: OpenAlexSearchParams = {}
  ): Promise<{ results: OpenAlexWork[]; meta: any }> {
    const defaultParams: OpenAlexSearchParams = {
      per_page: 50,
      sort: 'publication_year:desc',
      filter: [
        'type:article',
        'primary_location.source.type:journal'
      ]
    };

    const url = this.buildUrl(`/authors/${authorId}/works`, {
      ...defaultParams,
      ...params
    });

    return this.request(url);
  }

  /**
   * 搜索作品
   */
  async searchWorks(
    query: string,
    params: OpenAlexSearchParams = {}
  ): Promise<{ results: OpenAlexWork[]; meta: any }> {
    const defaultParams: OpenAlexSearchParams = {
      per_page: 50,
      sort: 'cited_by_count:desc',
      filter: ['type:article']
    };

    const url = this.buildUrl('/works', {
      ...defaultParams,
      ...params
    });

    const searchUrl = new URL(url);
    searchUrl.searchParams.set('search', query);

    return this.request(searchUrl.toString());
  }

  /**
   * 查找作者（通过名字和机构）
   */
  async findAuthorByName(
    name: string,
    institution?: string
  ): Promise<OpenAlexAuthor | null> {
    try {
      // 构建搜索查询
      let searchQuery = name;
      if (institution) {
        searchQuery = `${name} ${institution}`;
      }

      const { results } = await this.searchAuthors(searchQuery, {
        per_page: 5
      });

      if (results.length === 0) {
        return null;
      }

      // 如果有机构，优先选择匹配的作者
      if (institution) {
        const matched = results.find(author =>
          author.last_known_institution?.display_name
            .toLowerCase()
            .includes(institution.toLowerCase())
        );
        if (matched) {
          return matched;
        }
      }

      // 返回最相关的结果（works_count最多的）
      return results.sort((a, b) => b.works_count - a.works_count)[0];
    } catch (error) {
      console.error('Error finding author:', error);
      return null;
    }
  }

  /**
   * 将OpenAlex作品转换为Source格式
   */
  convertWorkToSource(work: OpenAlexWork, authorName: string): Source {
    // 构建摘要
    let content = `# ${work.title}\n\n`;

    if (work.abstract) {
      content += `## Abstract\n${work.abstract}\n\n`;
    }

    content += `## Publication Details\n`;
    content += `- **Year**: ${work.publication_year}\n`;
    content += `- **Type**: ${work.type}\n`;
    content += `- **Citations**: ${work.cited_by_count}\n`;

    if (work.primary_location?.source) {
      content += `- **Venue**: ${work.primary_location.source.display_name}\n`;
    }

    if (work.authorships && work.authorships.length > 0) {
      content += `\n## Authors\n`;
      work.authorships.forEach(a => {
        content += `- ${a.author.display_name}`;
        if (a.institutions && a.institutions.length > 0) {
          content += ` (${a.institutions.map(i => i.display_name).join(', ')})`;
        }
        content += '\n';
      });
    }

    if (work.open_access?.oa_url || work.best_oa_location?.landing_page_url) {
      content += `\n## Links\n`;
      if (work.open_access?.oa_url) {
        content += `- [Open Access](${work.open_access.oa_url})\n`;
      }
      if (work.best_oa_location?.landing_page_url) {
        content += `- [Publication Page](${work.best_oa_location.landing_page_url})\n`;
      }
    }

    return {
      id: `openalex_${work.id.replace(/^https?:\/\/openalex.org\//, '')}`,
      origin: 'public',
      kind: 'paper',
      title: work.title,
      url: work.best_oa_location?.landing_page_url || work.id,
      content,
      metadata: {
        fetchedAt: new Date().toISOString(),
        provider: 'openalex',
        publicationYear: work.publication_year,
        citedByCount: work.cited_by_count,
        venue: work.primary_location?.source?.display_name,
        authors: work.authorships?.map(a => a.author.display_name),
        openAccess: work.open_access?.is_oa,
        pdfUrl: work.best_oa_location?.pdf_url,
        oaUrl: work.open_access?.oa_url
      }
    };
  }

  /**
   * 批量获取作者的研究材料
   */
  async getAuthorResearchMaterials(
    name: string,
    institution?: string,
    maxWorks: number = 10
  ): Promise<{
    author: OpenAlexAuthor | null;
    sources: Source[];
  }> {
    // 查找作者
    const author = await this.findAuthorByName(name, institution);

    if (!author) {
      return {
        author: null,
        sources: []
      };
    }

    // 获取作品
    const { results: works } = await this.getAuthorWorks(author.id, {
      per_page: maxWorks
    });

    // 转换为Source格式
    const sources = works.map(work =>
      this.convertWorkToSource(work, author.display_name)
    );

    return {
      author,
      sources
    };
  }

  /**
   * 搜索相关研究（基于关键词）
   */
  async searchResearchByKeywords(
    keywords: string[],
    maxResults: number = 10
  ): Promise<Source[]> {
    const query = keywords.join(' ');
    const { results: works } = await this.searchWorks(query, {
      per_page: maxResults
    });

    return works.map(work =>
      this.convertWorkToSource(work, 'Various Authors')
    );
  }
}

/**
 * 创建全局OpenAlex客户端实例
 */
let globalOpenAlexClient: OpenAlexClient | null = null;

export function getOpenAlexClient(): OpenAlexClient {
  if (!globalOpenAlexClient) {
    globalOpenAlexClient = new OpenAlexClient({
      mailto: process.env.OPENALEX_EMAIL
    });
  }
  return globalOpenAlexClient;
}
