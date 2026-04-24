export const MENTOR_THINKING_QUESTIONNAIRE_VERSION = '2026-04-20.v1';

export const MENTOR_THINKING_SECTIONS = [
  {
    id: 'taste',
    title: 'Research Taste',
    purpose: 'Learn what the mentor considers a valuable, elegant, risky, or uninteresting research problem.',
    questions: [
      {
        id: 'taste.good_problem',
        required: true,
        prompt: '请描述你心中“值得做的好问题”的判断标准。最好给 2-3 个正例和反例。',
        guidance: 'Focus on novelty, importance, tractability, timing, data/evaluation availability, and fit with your lab.'
      },
      {
        id: 'taste.bad_problem',
        required: true,
        prompt: '什么样的问题你通常会劝学生不要做？请说明具体原因。',
        guidance: 'Mention incremental work, unclear benchmark value, weak motivation, impossible evaluation, or low scientific payoff if relevant.'
      },
      {
        id: 'taste.favorite_work',
        required: true,
        prompt: '列出 3 篇你很欣赏的论文、系统或 idea，并解释你欣赏它们的原因。',
        guidance: 'Do not only list names; explain what kind of taste each example represents.'
      },
      {
        id: 'taste.novelty_threshold',
        required: true,
        prompt: '你如何判断一个 idea 是否有足够 novelty？什么程度的“组合/改进”可以接受？',
        guidance: 'Give decision rules and examples if possible.'
      },
      {
        id: 'taste.risk_profile',
        required: false,
        prompt: '你更偏好高风险高收益、稳健渐进，还是两者按阶段组合？不同学生阶段是否不同？',
        guidance: 'Explain how you balance publishability, scientific value, and student growth.'
      },
      {
        id: 'taste.red_flags',
        required: true,
        prompt: '看到一个研究计划时，哪些信号会让你立刻警惕？',
        guidance: 'Examples: no baseline, no hypothesis, vague contribution, benchmark chasing, no failure plan.'
      }
    ]
  },
  {
    id: 'process',
    title: 'Thinking Process',
    purpose: 'Capture how the mentor moves from literature and observations to a concrete research plan.',
    questions: [
      {
        id: 'process.literature_reading',
        required: true,
        prompt: '你读一篇新论文时，通常按什么顺序判断它？你会问自己哪些问题？',
        guidance: 'Describe your mental checklist, not a generic reading method.'
      },
      {
        id: 'process.problem_selection',
        required: true,
        prompt: '从多个候选问题中选择一个时，你的排序规则是什么？',
        guidance: 'Mention importance, feasibility, evidence, competition, student ability, and time budget.'
      },
      {
        id: 'process.first_principles',
        required: false,
        prompt: '你会如何把一个模糊想法拆成假设、机制、实验和风险？',
        guidance: 'Give a step-by-step example if possible.'
      },
      {
        id: 'process.stop_or_continue',
        required: true,
        prompt: '项目推进中，什么时候应该继续、换方向、降级目标或停止？',
        guidance: 'Give observable decision signals.'
      },
      {
        id: 'process.tradeoffs',
        required: false,
        prompt: '当 novelty、实验效果、理论解释、工程复杂度冲突时，你怎么取舍？',
        guidance: 'State your preference order and exceptions.'
      }
    ]
  },
  {
    id: 'idea',
    title: 'Idea Generation',
    purpose: 'Learn how the mentor generates new research ideas rather than only evaluates existing proposals.',
    questions: [
      {
        id: 'idea.seed_to_project',
        required: true,
        prompt: '请举例说明你如何从一个 seed observation 发展出完整 research project。',
        guidance: 'Include the trigger, hypothesis, first experiment, and expected contribution.'
      },
      {
        id: 'idea.failure_to_hypothesis',
        required: true,
        prompt: '当实验失败或出现负结果时，你通常如何把它转化成下一个 hypothesis？',
        guidance: 'Describe what evidence makes a failure informative.'
      },
      {
        id: 'idea.cross_domain',
        required: false,
        prompt: '你会怎样从其他领域、工具或产业问题中迁移 idea？什么迁移是有价值的？',
        guidance: 'Mention analogies, mechanisms, or constraints that make transfer valid.'
      },
      {
        id: 'idea.minimum_experiment',
        required: true,
        prompt: '一个新 idea 最小可验证实验应该长什么样？',
        guidance: 'Specify baseline, metric, ablation, dataset, and timeline expectations.'
      },
      {
        id: 'idea.brainstorming_questions',
        required: true,
        prompt: '如果学生说“我想不出 idea”，你会连续问哪些问题帮助 TA 生成 idea？',
        guidance: 'Write the questions in your own voice.'
      }
    ]
  },
  {
    id: 'evidence',
    title: 'Evidence Standards',
    purpose: 'Learn what kind of evidence convinces or fails to convince the mentor.',
    questions: [
      {
        id: 'evidence.baseline',
        required: true,
        prompt: '你对 baseline 的最低要求是什么？什么时候 baseline 不可信？',
        guidance: 'Mention recency, implementation fairness, tuning, compute, and reporting.'
      },
      {
        id: 'evidence.metrics',
        required: true,
        prompt: '你如何选择评估指标？哪些指标会误导学生？',
        guidance: 'Explain metric validity and task alignment.'
      },
      {
        id: 'evidence.ablation',
        required: true,
        prompt: '你希望学生怎样设计 ablation，才能说明方法真正有效？',
        guidance: 'Include component, data, hyperparameter, robustness, and negative control if relevant.'
      },
      {
        id: 'evidence.error_analysis',
        required: true,
        prompt: '你希望学生如何做错误分析或失败案例分析？',
        guidance: 'Explain what categories or diagnosis you care about.'
      },
      {
        id: 'evidence.reproducibility',
        required: false,
        prompt: '你对代码、数据、实验记录和可复现性的要求是什么？',
        guidance: 'Mention logs, seeds, configs, versioning, and artifact quality.'
      }
    ]
  },
  {
    id: 'student',
    title: 'Student Evaluation And Mentoring',
    purpose: 'Capture how the mentor evaluates students and gives research feedback.',
    questions: [
      {
        id: 'student.fit_signals',
        required: true,
        prompt: '什么样的学生与你的组最匹配？请区分硬技能、软技能和研究习惯。',
        guidance: 'Give concrete observable signals.'
      },
      {
        id: 'student.red_flags',
        required: true,
        prompt: '哪些学生表现会让你担心 TA 不适合当前方向？',
        guidance: 'Avoid personality labels; focus on observable behavior.'
      },
      {
        id: 'student.proposal_feedback',
        required: true,
        prompt: '学生带来一个初步 proposal 时，你通常如何反馈？第一轮最想改什么？',
        guidance: 'Write the feedback sequence in your own style.'
      },
      {
        id: 'student.weekly_update',
        required: false,
        prompt: '你希望学生每周汇报包含哪些内容？',
        guidance: 'Mention problem, progress, evidence, blockers, next steps.'
      },
      {
        id: 'student.independence',
        required: true,
        prompt: '你如何判断学生是否具备独立推进科研的能力？',
        guidance: 'Give signals at undergraduate, master, PhD, or intern levels if useful.'
      }
    ]
  },
  {
    id: 'voice',
    title: 'Feedback Voice',
    purpose: 'Learn the mentor voice for idea critique without exposing private conversations.',
    questions: [
      {
        id: 'voice.common_phrases',
        required: false,
        prompt: '你在指导学生时常用哪些表达、追问或提醒？',
        guidance: 'Provide phrases you are comfortable letting the AI twin imitate abstractly.'
      },
      {
        id: 'voice.directness',
        required: false,
        prompt: '你反馈时通常多直接？什么时候会强硬，什么时候会鼓励探索？',
        guidance: 'Give boundaries and examples.'
      }
    ]
  },
  {
    id: 'scenario',
    title: 'Scenario Calibration',
    purpose: 'Use concrete situations to calibrate the mentor twin. Answer as if talking to a student.',
    questions: [
      {
        id: 'scenario.incremental_idea',
        required: true,
        prompt: '学生说：“我想把最近一个热门模型换到我们的任务上，应该能涨点。”你会怎么回应？',
        guidance: 'Answer in your own voice, including follow-up questions.'
      },
      {
        id: 'scenario.weak_baseline',
        required: true,
        prompt: '学生展示了新方法结果，但 baseline 很旧或调得不充分。你会怎么指出问题？',
        guidance: 'Be concrete about what must be redone.'
      },
      {
        id: 'scenario.negative_result',
        required: true,
        prompt: '学生做了两周实验，结果全是负的。你会怎么帮 TA 判断下一步？',
        guidance: 'Show how you separate bad idea, bad implementation, and useful failure.'
      },
      {
        id: 'scenario.hype_topic',
        required: false,
        prompt: '学生想追一个很热但与你主线关系不清的话题。你会怎么判断是否值得做？',
        guidance: 'Mention fit, timing, moat, and evidence.'
      },
      {
        id: 'scenario.student_screening',
        required: true,
        prompt: '一个学生说自己“对 AI 很感兴趣”，但没有明确经历。你会问哪些问题判断水平？',
        guidance: 'Write interview-style questions.'
      },
      {
        id: 'scenario.idea_generation',
        required: true,
        prompt: '请你现场示范：围绕你当前一个研究方向，如何生成 3 个不同风险等级的新 idea？',
        guidance: 'Include low-risk, medium-risk, high-risk ideas and why.'
      }
    ]
  }
];

export function allMentorThinkingQuestions() {
  return MENTOR_THINKING_SECTIONS.flatMap((section) => section.questions.map((question) => ({
    sectionId: section.id,
    sectionTitle: section.title,
    ...question
  })));
}

export function requiredMentorThinkingQuestionIds() {
  return allMentorThinkingQuestions()
    .filter((question) => question.required)
    .map((question) => question.id);
}

export function questionById(id) {
  return allMentorThinkingQuestions().find((question) => question.id === id) || null;
}

export function renderMentorThinkingQuestionnaireMarkdown(options = {}) {
  const mentorName = options.mentorName || '<导师姓名>';
  const compact = Boolean(options.compact);
  const lines = [
    '# 导师思考流程与科研品味问卷',
    '',
    `Questionnaire version: ${MENTOR_THINKING_QUESTIONNAIRE_VERSION}`,
    `Mentor: ${mentorName}`,
    '',
    '## 填写说明',
    '',
    '- 目标不是写宣传材料，而是让 agent 学会你的研究判断方式。',
    '- 请尽量写具体例子、反例、决策规则和你会对学生说的话。',
    '- 每题标题里的方括号 ID 请不要删除，例如 `[taste.good_problem]`。',
    '- 如果某题不适用，可以写“不适用”，但必答题建议给出至少 3-5 句话。',
    '- 场景题请直接用你会对学生说的口吻回答。',
    ''
  ];

  for (const section of MENTOR_THINKING_SECTIONS) {
    lines.push(`## ${section.title}`, '', section.purpose, '');
    for (const question of section.questions) {
      if (compact && !question.required) continue;
      lines.push(`### [${question.id}] ${question.prompt}`);
      lines.push('');
      lines.push(`Required: ${question.required ? 'yes' : 'no'}`);
      lines.push(`Guidance: ${question.guidance}`);
      lines.push('');
      lines.push('Answer:');
      lines.push('');
      lines.push('');
    }
  }

  return `${lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()}\n`;
}
