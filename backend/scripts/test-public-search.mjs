#!/usr/bin/env node

/**
 * Public Search Test Script
 * 测试公共信息搜索功能
 */

import { getSearchService } from '../lib/persona/web-search.js';
import { getOpenAlexClient } from '../lib/persona/openalex.js';
import { getPublicSearchService } from '../lib/persona/public-search.js';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function header(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

/**
 * 测试1: Web搜索服务
 */
async function testWebSearch() {
  header('Test 1: Web Search Service');

  const searchService = getSearchService();

  // 检查可用提供商
  const availableProviders = searchService.getAvailableProviders();
  info(`Available providers: ${availableProviders.join(', ') || 'none (check API keys)'}`);

  if (availableProviders.length === 0) {
    info('No search providers configured. Set BING_SEARCH_API_KEY or GOOGLE_SEARCH_API_KEY');
    info('DuckDuckGo will be used as fallback (no API key required)');
    return false;
  }

  // 测试搜索
  try {
    const query = 'Yann LeCun AI research';
    info(`Searching for: "${query}"`);

    const results = await searchService.searchMerged(query, 5, 'multi');

    if (results.length > 0) {
      success(`Found ${results.length} results`);
      results.slice(0, 3).forEach((result, i) => {
        info(`  ${i + 1}. ${result.title}`);
        info(`     ${result.url}`);
        info(`     ${result.snippet.substring(0, 100)}...`);
      });
      return true;
    } else {
      error('No results found');
      return false;
    }
  } catch (err) {
    error(`Search failed: ${err.message}`);
    return false;
  }
}

/**
 * 测试2: OpenAlex搜索
 */
async function testOpenAlex() {
  header('Test 2: OpenAlex Academic Search');

  const openAlex = getOpenAlexClient();

  // 检查配置
  if (!process.env.OPENALEX_EMAIL) {
    info('OPENALEX_EMAIL not set. Using default: noreply@scholarbridge.edu');
    info('Set your email for better rate limits: export OPENALEX_EMAIL=you@example.com');
  }

  try {
    // 查找知名学者
    const authorName = 'Yann LeCun';
    info(`Searching for author: "${authorName}"`);

    const author = await openAlex.findAuthorByName(authorName, 'Meta');

    if (author) {
      success(`Found author: ${author.display_name}`);
      info(`  ID: ${author.id}`);
      info(`  Institution: ${author.last_known_institution?.display_name || 'N/A'}`);
      info(`  Works count: ${author.works_count}`);
      info(`  Cited by: ${author.cited_by_count}`);
      info(`  H-index: ${author.h_index}`);

      // 获取作品
      const { results: works } = await openAlex.getAuthorWorks(author.id, {
        per_page: 3
      });

      info(`\n  Recent works:`);
      works.slice(0, 3).forEach((work, i) => {
        info(`    ${i + 1}. ${work.title}`);
        info(`       ${work.publication_year} · Cited: ${work.cited_by_count}`);
      });

      return true;
    } else {
      error('Author not found');
      return false;
    }
  } catch (err) {
    error(`OpenAlex search failed: ${err.message}`);
    return false;
  }
}

/**
 * 测试3: 集成公共搜索
 */
async function testIntegratedSearch() {
  header('Test 3: Integrated Public Search');

  const publicSearch = getPublicSearchService();

  try {
    info('Gathering public materials for Geoffrey Hinton...');

    const results = await publicSearch.gatherPublicMaterials({
      name: 'Geoffrey Hinton',
      affiliation: 'University of Toronto',
      enableWebSearch: true,
      enableOpenAlex: true,
      maxWebResults: 3,
      maxAcademicResults: 5,
      fetchContent: false  // 不抓取内容（更快）
    });

    success(`Gathered materials:`);
    info(`  Web results: ${results.webResults.length}`);
    info(`  Academic sources: ${results.academicResults.length}`);
    info(`  Total sources: ${results.sourceCount}`);

    if (results.author) {
      info(`\n  Author profile found:`);
      info(`    Name: ${results.author.display_name}`);
      info(`    H-index: ${results.author.h_index}`);
      info(`    Works: ${results.author.works_count}`);
    }

    if (results.academicResults.length > 0) {
      info(`\n  Sample academic sources:`);
      results.academicResults.slice(0, 2).forEach((source, i) => {
        info(`    ${i + 1}. ${source.title}`);
        info(`       Year: ${source.metadata?.publicationYear || 'N/A'}`);
        info(`       Citations: ${source.metadata?.citedByCount || 'N/A'}`);
      });
    }

    return true;
  } catch (err) {
    error(`Integrated search failed: ${err.message}`);
    return false;
  }
}

/**
 * 测试4: 搜索仅（不抓取内容）
 */
async function testSearchOnly() {
  header('Test 4: Search Only (No Content Fetching)');

  const publicSearch = getPublicSearchService();

  try {
    info('Quick search for Fei-Fei Li...');

    const results = await publicSearch.searchOnly({
      name: 'Fei-Fei Li',
      affiliation: 'Stanford University',
      maxResults: 5
    });

    success(`Search completed:`);
    info(`  Web results: ${results.webResults.length}`);

    if (results.webResults.length > 0) {
      info(`\n  Top web results:`);
      results.webResults.slice(0, 3).forEach((result, i) => {
        info(`    ${i + 1}. ${result.title}`);
        info(`       ${result.url}`);
      });
    }

    if (results.author) {
      info(`\n  Author found: ${results.author.display_name}`);
      info(`  Total works: ${results.author.works_count}`);
    }

    return true;
  } catch (err) {
    error(`Search only failed: ${err.message}`);
    return false;
  }
}

/**
 * 测试5: 内容抓取（可选）
 */
async function testContentFetching() {
  header('Test 5: Content Fetching (Optional)');

  const publicSearch = getPublicSearchService();

  try {
    info('Fetching content from search results...');

    const results = await publicSearch.gatherPublicMaterials({
      name: 'Andrew Ng',
      enableWebSearch: true,
      enableOpenAlex: false,  // 只测试web搜索抓取
      maxWebResults: 2,
      fetchContent: true
    });

    success(`Fetched content from web sources:`);
    info(`  Total sources with content: ${results.academicResults.length}`);

    const sourcesWithContent = results.academicResults.filter(s => s.content && s.content.length > 100);
    info(`  Sources with substantial content: ${sourcesWithContent.length}`);

    if (sourcesWithContent.length > 0) {
      info(`\n  Sample content:`);
      const source = sourcesWithContent[0];
      info(`    Title: ${source.title}`);
      info(`    URL: ${source.url}`);
      info(`    Content length: ${source.content.length} chars`);
      info(`    Preview: ${source.content.substring(0, 150)}...`);
    }

    return sourcesWithContent.length > 0;
  } catch (err) {
    error(`Content fetching failed: ${err.message}`);
    return false;
  }
}

/**
 * 主测试流程
 */
async function main() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║  Public Search Functionality Test Suite       ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');

  info('\nNote: Some tests require API keys:');
  info('  - Bing Search: BING_SEARCH_API_KEY');
  info('  - Google Search: GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX');
  info('  - OpenAlex: OPENALEX_EMAIL (optional, for better rate limits)');
  info('\nDuckDuckGo is used as fallback (no API key needed)');
  info('OpenAlex is free and does not require an API key\n');

  // 运行测试
  const results = {
    webSearch: false,
    openAlex: false,
    integratedSearch: false,
    searchOnly: false,
    contentFetching: false
  };

  try {
    results.webSearch = await testWebSearch();
    results.openAlex = await testOpenAlex();
    results.integratedSearch = await testIntegratedSearch();
    results.searchOnly = await testSearchOnly();
    results.contentFetching = await testContentFetching();

  } catch (err) {
    error(`Test execution failed: ${err.message}`);
  }

  // 总结
  header('Test Results Summary');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  log(`\nTotal: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');

  Object.entries(results).forEach(([test, passed]) => {
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    log(`${passed ? '✓' : '✗'} ${testName}`, passed ? 'green' : 'red');
  });

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else if (passedTests > 0) {
    log('\n⚠️  Some tests passed. Check configuration for failed tests.', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ All tests failed. Please check your configuration.', 'red');
    process.exit(1);
  }
}

// 运行测试
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
