import { db } from '../lib/db';
import { createPersonaForMentor, updatePersonaForMentor } from '../lib/persona/manager';
import { PersonaChatService } from '../lib/persona/chat';
import { StudentEvaluationService } from '../lib/persona/evaluation';
import { createLLMProviderFromEnv } from '../lib/persona/llm';
import { extractAiChatShareTurnsFromRenderedHtml } from '../lib/persona/runtime/parsers/aiChatShare.mjs';
import { appendAdvancedPersonaFields, createEmptyAdvancedPersonaValues } from '../app/mentor/skills/persona-form-data';

async function main() {
  process.env.PERSONA_LLM_PROVIDER = process.env.PERSONA_LLM_PROVIDER || 'mock';
  process.env.WEB_SEARCH_PROVIDER = process.env.WEB_SEARCH_PROVIDER || 'none';

  const parsedShare = extractAiChatShareTurnsFromRenderedHtml(`
    <html>
      <head><title>ChatGPT - Synthetic Mentor Review</title></head>
      <body>
        <main>
          <div data-testid="conversation-turn-1">
            <div data-message-author-role="user">
              <div class="user-message-bubble-color">Please break this research idea into baseline, metric, and minimum experiment.</div>
            </div>
          </div>
          <div data-testid="conversation-turn-2">
            <div data-message-author-role="assistant">
              <div class="markdown">Start from the concrete scenario, then define the strongest baseline and metric.</div>
            </div>
          </div>
        </main>
      </body>
    </html>
  `);

  if (parsedShare.turns.length !== 2 || parsedShare.turns[0].role !== 'user' || parsedShare.turns[1].role !== 'assistant') {
    throw new Error('AI chat share HTML parser regression');
  }

  const formData = new FormData();
  const advancedValues = createEmptyAdvancedPersonaValues();
  advancedValues.aiChatShareUrlsText = [
    'https://chatgpt.com/share/first-example',
    'https://chatgpt.com/share/second-example'
  ].join(' ; ');
  appendAdvancedPersonaFields(formData, advancedValues);
  if (formData.getAll('aiChatShareUrls').length !== 2) {
    throw new Error('AI chat share URL delimiter regression');
  }

  const stamp = Date.now().toString(36);
  const email = `persona-smoke-${stamp}@example.com`;
  const user = await db.user.create({
    data: {
      email,
      role: 'MENTOR',
      mentorProfile: {
        create: {
          displayName: 'Smoke Mentor',
          institution: 'Example University',
          department: 'Computer Science',
          title: 'Professor'
        }
      }
    },
    include: {
      mentorProfile: true
    }
  });

  const uploadFile = new File(
    ['Research interests: multimodal learning, reproducibility, strong baselines, and student mentoring.'],
    'research_notes.txt',
    { type: 'text/plain' }
  );

  const wechatFile = new File(
    [[
      '2026-04-24 10:00 Smoke Mentor: Narrow the problem first. Do not start with a bigger model.\n',
      '2026-04-24 10:01 Student A: I want to work on multimodal retrieval.\n',
      '2026-04-24 10:02 Smoke Mentor: Bring me the baseline, the metric, and the minimum experiment.'
    ].join('')],
    'wechat_chat.txt',
    { type: 'text/plain' }
  );

  const meetingFile = new File(
    [[
      '00:00:01 Smoke Mentor: Start from the problem and the hypothesis, not from the result.',
      '00:00:08 Student A: The current benchmark result improved.',
      '00:00:14 Smoke Mentor: Is the baseline strong enough? Where are the failure cases and ablations?'
    ].join('\n')],
    'group_meeting.srt',
    { type: 'text/plain' }
  );

  const questionnaireFile = new File(
    [[
      '### [taste.preferred_problems] Preferred problem type',
      'I prefer problems with clear definitions, measurable outcomes, and strong failure analysis.',
      '',
      '### [process.problem_selection] How do you select problems',
      'I first check the concrete scenario, baseline, and metric, then discuss novelty.',
      '',
      '### [evidence.minimum_evidence] Minimum acceptable evidence',
      'I need a strong baseline, key ablations, error analysis, and a next-step hypothesis.'
    ].join('\n')],
    'thinking_questionnaire.md',
    { type: 'text/markdown' }
  );

  const created = await createPersonaForMentor({
    ownerUserId: user.id,
    mentor: {
      name: 'Smoke Mentor',
      affiliation: 'Example University, Department of Computer Science',
      title: 'Professor',
      authorizedBy: email,
      consentNotes: 'smoke test',
      publicUrls: ['https://example.com/']
    },
    publicUrls: ['https://example.com/'],
    uploads: [uploadFile],
    wechatFiles: [wechatFile],
    meetingFiles: [meetingFile],
    thinkingQuestionnaireFiles: [questionnaireFile],
    projectText: 'Looking for students who can reproduce papers and explain failure cases.',
    skipPublicSearch: true,
    mentorSpeaker: 'Smoke Mentor',
    meetingSpeaker: 'Smoke Mentor'
  });

  const customSkillFields = {
    title: 'Smoke Mentor Research Openings',
    profileMarkdown: [
      '# Smoke Mentor Research Openings',
      '',
      '## Public summary',
      '- This is the user-authored public Skill profile.',
      '- It should not be replaced by persona update.',
      '',
      '## Expectations',
      '- Reproducible experiments',
      '- Clear failure analysis'
    ].join('\n'),
    researchSummary: 'User-authored public research summary.',
    agentIntro: 'User-authored public agent intro.',
    tags: ['Custom Tag', 'Systems']
  };

  await db.skill.update({
    where: { id: created.skill.id },
    data: customSkillFields as any
  });

  const llmProvider = await createLLMProviderFromEnv();
  const chatService = new PersonaChatService(llmProvider);
  const chat = await chatService.chat({
    persona: created.built.persona,
    chunks: created.built.chunks as any[],
    message: '我应该怎么开始准备一个新的研究 idea？',
    studentProfile: {
      name: 'Test Student',
      background: 'Has reproduced two papers and built PyTorch baselines.'
    },
    session: { turns: [] }
  });

  const evaluator = new StudentEvaluationService(llmProvider);
  const evaluation = await evaluator.evaluate({
    persona: created.built.persona,
    chunks: created.built.chunks as any[],
    studentProfile: {
      name: 'Test Student',
      interests: ['multimodal learning', 'retrieval'],
      experience: ['reproduced papers', 'built baseline in PyTorch']
    },
    transcript: [
      { role: 'user', content: 'I reproduced a retrieval baseline and analyzed failure cases.' },
      { role: 'assistant', content: chat.answer }
    ]
  });

  const updateFile = new File(
    ['Additional update: students should bring quantitative metric tables and ablation evidence.'],
    'update_notes.txt',
    { type: 'text/plain' }
  );

  const updated = await updatePersonaForMentor({
    slug: created.persona.slug,
    ownerUserId: user.id,
    projectText: 'Updated: require metric table, error analysis, and minimum viable experiment.',
    uploads: [updateFile],
    publicUrls: ['https://www.iana.org/domains/example'],
    skipPublicSearch: true,
    mentorSpeaker: 'Smoke Mentor',
    meetingSpeaker: 'Smoke Mentor'
  });

  const updatedSkill = await db.skill.findUnique({
    where: { id: created.skill.id },
    select: {
      title: true,
      profileMarkdown: true,
      researchSummary: true,
      agentIntro: true,
      tags: true
    }
  });

  if (!updatedSkill) {
    throw new Error('Updated skill record not found');
  }

  const updatedTags = Array.isArray(updatedSkill.tags) ? updatedSkill.tags : [];
  if (
    updatedSkill.title !== customSkillFields.title ||
    updatedSkill.profileMarkdown !== customSkillFields.profileMarkdown ||
    updatedSkill.researchSummary !== customSkillFields.researchSummary ||
    updatedSkill.agentIntro !== customSkillFields.agentIntro ||
    JSON.stringify(updatedTags) !== JSON.stringify(customSkillFields.tags)
  ) {
    throw new Error('Persona update overwrote user-authored Skill display fields');
  }

  const summary = {
    slug: created.persona.slug,
    created: {
      sourceCount: created.built.sourceCount,
      publicSourceCount: created.built.publicSourceCount,
      uploadSourceCount: created.built.uploadSourceCount,
      privateSourceCount: created.built.privateSourceCount,
      chunkCount: created.built.chunkCount
    },
    chat: {
      answerPreview: chat.answer.slice(0, 240),
      citationCount: chat.citations.length
    },
    evaluation: {
      overallScore: evaluation.overallScore,
      recommendation: evaluation.recommendation,
      lowEvidence: evaluation.evidenceQuality?.lowEvidence
    },
    updated: {
      sourceCount: updated.built.sourceCount,
      addedSourceCount: updated.built.addedSourceCount,
      privateSourceCount: updated.built.privateSourceCount,
      chunkCount: updated.built.chunkCount
    },
    aiChatShareParser: {
      title: parsedShare.title,
      turnCount: parsedShare.turns.length
    },
    skillPresentationPreserved: {
      title: updatedSkill.title,
      researchSummary: updatedSkill.researchSummary,
      agentIntro: updatedSkill.agentIntro,
      tags: updatedTags
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
