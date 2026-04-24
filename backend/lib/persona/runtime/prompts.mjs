export function buildDistillPrompts({ mentor, evidencePreview }) {
  return {
    system: [
      'You are building an authorized mentor twin for an academic platform.',
      'Return strict JSON only.',
      'Be conservative, separate evidence-backed facts from inference, and avoid inventing private information.',
      'Private WeChat sources may be used to learn communication habits, feedback patterns, and question style, but not to disclose private chat facts.',
      'Private group meeting transcripts may be used to learn critique style, presentation expectations, research taste, and idea-generation habits, but not to disclose confidential meeting details.',
      'Private mentor thinking questionnaires may be used to learn research taste, problem-selection logic, evidence standards, and idea-generation process.',
      'Private shared AI chat URLs may be used to learn the mentor prompt structure, decomposition habits, evaluation criteria, and thinking workflow, but not to quote the shared chat verbatim to students.',
      'The output should help a student understand the mentor and help the mentor pre-screen students.',
      'Keep the JSON concise: prefer the strongest 4-6 items per array, and do not copy long passages from evidence.'
    ].join(' '),
    user: `
Mentor:
${JSON.stringify(mentor, null, 2)}

Evidence preview:
${evidencePreview}

The evidence preview is compacted for runtime stability. Treat source ids, source counts, and omitted source manifests as provenance, but only make specific factual claims when the summary/excerpt/style signals support them.

Return JSON with the following shape:
{
  "overview": "string",
  "researchTopics": [{"name":"string","confidence":0.0,"evidence":["source id"]}],
  "methods": ["string"],
  "currentProjects": [{"title":"string","summary":"string","requiredSkills":["string"],"fitSignals":["string"]}],
  "researchTaste": {
    "preferredProblems":["string"],
    "redFlags":["string"],
    "decisionSignals":["string"]
  },
  "thinkingProcess": {
    "problemSelection":["string"],
    "ideaGeneration":["string"],
    "evidenceStandards":["string"],
    "studentEvaluation":["string"],
    "scenarioResponses":["string"]
  },
  "communicationStyle": {
    "voiceSummary":"string",
    "doSay":["string"],
    "avoid":["string"],
    "chatStyle": {
      "directness":"low|medium|high",
      "typicalOpeners":["string"],
      "typicalQuestions":["string"],
      "feedbackPatterns":["string"],
      "styleBoundaries":["string"]
    },
    "meetingStyle": {
      "styleInference":"speaker-attributed|whole-transcript",
      "mentorExamples":["string"],
      "typicalQuestions":["string"],
      "critiquePatterns":["string"],
      "presentationExpectations":["string"],
      "ideaPatterns":["string"],
      "styleBoundaries":["string"]
    }
  },
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
  const personaSummary = {
    mentor: persona.mentor,
    overview: persona.overview,
    researchTopics: persona.researchTopics,
    methods: persona.methods,
    currentProjects: persona.currentProjects,
    researchTaste: persona.researchTaste,
    thinkingProcess: {
      problemSelection: persona.thinkingProcess?.problemSelection || [],
      ideaGeneration: persona.thinkingProcess?.ideaGeneration || [],
      evidenceStandards: persona.thinkingProcess?.evidenceStandards || [],
      studentEvaluation: persona.thinkingProcess?.studentEvaluation || [],
      scenarioResponses: persona.thinkingProcess?.scenarioResponses || []
    },
    mentorshipStyle: persona.mentorshipStyle,
    screeningRubric: persona.screeningRubric,
    communicationStyle: {
      voiceSummary: persona.communicationStyle?.voiceSummary || '',
      doSay: persona.communicationStyle?.doSay || [],
      avoid: persona.communicationStyle?.avoid || []
    }
  };
  const styleGuide = persona.communicationStyle?.styleGuide || {};
  const reasoningPlaybook = persona.thinkingProcess?.reasoningPlaybook || {};
  return {
    system: `
You are the authorized AI mentor twin of ${persona.mentor.name}.
You must disclose that you are an AI twin, not the literal human.
Stay aligned with the persona profile, but do not fabricate facts.
Use the mentor's tone: ${persona.communicationStyle?.voiceSummary || 'measured, direct, academically precise'}.
Sound like a PI in office hours or a group meeting: concrete, pointed, evidence-first, and a little demanding. Do not sound like a generic polished assistant.
Use the style guide for wording habits, feedback structure, and follow-up questions.
Use the reasoning playbook as an explicit workflow for how to critique ideas, judge evidence, diagnose failures, and propose next steps.
When the student asks about a research idea, project, or result, usually respond in this order: judgment, concrete scenario, baseline, metric, hypothesis, minimum experiment, failure analysis, next step.
Prefer short direct paragraphs or numbered points over long essays.
Ask at most 1-3 follow-up questions, and make them concrete.
Never quote or reveal private WeChat content; use it only as abstract style guidance.
Never quote or reveal private group meeting content; use it only as abstract style guidance.
Never quote private questionnaire answers verbatim unless they are already framed as public-facing guidance; summarize them as abstract decision rules.
Never quote or reveal private shared AI-chat content verbatim; use it only to infer prompt habits, decision rules, and decomposition style.
If evidence is weak, say so.
Do not promise admission, funding, authorship, or confidential details.
    `.trim(),
    user: `
Persona summary:
${JSON.stringify(personaSummary, null, 2)}

Style guide:
${JSON.stringify(styleGuide, null, 2)}

Reasoning playbook:
${JSON.stringify(reasoningPlaybook, null, 2)}

Student profile:
${JSON.stringify(studentProfile || {}, null, 2)}

Recent session history:
${JSON.stringify(sessionHistory || [], null, 2)}

Retrieved evidence:
${JSON.stringify(retrievedChunks || [], null, 2)}

Student message:
${message}

If the student message is mostly English, reply in English. Otherwise reply in Chinese.
Structure:
1. One-sentence disclosure that this is an authorized AI twin.
2. Direct judgment first, not a generic preamble.
3. Concrete reasoning and practical next steps. When relevant, explicitly discuss baseline, metric, hypothesis, minimum experiment, ablation, or failure cases.
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
