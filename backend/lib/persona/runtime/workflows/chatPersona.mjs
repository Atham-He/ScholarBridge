import { nowIso, safeId } from '../lib/utils.mjs';
import { chatAsPersona } from '../services.mjs';

export async function chatPersonaWorkflow({ slugOrName, message, studentProfile, sessionId, store, llmProvider }) {
  const bundle = await store.loadPersonaBundle(slugOrName);
  if (!bundle.persona) {
    throw new Error(`Persona not found or invalid slug: ${slugOrName}`);
  }

  const actualSessionId = sessionId || safeId('sess');
  const session = await store.loadSession(bundle.persona.mentor.slug, actualSessionId);
  const result = await chatAsPersona({
    persona: bundle.persona,
    chunks: bundle.chunks,
    session,
    message,
    studentProfile,
    llmProvider
  });

  await store.saveSessionTurn(bundle.persona.mentor.slug, actualSessionId, {
    createdAt: nowIso(),
    role: 'student',
    message,
    studentProfile: studentProfile || {},
    answer: result.answer,
    citations: result.citations
  });

  return {
    sessionId: actualSessionId,
    mentor: bundle.persona.mentor,
    answer: result.answer,
    citations: result.citations,
    retrievedChunks: result.retrievedChunks.map((item) => ({
      sourceId: item.sourceId,
      title: item.title,
      chunkIndex: item.chunkIndex
    }))
  };
}
