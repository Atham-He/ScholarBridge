#!/usr/bin/env node
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { createLlmProvider } from './providers/llm.mjs';
import { FsStore } from './storage.mjs';
import { buildPersonaWorkflow } from './workflows/buildPersona.mjs';
import { updatePersonaWorkflow } from './workflows/updatePersona.mjs';
import { chatPersonaWorkflow } from './workflows/chatPersona.mjs';
import { evaluateStudentWorkflow } from './workflows/evaluateStudent.mjs';
import { parseBoolean, parseLines, readJson } from './lib/utils.mjs';

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const result = { command, flags: {}, values: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      result.values.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      result.flags[key] = true;
      continue;
    }
    if (result.flags[key]) {
      result.flags[key] = Array.isArray(result.flags[key]) ? [...result.flags[key], next] : [result.flags[key], next];
    } else {
      result.flags[key] = next;
    }
    index += 1;
  }
  return result;
}

function arrayFlag(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function mustGet(flagValue, label) {
  if (!flagValue) throw new Error(`${label} is required`);
  return flagValue;
}

async function maybeReadJson(filePath) {
  if (!filePath) return undefined;
  return readJson(path.resolve(filePath));
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const llmProvider = createLlmProvider(config);
  const store = new FsStore(config);

  if (parsed.command === 'build' || parsed.command === 'create') {
    const input = {
      name: mustGet(parsed.flags.name, '--name'),
      affiliation: parsed.flags.affiliation || '',
      title: parsed.flags.title || '',
      authorizedBy: mustGet(parsed.flags['authorized-by'] || parsed.flags.authorizedBy, '--authorized-by'),
      consentNotes: parsed.flags['consent-notes'] || parsed.flags.consentNotes || '',
      publicUrls: [
        ...arrayFlag(parsed.flags['public-url']),
        ...parseLines(parsed.flags['public-urls'])
      ],
      uploadPaths: arrayFlag(parsed.flags.upload).map((item) => path.resolve(item)),
      projectText: parsed.flags['project-text'] || '',
      skipPublicSearch: parseBoolean(parsed.flags['skip-public-search']),
      disableOpenAlex: parseBoolean(parsed.flags['disable-openalex'])
    };

    const result = await buildPersonaWorkflow({ input, config, store, llmProvider });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (parsed.command === 'update') {
    const input = {
      name: parsed.flags.name || '',
      affiliation: parsed.flags.affiliation || '',
      title: parsed.flags.title || '',
      authorizedBy: parsed.flags['authorized-by'] || parsed.flags.authorizedBy || '',
      consentNotes: parsed.flags['consent-notes'] || parsed.flags.consentNotes || '',
      publicUrls: [
        ...arrayFlag(parsed.flags['public-url']),
        ...parseLines(parsed.flags['public-urls'])
      ],
      uploadPaths: arrayFlag(parsed.flags.upload).map((item) => path.resolve(item)),
      projectText: parsed.flags['project-text'] || '',
      skipPublicSearch: parseBoolean(parsed.flags['skip-public-search']),
      disableOpenAlex: parseBoolean(parsed.flags['disable-openalex'])
    };

    const result = await updatePersonaWorkflow({
      slug: mustGet(parsed.flags.slug, '--slug'),
      input,
      config,
      store,
      llmProvider
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (parsed.command === 'chat') {
    const slugOrName = mustGet(parsed.flags.mentor || parsed.values[0], '--mentor');
    const message = mustGet(parsed.flags.message || parsed.values[1], '--message');
    const studentProfile = await maybeReadJson(parsed.flags['student-file'] || parsed.flags.studentFile);
    const result = await chatPersonaWorkflow({
      slugOrName,
      message,
      sessionId: parsed.flags.session || parsed.flags.sessionId || '',
      studentProfile,
      store,
      llmProvider
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (parsed.command === 'evaluate') {
    const slugOrName = mustGet(parsed.flags.mentor || parsed.values[0], '--mentor');
    const studentProfile = await maybeReadJson(parsed.flags['student-file'] || parsed.flags.studentFile);
    const transcript = await maybeReadJson(parsed.flags['transcript-file'] || parsed.flags.transcriptFile);
    const result = await evaluateStudentWorkflow({
      slugOrName,
      studentProfile: studentProfile || {},
      transcript,
      sessionId: parsed.flags.session || parsed.flags.sessionId || '',
      store,
      llmProvider
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error([
    'Usage:',
    '  node src/cli.mjs build --name "Mentor" --affiliation "University" --authorized-by "admin" [--public-url URL] [--upload FILE]',
    '  node src/cli.mjs update --slug "mentor-slug" [--public-url URL] [--upload FILE]',
    '  node src/cli.mjs chat --mentor "mentor-slug" --message "..." [--student-file ./student.json]',
    '  node src/cli.mjs evaluate --mentor "mentor-slug" --student-file ./student.json [--session SESSION_ID]'
  ].join('\n'));
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
