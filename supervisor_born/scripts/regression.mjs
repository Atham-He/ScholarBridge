import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { createLlmProvider } from '../src/providers/llm.mjs';
import { parseUploadFiles } from '../src/parsers.mjs';
import { collectPublicSources, fetchOpenAlexAuthorAndWorks } from '../src/providers/public.mjs';
import { FsStore } from '../src/storage.mjs';
import { buildPersonaWorkflow } from '../src/workflows/buildPersona.mjs';
import { updatePersonaWorkflow, mergeSources } from '../src/workflows/updatePersona.mjs';
import { chatPersonaWorkflow } from '../src/workflows/chatPersona.mjs';
import { evaluateStudentWorkflow } from '../src/workflows/evaluateStudent.mjs';
import { readJson } from '../src/lib/utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));

async function tempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function testUploadDescriptorFallback() {
  const dir = await tempDir('sb-upload-');
  const noExt = path.join(dir, 'multer-temp-name');
  await fs.copyFile(path.join(projectRoot, 'examples/uploads/mentor_bio.txt'), noExt);
  const docs = await parseUploadFiles([{
    path: noExt,
    originalName: 'mentor_bio.txt',
    mimeType: 'text/plain'
  }], { kind: 'mock', supportsVision: false });
  assert.equal(docs.length, 1);
  assert.equal(docs[0].title, 'mentor_bio.txt');
  assert.equal(docs[0].kind, 'upload_text');
}

async function testDeepSeekTextOnlyImageFallback() {
  const dir = await tempDir('sb-image-');
  const pngPath = path.join(dir, 'tiny-upload');
  await fs.writeFile(
    pngPath,
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64')
  );
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir: await tempDir('sb-deepseek-config-'),
    llmProvider: 'deepseek',
    openaiApiKey: 'not-used-in-this-test'
  });
  const provider = createLlmProvider(config);
  assert.equal(provider.kind, 'deepseek');
  assert.equal(provider.supportsVision, false);
  const docs = await parseUploadFiles([{
    path: pngPath,
    originalName: 'tiny.png',
    mimeType: 'image/png'
  }], provider);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].kind, 'upload_image');
  assert.match(docs[0].content, /Vision model unavailable|text-only/);
}

function crc32(buffer) {
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let c = 0xffffffff;
  for (const byte of buffer) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = 0x5b21;

  for (const [name, content] of entries) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, buffer) => sum + buffer.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function makeMinimalDocx(text) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const docXml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${escaped}</w:t></w:r></w:p></w:body></w:document>`;
  return zipStore([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'],
    ['word/document.xml', docXml]
  ]);
}

function makeMinimalPdf(text) {
  const safe = text.replace(/[()\\]/g, ' ');
  const stream = `BT /F1 24 Tf 72 720 Td (${safe}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function testDocumentUploadFallbackParsers() {
  const dir = await tempDir('sb-doc-upload-');
  const docxPath = path.join(dir, 'mentor_notes.docx');
  const pdfPath = path.join(dir, 'mentor_notes.pdf');
  await fs.writeFile(docxPath, makeMinimalDocx('DOCX mentor values Bayesian modeling and clear experiments.'));
  await fs.writeFile(pdfPath, makeMinimalPdf('PDF mentor values robust evaluation.'));

  const docs = await parseUploadFiles([docxPath, pdfPath], { kind: 'mock', supportsVision: false });
  const docx = docs.find((item) => item.kind === 'upload_docx');
  const pdf = docs.find((item) => item.kind === 'upload_pdf');
  assert.match(docx?.content || '', /Bayesian modeling/);
  assert.match(pdf?.content || '', /robust evaluation/);
}

async function testMockWorkflow() {
  const dataDir = await tempDir('sb-workflow-');
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir,
    llmProvider: 'mock'
  });
  const store = new FsStore(config);
  const llmProvider = createLlmProvider(config);
  const build = await buildPersonaWorkflow({
    input: {
      name: 'Regression Mentor',
      affiliation: 'Regression University',
      authorizedBy: 'regression',
      publicUrls: [],
      uploadPaths: [
        path.join(projectRoot, 'examples/uploads/mentor_bio.txt'),
        path.join(projectRoot, 'examples/uploads/project_brief.md')
      ],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });
  assert.equal(build.sourceCount, 2);
  assert.ok(build.chunkCount >= 1);

  const studentProfile = await readJson(path.join(projectRoot, 'examples/student_profile.json'));
  const chat = await chatPersonaWorkflow({
    slugOrName: build.slug,
    message: 'What should I prepare first?',
    studentProfile,
    store,
    llmProvider
  });
  assert.ok(chat.answer);
  assert.ok(chat.citations.length >= 1);

  const evaluation = await evaluateStudentWorkflow({
    slugOrName: build.slug,
    studentProfile,
    sessionId: chat.sessionId,
    store,
    llmProvider
  });
  assert.ok(['do_not_progress', 'needs_human_review', 'recommend_interview', 'strong_recommendation'].includes(evaluation.recommendation));
  assert.ok(evaluation.evidenceBreakdown);
}

async function testBuildWorkflowWithUploadDescriptor() {
  const uploadDir = await tempDir('sb-build-upload-');
  const noExt = path.join(uploadDir, 'multer-temp-name');
  await fs.copyFile(path.join(projectRoot, 'examples/uploads/mentor_bio.txt'), noExt);
  const dataDir = await tempDir('sb-build-descriptor-');
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir,
    llmProvider: 'mock'
  });
  const store = new FsStore(config);
  const llmProvider = createLlmProvider(config);
  const build = await buildPersonaWorkflow({
    input: {
      name: 'Descriptor Upload Mentor',
      affiliation: 'Regression University',
      authorizedBy: 'regression',
      publicUrls: [],
      uploadPaths: [{
        path: noExt,
        originalName: 'mentor_bio.txt',
        mimeType: 'text/plain'
      }],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });
  assert.equal(build.sourceCount, 1);
  assert.equal(build.uploadSourceCount, 1);
  const sources = await readJson(path.join(dataDir, 'personas', build.slug, 'sources.json'), []);
  assert.equal(sources[0].title, 'mentor_bio.txt');
  assert.equal(sources[0].kind, 'upload_text');
}

async function testCreateGeneratesUniqueSlugs() {
  const dataDir = await tempDir('sb-create-unique-');
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir,
    llmProvider: 'mock'
  });
  const store = new FsStore(config);
  const llmProvider = createLlmProvider(config);
  const input = {
    name: 'Same Name Mentor',
    affiliation: 'Regression University',
    authorizedBy: 'regression',
    publicUrls: [],
    uploadPaths: [path.join(projectRoot, 'examples/uploads/mentor_bio.txt')],
    skipPublicSearch: true,
    disableOpenAlex: true
  };

  const first = await buildPersonaWorkflow({ input, config, store, llmProvider });
  const second = await buildPersonaWorkflow({ input, config, store, llmProvider });

  assert.notEqual(first.slug, second.slug);
  assert.match(first.slug, /^same-name-mentor-regression-university-[a-f0-9]{8}$/);
  assert.match(second.slug, /^same-name-mentor-regression-university-[a-f0-9]{8}$/);
  assert.ok(await readJson(path.join(dataDir, 'personas', first.slug, 'persona.json')));
  assert.ok(await readJson(path.join(dataDir, 'personas', second.slug, 'persona.json')));
  await assert.rejects(
    () => chatPersonaWorkflow({
      slugOrName: 'Same Name Mentor',
      message: 'Will this resolve by name?',
      store,
      llmProvider
    }),
    /invalid slug|Persona not found/
  );
}

async function testUpdatePersonaMergesOnlyTargetSlug() {
  const dataDir = await tempDir('sb-update-target-');
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir,
    llmProvider: 'mock'
  });
  const store = new FsStore(config);
  const llmProvider = createLlmProvider(config);

  const first = await buildPersonaWorkflow({
    input: {
      name: 'Jun Zhu',
      affiliation: 'Tsinghua University',
      authorizedBy: 'regression',
      publicUrls: [],
      uploadPaths: [path.join(projectRoot, 'examples/uploads/mentor_bio.txt')],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });
  const second = await buildPersonaWorkflow({
    input: {
      name: 'Jun Zhu',
      affiliation: 'Tsinghua University',
      authorizedBy: 'regression',
      publicUrls: [],
      uploadPaths: [path.join(projectRoot, 'examples/uploads/project_brief.md')],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });

  const secondSourcesBefore = await readJson(path.join(dataDir, 'personas', second.slug, 'sources.json'), []);
  const update = await updatePersonaWorkflow({
    slug: first.slug,
    input: {
      projectText: 'New update evidence: this agent should discuss diffusion planning.',
      publicUrls: [],
      uploadPaths: [],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });

  assert.equal(update.slug, first.slug);
  assert.notEqual(first.slug, second.slug);
  assert.equal(update.sourceCount, 2);
  const firstSources = await readJson(path.join(dataDir, 'personas', first.slug, 'sources.json'), []);
  const secondSourcesAfter = await readJson(path.join(dataDir, 'personas', second.slug, 'sources.json'), []);
  assert.ok(firstSources.some((source) => /diffusion planning/i.test(source.content || '')));
  assert.deepEqual(secondSourcesAfter, secondSourcesBefore);

  await chatPersonaWorkflow({
    slugOrName: first.slug,
    sessionId: 'same-session',
    message: 'What should I prepare?',
    store,
    llmProvider
  });
  await chatPersonaWorkflow({
    slugOrName: second.slug,
    sessionId: 'same-session',
    message: 'What should I prepare?',
    store,
    llmProvider
  });
  assert.ok(await readJson(path.join(dataDir, 'personas', first.slug, 'sessions', 'same-session.json')));
  assert.ok(await readJson(path.join(dataDir, 'personas', second.slug, 'sessions', 'same-session.json')));
}

async function testLegacySlugUpdateCompatibility() {
  const dataDir = await tempDir('sb-legacy-update-');
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir,
    llmProvider: 'mock'
  });
  const store = new FsStore(config);
  const llmProvider = createLlmProvider(config);
  const legacySlug = 'geoffrey-hinton';
  const source = {
    id: 'legacy_src',
    origin: 'upload',
    kind: 'upload_text',
    title: 'legacy.txt',
    content: 'Legacy source about representation learning.'
  };
  await store.savePersonaBundle({
    input: {
      name: 'Geoffrey Hinton',
      affiliation: 'University of Toronto',
      authorizedBy: 'regression',
      publicUrls: [],
      uploadPaths: []
    },
    sources: [source],
    chunks: [],
    persona: {
      version: '0.1.0',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      mentor: {
        name: 'Geoffrey Hinton',
        slug: legacySlug,
        affiliation: 'University of Toronto',
        title: 'Professor'
      },
      authorization: {
        authorized: true,
        authorizedBy: 'regression',
        consentNotes: ''
      },
      overview: 'Legacy persona.',
      researchTopics: [],
      methods: [],
      communicationStyle: { voiceSummary: 'direct' },
      provenance: { sourceCount: 1, topSources: ['legacy_src'] }
    },
    agentCard: '# Legacy'
  });

  const update = await updatePersonaWorkflow({
    slug: legacySlug,
    input: {
      projectText: 'New update evidence for legacy slug compatibility.',
      publicUrls: [],
      uploadPaths: [],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });
  assert.equal(update.slug, legacySlug);
  assert.equal(update.sourceCount, 2);
  assert.ok(await readJson(path.join(dataDir, 'personas', legacySlug, 'persona.json')));
}

async function testMergeSourcesDeduplicatesByUrlAndPath() {
  const sharedPath = path.join(os.tmpdir(), 'shared-source.txt');
  const merged = mergeSources([
    { id: 'old_url', url: 'https://example.edu/page#section', title: 'old', content: 'old' },
    { id: 'old_file', filePath: sharedPath, title: 'old file', content: 'old file' }
  ], [
    { id: 'new_url', url: 'https://example.edu/page', title: 'new', content: 'new' },
    { id: 'new_file', filePath: sharedPath, title: 'new file', content: 'new file' }
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'old_url');
  assert.equal(merged[1].id, 'old_file');
}

async function testOpenAlexFallback() {
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir: await tempDir('sb-openalex-'),
    maxPapers: 3,
    fetchTimeoutMs: 15000
  });
  const sources = await fetchOpenAlexAuthorAndWorks({
    name: 'Geoffrey Hinton',
    affiliation: 'University of Toronto'
  }, config);
  assert.ok(sources.length >= 1);
  assert.ok(sources.some((source) => /Geoffrey/i.test(source.title) || /Hinton/i.test(source.content || '')));
}

async function testPublicSearchFindsOfficialHomepage() {
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir: await tempDir('sb-search-'),
    webSearchProvider: 'bing,google',
    maxPublicPages: 8,
    maxPapers: 0,
    fetchTimeoutMs: 15000
  });
  const cases = [
    {
      mentor: {
        name: 'Jun Zhu',
        affiliation: 'Tsinghua University, Department of Computer Science'
      },
      expectedUrl: /ml\.cs\.tsinghua\.edu\.cn\/~jun/i
    },
    {
      mentor: {
        name: 'Jie Tang',
        affiliation: 'Tsinghua University, Department of Computer Science'
      },
      expectedUrl: /keg\.cs\.tsinghua\.edu\.cn\/persons\/jietang/i
    },
    {
      mentor: {
        name: 'Zhiyuan Liu',
        affiliation: 'Tsinghua University, Department of Computer Science'
      },
      expectedUrl: /nlp\.csai\.tsinghua\.edu\.cn\/~lzy/i
    }
  ];

  for (const testCase of cases) {
    const sources = await collectPublicSources({
      mentor: testCase.mentor,
      publicUrls: [],
      config,
      skipPublicSearch: false,
      disableOpenAlex: true
    });
    assert.ok(
      sources.some((source) => testCase.expectedUrl.test(source.url || '')),
      `official homepage not found for ${testCase.mentor.name}: ${sources.map((source) => source.url).join(', ')}`
    );
  }
}

async function testDeepSeekWorkflow() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Set DEEPSEEK_API_KEY to run --deepseek');
  }
  const dataDir = await tempDir('sb-deepseek-workflow-');
  const config = await loadConfig({
    rootDir: projectRoot,
    dataDir,
    llmProvider: 'deepseek',
    openaiApiKey: apiKey,
    maxPublicPages: 1,
    maxPapers: 1,
    fetchTimeoutMs: 15000
  });
  const store = new FsStore(config);
  const llmProvider = createLlmProvider(config);
  const build = await buildPersonaWorkflow({
    input: {
      name: 'Geoffrey Hinton',
      affiliation: 'University of Toronto',
      authorizedBy: 'regression',
      publicUrls: [],
      uploadPaths: [
        path.join(projectRoot, 'examples/uploads/mentor_bio.txt'),
        path.join(projectRoot, 'examples/uploads/project_brief.md')
      ],
      skipPublicSearch: true,
      disableOpenAlex: true
    },
    config,
    store,
    llmProvider
  });
  const studentProfile = await readJson(path.join(projectRoot, 'examples/student_profile.json'));
  const chat = await chatPersonaWorkflow({
    slugOrName: build.slug,
    message: '我想加入这个方向，应该先准备什么？',
    studentProfile,
    store,
    llmProvider
  });
  const evaluation = await evaluateStudentWorkflow({
    slugOrName: build.slug,
    studentProfile,
    sessionId: chat.sessionId,
    store,
    llmProvider
  });
  assert.ok(chat.answer);
  assert.ok(['do_not_progress', 'needs_human_review', 'recommend_interview', 'strong_recommendation'].includes(evaluation.recommendation));
}

await testUploadDescriptorFallback();
await testDeepSeekTextOnlyImageFallback();
await testDocumentUploadFallbackParsers();
await testMockWorkflow();
await testBuildWorkflowWithUploadDescriptor();
await testCreateGeneratesUniqueSlugs();
await testUpdatePersonaMergesOnlyTargetSlug();
await testLegacySlugUpdateCompatibility();
await testMergeSourcesDeduplicatesByUrlAndPath();

if (args.has('--network')) {
  await testOpenAlexFallback();
  await testPublicSearchFindsOfficialHomepage();
}
if (args.has('--deepseek')) {
  await testDeepSeekWorkflow();
}

console.log(JSON.stringify({
  ok: true,
  tests: [
    'upload-descriptor-fallback',
    'deepseek-text-only-image-fallback',
    'document-upload-fallback-parsers',
    'mock-workflow',
    'build-workflow-upload-descriptor',
    'create-generates-unique-slugs',
    'update-persona-merges-only-target-slug',
    'legacy-slug-update-compatibility',
    'merge-sources-deduplicates-by-url-and-path',
    ...(args.has('--network') ? ['openalex-fallback', 'official-homepage-search'] : []),
    ...(args.has('--deepseek') ? ['deepseek-workflow'] : [])
  ]
}, null, 2));
