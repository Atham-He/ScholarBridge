import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { createLlmProvider } from '../src/providers/llm.mjs';
import { FsStore } from '../src/storage.mjs';
import { buildPersonaWorkflow } from '../src/workflows/buildPersona.mjs';
import { chatPersonaWorkflow } from '../src/workflows/chatPersona.mjs';
import { evaluateStudentWorkflow } from '../src/workflows/evaluateStudent.mjs';
import { readJson } from '../src/lib/utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'supervisor-born-smoke-'));

const config = await loadConfig({
  rootDir: projectRoot,
  dataDir,
  llmProvider: 'mock'
});
const llmProvider = createLlmProvider(config);
const store = new FsStore(config);

const result = await buildPersonaWorkflow({
  input: {
    name: 'Geoffrey Hinton',
    affiliation: 'University of Toronto',
    authorizedBy: 'smoke-test',
    consentNotes: 'Local mock smoke test',
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
  slugOrName: result.slug,
  message: '我想加入这个项目，你觉得我应该先准备什么？',
  studentProfile,
  store,
  llmProvider
});

const evaluation = await evaluateStudentWorkflow({
  slugOrName: result.slug,
  studentProfile,
  sessionId: chat.sessionId,
  store,
  llmProvider
});

console.log(JSON.stringify({
  dataDir,
  build: {
    slug: result.slug,
    sourceCount: result.sourceCount,
    chunkCount: result.chunkCount
  },
  chat: {
    sessionId: chat.sessionId,
    answerPreview: chat.answer.slice(0, 240)
  },
  evaluation: {
    overallScore: evaluation.overallScore,
    recommendation: evaluation.recommendation
  }
}, null, 2));
