#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { createLlmProvider } from './providers/llm.mjs';
import { createAsrProvider } from './providers/asr.mjs';
import { FsStore } from './storage.mjs';
import { buildPersonaWorkflow } from './workflows/buildPersona.mjs';
import { updatePersonaWorkflow } from './workflows/updatePersona.mjs';
import { chatPersonaWorkflow } from './workflows/chatPersona.mjs';
import { evaluateStudentWorkflow } from './workflows/evaluateStudent.mjs';
import { parseBoolean, parseLines, readJson } from './lib/utils.mjs';
import { renderMentorThinkingQuestionnaireMarkdown } from './questionnaires/mentorThinking.mjs';

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

function meetingSpeakerFlag(flags) {
  return flags['meeting-speaker'] || flags.meetingSpeaker || flags['mentor-speaker'] || flags.mentorSpeaker || '';
}

function meetingDescriptor(item, sourceLabel, flags) {
  return {
    path: path.resolve(item),
    originalName: path.basename(item),
    mimeType: sourceLabel === 'transcript' ? 'text/plain' : '',
    sourceType: 'meeting',
    mentorSpeaker: meetingSpeakerFlag(flags),
    meetingSpeaker: meetingSpeakerFlag(flags),
    transcriptPath: flags['meeting-transcript-sidecar'] ? path.resolve(flags['meeting-transcript-sidecar']) : ''
  };
}

function thinkingQuestionnaireDescriptor(item) {
  return {
    path: path.resolve(item),
    originalName: path.basename(item),
    mimeType: 'text/plain',
    sourceType: 'thinking_questionnaire'
  };
}

function thinkingQuestionnairePaths(flags) {
  return [
    ...arrayFlag(flags['thinking-questionnaire']),
    ...arrayFlag(flags.thinkingQuestionnaire),
    ...arrayFlag(flags.questionnaire),
    ...arrayFlag(flags['research-taste-questionnaire'])
  ].map((item) => thinkingQuestionnaireDescriptor(item));
}

async function maybeReadJson(filePath) {
  if (!filePath) return undefined;
  return readJson(path.resolve(filePath));
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === 'questionnaire') {
    const markdown = renderMentorThinkingQuestionnaireMarkdown({
      mentorName: parsed.flags.name || parsed.flags.mentor || '',
      compact: parseBoolean(parsed.flags.compact)
    });
    const output = parsed.flags.output || parsed.flags.o || '';
    if (output) {
      const target = path.resolve(output);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, markdown, 'utf8');
      console.log(JSON.stringify({ ok: true, output: target }, null, 2));
    } else {
      console.log(markdown);
    }
    return;
  }

  const config = await loadConfig();
  const llmProvider = createLlmProvider(config);
  const asrProvider = createAsrProvider(config);
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
      wechatPaths: arrayFlag(parsed.flags.wechat).map((item) => ({
        path: path.resolve(item),
        originalName: path.basename(item),
        mimeType: 'text/plain',
        sourceType: 'wechat',
        mentorSpeaker: parsed.flags['mentor-speaker'] || parsed.flags.mentorSpeaker || ''
      })),
      meetingPaths: [
        ...arrayFlag(parsed.flags['meeting-transcript']).map((item) => meetingDescriptor(item, 'transcript', parsed.flags)),
        ...arrayFlag(parsed.flags['meeting-video']).map((item) => meetingDescriptor(item, 'video', parsed.flags)),
        ...arrayFlag(parsed.flags['meeting-audio']).map((item) => meetingDescriptor(item, 'audio', parsed.flags))
      ],
      thinkingQuestionnairePaths: thinkingQuestionnairePaths(parsed.flags),
      mentorSpeaker: parsed.flags['mentor-speaker'] || parsed.flags.mentorSpeaker || '',
      meetingSpeaker: meetingSpeakerFlag(parsed.flags),
      projectText: parsed.flags['project-text'] || '',
      skipPublicSearch: parseBoolean(parsed.flags['skip-public-search']),
      disableOpenAlex: parseBoolean(parsed.flags['disable-openalex'])
    };

    const result = await buildPersonaWorkflow({ input, config, store, llmProvider, asrProvider });
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
      wechatPaths: arrayFlag(parsed.flags.wechat).map((item) => ({
        path: path.resolve(item),
        originalName: path.basename(item),
        mimeType: 'text/plain',
        sourceType: 'wechat',
        mentorSpeaker: parsed.flags['mentor-speaker'] || parsed.flags.mentorSpeaker || ''
      })),
      meetingPaths: [
        ...arrayFlag(parsed.flags['meeting-transcript']).map((item) => meetingDescriptor(item, 'transcript', parsed.flags)),
        ...arrayFlag(parsed.flags['meeting-video']).map((item) => meetingDescriptor(item, 'video', parsed.flags)),
        ...arrayFlag(parsed.flags['meeting-audio']).map((item) => meetingDescriptor(item, 'audio', parsed.flags))
      ],
      thinkingQuestionnairePaths: thinkingQuestionnairePaths(parsed.flags),
      mentorSpeaker: parsed.flags['mentor-speaker'] || parsed.flags.mentorSpeaker || '',
      meetingSpeaker: meetingSpeakerFlag(parsed.flags),
      projectText: parsed.flags['project-text'] || '',
      skipPublicSearch: parseBoolean(parsed.flags['skip-public-search']),
      disableOpenAlex: parseBoolean(parsed.flags['disable-openalex'])
    };

    const result = await updatePersonaWorkflow({
      slug: mustGet(parsed.flags.slug, '--slug'),
      input,
      config,
      store,
      llmProvider,
      asrProvider
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
    '  node src/cli.mjs questionnaire [--name "Mentor"] [--compact] [--output ./mentor_thinking_questionnaire.md]',
    '  node src/cli.mjs build --name "Mentor" --affiliation "University" --authorized-by "admin" [--public-url URL] [--upload FILE] [--wechat WECHAT_TXT --mentor-speaker NAME] [--meeting-transcript FILE | --meeting-video FILE | --meeting-audio FILE --meeting-speaker NAME] [--thinking-questionnaire FILE]',
    '  node src/cli.mjs update --slug "mentor-slug" [--public-url URL] [--upload FILE] [--wechat WECHAT_TXT --mentor-speaker NAME] [--meeting-transcript FILE | --meeting-video FILE | --meeting-audio FILE] [--thinking-questionnaire FILE]',
    '  node src/cli.mjs chat --mentor "mentor-slug" --message "..." [--student-file ./student.json]',
    '  node src/cli.mjs evaluate --mentor "mentor-slug" --student-file ./student.json [--session SESSION_ID]'
  ].join('\n'));
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
