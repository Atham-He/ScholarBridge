import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const xiaoluoTimeline = {
  topics: [
    {
      id: "ai4math-2025",
      year: "2025",
      title: "AI4MATH",
      shortTitle: "AI4MATH",
      subtitle: "Mathematical reasoning",
      accent: "blue",
      description:
        "Develop AI systems that combine language-model reasoning, formal verification, and problem decomposition for reliable mathematical discovery.",
    },
    {
      id: "neuro-symbolic-2025",
      year: "2025",
      title: "Neuro-Symbolic AI",
      shortTitle: "Neuro-Symbolic",
      subtitle: "Structured reasoning",
      accent: "teal",
      description:
        "Connect neural search with symbolic constraints so automated reasoning systems can be interpretable, checkable, and easier to steer.",
    },
    {
      id: "autoresearch-2026",
      year: "2026",
      title: "AutoResearch",
      shortTitle: "AutoResearch",
      subtitle: "Research automation",
      accent: "gold",
      description:
        "Build closed-loop research agents that move from literature reading and hypothesis generation to experiment planning, evaluation, and revision.",
    },
  ],
  works: [
    {
      id: "ai4math-direction-2025",
      topicId: "ai4math-2025",
      title: "AI4MATH Research Direction",
      year: "2025",
      venue: "Research Idea",
      type: "Theme",
      summary:
        "Use LLM agents, formal tools, and symbolic feedback to make mathematical reasoning more verifiable instead of only fluent. The focus is on proof search, theorem formalization, and multi-step problem solving pipelines that expose intermediate reasoning states.",
      image: "/images/project-templates/auto-math-scientific.png",
      tags: ["AI4MATH", "Formal Reasoning", "Proof Systems"],
    },
    {
      id: "neuro-symbolic-direction-2025",
      topicId: "neuro-symbolic-2025",
      title: "Neuro-Symbolic AI Research Direction",
      year: "2025",
      venue: "Research Idea",
      type: "Theme",
      summary:
        "Study hybrid systems where neural models propose candidates and symbolic modules check constraints, derive structure, or provide counterexamples. The goal is a research stack that is both powerful enough for discovery and transparent enough for scientific use.",
      image: "/images/project-templates/auto-math-scientific.png",
      tags: ["Neuro-Symbolic AI", "Constraint Reasoning", "Interpretability"],
    },
    {
      id: "autoresearch-direction-2026",
      topicId: "autoresearch-2026",
      title: "AutoResearch Research Direction",
      year: "2026",
      venue: "Research Idea",
      type: "Theme",
      summary:
        "Design automated research workflows that can read papers, form hypotheses, design experiments, inspect results, and revise assumptions. The emphasis is on rigorous evaluation loops rather than one-shot content generation.",
      image: "/images/project-templates/auto-research-scientific.png",
      tags: ["AutoResearch", "AI4SCI", "Research Agents"],
    },
  ],
};

async function main() {
  console.log("Seeding ScholarBridge demo data...");

  const passwordHash = await bcrypt.hash("demo123", 10);

  await prisma.application.deleteMany();
  await prisma.savedProject.deleteMany();
  await prisma.project.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const alex = await prisma.user.create({
    data: {
      email: "alex@demo.local",
      passwordHash,
      emailVerified: true,
      profile: {
        create: {
          displayName: "Alex Wang",
          institution: "UC Berkeley",
          education: "B.S. Computer Science",
          bioShort: "Interested in AI4MATH, scientific agents, and trustworthy LLM evaluation.",
          backgroundBrief:
            "Undergraduate researcher with Python, PyTorch, retrieval, and mathematical reasoning project experience.",
          interests: ["AI4MATH", "AI4SCI", "LLM Agents"],
          skills: ["Python", "PyTorch", "Evaluation", "Mathematical Reasoning"],
        },
      },
    },
  });

  const xiaoluo = await prisma.user.create({
    data: {
      email: "xiaoluo.zhang@demo.local",
      passwordHash,
      emailVerified: true,
      profile: {
        create: {
          displayName: "XiaoLuo Zhang",
          institution: "ScholarBridge Research Lab",
          department: "AI Research Systems",
          title: "Project Leader, AutoResearch",
          education: "AI4MATH, AI4SCI, and neuro-symbolic research systems",
          bioShort:
            "Researcher building automated research systems for AI4MATH, AI4SCI, and neuro-symbolic reasoning.",
          backgroundBrief:
            "XiaoLuo Zhang studies how AI systems can help researchers move from literature and hypotheses to verifiable reasoning, controlled experiments, and reproducible scientific workflows. His current direction emphasizes AutoResearch as a rigorous loop rather than a one-shot generation tool.",
          location: "Remote / Hybrid",
          contactEmail: "xiaoluo.zhang@demo.local",
          researchAreas: ["AI4MATH", "AI4SCI", "Neuro-Symbolic AI", "AutoResearch"],
          interests: ["AI4MATH", "AI4SCI", "Neuro-Symbolic AI", "AutoResearch", "Research Agents"],
          skills: ["LLM Agents", "Formal Reasoning", "Scientific Evaluation", "Experiment Automation"],
          materialsJson: {
            researchTimeline: xiaoluoTimeline,
          },
          aiAgentEnabled: true,
          aiHardWeight: 55,
          aiFitWeight: 45,
        },
      },
    },
  });

  const autoResearch = await prisma.project.create({
    data: {
      ownerUserId: xiaoluo.id,
      title: "AutoResearch",
      description:
        "AutoResearch explores a closed-loop academic research agent that links paper reading, hypothesis generation, experiment design, result inspection, and revision. The project focuses on scientific reliability: every step should leave an auditable trace, use explicit evaluation criteria, and support human researchers in deciding which hypotheses are worth pursuing.",
      researchArea: "AutoResearch / AI4SCI",
      startTime: "2026 Spring",
      endTime: "Ongoing",
      location: "Remote / Hybrid",
      requirements:
        "Useful backgrounds include LLM agents, information retrieval, scientific computing, evaluation design, or research workflow tooling. Collaborators should be comfortable reading papers and turning vague research questions into testable system components.",
      illustrationUrl: "/images/project-templates/auto-research-scientific.png",
      capacity: 6,
      status: "OPEN",
    },
  });

  const autoExperiment = await prisma.project.create({
    data: {
      ownerUserId: xiaoluo.id,
      title: "AutoExperiment",
      description:
        "AutoExperiment studies how research agents can plan, run, and evaluate experiments with minimal manual friction. The goal is not to replace scientific judgment, but to make experiment loops more reproducible: define variables, select baselines, run checks, compare outcomes, and document failures in a structured way.",
      researchArea: "AI4SCI / Experiment Automation",
      startTime: "2026 Spring",
      endTime: "Ongoing",
      location: "Remote / Hybrid",
      requirements:
        "Best suited for students interested in scientific machine learning, experiment orchestration, benchmark design, lab automation concepts, or data-driven evaluation. Practical engineering ability and careful logging habits are important.",
      illustrationUrl: "/images/project-templates/auto-experiment-scientific.png",
      capacity: 5,
      status: "OPEN",
    },
  });

  const autoMath = await prisma.project.create({
    data: {
      ownerUserId: xiaoluo.id,
      title: "AutoMath",
      description:
        "AutoMath focuses on verifiable mathematical reasoning with language models, symbolic tools, and proof-oriented feedback. The project investigates how agents can decompose problems, call formal or semi-formal checkers, recover from invalid steps, and produce reasoning traces that are useful to mathematicians rather than merely plausible.",
      researchArea: "AI4MATH / Neuro-Symbolic AI",
      startTime: "2026 Spring",
      endTime: "Ongoing",
      location: "Remote / Hybrid",
      requirements:
        "Helpful preparation includes discrete math, theorem proving, symbolic reasoning, algorithms, LLM tooling, or strong mathematical problem solving. Interest in rigorous failure analysis is more important than having every tool already mastered.",
      illustrationUrl: "/images/project-templates/auto-math-scientific.png",
      capacity: 6,
      status: "OPEN",
    },
  });

  await prisma.savedProject.create({
    data: {
      userId: alex.id,
      projectId: autoResearch.id,
    },
  });

  await prisma.application.create({
    data: {
      applicantUserId: alex.id,
      ownerUserId: xiaoluo.id,
      projectId: autoMath.id,
      coverLetter:
        "I have been studying mathematical reasoning benchmarks and would like to help build verifiable AI4MATH evaluation loops.",
      status: "pending",
      aiHardScore: 82,
      aiFitScore: 90,
      aiScoreSummary:
        "Strong fit for AutoMath because the applicant combines mathematical reasoning interest with practical evaluation experience.",
      aiScoredAt: new Date(),
    },
  });

  await prisma.application.create({
    data: {
      applicantUserId: alex.id,
      ownerUserId: xiaoluo.id,
      projectId: autoExperiment.id,
      coverLetter:
        "I am interested in reproducible scientific experiments and can contribute to benchmark logging and result analysis.",
      status: "accepted",
      ownerFeedback: "Good fit. Please prepare a short summary of your prior evaluation workflow.",
      aiHardScore: 78,
      aiFitScore: 86,
      aiScoreSummary:
        "The applicant has relevant evaluation skills and a clear interest in structured scientific experimentation.",
      aiScoredAt: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log("Demo users: alex@demo.local, xiaoluo.zhang@demo.local");
  console.log("Password: demo123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
