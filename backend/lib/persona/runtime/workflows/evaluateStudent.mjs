import { nowIso } from '../lib/utils.mjs';
import { evaluateStudentFit } from '../services.mjs';

export async function evaluateStudentWorkflow({ slugOrName, studentProfile, transcript, sessionId, store, llmProvider }) {
  const bundle = await store.loadPersonaBundle(slugOrName);
  if (!bundle.persona) {
    throw new Error(`Persona not found or invalid slug: ${slugOrName}`);
  }

  let transcriptData = transcript;
  if ((!transcriptData || !transcriptData.length) && sessionId) {
    const session = await store.loadSession(bundle.persona.mentor.slug, sessionId);
    transcriptData = session?.turns || [];
  }

  const report = await evaluateStudentFit({
    persona: bundle.persona,
    chunks: bundle.chunks,
    studentProfile,
    transcript: transcriptData,
    llmProvider
  });

  const saved = await store.saveEvaluation(bundle.persona.mentor.slug, {
    ...report,
    createdAt: report.createdAt || nowIso(),
    mentorSlug: bundle.persona.mentor.slug,
    studentProfile,
    sessionId: sessionId || null
  });

  return {
    ...report,
    savedTo: saved
  };
}
