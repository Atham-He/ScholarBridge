import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import zlib from 'node:zlib';
import { db } from '../lib/db';
import { createPersonaForMentor, updatePersonaForMentor } from '../lib/persona/manager';
import { PersonaChatService } from '../lib/persona/chat';
import { StudentEvaluationService } from '../lib/persona/evaluation';
import { createLLMProviderFromEnv } from '../lib/persona/llm';

function requireEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function escapePdfText(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Buffer {
  const content = [
    'BT',
    '/F1 12 Tf',
    '72 760 Td',
    ...lines.flatMap((line, index) => index === 0
      ? [`(${escapePdfText(line)}) Tj`]
      : ['0 -18 Td', `(${escapePdfText(line)}) Tj`]),
    'ET'
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function buildZipWithLocalEntries(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const compressed = zlib.deflateRawSync(entry.data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(entry.data.length, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    parts.push(header, nameBuffer, compressed);
  }
  return Buffer.concat(parts);
}

function buildSimpleDocx(paragraphs: string[]): Buffer {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    ...paragraphs.map((paragraph) => `<w:p><w:r><w:t>${String(paragraph || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`),
    '</w:body>',
    '</w:document>'
  ].join('');
  return buildZipWithLocalEntries([
    {
      name: 'word/document.xml',
      data: Buffer.from(xml, 'utf8')
    }
  ]);
}

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kP1cAAAAASUVORK5CYII=',
  'base64'
);

const JPG_1X1 = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAVFhUVFRUVFRUVFRUVFRUVFRUXFhUVFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBEQACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAByA//xAAXEAEBAQEAAAAAAAAAAAAAAAABEQAh/9oACAEBAAEFAtj/xAAVEQEBAAAAAAAAAAAAAAAAAAABEP/aAAgBAwEBPwGn/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwCf/8QAGhAAAgIDAAAAAAAAAAAAAAAAAAERITFBUf/aAAgBAQAGPwJQmF//xAAZEAEAAwEBAAAAAAAAAAAAAAABABEhMUH/2gAIAQEAAT8hFvNOvZR4M1//2gAMAwEAAgADAAAAEM//xAAWEQEBAQAAAAAAAAAAAAAAAAABABH/2gAIAQMBAT8QhD//xAAWEQEBAQAAAAAAAAAAAAAAAAABABH/2gAIAQIBAT8Qmt//xAAbEAEBAQADAQEAAAAAAAAAAAABEQAhMUFhcf/aAAgBAQABPxARyjdKCVh0b07XHtcwPa5wPLXrI75E+Q==',
  'base64'
);

function fileFromBuffer(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

function summarizeKinds(sources: any[]) {
  const counts: Record<string, number> = {};
  for (const source of sources || []) {
    const key = `${source.origin}:${source.kind}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function preview(text: string, size = 220): string {
  return String(text || '').replace(/\s+/g, ' ').slice(0, size);
}

function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      windowsHide: true
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${cmd} exited with code ${code}: ${stderr.slice(0, 800)}`));
    });
  });
}

async function buildMeetingVideo(text: string): Promise<File> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'persona-meeting-video-'));
  const wavPath = path.join(tmpDir, 'meeting.wav');
  const mp4Path = path.join(tmpDir, 'meeting.mp4');
  const fliteText = text.replace(/[:']/g, '').replace(/\s+/g, ' ').trim();

  await run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    `flite=text='${fliteText}':voice=slt`,
    '-ar',
    '16000',
    '-ac',
    '1',
    wavPath
  ]);

  await run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=size=640x360:rate=25:color=black',
    '-i',
    wavPath,
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    mp4Path
  ]);

  const buffer = await fs.readFile(mp4Path);
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  return fileFromBuffer(buffer, 'group_meeting.mp4', 'video/mp4');
}

async function main() {
  requireEnv('DEEPSEEK_API_KEY');
  requireEnv('GLM_ASR_API_KEY');

  process.env.PERSONA_LLM_PROVIDER = process.env.PERSONA_LLM_PROVIDER || 'deepseek';
  process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  process.env.WEB_SEARCH_PROVIDER = process.env.WEB_SEARCH_PROVIDER || 'multi';
  process.env.ASR_PROVIDER = process.env.ASR_PROVIDER || 'glm';
  process.env.GLM_ASR_BASE_URL = process.env.GLM_ASR_BASE_URL || 'https://llmapi.paratera.com';
  process.env.GLM_ASR_MODEL = process.env.GLM_ASR_MODEL || 'GLM-ASR-2512';

  const stamp = Date.now().toString(36);
  const email = `persona-real-${stamp}@example.com`;
  const mentorUser = await db.user.create({
    data: {
      email,
      role: 'MENTOR',
      mentorProfile: {
        create: {
          displayName: 'Junliang Xing',
          institution: 'Tsinghua University',
          department: 'Department of Computer Science and Technology',
          title: 'Associate Professor'
        }
      }
    },
    include: {
      mentorProfile: true
    }
  });

  const llmProvider = await createLLMProviderFromEnv();
  const chatService = new PersonaChatService(llmProvider);
  const evaluationService = new StudentEvaluationService(llmProvider);

  const uploadTxt = fileFromBuffer(
    Buffer.from(
      [
        'Junliang Xing research notes.',
        'Focus on visual understanding, decision making, strong baselines, and failure analysis.',
        'Students should come with a precise scenario, metric, and a minimum viable experiment.'
      ].join('\n'),
      'utf8'
    ),
    'research_notes.txt',
    'text/plain'
  );

  const uploadMd = fileFromBuffer(
    Buffer.from(
      [
        '# Mentoring preferences',
        '',
        '- Start from the problem and hypothesis.',
        '- Compare against a strong baseline.',
        '- Bring ablations, error analysis, and next-step hypotheses.'
      ].join('\n'),
      'utf8'
    ),
    'mentoring_preferences.md',
    'text/markdown'
  );

  const uploadPdf = fileFromBuffer(
    buildSimplePdf([
      'Junliang Xing brief profile',
      'Research areas: computer vision, visual understanding, and embodied intelligence.',
      'Advising style: evidence first, baseline first, and clear failure-case analysis.'
    ]),
    'junliang_xing_brief.pdf',
    'application/pdf'
  );

  const uploadDocx = fileFromBuffer(
    buildSimpleDocx([
      'Junliang Xing mentoring memo',
      'Do not claim novelty before the task definition, baseline, and metric are stable.',
      'A good student brings reproducible code, ablations, and a plan for the next experiment.'
    ]),
    'mentoring_memo.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  const uploadPng = fileFromBuffer(PNG_1X1, 'slide_snapshot.png', 'image/png');
  const uploadJpg = fileFromBuffer(JPG_1X1, 'whiteboard_photo.jpg', 'image/jpeg');

  const wechatTxt = fileFromBuffer(
    Buffer.from(
      [
        '2026-04-24 21:00 Junliang Xing: Narrow the scenario first. A big direction is not a research problem.',
        '2026-04-24 21:02 Student: I want to improve visual decision making.',
        '2026-04-24 21:03 Junliang Xing: Show the baseline, metric, and the minimum experiment before talking about a larger model.',
        '2026-04-24 21:05 Junliang Xing: If the hard cases fail, classify the failures and tell me what hypothesis that suggests.'
      ].join('\n'),
      'utf8'
    ),
    'wechat_chat.txt',
    'text/plain'
  );

  const meetingTranscript = fileFromBuffer(
    Buffer.from(
      [
        '1',
        '00:00:01,000 --> 00:00:06,000',
        'Junliang Xing: Start from the concrete scenario and the hypothesis.',
        '',
        '2',
        '00:00:06,500 --> 00:00:12,000',
        'Student: The benchmark score is slightly higher than last week.',
        '',
        '3',
        '00:00:12,500 --> 00:00:18,000',
        'Junliang Xing: Is the baseline strong enough and where are the failure cases?',
        '',
        '4',
        '00:00:18,500 --> 00:00:24,000',
        'Junliang Xing: Bring me ablations and a one week next step.'
      ].join('\n'),
      'utf8'
    ),
    'group_meeting.srt',
    'text/plain'
  );

  const questionnaire = fileFromBuffer(
    Buffer.from(
      [
        '### [taste.preferred_problems] Preferred problem type',
        'I prefer problems with clear definitions, measurable outcomes, and obvious failure modes.',
        '',
        '### [process.problem_selection] How do you select problems',
        'I first fix the scenario, baseline, and metric, then ask whether the hypothesis is testable in a short cycle.',
        '',
        '### [evidence.minimum_evidence] Minimum acceptable evidence',
        'I need strong baselines, targeted ablations, failure analysis, and a next-step hypothesis.',
        '',
        '### [students.screening] How do you judge students',
        'I value reproducibility, quantitative discipline, and whether the student can turn a vague idea into a minimal experiment.'
      ].join('\n'),
      'utf8'
    ),
    'thinking_questionnaire.md',
    'text/markdown'
  );

  const meetingVideo = await buildMeetingVideo(
    'Start from the problem and hypothesis. Check the baseline. Bring ablations and failure cases for next week.'
  );

  const created = await createPersonaForMentor({
    ownerUserId: mentorUser.id,
    mentor: {
      name: 'Junliang Xing',
      affiliation: 'Tsinghua University, Department of Computer Science and Technology',
      title: 'Associate Professor',
      authorizedBy: email,
      consentNotes: 'real provider e2e test',
      publicUrls: ['https://pi.cs.tsinghua.edu.cn/person/junliang-xing/']
    },
    publish: false,
    publicUrls: ['https://pi.cs.tsinghua.edu.cn/person/junliang-xing/'],
    uploads: [uploadTxt, uploadMd, uploadPdf, uploadDocx, uploadPng, uploadJpg],
    wechatFiles: [wechatTxt],
    meetingFiles: [meetingTranscript, meetingVideo],
    thinkingQuestionnaireFiles: [questionnaire],
    projectText: 'Looking for students who can define the task precisely, run strong baselines, and explain failure cases.',
    skipPublicSearch: false,
    disableOpenalex: false,
    mentorSpeaker: 'Junliang Xing',
    meetingSpeaker: 'Junliang Xing'
  });

  const session = chatService.createSession(`junliang-real-${stamp}`, {
    name: 'Test Student',
    background: 'Worked on multimodal learning and reproduced several baselines.'
  });

  const chatQuestions = [
    'If I want to start a project on embodied visual understanding, what should I prepare before next week?',
    'I only beat one baseline and the hard cases are unstable. What would you ask me to do next?',
    '如果我是基础一般但执行力强的学生，你会怎么判断我要不要继续推进？'
  ];

  const chats = [];
  for (const question of chatQuestions) {
    const response = await chatService.chat({
      persona: created.built.persona as any,
      chunks: created.built.chunks as any[],
      message: question,
      studentProfile: session.studentProfile,
      session
    });
    chatService.addTurn(session, question, response);
    chats.push({
      question,
      answerPreview: preview(response.answer, 320),
      citationCount: response.citations.length,
      firstCitationTitles: response.citations.slice(0, 3).map((item) => item.title)
    });
  }

  const evaluation = await evaluationService.evaluate({
    persona: created.built.persona as any,
    chunks: created.built.chunks as any[],
    studentProfile: {
      name: 'Test Student',
      interests: ['computer vision', 'multimodal learning', 'embodied AI'],
      experience: [
        'reproduced two vision baselines',
        'wrote ablations and error analysis',
        'built a small embodied decision-making prototype'
      ]
    },
    transcript: session.turns.map((turn) => ({
      role: 'user',
      content: `${turn.message}\n${turn.answer}`
    }))
  });

  const updateTxt = fileFromBuffer(
    Buffer.from(
      [
        'Update memo',
        'For the next meeting, bring a compact metric table, one strong baseline, and targeted failure cases.',
        'Do not expand the model before the simplest experiment is stable.'
      ].join('\n'),
      'utf8'
    ),
    'update_notes.txt',
    'text/plain'
  );

  const updateWechat = fileFromBuffer(
    Buffer.from(
      [
        '2026-04-25 09:00 Junliang Xing: A result without a failure taxonomy is not actionable.',
        '2026-04-25 09:01 Junliang Xing: Decide the next experiment by what uncertainty it resolves.'
      ].join('\n'),
      'utf8'
    ),
    'wechat_followup.txt',
    'text/plain'
  );

  const updateQuestionnaire = fileFromBuffer(
    Buffer.from(
      [
        '### [process.idea_triage] How do you triage an idea',
        'I choose the idea that can be converted into a one-week minimal experiment with a strong baseline and a clear metric.',
        '',
        '### [meetings.expectations] What should students bring to group meeting',
        'A metric table, key ablations, qualitative failure cases, and the exact uncertainty to resolve next.'
      ].join('\n'),
      'utf8'
    ),
    'thinking_update.md',
    'text/markdown'
  );

  const updated = await updatePersonaForMentor({
    slug: created.persona.slug,
    ownerUserId: mentorUser.id,
    projectText: 'Updated guidance: prioritize one-week minimal experiments, strong baselines, metric tables, and failure taxonomies.',
    uploads: [updateTxt],
    wechatFiles: [updateWechat],
    thinkingQuestionnaireFiles: [updateQuestionnaire],
    skipPublicSearch: false,
    disableOpenalex: false,
    mentorSpeaker: 'Junliang Xing',
    meetingSpeaker: 'Junliang Xing'
  });

  const postUpdateChat = await chatService.chat({
    persona: updated.built.persona as any,
    chunks: updated.built.chunks as any[],
    message: 'What should I bring to the next group meeting if my result is still unstable?',
    studentProfile: session.studentProfile,
    session
  });

  const searchOnly = await createPersonaForMentor({
    ownerUserId: mentorUser.id,
    mentor: {
      name: 'Junliang Xing',
      affiliation: 'Tsinghua University, Department of Computer Science and Technology',
      title: 'Associate Professor',
      authorizedBy: email,
      consentNotes: 'real provider auto-search test'
    },
    uploads: [uploadTxt, uploadPdf],
    projectText: 'Testing auto public search without homepage input.',
    skipPublicSearch: false,
    disableOpenalex: false,
    mentorSpeaker: 'Junliang Xing',
    meetingSpeaker: 'Junliang Xing'
  });

  const videoSource = (created.built.sources as any[]).find((source) =>
    source.kind === 'meeting_transcript' &&
    source.metadata?.inputKind === 'video'
  );

  const summary = {
    provider: {
      llm: process.env.PERSONA_LLM_PROVIDER,
      llmModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      asr: process.env.ASR_PROVIDER,
      asrModel: process.env.GLM_ASR_MODEL || 'GLM-ASR-2512',
      webSearchProvider: process.env.WEB_SEARCH_PROVIDER
    },
    fullScenario: {
      slug: created.persona.slug,
      counts: {
        sourceCount: created.built.sourceCount,
        publicSourceCount: created.built.publicSourceCount,
        uploadSourceCount: created.built.uploadSourceCount,
        privateSourceCount: created.built.privateSourceCount,
        chunkCount: created.built.chunkCount
      },
      sourceKinds: summarizeKinds(created.built.sources as any[]),
      publicUrlsFound: (created.built.sources as any[])
        .filter((source) => source.origin === 'public' && source.url)
        .slice(0, 8)
        .map((source) => source.url),
      llmDistillation: (created.built.persona as any).provenance?.llmDistillation || null,
      evidencePreview: (created.built.persona as any).provenance?.evidencePreview || null,
      styleGuideKeys: Object.keys((created.built.persona as any).communicationStyle?.styleGuide || {}),
      reasoningPlaybookKeys: Object.keys((created.built.persona as any).thinkingProcess?.reasoningPlaybook || {}),
      meetingVideoAsr: videoSource
        ? {
            inputKind: videoSource.metadata?.inputKind,
            mentorSegmentCount: videoSource.metadata?.mentorSegmentCount,
            styleInference: videoSource.metadata?.styleSignals?.styleInference,
            asr: videoSource.metadata?.asr
          }
        : null,
      chats,
      evaluation: {
        overallScore: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        lowEvidence: evaluation.evidenceQuality?.lowEvidence,
        followUpQuestions: evaluation.followUpQuestions?.slice(0, 3)
      }
    },
    updateScenario: {
      slug: updated.persona.slug,
      counts: {
        sourceCount: updated.built.sourceCount,
        publicSourceCount: updated.built.publicSourceCount,
        uploadSourceCount: updated.built.uploadSourceCount,
        privateSourceCount: updated.built.privateSourceCount,
        chunkCount: updated.built.chunkCount,
        addedSourceCount: updated.built.addedSourceCount
      },
      postUpdateChat: {
        answerPreview: preview(postUpdateChat.answer, 320),
        citationCount: postUpdateChat.citations.length,
        firstCitationTitles: postUpdateChat.citations.slice(0, 3).map((item) => item.title)
      }
    },
    autoSearchScenario: {
      slug: searchOnly.persona.slug,
      counts: {
        sourceCount: searchOnly.built.sourceCount,
        publicSourceCount: searchOnly.built.publicSourceCount,
        uploadSourceCount: searchOnly.built.uploadSourceCount,
        privateSourceCount: searchOnly.built.privateSourceCount,
        chunkCount: searchOnly.built.chunkCount
      },
      publicUrlsFound: (searchOnly.built.sources as any[])
        .filter((source) => source.origin === 'public' && source.url)
        .slice(0, 8)
        .map((source) => source.url),
      llmDistillation: (searchOnly.built.persona as any).provenance?.llmDistillation || null
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
