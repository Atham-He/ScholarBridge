export function buildDistillPrompts({ mentor, evidencePreview }) {
  return {
    system: [
      'You are building an authorized mentor twin for an academic platform.',
      'Return strict JSON only.',
      'Be conservative, separate evidence-backed facts from inference, and avoid inventing private information.',
      'The output should help a student understand the mentor and help the mentor pre-screen students.'
    ].join(' '),
    user: `
Mentor:
${JSON.stringify(mentor, null, 2)}

Evidence preview:
${evidencePreview}

Return JSON with the following shape:
{
  "overview": "string",
  "researchTopics": [{"name":"string","confidence":0.0,"evidence":["source id"]}],
  "methods": ["string"],
  "currentProjects": [{"title":"string","summary":"string","requiredSkills":["string"],"fitSignals":["string"]}],
  "communicationStyle": {"voiceSummary":"string","doSay":["string"],"avoid":["string"]},
  "mentorshipStyle": {"expectations":["string"],"preferredStudents":["string"],"screeningQuestions":["string"]},
  "screeningRubric": {"hardRequirements":["string"],"positiveSignals":["string"],"concerns":["string"]},
  "personalInterests": ["string"],
  "guardrails": ["string"],
  "provenance": {"topSources":["source id"],"confidenceNotes":"string"}
}
    `.trim()
  };
}

export function buildChatPrompts({ persona, retrievedChunks, sessionHistory, message, studentProfile }) {
  return {
    system: `
You are the authorized AI mentor twin of ${persona.mentor.name}.
You must disclose that you are an AI twin, not the literal human.
Stay aligned with the persona profile, but do not fabricate facts.
Use the mentor's tone: ${persona.communicationStyle?.voiceSummary || 'measured, direct, academically precise'}.
If evidence is weak, say so.
Do not promise admission, funding, authorship, or confidential details.
    `.trim(),
    user: `
Persona:
${JSON.stringify(persona, null, 2)}

Student profile:
${JSON.stringify(studentProfile || {}, null, 2)}

Recent session history:
${JSON.stringify(sessionHistory || [], null, 2)}

Retrieved evidence:
${JSON.stringify(retrievedChunks || [], null, 2)}

Student message:
${message}

Write a reply in Chinese unless the student clearly used another language.
Structure:
1. One-sentence disclosure that this is an authorized AI twin.
2. Direct answer.
3. Practical next steps or follow-up questions.
4. A short "证据依据" block listing source ids or titles when possible.
    `.trim()
  };
}

export function buildEvaluationPrompts({ persona, studentProfile, transcript, retrievedChunks }) {
  return {
    system: `
You are helping an authorized mentor twin produce a transparent student-screening recommendation.
Return strict JSON only.
Do not make the final decision. Output a recommendation for human review.
    `.trim(),
    user: `
Persona:
${JSON.stringify(persona, null, 2)}

Student profile:
${JSON.stringify(studentProfile || {}, null, 2)}

Transcript:
${JSON.stringify(transcript || [], null, 2)}

Relevant evidence:
${JSON.stringify(retrievedChunks || [], null, 2)}

Return JSON:
{
  "researchFit": {"score":0-100,"rationale":"string","evidence":["string"]},
  "technicalDepth": {"score":0-100,"rationale":"string","evidence":["string"]},
  "communication": {"score":0-100,"rationale":"string","evidence":["string"]},
  "initiative": {"score":0-100,"rationale":"string","evidence":["string"]},
  "overallScore": 0-100,
  "recommendation": "do_not_progress|needs_human_review|recommend_interview|strong_recommendation",
  "summary": "string",
  "followUpQuestions": ["string"]
}
    `.trim()
  };
}
