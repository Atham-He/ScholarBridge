import path from 'node:path';
import { buildChunks } from '../retrieval.mjs';
import { distillPersona, generateAgentCard } from '../services.mjs';
import { nowIso, slugify } from '../lib/utils.mjs';
import { collectPersonaInputSources } from './buildPersona.mjs';

function uniqueStrings(items) {
  return [...new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean))];
}

function optionalText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text ? value : fallback;
}

function normalizeUrlForKey(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/+$/g, '').toLowerCase();
  } catch {
    return String(value || '').trim().replace(/\/+$/g, '').toLowerCase();
  }
}

function sourceKey(source) {
  if (source?.url) return `url:${normalizeUrlForKey(source.url)}`;
  if (source?.filePath) return `file:${path.resolve(source.filePath).toLowerCase()}`;
  if (source?.id) return `id:${source.id}`;
  return `fallback:${source?.origin || ''}:${source?.kind || ''}:${source?.title || ''}`;
}

export function mergeSources(existingSources = [], newSources = []) {
  const merged = [];
  const seen = new Set();
  for (const source of [...existingSources, ...newSources]) {
    const key = sourceKey(source);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }
  return merged;
}

function buildUpdatedInput({ existingInput = {}, input = {}, copiedUploads = [], publicUrls = [] }) {
  return {
    ...existingInput,
    ...input,
    name: optionalText(input.name, existingInput.name || ''),
    affiliation: optionalText(input.affiliation, existingInput.affiliation || ''),
    title: optionalText(input.title, existingInput.title || ''),
    authorizedBy: optionalText(input.authorizedBy, existingInput.authorizedBy || 'unknown'),
    consentNotes: optionalText(input.consentNotes, existingInput.consentNotes || ''),
    publicUrls,
    uploadPaths: [
      ...(existingInput.uploadPaths || []),
      ...copiedUploads
    ],
    projectText: input.projectText || existingInput.projectText || '',
    updatedAt: nowIso(),
    updates: [
      ...(existingInput.updates || []),
      {
        updatedAt: nowIso(),
        publicUrls: input.publicUrls || [],
        uploadCount: copiedUploads.length,
        hasProjectText: Boolean(input.projectText?.trim())
      }
    ]
  };
}

export async function updatePersonaWorkflow({ slug, input = {}, config, store, llmProvider }) {
  await store.init();
  const targetSlug = slugify(slug);
  if (!targetSlug || targetSlug !== String(slug || '').trim()) {
    throw new Error('Update requires an exact persona slug');
  }

  const existing = await store.loadPersonaBundle(targetSlug);
  if (!existing.persona) {
    throw new Error(`Persona not found: ${targetSlug}`);
  }

  const existingMentor = existing.persona.mentor || {};
  const existingAuthorization = existing.persona.authorization || {};
  const publicUrls = uniqueStrings([
    ...(existing.input?.publicUrls || []),
    ...(input.publicUrls || [])
  ]);
  const mentor = {
    name: optionalText(input.name, existingMentor.name),
    slug: existingMentor.slug || targetSlug,
    affiliation: optionalText(input.affiliation, existingMentor.affiliation || ''),
    title: optionalText(input.title, existingMentor.title || 'Professor'),
    authorizedBy: optionalText(input.authorizedBy, existingAuthorization.authorizedBy || existing.input?.authorizedBy || 'unknown'),
    consentNotes: optionalText(input.consentNotes, existingAuthorization.consentNotes || existing.input?.consentNotes || ''),
    publicUrls
  };

  const uploadsDir = store.uploadsDir(targetSlug);
  const { copiedUploads, publicSources, uploadSources } = await collectPersonaInputSources({
    input: {
      ...input,
      publicUrls
    },
    mentor,
    config,
    uploadsDir,
    llmProvider
  });

  const addedSources = [...publicSources, ...uploadSources];
  const sources = mergeSources(existing.sources || [], addedSources);
  if (!sources.length) {
    throw new Error('No sources available after update.');
  }

  const chunks = buildChunks(sources);
  const persona = await distillPersona({ mentor, sources, chunks, llmProvider });
  persona.createdAt = existing.persona.createdAt || persona.createdAt;
  persona.updatedAt = nowIso();
  persona.mentor = {
    ...(persona.mentor || {}),
    name: mentor.name,
    slug: targetSlug,
    affiliation: mentor.affiliation,
    title: mentor.title
  };
  persona.authorization = {
    ...(persona.authorization || {}),
    authorized: true,
    authorizedBy: mentor.authorizedBy,
    consentNotes: mentor.consentNotes
  };

  const agentCard = generateAgentCard(persona);
  const bundle = {
    input: buildUpdatedInput({
      existingInput: existing.input,
      input,
      copiedUploads,
      publicUrls
    }),
    sources,
    chunks,
    persona,
    agentCard
  };

  await store.savePersonaBundle(bundle);

  return {
    slug: targetSlug,
    persona,
    sourceCount: sources.length,
    addedSourceCount: addedSources.length,
    chunkCount: chunks.length,
    publicSourceCount: sources.filter((source) => source.origin === 'public').length,
    uploadSourceCount: sources.filter((source) => source.origin === 'upload').length,
    agentCardPath: path.join(store.personaDir(targetSlug), 'agent-card.md')
  };
}
