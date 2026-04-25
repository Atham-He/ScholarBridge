import { cleanText, decodeHtmlEntities, extractTitleFromHtml, firstSentences, nowIso, safeId, stripHtml, uniqueBy } from '../lib/utils.mjs';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';
const DEFAULT_SEARCH_PROVIDERS = ['bing', 'google'];
const ALL_SEARCH_PROVIDERS = ['bing', 'google', 'duckduckgo'];

const PINYIN_SYLLABLES = [
  'zhuang', 'chuang', 'shuang', 'zhong', 'chong', 'shang', 'cheng', 'chang', 'sheng', 'zhang',
  'xiang', 'huang', 'jiang', 'qiang', 'liang', 'wang', 'yang', 'yuan', 'zhai', 'chai',
  'shai', 'zhan', 'chan', 'shan', 'zhen', 'chen', 'shen', 'zhun', 'chun', 'shun',
  'zhua', 'chua', 'shua', 'zhuo', 'chuo', 'shuo', 'guang', 'kuang', 'xiong', 'iong',
  'ang', 'eng', 'ong', 'iao', 'ian', 'iang', 'uan', 'uang', 'uai', 'uei', 'jie',
  'jun', 'liu', 'tang', 'zhu', 'ui',
  'ai', 'an', 'ao', 'ba', 'bo', 'bi', 'bu', 'pa', 'po', 'pi', 'pu', 'ma', 'mo',
  'me', 'mi', 'mu', 'fa', 'fo', 'fu', 'de', 'di', 'du', 'ta', 'te', 'ti', 'tu',
  'na', 'ne', 'ni', 'nu', 'nv', 'la', 'le', 'li', 'lu', 'lv', 'ga', 'ge', 'gu',
  'ka', 'ke', 'ku', 'ha', 'he', 'hu', 'ji', 'ju', 'qi', 'qu', 'xi', 'xu', 'zhi',
  'chi', 'shi', 'ri', 'zi', 'ci', 'si', 'ya', 'ye', 'yi', 'yo', 'yu', 'wu', 'er',
  'a', 'o', 'e'
].sort((a, b) => b.length - a.length);

async function fetchText(url, timeoutMs) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchJson(url, timeoutMs, headers = {}) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'application/json,text/html;q=0.8,*/*;q=0.7',
      'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8',
      ...headers
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return response.json();
}

function makeSearchResult({ title, url, snippet = '', provider, query }) {
  return {
    title: cleanText(decodeHtmlEntities(stripHtml(title || '')), 300),
    url: decodeHtmlEntities(url || ''),
    snippet: cleanText(decodeHtmlEntities(stripHtml(snippet || '')), 800),
    provider,
    query
  };
}

function unwrapDuckDuckGoUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : parsed.href;
  } catch {
    return url;
  }
}

function unwrapGoogleUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url, 'https://www.google.com');
    if (parsed.pathname === '/url') {
      return parsed.searchParams.get('q') || parsed.searchParams.get('url') || parsed.href;
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function parseDuckDuckGoResults(html, limit, query) {
  const results = [];
  const blockRegex = /<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(html)) && results.length < limit) {
    const block = blockMatch[0];
    const link = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const snippet = block.match(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    results.push(makeSearchResult({
      title: link[2],
      url: unwrapDuckDuckGoUrl(link[1]),
      snippet: snippet?.[1] || '',
      provider: 'duckduckgo',
      query
    }));
  }

  if (!results.length) {
    const fallbackRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = fallbackRegex.exec(html)) && results.length < limit) {
      const url = unwrapDuckDuckGoUrl(match[1]);
      if (!/^https?:\/\//i.test(url || '')) continue;
      results.push(makeSearchResult({ title: match[2], url, provider: 'duckduckgo', query }));
    }
  }

  return uniqueBy(results.filter((item) => item.title && /^https?:\/\//i.test(item.url)), (item) => item.url).slice(0, limit);
}

function parseBingResults(html, limit, query) {
  const results = [];
  const regex = /<li[^>]+class="[^"]*b_algo[^"]*"[\s\S]*?<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = regex.exec(html)) && results.length < limit) {
    const snippet = match[3].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    results.push(makeSearchResult({
      title: match[2],
      url: match[1],
      snippet: snippet?.[1] || '',
      provider: 'bing',
      query
    }));
  }
  return uniqueBy(results.filter((item) => item.title && /^https?:\/\//i.test(item.url)), (item) => item.url).slice(0, limit);
}

function parseGoogleResults(html, limit, query) {
  const results = [];
  const regex = /<a[^>]+href="([^"]+)"[^>]*>\s*(?:<br>)?\s*<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) && results.length < limit) {
    const url = unwrapGoogleUrl(match[1]);
    if (!/^https?:\/\//i.test(url || '')) continue;
    if (/google\.(com|cn)\/search/i.test(url)) continue;
    results.push(makeSearchResult({
      title: match[2],
      url,
      provider: 'google',
      query
    }));
  }
  return uniqueBy(results.filter((item) => item.title), (item) => item.url).slice(0, limit);
}

async function searchDuckDuckGo(query, config, limit) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url, config.fetchTimeoutMs);
  return parseDuckDuckGoResults(html, limit, query);
}

async function searchBing(query, config, limit) {
  if (config.bingSearchApiKey) {
    const url = new URL(config.bingSearchEndpoint || 'https://api.bing.microsoft.com/v7.0/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(Math.min(10, Math.max(1, limit))));
    url.searchParams.set('mkt', 'en-US');
    url.searchParams.set('setLang', 'en-US');
    const data = await fetchJson(url.toString(), config.fetchTimeoutMs, {
      'Ocp-Apim-Subscription-Key': config.bingSearchApiKey
    });
    return (data.webPages?.value || []).slice(0, limit).map((item) => makeSearchResult({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      provider: 'bing-api',
      query
    }));
  }

  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${Math.min(10, Math.max(1, limit))}&mkt=en-US&setlang=en-US`;
  const html = await fetchText(url, config.fetchTimeoutMs);
  return parseBingResults(html, limit, query);
}

async function searchGoogle(query, config, limit) {
  if (config.googleSearchApiKey && config.googleSearchCx) {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', config.googleSearchApiKey);
    url.searchParams.set('cx', config.googleSearchCx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(10, Math.max(1, limit))));
    const data = await fetchJson(url.toString(), config.fetchTimeoutMs);
    return (data.items || []).slice(0, limit).map((item) => makeSearchResult({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      provider: 'google-cse',
      query
    }));
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${Math.min(10, Math.max(1, limit))}&hl=en`;
  const html = await fetchText(url, config.fetchTimeoutMs);
  return parseGoogleResults(html, limit, query);
}

function configuredSearchProviders(config) {
  const raw = String(config.webSearchProvider || 'multi').toLowerCase().trim();
  if (!raw || raw === 'none') return [];
  if (raw === 'multi') return DEFAULT_SEARCH_PROVIDERS;
  if (raw === 'all' || raw === 'html-all') return ALL_SEARCH_PROVIDERS;
  return uniqueBy(raw.split(',').map((item) => item.trim()).filter(Boolean), (item) => item);
}

export async function searchWeb(query, config, limit = 5) {
  const providers = configuredSearchProviders(config);
  const results = [];
  for (const provider of providers) {
    try {
      if (provider === 'duckduckgo') {
        results.push(...await searchDuckDuckGo(query, config, limit));
      } else if (provider === 'bing') {
        results.push(...await searchBing(query, config, limit));
      } else if (provider === 'google') {
        results.push(...await searchGoogle(query, config, limit));
      }
    } catch {
      // Search providers are best-effort; one failing provider should not block public collection.
    }
  }
  return uniqueBy(results, (item) => item.url).slice(0, limit);
}

export async function fetchWebPage(url, config, metadata = {}) {
  try {
    const html = await fetchText(url, config.fetchTimeoutMs);
    const title = extractTitleFromHtml(html) || metadata.title || url;
    const text = stripHtml(html);
    return {
      id: safeId('src'),
      origin: 'public',
      kind: metadata.kind || 'webpage',
      title,
      url,
      content: cleanText(text, 40000),
      metadata: {
        fetchedAt: nowIso(),
        provider: metadata.provider || null,
        query: metadata.query || null,
        searchSnippet: metadata.snippet || '',
        summary: firstSentences(text, 3)
      }
    };
  } catch {
    return null;
  }
}

function searchResultSource(result, kind = 'search_result') {
  return {
    id: safeId('src'),
    origin: 'public',
    kind,
    title: result.title || result.url,
    url: result.url,
    content: cleanText([
      `Title: ${result.title || ''}`,
      `URL: ${result.url || ''}`,
      `Snippet: ${result.snippet || ''}`,
      `Provider: ${result.provider || ''}`,
      `Query: ${result.query || ''}`
    ].join('\n'), 4000),
    metadata: {
      provider: result.provider || null,
      query: result.query || null,
      summary: result.snippet || result.title || ''
    }
  };
}

function canonicalScholarUrl(url) {
  try {
    const parsed = new URL(decodeHtmlEntities(url), 'https://scholar.google.com');
    const user = parsed.searchParams.get('user');
    if (!user) return '';
    return `https://scholar.google.com/citations?user=${encodeURIComponent(user)}&hl=en`;
  } catch {
    return '';
  }
}

function extractScholarProfileLinks(html) {
  const links = [];
  const hrefRegex = /href=["']([^"']*scholar\.google[^"']*citations\?[^"']*user=[^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html))) {
    const url = canonicalScholarUrl(decodeHtmlEntities(match[1]));
    if (url) links.push(url);
  }

  const relativeHrefRegex = /href=["'](\/citations\?[^"']*user=[^"']+)["']/gi;
  while ((match = relativeHrefRegex.exec(html))) {
    const url = canonicalScholarUrl(`https://scholar.google.com${decodeHtmlEntities(match[1])}`);
    if (url) links.push(url);
  }

  const textRegex = /https?:\/\/scholar\.google\.[^\s"'<>]+\/citations\?[^\s"'<>]*user=[^\s"'<>]+/gi;
  while ((match = textRegex.exec(html))) {
    const url = canonicalScholarUrl(match[0]);
    if (url) links.push(url);
  }

  return uniqueBy(links, (item) => item);
}

function scholarProfileHintSource({ url, title, provider, query, snippet, discoveredFrom }) {
  return searchResultSource({
    title: title || 'Google Scholar profile',
    url,
    provider: provider || 'scholar-discovery',
    query: query || '',
    snippet: [
      snippet || '',
      discoveredFrom ? `Discovered from: ${discoveredFrom}` : ''
    ].filter(Boolean).join('\n')
  }, 'scholar_profile_hint');
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}\s.-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function mentorTokens(mentor) {
  const nameTokens = normalizeText(mentor.name).split(/\s+/).filter((item) => item.length > 1);
  const affiliationTokens = normalizeText(mentor.affiliation).split(/\s+/).filter((item) => item.length > 2);
  return { nameTokens, affiliationTokens };
}

function institutionDomainHints(affiliation) {
  const text = normalizeText(affiliation);
  const hints = [];
  if (text.includes('tsinghua')) hints.push('tsinghua.edu.cn');
  if (text.includes('stanford')) hints.push('stanford.edu');
  if (text.includes('toronto')) hints.push('toronto.edu');
  if (text.includes('mit') || text.includes('massachusetts institute of technology')) hints.push('mit.edu');
  if (text.includes('berkeley')) hints.push('berkeley.edu');
  if (text.includes('carnegie mellon') || text.includes('cmu')) hints.push('cmu.edu');
  return hints;
}

function compactToken(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function pinyinInitials(value) {
  const token = compactToken(value);
  if (!token) return '';
  let rest = token;
  let initials = '';
  while (rest) {
    const syllable = PINYIN_SYLLABLES.find((item) => rest.startsWith(item));
    if (!syllable) {
      initials += rest[0];
      rest = rest.slice(1);
      continue;
    }
    initials += syllable[0];
    rest = rest.slice(syllable.length);
  }
  return initials || token[0] || '';
}

function homepageHandleCandidates(mentor) {
  const tokens = normalizeText(mentor.name).split(/\s+/).map(compactToken).filter(Boolean);
  if (!tokens.length) return [];

  const first = tokens[0] || '';
  const last = tokens[tokens.length - 1] || '';
  const given = tokens.slice(0, -1).join('');
  const joined = tokens.join('');
  const reversed = [...tokens].reverse().join('');
  const pinyinGivenInitials = tokens.slice(0, -1).map((token) => pinyinInitials(token)).join('');
  const allInitials = tokens.map((token) => pinyinInitials(token)).join('');

  return uniqueBy([
    joined,
    reversed,
    tokens.join('-'),
    [...tokens].reverse().join('-'),
    first,
    last,
    given,
    `${first}${last}`,
    `${last}${first}`,
    first && last ? `${first[0]}${last}` : '',
    first && last ? `${last}${first[0]}` : '',
    given && last ? `${last[0]}${pinyinGivenInitials}` : '',
    given && last ? `${last}${pinyinGivenInitials}` : '',
    allInitials
  ].filter(Boolean), (item) => item).slice(0, 16);
}

function institutionHomepageCandidateUrls(mentor) {
  const domains = institutionDomainHints(mentor.affiliation);
  const handles = homepageHandleCandidates(mentor);
  const urls = [];

  if (domains.includes('tsinghua.edu.cn')) {
    for (const handle of handles) {
      urls.push(
        `https://keg.cs.tsinghua.edu.cn/persons/${handle}/`,
        `https://nlp.csai.tsinghua.edu.cn/~${handle}/`,
        `https://nlp.csai.tsinghua.edu.cn/~${handle}/bio.html`,
        `https://ml.cs.tsinghua.edu.cn/~${handle}/`,
        `https://ml.cs.tsinghua.edu.cn/~${handle}/index.shtml`
      );
    }
  }

  for (const domain of domains) {
    for (const handle of handles.slice(0, 8)) {
      urls.push(
        `https://www.${domain}/~${handle}/`,
        `https://${domain}/~${handle}/`,
        `https://www.${domain}/people/${handle}/`,
        `https://${domain}/people/${handle}/`
      );
    }
  }

  return uniqueBy(urls, (item) => item).slice(0, 80);
}

function sourceMentionsMentor(source, mentor) {
  const { nameTokens } = mentorTokens(mentor);
  const haystack = normalizeText(`${source.title || ''} ${source.content || ''} ${source.url || ''}`);
  return nameTokens.length > 0 && nameTokens.every((token) => haystack.includes(token));
}

function sourceLooksLikeMentorHomepage(source, mentor) {
  const { nameTokens } = mentorTokens(mentor);
  if (!nameTokens.length) return false;
  const title = normalizeText(source.title || '');
  const earlyContent = normalizeText(String(source.content || '').slice(0, 3000));
  return nameTokens.every((token) => title.includes(token))
    || nameTokens.every((token) => earlyContent.includes(token));
}

async function discoverInstitutionHomepages(mentor, config) {
  const urls = institutionHomepageCandidateUrls(mentor);
  if (!urls.length) return [];
  const probeConfig = {
    ...config,
    fetchTimeoutMs: Math.min(Number(config.fetchTimeoutMs || 15000), 5000)
  };
  const pages = await Promise.all(urls.map(async (url) => fetchWebPage(url, probeConfig, {
    title: url,
    provider: 'institution-probe',
    query: `direct homepage probe for ${mentor.name}`,
    kind: 'webpage'
  })));
  return uniqueBy(
    pages.filter((page) => page?.content && sourceLooksLikeMentorHomepage(page, mentor)),
    (page) => page.url
  );
}

function scoreSearchResult(result, mentor) {
  const { nameTokens, affiliationTokens } = mentorTokens(mentor);
  const haystack = normalizeText(`${result.title} ${result.snippet} ${result.url}`);
  let score = 0;
  for (const token of nameTokens) {
    if (haystack.includes(token)) score += 4;
  }
  for (const token of affiliationTokens) {
    if (haystack.includes(token)) score += 2;
  }

  const url = String(result.url || '').toLowerCase();
  if (/scholar\.google\.[^/]+\/citations/.test(url)) score += 10;
  if (/\/~|faculty|people|profile|homepage|home-page|teacher|staff|lab/.test(url)) score += 5;
  if (/github|linkedin|twitter|x\.com|facebook|youtube|bilibili/.test(url)) score -= 6;
  for (const domain of institutionDomainHints(mentor.affiliation)) {
    if (url.includes(domain)) score += 8;
  }
  if (String(result.provider || '').startsWith('google')) score += 1;
  if (String(result.provider || '').startsWith('bing')) score += 1;
  return score;
}

function resultMatchesFullName(result, mentor) {
  const { nameTokens } = mentorTokens(mentor);
  const haystack = normalizeText(`${result.title} ${result.snippet} ${result.url}`);
  if (!nameTokens.length) return false;
  return nameTokens.every((token) => haystack.includes(token));
}

function resultMatchesInstitutionDomain(result, mentor) {
  const url = String(result.url || '').toLowerCase();
  return institutionDomainHints(mentor.affiliation).some((domain) => url.includes(domain));
}

function isScholarProfileResult(result) {
  return /scholar\.google\.[^/]+\/citations/i.test(String(result.url || ''));
}

function buildSearchQueries(mentor) {
  const name = String(mentor.name || '').trim();
  const affiliation = String(mentor.affiliation || '').trim();
  const primaryAffiliation = affiliation.split(',')[0] || affiliation;
  const domainHints = institutionDomainHints(affiliation);
  const queries = [
    `"${name}" "${affiliation}" official homepage`,
    `"${name}" "${primaryAffiliation}" homepage`,
    `"${name}" "${primaryAffiliation}" professor`,
    `${name} ${affiliation} official homepage`,
    `${name} ${affiliation} professor`,
    `${name} ${affiliation} lab research`,
    `${name} ${affiliation} Google Scholar`,
    `site:scholar.google.com/citations "${name}" "${primaryAffiliation}"`,
    `${name} Google Scholar citations`,
    `${name} research group`,
    `${name} publications`
  ];

  for (const domain of domainHints) {
    queries.unshift(`site:${domain} "${name}"`);
  }

  if (domainHints.includes('tsinghua.edu.cn')) {
    queries.unshift(
      `site:keg.cs.tsinghua.edu.cn "${name}"`,
      `site:nlp.csai.tsinghua.edu.cn "${name}"`,
      `site:ml.cs.tsinghua.edu.cn "${name}"`,
      `site:cs.tsinghua.edu.cn/csen/info "${name}"`
    );
  }

  return uniqueBy(queries.map((item) => item.trim()).filter(Boolean), (item) => item.toLowerCase());
}

function buildScholarDiscoveryQueries(mentor) {
  const name = String(mentor.name || '').trim();
  const affiliation = String(mentor.affiliation || '').split(',')[0].trim();
  return uniqueBy([
    `site:scholar.google.com/citations "${name}" "${affiliation}"`,
    `"${name}" "${affiliation}" "Google Scholar" "citations"`,
    `"${name}" "${affiliation}" "scholar.google.com/citations"`,
    `site:research.com/u "${name}" "${affiliation}"`,
    `site:adscientificindex.com/scientist "${name}" "${affiliation}"`,
    `"${name}" "${affiliation}" "AD Scientific Index" "Google Scholar"`,
    `"${name}" "${affiliation}" "Research.com" "Google Scholar"`
  ].filter(Boolean), (item) => item.toLowerCase());
}

function shouldKeepSearchResult(result, mentor) {
  const url = String(result.url || '').toLowerCase();
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\/search\?|\/preferences\?|\/settings\?/.test(url)) return false;
  if (!resultMatchesFullName(result, mentor) && !resultMatchesInstitutionDomain(result, mentor) && !isScholarProfileResult(result)) {
    return false;
  }
  return scoreSearchResult(result, mentor) >= 8;
}

function shouldAddFallbackSource(result, mentor) {
  return isScholarProfileResult(result) || scoreSearchResult(result, mentor) >= 14;
}

function buildDirectScholarAuthorQueries(mentor) {
  const name = String(mentor.name || '').trim();
  const affiliation = String(mentor.affiliation || '').split(',')[0].trim();
  return uniqueBy([
    `${name} ${affiliation}`.trim(),
    `"${name}" ${affiliation}`.trim(),
    name
  ].filter(Boolean), (item) => item.toLowerCase());
}

function parseScholarAuthorSearch(html, mentor, query) {
  const hints = [];
  const profileLinks = extractScholarProfileLinks(html);
  for (const url of profileLinks) {
    hints.push(scholarProfileHintSource({
      url,
      title: `Google Scholar profile for ${mentor.name}`,
      provider: 'google-scholar',
      query,
      snippet: cleanText(stripHtml(html), 1200)
    }));
  }
  return hints;
}

async function fetchDirectScholarProfiles(mentor, config) {
  const hints = [];
  const scholarConfig = {
    ...config,
    fetchTimeoutMs: Math.min(Number(config.fetchTimeoutMs || 15000), 5000)
  };
  for (const query of buildDirectScholarAuthorQueries(mentor)) {
    const url = `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(query)}&hl=en`;
    try {
      const html = await fetchText(url, scholarConfig.fetchTimeoutMs);
      hints.push(...parseScholarAuthorSearch(html, mentor, query));
    } catch {
      // Google Scholar often returns 403/captcha/timeouts for scripted requests.
    }
  }
  return uniqueBy(hints, (item) => item.url);
}

async function discoverScholarProfiles(mentor, config, existingSearchResults = []) {
  const hints = [];
  hints.push(...await fetchDirectScholarProfiles(mentor, config));

  for (const result of existingSearchResults) {
    if (isScholarProfileResult(result)) {
      hints.push(scholarProfileHintSource({
        url: canonicalScholarUrl(result.url) || result.url,
        title: result.title,
        provider: result.provider,
        query: result.query,
        snippet: result.snippet
      }));
    }
  }

  const discoveryQueries = buildScholarDiscoveryQueries(mentor);
  const searchResults = [];
  for (const query of discoveryQueries) {
    searchResults.push(...await searchWeb(query, config, 8));
  }

  const candidates = uniqueBy([...existingSearchResults, ...searchResults], (item) => item.url)
    .filter((result) => {
      const url = String(result.url || '').toLowerCase();
      return isScholarProfileResult(result)
        || /research\.com\/u\//i.test(url)
        || /adscientificindex\.com\/scientist/i.test(url)
        || /scholar\.google/i.test(`${url} ${result.snippet || ''}`);
    })
    .filter((result) => resultMatchesFullName(result, mentor) || resultMatchesInstitutionDomain(result, mentor) || isScholarProfileResult(result))
    .slice(0, 8);

  for (const result of candidates) {
    if (isScholarProfileResult(result)) {
      hints.push(scholarProfileHintSource({
        url: canonicalScholarUrl(result.url) || result.url,
        title: result.title,
        provider: result.provider,
        query: result.query,
        snippet: result.snippet
      }));
      continue;
    }

    try {
      const html = await fetchText(result.url, config.fetchTimeoutMs);
      for (const scholarUrl of extractScholarProfileLinks(html)) {
        hints.push(scholarProfileHintSource({
          url: scholarUrl,
          title: `Google Scholar profile for ${mentor.name}`,
          provider: result.provider || 'scholar-discovery',
          query: result.query,
          snippet: result.snippet,
          discoveredFrom: result.url
        }));
      }
    } catch {
      // Third-party index pages are optional discovery hints.
    }
  }

  return uniqueBy(hints, (item) => item.url);
}

function scoreAuthorCandidate(author, mentor) {
  const name = normalizeText(mentor.name);
  const nameTokens = name.split(/\s+/).filter(Boolean);
  const firstName = nameTokens[0] || '';
  const lastName = nameTokens[nameTokens.length - 1] || '';
  const affiliation = normalizeText(mentor.affiliation);
  const display = normalizeText(author.display_name);
  let score = 0;
  if (firstName && display.includes(firstName)) score += 2;
  if (lastName && display.includes(lastName)) score += 4;
  if (name && display === name) score += 4;
  if (firstName && lastName && display.includes(firstName) && display.includes(lastName)) score += 6;
  const institutions = [
    ...(author.affiliations || []).map((item) => item.institution?.display_name),
    ...(author.last_known_institutions || []).map((item) => item.display_name)
  ]
    .map((item) => normalizeText(item))
    .join(' ');
  if (affiliation && institutions.includes(affiliation)) score += 4;
  score += Math.min(12, Math.log10(Number(author.works_count || 0) + 1) * 4);
  return score;
}

function openAlexShortId(id) {
  return String(id || '').split('/').filter(Boolean).pop() || id;
}

function authorSearchQueries(mentor) {
  const name = String(mentor.name || '').trim();
  const affiliation = String(mentor.affiliation || '').trim();
  return uniqueBy([
    `${name} ${affiliation}`.trim(),
    name
  ].filter(Boolean), (item) => item.toLowerCase());
}

export async function fetchOpenAlexAuthorAndWorks(mentor, config) {
  try {
    let results = [];
    let matchedQuery = '';
    for (const query of authorSearchQueries(mentor)) {
      const authorUrl = `https://api.openalex.org/authors?search=${encodeURIComponent(query)}&per-page=10`;
      const authorData = JSON.parse(await fetchText(authorUrl, config.fetchTimeoutMs));
      results = authorData.results || [];
      matchedQuery = query;
      if (results.length) break;
    }
    if (!results.length) return [];

    const author = [...results].sort((a, b) => scoreAuthorCandidate(b, mentor) - scoreAuthorCandidate(a, mentor))[0];
    const authorId = openAlexShortId(author.id);
    const sources = [{
      id: safeId('src'),
      origin: 'public',
      kind: 'author_profile',
      title: `OpenAlex author profile: ${author.display_name}`,
      url: author.id,
      content: cleanText(JSON.stringify({
        display_name: author.display_name,
        works_count: author.works_count,
        cited_by_count: author.cited_by_count,
        summary_stats: author.summary_stats,
        affiliations: author.affiliations,
        last_known_institutions: author.last_known_institutions,
        topics: author.x_concepts || author.topics || []
      }, null, 2), 20000),
      metadata: { provider: 'openalex', authorId: author.id, matchedQuery }
    }];

    const worksUrl = `https://api.openalex.org/works?filter=author.id:${encodeURIComponent(authorId)}&sort=cited_by_count:desc&per-page=${config.maxPapers}`;
    const worksData = JSON.parse(await fetchText(worksUrl, config.fetchTimeoutMs));
    for (const work of worksData.results || []) {
      const abstract = work.abstract_inverted_index
        ? Object.entries(work.abstract_inverted_index)
            .flatMap(([token, positions]) => positions.map((position) => [position, token]))
            .sort((a, b) => a[0] - b[0])
            .map(([, token]) => token)
            .join(' ')
        : '';
      sources.push({
        id: safeId('src'),
        origin: 'public',
        kind: 'paper',
        title: work.title || 'Untitled work',
        url: work.id || work.primary_location?.landing_page_url || '',
        content: cleanText([
          work.title,
          abstract,
          work.authorships?.map((item) => item.author?.display_name).join(', '),
          work.primary_location?.source?.display_name,
          work.publication_year,
          JSON.stringify(work.keywords || [])
        ].filter(Boolean).join('\n\n'), 20000),
        metadata: {
          provider: 'openalex',
          publicationYear: work.publication_year,
          citedByCount: work.cited_by_count
        }
      });
    }

    return sources;
  } catch {
    return [];
  }
}

export async function collectPublicSources({ mentor, publicUrls = [], config, skipPublicSearch = false, disableOpenAlex = false }) {
  const sources = [];
  const searchResults = [];

  if (!skipPublicSearch) {
    const queries = buildSearchQueries(mentor);
    const perQueryLimit = Math.max(3, Math.ceil(config.maxPublicPages / 2));
    for (const query of queries) {
      const results = await searchWeb(query, config, perQueryLimit);
      searchResults.push(...results);
    }
    sources.push(...await discoverInstitutionHomepages(mentor, config));
  }

  const rankedSearchResults = uniqueBy(searchResults, (item) => item.url)
    .filter((item) => shouldKeepSearchResult(item, mentor))
    .map((item) => ({ ...item, score: scoreSearchResult(item, mentor) }))
    .sort((a, b) => b.score - a.score);

  const candidateUrls = uniqueBy(
    [
      ...publicUrls.map((url) => ({ title: url, url, provider: 'user', query: 'manual url', snippet: '', score: 100 })),
      ...rankedSearchResults
    ],
    (item) => item.url
  ).slice(0, config.maxPublicPages);

  for (const item of candidateUrls) {
    const page = await fetchWebPage(item.url, config, {
      title: item.title,
      provider: item.provider,
      query: item.query,
      snippet: item.snippet,
      kind: /scholar\.google\.[^/]+\/citations/i.test(item.url) ? 'scholar_profile' : 'webpage'
    });
    if (page?.content) {
      sources.push(page);
    } else if (shouldAddFallbackSource(item, mentor)) {
      sources.push(searchResultSource(item, /scholar\.google\.[^/]+\/citations/i.test(item.url) ? 'scholar_profile_hint' : 'search_result'));
    }
  }

  if (!skipPublicSearch && !sources.some((source) => /scholar_profile/i.test(source.kind || ''))) {
    sources.push(...await discoverScholarProfiles(mentor, config, rankedSearchResults));
  }

  if (!disableOpenAlex) {
    sources.push(...await fetchOpenAlexAuthorAndWorks(mentor, config));
  }

  return uniqueBy(sources, (item) => item.url || item.title || item.id);
}
