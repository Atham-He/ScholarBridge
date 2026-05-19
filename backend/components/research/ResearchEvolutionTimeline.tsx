'use client';

import { useState } from 'react';

interface ResearchWork {
  id: string;
  topicId: string;
  title: string;
  year: string;
  venue: string;
  type: string;
  summary: string;
  image: string;
  tags: string[];
}

interface ResearchTopic {
  id: string;
  year: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  accent: 'blue' | 'gold' | 'green' | 'teal' | 'slate';
  description: string;
}

const accentStyles: Record<ResearchTopic['accent'], {
  node: string;
  soft: string;
  text: string;
  line: string;
}> = {
  blue: {
    node: 'border-[#9cc9df] bg-[#E8F2F7]',
    soft: 'border-[#D8E8F2] bg-[#F3FAFD]',
    text: 'text-[#17425d]',
    line: 'bg-[#9cc9df]',
  },
  gold: {
    node: 'border-[#d8b98c] bg-[#fff4df]',
    soft: 'border-[#ead7bb] bg-[#fff8ea]',
    text: 'text-[#8b603b]',
    line: 'bg-[#d8b98c]',
  },
  green: {
    node: 'border-[#afd9c2] bg-[#effaf4]',
    soft: 'border-[#cfe8d9] bg-[#f6fcf8]',
    text: 'text-[#2d7a4f]',
    line: 'bg-[#afd9c2]',
  },
  teal: {
    node: 'border-[#a7d7d9] bg-[#eefafa]',
    soft: 'border-[#cae7e8] bg-[#f7fcfc]',
    text: 'text-[#176567]',
    line: 'bg-[#a7d7d9]',
  },
  slate: {
    node: 'border-[#c8ccd3] bg-[#f1f3f6]',
    soft: 'border-[#d9dde4] bg-[#f8f9fb]',
    text: 'text-[#4d5663]',
    line: 'bg-[#c8ccd3]',
  },
};

const researchTopics: ResearchTopic[] = [
  {
    id: 'representation',
    year: '2018',
    title: 'Representation Learning',
    shortTitle: 'Representation',
    subtitle: 'Visual states',
    accent: 'blue',
    description: 'Early work on compact visual abstractions for downstream policy learning.',
  },
  {
    id: 'reinforcement',
    year: '2020',
    title: 'Reinforcement Learning',
    shortTitle: 'RL',
    subtitle: 'Preference signals',
    accent: 'gold',
    description: 'A shift toward reward design, preference shaping, and stable policy optimization.',
  },
  {
    id: 'robotics',
    year: '2022',
    title: 'Robot Learning',
    shortTitle: 'Robotics',
    subtitle: 'Embodied control',
    accent: 'green',
    description: 'Representative work connecting latent skills, tactile feedback, and robot autonomy.',
  },
  {
    id: 'human-ai',
    year: '2024',
    title: 'Human-AI Collaboration',
    shortTitle: 'Human-AI',
    subtitle: 'Interactive systems',
    accent: 'teal',
    description: 'Current focus on models that learn from small feedback sets and collaborate with humans.',
  },
  {
    id: 'embodied-agents',
    year: '2026',
    title: 'Embodied Agents',
    shortTitle: 'Agents',
    subtitle: 'Evaluation',
    accent: 'slate',
    description: 'Emerging work on reliable benchmark suites and continual evaluation for embodied agents.',
  },
];

const researchWorks: ResearchWork[] = [
  {
    id: 'contrastive-state-abstractions',
    topicId: 'representation',
    title: 'Contrastive Visual State Abstractions',
    year: '2018',
    venue: 'NeurIPS Workshop',
    type: 'Paper',
    summary: 'Introduced a compact state representation pipeline for data-efficient visual policy learning.',
    image: '/research-works/latent-skill-discovery.png',
    tags: ['Representation', 'Vision', 'Policy Learning'],
  },
  {
    id: 'causal-scene-embeddings',
    topicId: 'representation',
    title: 'Causal Scene Embeddings for Manipulation',
    year: '2019',
    venue: 'ICLR',
    type: 'Paper',
    summary: 'Explored causal visual factors that make robotic manipulation policies more transferable.',
    image: '/research-works/multimodal-world-models.png',
    tags: ['Causal Learning', 'Manipulation', 'Transfer'],
  },
  {
    id: 'preference-shaping',
    topicId: 'reinforcement',
    title: 'Preference Shaping for Safe Autonomy',
    year: '2020',
    venue: 'ICML',
    type: 'Paper',
    summary: 'Proposed a reward shaping method that uses sparse human preference feedback for safer policy improvement.',
    image: '/research-works/preference-shaping.png',
    tags: ['RL', 'Safety', 'Human Feedback'],
  },
  {
    id: 'offline-rl-teachers',
    topicId: 'reinforcement',
    title: 'Offline RL with Uncertain Teachers',
    year: '2021',
    venue: 'CoRL',
    type: 'Paper',
    summary: 'Studied how imperfect demonstrations can be weighted for reliable offline policy learning.',
    image: '/research-works/continual-evaluation.png',
    tags: ['Offline RL', 'Uncertainty', 'Demonstrations'],
  },
  {
    id: 'latent-skill-discovery',
    topicId: 'robotics',
    title: 'Latent Skill Discovery for Robot Learning',
    year: '2022',
    venue: 'RSS',
    type: 'Paper',
    summary: 'Presented a latent skill library that helps robots compose reusable behaviors across manipulation tasks.',
    image: '/research-works/latent-skill-discovery.png',
    tags: ['Robot Learning', 'Latent Skills', 'Manipulation'],
  },
  {
    id: 'sparse-human-corrections',
    topicId: 'robotics',
    title: 'Robot Learning from Sparse Human Corrections',
    year: '2023',
    venue: 'ICRA',
    type: 'Paper',
    summary: 'Reduced annotation cost by learning from brief corrective interventions during robot rollout.',
    image: '/research-works/preference-shaping.png',
    tags: ['Robotics', 'Corrections', 'Interactive Learning'],
  },
  {
    id: 'multimodal-world-models',
    topicId: 'human-ai',
    title: 'Multimodal World Models for Assistance',
    year: '2024',
    venue: 'Science Robotics',
    type: 'Article',
    summary: 'Built a multimodal world model that connects vision, language, and motion traces for assistive agents.',
    image: '/research-works/multimodal-world-models.png',
    tags: ['World Models', 'Multimodal', 'Assistance'],
  },
  {
    id: 'interactive-rl-labs',
    topicId: 'human-ai',
    title: 'Interactive RL for Lab-Scale Autonomy',
    year: '2025',
    venue: 'Nature Machine Intelligence',
    type: 'Article',
    summary: 'Defined a practical loop for researchers to guide autonomous lab agents without dense rewards.',
    image: '/research-works/preference-shaping.png',
    tags: ['Interactive RL', 'Lab Automation', 'Autonomy'],
  },
  {
    id: 'continual-evaluation',
    topicId: 'embodied-agents',
    title: 'Continual Evaluation for Embodied Agents',
    year: '2026',
    venue: 'Benchmark Release',
    type: 'Project',
    summary: 'A living benchmark suite for tracking embodied agents across changing tasks, environments, and safety constraints.',
    image: '/research-works/continual-evaluation.png',
    tags: ['Evaluation', 'Benchmarks', 'Embodied Agents'],
  },
  {
    id: 'adaptive-agent-audits',
    topicId: 'embodied-agents',
    title: 'Adaptive Audits for Agentic Systems',
    year: '2026',
    venue: 'Preprint',
    type: 'Preprint',
    summary: 'Introduced audit tasks that adapt to agent capability growth and expose failure modes over time.',
    image: '/research-works/multimodal-world-models.png',
    tags: ['Auditing', 'Reliability', 'Agent Safety'],
  },
];

function RepresentativeMiniCard({
  label,
  work,
  active,
  onClick,
}: {
  label: string;
  work: ResearchWork;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open representative work: ${work.title}`}
      className={[
        'group flex min-h-[118px] gap-3 rounded-[8px] border bg-white p-2.5 text-left shadow-[0_1px_2px_rgba(60,42,27,0.03)] transition',
        'hover:-translate-y-0.5 hover:border-[#8f623b] hover:shadow-[0_12px_24px_rgba(60,42,27,0.1)]',
        active ? 'border-[#8f623b] bg-[#fffaf4]' : 'border-[#E0D8CC]',
      ].join(' ')}
    >
      <span className="relative h-[92px] w-[86px] shrink-0 overflow-hidden rounded-[7px] border border-[#E0D8CC] bg-[#f5f0ea]">
        <img src={work.image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute left-2 top-2 rounded-full border border-white/60 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#8b603b] shadow-[0_4px_10px_rgba(60,42,27,0.12)]">
          {work.year}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col py-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a8b7d]">{label}</span>
        <span className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-[18px] text-[#17120e]">{work.title}</span>
        <span className="mt-1 truncate text-[11px] font-semibold text-[#8b603b]">{work.venue} · {work.type}</span>
        <span className="mt-1 line-clamp-2 text-[12px] leading-[18px] text-[#5B5148]">{work.summary}</span>
        <span className="mt-auto flex justify-end pt-1">
          <span className="text-[11px] font-semibold text-[#17425d] group-hover:underline">Expand</span>
        </span>
      </span>
    </button>
  );
}

function TopicMiniCard({
  topic,
  accent,
  onClick,
}: {
  topic: ResearchTopic;
  accent: typeof accentStyles[ResearchTopic['accent']];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select research topic: ${topic.title}`}
      className={`group flex min-h-[118px] gap-3 rounded-[8px] border p-2.5 text-left shadow-[0_1px_2px_rgba(60,42,27,0.03)] transition hover:-translate-y-0.5 hover:border-[#8f623b] hover:shadow-[0_12px_24px_rgba(60,42,27,0.1)] ${accent.soft}`}
    >
      <span className={`relative grid h-[92px] w-[86px] shrink-0 place-items-center overflow-hidden rounded-[7px] border border-white/50 ${accent.line}`}>
        <svg aria-hidden="true" className="h-11 w-11 text-white" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 34 18 12l10 24 14-28" />
        </svg>
        <span className="absolute left-2 top-2 rounded-full border border-white/60 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#8b603b] shadow-[0_4px_10px_rgba(60,42,27,0.12)]">
          {topic.year}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col py-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a8b7d]">Topic</span>
        <span className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-[18px] text-[#17120e]">{topic.title}</span>
        <span className={`mt-1 text-[11px] font-semibold ${accent.text}`}>{topic.subtitle}</span>
        <span className="mt-1 line-clamp-2 text-[12px] leading-[18px] text-[#5B5148]">{topic.description}</span>
        <span className="mt-auto flex justify-end pt-1">
          <span className="text-[11px] font-semibold text-[#17425d] group-hover:underline">Expand</span>
        </span>
      </span>
    </button>
  );
}

function RepresentativeFeatureCard({
  work,
  onClick,
}: {
  work: ResearchWork;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Expand representative work: ${work.title}`}
      className="group flex h-full flex-col overflow-hidden rounded-[10px] border-2 border-[#8f623b] bg-white p-3 text-left shadow-[0_10px_22px_rgba(60,42,27,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(60,42,27,0.12)]"
    >
      <span className="relative block overflow-hidden rounded-[8px] border border-[#e5d7c6] bg-[#f5f0ea]">
        <img src={work.image} alt="" className="h-[98px] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#8b603b] shadow-[0_6px_14px_rgba(60,42,27,0.14)]">
          {work.year} · {work.type}
        </span>
      </span>

      <span className="flex min-h-0 flex-1 flex-col pt-3">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a8b7d]">Enlarged Representative Work</span>
        <span className="mt-1.5 line-clamp-2 block text-[19px] font-semibold leading-[23px] text-[#17120e]">{work.title}</span>
        <span className="mt-1.5 block truncate text-[12px] font-semibold leading-5 text-[#8b603b]">{work.venue}</span>
        <span className="mt-2 line-clamp-2 block text-[13px] leading-5 text-[#5B5148]">{work.summary}</span>
        <span className="mt-auto flex justify-end pt-2">
          <span className="text-[12px] font-semibold text-[#17425d] group-hover:underline">Expand</span>
        </span>
      </span>
    </button>
  );
}

export function ResearchEvolutionTimeline({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [selectedTopicId, setSelectedTopicId] = useState('human-ai');
  const [selectedWorkId, setSelectedWorkId] = useState('multimodal-world-models');
  const [expandedWorkId, setExpandedWorkId] = useState<string | null>(null);

  const selectedTopic = researchTopics.find((topic) => topic.id === selectedTopicId) || researchTopics[0];
  const topicWorks = researchWorks.filter((work) => work.topicId === selectedTopic.id);
  const selectedWork = topicWorks.find((work) => work.id === selectedWorkId) || topicWorks[0];
  const expandedWork = expandedWorkId ? researchWorks.find((work) => work.id === expandedWorkId) || null : null;
  const expandedTopic = expandedWork
    ? researchTopics.find((topic) => topic.id === expandedWork.topicId) || selectedTopic
    : null;
  const selectedTopicIndex = Math.max(0, researchTopics.findIndex((topic) => topic.id === selectedTopic.id));
  const selectedAccent = accentStyles[selectedTopic.accent];
  const keyWork = topicWorks[0] || selectedWork;
  const supportingWork = topicWorks[1] || selectedWork;

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    const firstWork = researchWorks.find((work) => work.topicId === topicId);
    if (firstWork) {
      setSelectedWorkId(firstWork.id);
    }
  };

  return (
    <>
      <section className={`overflow-hidden rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] shadow-[0_1px_3px_rgba(60,42,27,0.05)] ${compact ? 'p-5' : 'p-6'} ${className}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[19px] font-semibold leading-6 text-[#17120e]">Research Interest Evolution</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5B5148]">
              Dynamic timeline of research interests, key topics, and representative works over time.
            </p>
          </div>
          <span className="inline-flex h-8 w-fit items-center rounded-full border border-[#D8E8F2] bg-[#F3FAFD] px-5 text-xs font-semibold text-[#17425d]">
            Auto-updated from profile signals
          </span>
        </div>

        <div className={`mt-5 grid gap-8 ${compact ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : 'xl:grid-cols-[minmax(0,1fr)_382px]'}`}>
          <div className="min-w-0">
            <div className="overflow-x-auto pb-1">
              <div className="relative min-w-[620px] pb-2 pt-1">
                <div className="absolute left-[38px] right-[38px] top-[40px] h-1 rounded-full bg-[#d8d0c5]" />
                <div
                  className="absolute left-[38px] top-[40px] h-1 rounded-full bg-[#8f623b]"
                  style={{
                    width: `calc((100% - 76px) * ${researchTopics.length > 1 ? selectedTopicIndex / (researchTopics.length - 1) : 0})`,
                  }}
                />
                <ol className="relative grid grid-cols-5 gap-2">
                  {researchTopics.map((topic) => {
                    const active = topic.id === selectedTopic.id;
                    return (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectTopic(topic.id)}
                          aria-pressed={active}
                          className="group grid w-full justify-items-center text-center"
                        >
                          <span className="mb-2 text-[12px] font-semibold tracking-[0.32em] text-[#8a8178]">{topic.year}</span>
                          <span
                            className={[
                              'relative z-10 grid h-8 w-8 place-items-center rounded-full border-[4px] bg-[#fffdf9] transition',
                              active
                                ? 'border-[#8f623b] shadow-[0_0_0_8px_rgba(143,98,59,0.16)]'
                                : 'border-[#d8d0c5] group-hover:border-[#8f623b]',
                            ].join(' ')}
                          >
                            <span className={active ? 'h-4 w-4 rounded-full bg-[#8f623b]' : 'h-2 w-2 rounded-full bg-transparent'} />
                          </span>
                          <span className="mt-3 text-[13px] font-semibold leading-4 text-[#17120e]">{topic.shortTitle}</span>
                          <span className="mt-1 text-[12px] leading-4 text-[#5B5148]">{topic.subtitle}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <RepresentativeMiniCard
                label="Key Work"
                work={keyWork}
                active={selectedWork.id === keyWork.id}
                onClick={() => {
                  setSelectedWorkId(keyWork.id);
                  setExpandedWorkId(keyWork.id);
                }}
              />

              <TopicMiniCard
                topic={selectedTopic}
                accent={selectedAccent}
                onClick={() => handleSelectTopic(selectedTopic.id)}
              />

              <RepresentativeMiniCard
                label="Selected"
                work={supportingWork}
                active={selectedWork.id === supportingWork.id}
                onClick={() => {
                  setSelectedWorkId(supportingWork.id);
                  setExpandedWorkId(supportingWork.id);
                }}
              />
            </div>
          </div>

          <RepresentativeFeatureCard work={selectedWork} onClick={() => setExpandedWorkId(selectedWork.id)} />
        </div>
      </section>

      {expandedWork && expandedTopic && (
        <ResearchWorkModal work={expandedWork} topic={expandedTopic} onClose={() => setExpandedWorkId(null)} />
      )}
    </>
  );
}

function ResearchWorkModal({
  work,
  topic,
  onClose,
}: {
  work: ResearchWork;
  topic: ResearchTopic;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(26,26,26,0.38)] px-4 py-8"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-work-title"
        className="max-h-[calc(100vh-64px)] w-full max-w-[860px] overflow-hidden rounded-[12px] border border-[#E0D8CC] bg-white shadow-[0_24px_64px_rgba(26,26,26,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid max-h-[calc(100vh-64px)] overflow-y-auto lg:grid-cols-[0.95fr_1fr]">
          <img src={work.image} alt="" className="h-full min-h-[320px] w-full bg-[#f5f0ea] object-cover" />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b603b]">{topic.year} · {topic.title}</p>
                <h2 id="research-work-title" className="mt-2 font-display text-[32px] font-semibold leading-tight text-[#17120e]">
                  {work.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#5B5148]">{work.year} · {work.venue} · {work.type}</p>
              </div>
              <button
                type="button"
                aria-label="Close representative work details"
                onClick={onClose}
                className="shrink-0 rounded-[8px] border border-[#E0D8CC] bg-white px-3 py-2 text-sm font-semibold text-[#17120e] transition hover:border-[#8b603b]"
              >
                Close
              </button>
            </div>

            <p className="mt-5 text-sm leading-7 text-[#5B5148]">{work.summary}</p>
            <div className="mt-5 rounded-[8px] border border-[#eee6dc] bg-[#fffdf9] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">Why this matters</p>
              <p className="mt-2 text-sm leading-6 text-[#5B5148]">
                This representative work explains how interest in {topic.title.toLowerCase()} connects to current recruiting topics and open project opportunities.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {work.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[#D8E8F2] bg-[#F3FAFD] px-3 py-1.5 text-xs font-semibold text-[#17425d]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
