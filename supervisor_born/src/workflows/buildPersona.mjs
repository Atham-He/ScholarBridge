import fs from 'node:fs/promises';
import path from 'node:path';
import { parseUploadFiles } from '../parsers.mjs';
import { collectPublicSources } from '../providers/public.mjs';
import { buildChunks } from '../retrieval.mjs';
import { generateAgentCard, distillPersona } from '../services.mjs';
import { ensureDir, extensionFromMime, randomHex, safeId, sanitizeFileName, slugify } from '../lib/utils.mjs';

export function normalizeUploadInput(upload) {
  if (typeof upload === 'string') {
    return {
      path: upload,
      originalName: path.basename(upload),
      mimeType: ''
    };
  }

  return {
    path: upload?.path || upload?.filePath || '',
    originalName: upload?.originalName || upload?.originalname || path.basename(upload?.path || upload?.filePath || 'upload'),
    mimeType: upload?.mimeType || upload?.mimetype || ''
  };
}

function fileNameWithMimeExtension(fileName, mimeType) {
  if (path.extname(fileName)) return fileName;
  const inferred = extensionFromMime(mimeType);
  return inferred ? `${fileName}${inferred}` : fileName;
}

export async function copyUploadIntoDir(upload, targetDir) {
  const descriptor = normalizeUploadInput(upload);
  if (!descriptor.path) {
    throw new Error('Upload path is required');
  }

  const safeName = fileNameWithMimeExtension(
    sanitizeFileName(descriptor.originalName || path.basename(descriptor.path), 'upload'),
    descriptor.mimeType
  );
  const targetPath = path.join(targetDir, `${safeId('upload')}_${safeName}`);
  await fs.copyFile(descriptor.path, targetPath);

  return {
    path: targetPath,
    originalName: descriptor.originalName,
    mimeType: descriptor.mimeType
  };
}

export function buildPersonaSlugBase(input) {
  const base = slugify([input?.name, input?.affiliation].filter(Boolean).join(' '));
  return (base || slugify(input?.name) || 'mentor').slice(0, 140).replace(/-+$/g, '') || 'mentor';
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function createUniquePersonaSlug(input, store) {
  const base = buildPersonaSlugBase(input);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = `${base}-${randomHex(8)}`;
    if (!await pathExists(store.personaDir(slug))) {
      return slug;
    }
  }
  throw new Error(`Could not create a unique persona slug for ${input?.name || 'mentor'}`);
}

export async function collectPersonaInputSources({ input, mentor, config, uploadsDir, llmProvider }) {
  const copiedUploads = [];
  for (const upload of input.uploadPaths || []) {
    try {
      copiedUploads.push(await copyUploadIntoDir(upload, uploadsDir));
    } catch {
      // Ignore copy failure for now; parsing step will still use original if available.
      copiedUploads.push(normalizeUploadInput(upload));
    }
  }

  if (input.projectText?.trim()) {
    const virtualPath = path.join(uploadsDir, `${safeId('virtual')}.project.txt`);
    await fs.writeFile(virtualPath, input.projectText, 'utf8');
    copiedUploads.push({
      path: virtualPath,
      originalName: path.basename(virtualPath),
      mimeType: 'text/plain'
    });
  }

  const publicSources = await collectPublicSources({
    mentor,
    publicUrls: mentor.publicUrls,
    config,
    skipPublicSearch: Boolean(input.skipPublicSearch),
    disableOpenAlex: Boolean(input.disableOpenAlex)
  });

  const uploadSources = await parseUploadFiles(copiedUploads, llmProvider);
  return { copiedUploads, publicSources, uploadSources };
}

export async function buildPersonaWorkflow({ input, config, store, llmProvider }) {
  await store.init();

  if (!input.name) {
    throw new Error('Mentor name is required');
  }

  const slug = await createUniquePersonaSlug(input, store);
  const mentor = {
    name: input.name,
    slug,
    affiliation: input.affiliation || '',
    title: input.title || 'Professor',
    authorizedBy: input.authorizedBy || 'unknown',
    consentNotes: input.consentNotes || '',
    publicUrls: input.publicUrls || []
  };

  const personaDir = store.personaDir(mentor.slug);
  const uploadsDir = store.uploadsDir(mentor.slug);
  await ensureDir(personaDir);
  await ensureDir(uploadsDir);

  const { copiedUploads, publicSources, uploadSources } = await collectPersonaInputSources({
    input,
    mentor,
    config,
    uploadsDir,
    llmProvider
  });

  const sources = [...publicSources, ...uploadSources];
  if (!sources.length) {
    throw new Error('No sources collected. Provide at least one public URL or upload one file.');
  }

  const chunks = buildChunks(sources);
  const persona = await distillPersona({ mentor, sources, chunks, llmProvider });
  const agentCard = generateAgentCard(persona);

  const bundle = {
    input: {
      ...input,
      uploadPaths: copiedUploads
    },
    sources,
    chunks,
    persona,
    agentCard
  };

  await store.savePersonaBundle(bundle);

  return {
    slug: mentor.slug,
    persona,
    sourceCount: sources.length,
    chunkCount: chunks.length,
    publicSourceCount: publicSources.length,
    uploadSourceCount: uploadSources.length,
    agentCardPath: path.join(store.personaDir(mentor.slug), 'agent-card.md')
  };
}
