import { randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import type { MentorInput, PersonaData, Source, UploadedFileDescriptor } from './types';
import { buildPersonaArtifacts, updatePersonaArtifacts } from './engine.mjs';

const PERSONA_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'personas');

type InputFile = File;

interface PersistedUpload {
  descriptor: UploadedFileDescriptor;
  originalName: string;
  storedPath: string;
  mimeType: string;
  size: number;
  sourceType: string;
}

interface PersonaCreateInput {
  ownerUserId: string;
  mentor: MentorInput;
  publish?: boolean;
  publicUrls?: string[];
  aiChatShareUrls?: string[];
  uploads?: InputFile[];
  wechatFiles?: InputFile[];
  meetingFiles?: InputFile[];
  thinkingQuestionnaireFiles?: InputFile[];
  projectText?: string;
  skipPublicSearch?: boolean;
  disableOpenalex?: boolean;
  mentorSpeaker?: string;
  meetingSpeaker?: string;
}

interface PersonaUpdateInput {
  slug: string;
  ownerUserId: string;
  name?: string;
  affiliation?: string;
  title?: string;
  authorizedBy?: string;
  consentNotes?: string;
  publicUrls?: string[];
  aiChatShareUrls?: string[];
  uploads?: InputFile[];
  wechatFiles?: InputFile[];
  meetingFiles?: InputFile[];
  thinkingQuestionnaireFiles?: InputFile[];
  projectText?: string;
  skipPublicSearch?: boolean;
  disableOpenalex?: boolean;
  mentorSpeaker?: string;
  meetingSpeaker?: string;
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function personaSlugBase(name: string, affiliation: string): string {
  return slugify([name, affiliation].filter(Boolean).join(' ')).slice(0, 140).replace(/-+$/g, '') || 'mentor';
}

async function createUniquePersonaSlug(name: string, affiliation: string): Promise<string> {
  const base = personaSlugBase(name, affiliation);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = `${base}-${randomBytes(4).toString('hex')}`;
    const [persona, skill] = await Promise.all([
      db.persona.findUnique({ where: { slug } }),
      db.skill.findUnique({ where: { slug } })
    ]);
    if (!persona && !skill) return slug;
  }
  throw new Error(`Could not create unique slug for ${name}`);
}

function extensionFromMime(mimeType: string): string {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized === 'text/plain') return '.txt';
  if (normalized === 'text/markdown') return '.md';
  if (normalized === 'application/pdf') return '.pdf';
  if (normalized === 'application/msword') return '.doc';
  if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return '.jpg';
  return '';
}

function sanitizeFileName(name: string, fallback: string): string {
  const raw = String(name || '').trim() || fallback;
  return raw.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').slice(0, 180);
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function persistFiles(
  personaSlug: string,
  files: InputFile[] = [],
  sourceType: string,
  mentorSpeaker = '',
  meetingSpeaker = ''
): Promise<PersistedUpload[]> {
  if (!files.length) return [];
  const targetDir = path.join(PERSONA_UPLOAD_ROOT, personaSlug, sourceType || 'files');
  await ensureDir(targetDir);

  const items: PersistedUpload[] = [];
  for (const file of files) {
    const originalName = sanitizeFileName(file.name || `${sourceType || 'upload'}${extensionFromMime(file.type)}`, 'upload');
    const fileName = path.extname(originalName)
      ? originalName
      : `${originalName}${extensionFromMime(file.type)}`;
    const storedName = `${Date.now().toString(36)}_${randomBytes(4).toString('hex')}_${fileName}`;
    const storedPath = path.join(targetDir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storedPath, buffer);
    items.push({
      descriptor: {
        path: storedPath,
        originalName: fileName,
        mimeType: file.type || 'application/octet-stream',
        size: file.size || buffer.length,
        sourceType,
        mentorSpeaker,
        meetingSpeaker
      },
      originalName: fileName,
      storedPath,
      mimeType: file.type || 'application/octet-stream',
      size: file.size || buffer.length,
      sourceType
    });
  }
  return items;
}

async function persistProjectText(personaSlug: string, projectText?: string): Promise<UploadedFileDescriptor[]> {
  const text = String(projectText || '').trim();
  if (!text) return [];
  const targetDir = path.join(PERSONA_UPLOAD_ROOT, personaSlug, 'virtual');
  await ensureDir(targetDir);
  const storedPath = path.join(targetDir, `project_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}.txt`);
  await fs.writeFile(storedPath, text, 'utf8');
  return [{
    path: storedPath,
    originalName: path.basename(storedPath),
    mimeType: 'text/plain',
    sourceType: 'upload'
  }];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => String(item || '').split(/[\r\n;；]+/))
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePublicUrls(input: string[] = [], fallback: string[] = []): string[] {
  return [...new Set([...asStringArray(fallback), ...asStringArray(input)])];
}

function normalizeAiChatShareUrls(input: string[] = [], fallback: string[] = []): string[] {
  return [...new Set([...asStringArray(fallback), ...asStringArray(input)])];
}

function aiChatShareDescriptors(urls: string[] = []): UploadedFileDescriptor[] {
  return urls.map((url, index) => ({
    path: '',
    originalName: `ai_chat_share_${index + 1}.url`,
    mimeType: 'text/uri-list',
    sourceType: 'ai_chat_share',
    fileUrl: url
  }));
}

function resolveSourceIdByPath(sources: Source[], storedPath: string): string {
  const resolved = path.resolve(storedPath).toLowerCase();
  return sources.find((source) => source.filePath && path.resolve(source.filePath).toLowerCase() === resolved)?.id || '';
}

function buildSkillProfileMarkdown(persona: PersonaData, agentCard: string): string {
  const topics = (persona.researchTopics || []).map((item) => `- ${item.name}`).join('\n');
  const projects = (persona.currentProjects || []).map((item) => `- **${item.title}**: ${item.summary}`).join('\n');
  return [
    `# ${persona.mentor.name}`,
    '',
    `**Institution:** ${persona.mentor.affiliation}`,
    `**Title:** ${persona.mentor.title}`,
    '',
    '## Overview',
    persona.overview || '',
    '',
    '## Research Topics',
    topics || '- N/A',
    '',
    '## Current Projects',
    projects || '- N/A',
    '',
    '## Agent Card',
    agentCard
  ].join('\n');
}

function skillDataFromPersona(persona: PersonaData, agentCard: string, publish = false) {
  const status: 'PUBLISHED' | 'DRAFT' = publish ? 'PUBLISHED' : 'DRAFT';
  const topics = (persona.researchTopics || []).map((item) => item.name).filter(Boolean).slice(0, 8);
  return {
    title: persona.mentor.name,
    profileMarkdown: buildSkillProfileMarkdown(persona, agentCard),
    status,
    isPublic: publish,
    publishedAt: publish ? new Date() : null,
    tags: topics as any,
    researchSummary: persona.overview || null,
    agentActive: true,
    agentIntro: persona.communicationStyle?.voiceSummary || `${persona.mentor.name} AI twin`
  };
}

async function createUploadRows(tx: any, personaId: string, uploads: PersistedUpload[], sources: Source[]): Promise<void> {
  if (!uploads.length) return;
  await tx.personaUpload.createMany({
    data: uploads.map((upload) => ({
      personaId,
      originalName: upload.originalName,
      storedPath: upload.storedPath,
      mimeType: upload.mimeType,
      size: upload.size,
      sourceId: resolveSourceIdByPath(sources, upload.storedPath)
    }))
  });
}

export async function createPersonaForMentor(input: PersonaCreateInput) {
  const publicUrls = normalizePublicUrls(input.publicUrls, input.mentor.publicUrls);
  const aiChatShareUrls = normalizeAiChatShareUrls(input.aiChatShareUrls);
  const slug = await createUniquePersonaSlug(input.mentor.name, input.mentor.affiliation);

  const [uploads, wechatUploads, meetingUploads, thinkingQuestionnaireUploads, projectUploads] = await Promise.all([
    persistFiles(slug, input.uploads || [], 'upload', input.mentorSpeaker || '', input.meetingSpeaker || ''),
    persistFiles(slug, input.wechatFiles || [], 'wechat', input.mentorSpeaker || '', input.meetingSpeaker || ''),
    persistFiles(slug, input.meetingFiles || [], 'meeting', input.mentorSpeaker || '', input.meetingSpeaker || ''),
    persistFiles(slug, input.thinkingQuestionnaireFiles || [], 'thinking_questionnaire', input.mentorSpeaker || '', input.meetingSpeaker || ''),
    persistProjectText(slug, input.projectText)
  ]);

  const mentor: MentorInput = {
    ...input.mentor,
    publicUrls
  };

  const built = await (buildPersonaArtifacts as any)({
    mentor: { ...mentor, slug } as any,
    publicUrls,
    uploads: [...uploads.map((item) => item.descriptor), ...projectUploads],
    wechatUploads: wechatUploads.map((item) => item.descriptor),
    meetingUploads: meetingUploads.map((item) => item.descriptor),
    thinkingQuestionnaireUploads: thinkingQuestionnaireUploads.map((item) => item.descriptor),
    aiChatShareUploads: aiChatShareDescriptors(aiChatShareUrls),
    skipPublicSearch: input.skipPublicSearch,
    disableOpenalex: input.disableOpenalex,
    mentorSpeaker: input.mentorSpeaker || '',
    meetingSpeaker: input.meetingSpeaker || ''
  });

  const { skill, persona } = await db.$transaction(async (tx) => {
    const skill = await tx.skill.create({
      data: {
        ownerUserId: input.ownerUserId,
        slug,
        ...skillDataFromPersona(built.persona, built.agentCard, Boolean(input.publish))
      }
    });

    const persona = await tx.persona.create({
      data: {
        skillId: skill.id,
        slug,
        personaJson: built.persona as any,
        agentCard: built.agentCard,
        sourcesJson: built.sources as any,
        chunksJson: built.chunks as any,
        inputJson: {
          name: mentor.name,
          affiliation: mentor.affiliation,
          title: mentor.title || '',
          publicUrls,
          projectText: input.projectText || '',
          aiChatShareUrls,
          mentorSpeaker: input.mentorSpeaker || '',
          meetingSpeaker: input.meetingSpeaker || '',
          uploadPaths: uploads.map((item) => item.descriptor),
          wechatPaths: wechatUploads.map((item) => item.descriptor),
          meetingPaths: meetingUploads.map((item) => item.descriptor),
          thinkingQuestionnairePaths: thinkingQuestionnaireUploads.map((item) => item.descriptor)
        } as any,
        version: built.persona.version || '0.1.0',
        authorizedBy: mentor.authorizedBy,
        consentNotes: mentor.consentNotes || null,
        llmProvider: built.llmProviderKind,
        llmModel: built.llmModel,
        buildStatus: 'completed',
        builtAt: new Date(),
        sourceCount: built.sourceCount,
        publicSourceCount: built.publicSourceCount,
        uploadSourceCount: built.uploadSourceCount,
        privateSourceCount: built.privateSourceCount,
        chunkCount: built.chunkCount
      }
    });

    await createUploadRows(tx, persona.id, [...uploads, ...wechatUploads, ...meetingUploads, ...thinkingQuestionnaireUploads], built.sources);
    return { skill, persona };
  });

  return {
    skill,
    persona,
    built
  };
}

export async function updatePersonaForMentor(input: PersonaUpdateInput) {
  const personaRecord = await db.persona.findUnique({
    where: { slug: input.slug },
    include: {
      skill: true
    }
  });

  if (!personaRecord) {
    throw new Error(`Persona not found: ${input.slug}`);
  }

  if (personaRecord.skill.ownerUserId !== input.ownerUserId) {
    throw new Error('Forbidden');
  }

  const existingInput = (personaRecord.inputJson || {}) as any;
  const existingPersona = personaRecord.personaJson as any;
  const existingPublicUrls = Array.isArray(existingInput.publicUrls)
    ? existingInput.publicUrls
    : (existingPersona.mentor?.homepage ? [existingPersona.mentor.homepage] : []);
  const publicUrls = normalizePublicUrls(input.publicUrls, existingPublicUrls);
  const aiChatShareUrls = normalizeAiChatShareUrls(input.aiChatShareUrls, existingInput.aiChatShareUrls || []);

  const [uploads, wechatUploads, meetingUploads, thinkingQuestionnaireUploads, projectUploads] = await Promise.all([
    persistFiles(input.slug, input.uploads || [], 'upload', input.mentorSpeaker || existingInput.mentorSpeaker || '', input.meetingSpeaker || existingInput.meetingSpeaker || ''),
    persistFiles(input.slug, input.wechatFiles || [], 'wechat', input.mentorSpeaker || existingInput.mentorSpeaker || '', input.meetingSpeaker || existingInput.meetingSpeaker || ''),
    persistFiles(input.slug, input.meetingFiles || [], 'meeting', input.mentorSpeaker || existingInput.mentorSpeaker || '', input.meetingSpeaker || existingInput.meetingSpeaker || ''),
    persistFiles(input.slug, input.thinkingQuestionnaireFiles || [], 'thinking_questionnaire', input.mentorSpeaker || existingInput.mentorSpeaker || '', input.meetingSpeaker || existingInput.meetingSpeaker || ''),
    persistProjectText(input.slug, input.projectText)
  ]);

  const mentor: MentorInput & { slug: string } = {
    name: input.name || existingPersona.mentor?.name || '',
    affiliation: input.affiliation || existingPersona.mentor?.affiliation || '',
    title: input.title || existingPersona.mentor?.title || 'Professor',
    authorizedBy: input.authorizedBy || existingPersona.authorization?.authorizedBy || personaRecord.authorizedBy,
    consentNotes: input.consentNotes || existingPersona.authorization?.consentNotes || personaRecord.consentNotes || '',
    publicUrls,
    slug: input.slug
  };

  const built = await (updatePersonaArtifacts as any)({
    mentor,
    existingSources: (personaRecord.sourcesJson || []) as any[],
    publicUrls,
    uploads: [...uploads.map((item) => item.descriptor), ...projectUploads],
    wechatUploads: wechatUploads.map((item) => item.descriptor),
    meetingUploads: meetingUploads.map((item) => item.descriptor),
    thinkingQuestionnaireUploads: thinkingQuestionnaireUploads.map((item) => item.descriptor),
    aiChatShareUploads: aiChatShareDescriptors(aiChatShareUrls),
    skipPublicSearch: input.skipPublicSearch,
    disableOpenalex: input.disableOpenalex,
    mentorSpeaker: input.mentorSpeaker || existingInput.mentorSpeaker || '',
    meetingSpeaker: input.meetingSpeaker || existingInput.meetingSpeaker || ''
  });

  built.persona.createdAt = existingPersona.createdAt || built.persona.createdAt;
  built.persona.updatedAt = new Date().toISOString();
  built.persona.mentor = {
    ...built.persona.mentor,
    slug: input.slug
  };

  const updatedInput = {
    ...existingInput,
    name: mentor.name,
    affiliation: mentor.affiliation,
    title: mentor.title,
    authorizedBy: mentor.authorizedBy,
    consentNotes: mentor.consentNotes,
    publicUrls,
    aiChatShareUrls,
    projectText: input.projectText || existingInput.projectText || '',
    mentorSpeaker: input.mentorSpeaker || existingInput.mentorSpeaker || '',
    meetingSpeaker: input.meetingSpeaker || existingInput.meetingSpeaker || '',
    uploadPaths: [...(existingInput.uploadPaths || []), ...uploads.map((item) => item.descriptor)],
    wechatPaths: [...(existingInput.wechatPaths || []), ...wechatUploads.map((item) => item.descriptor)],
    meetingPaths: [...(existingInput.meetingPaths || []), ...meetingUploads.map((item) => item.descriptor)],
    thinkingQuestionnairePaths: [
      ...(existingInput.thinkingQuestionnairePaths || []),
      ...thinkingQuestionnaireUploads.map((item) => item.descriptor)
    ],
    updatedAt: new Date().toISOString()
  };

  const { persona } = await db.$transaction(async (tx) => {
    // Persona evidence updates should not rewrite the user-authored public Skill page.
    // The Skill record is the product-facing presentation layer; the Persona record is
    // the AI runtime layer. Keep Skill fields intact unless the user explicitly edits them
    // through the Skill editing flow.
    const persona = await tx.persona.update({
      where: { id: personaRecord.id },
      data: {
        personaJson: built.persona as any,
        agentCard: built.agentCard,
        sourcesJson: built.sources as any,
        chunksJson: built.chunks as any,
        inputJson: updatedInput as any,
        version: built.persona.version || personaRecord.version,
        authorizedBy: mentor.authorizedBy,
        consentNotes: mentor.consentNotes || null,
        llmProvider: built.llmProviderKind,
        llmModel: built.llmModel,
        buildStatus: 'completed',
        buildError: null,
        builtAt: new Date(),
        sourceCount: built.sourceCount,
        publicSourceCount: built.publicSourceCount,
        uploadSourceCount: built.uploadSourceCount,
        privateSourceCount: built.privateSourceCount,
        chunkCount: built.chunkCount
      }
    });

    await createUploadRows(tx, persona.id, [...uploads, ...wechatUploads, ...meetingUploads, ...thinkingQuestionnaireUploads], built.sources);
    return { persona };
  });

  return {
    skill: personaRecord.skill,
    persona,
    built
  };
}
