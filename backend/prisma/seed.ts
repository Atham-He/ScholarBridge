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
      subtitle: "Verifiable problems",
      accent: "blue",
      description:
        "Systematically find low-hanging fruit in mathematics: valuable problems that are computable, formalizable, and easy to verify.",
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
      subtitle: "Verifiable outcomes",
      accent: "gold",
      description:
        "Discover verifiable research outcomes, prioritize work with clear return value, and feed verified data back into project strategy and model training.",
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
        "Search for low-hanging fruit in mathematics: problems that are valuable, computable, and easy to verify. The direction emphasizes formalizable tasks, automatically checked answers, new verified datasets, iterative model improvement, and human-AI collaboration around problem selection and failure analysis.",
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
        "Design research workflows that prioritize verifiable outcomes and measurable return value. The direction studies token-economics for research: allocate compute and human attention toward ideas that can be checked, rewarded, converted into training data, and used to produce stronger hypotheses and viewpoints.",
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
            "XiaoLuo Zhang studies how AI systems can discover verifiable mathematical and scientific opportunities, turn results into useful training data, and support human-AI collaboration. His current direction emphasizes low-hanging-fruit discovery, token-economics for research prioritization, and closed-loop improvement rather than one-shot generation.",
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
        "AutoResearch explores how to systematically discover verifiable research outcomes instead of only generating more text. The project prioritizes directions where progress can be checked, rewarded, and converted into useful training data. It studies a token-economics view of research: spend compute and human attention first on work with clear return value, use verified outputs to feed back into project design and model training, and develop methods for proposing more numerous and higher-quality viewpoints, hypotheses, and research angles.",
      researchArea: "AutoResearch / Verifiable Research",
      startTime: "2026 Spring",
      endTime: "Ongoing",
      location: "Remote / Hybrid",
      requirements:
        "Useful backgrounds include LLM agents, information retrieval, scientific evaluation, research strategy, incentive design, data flywheels, or hypothesis generation. Collaborators should care about whether an idea can be verified, whether it has return value, and how verified outcomes can improve the next research cycle.",
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
        "AutoExperiment explores how simulation and embodied intelligence can automatically complete experiments for education and research. The project focuses on building simulation environments, defining protocol standards, training embodied agents, sampling interaction data, and closing the loop between simulated trial outcomes and improved experimental policies. The goal is to make agents understand what to manipulate, what to measure, how to log state transitions, and how to turn simulated practice into reusable educational or research workflows.",
      researchArea: "Embodied AI / Experiment Simulation",
      startTime: "2026 Spring",
      endTime: "Ongoing",
      location: "Remote / Hybrid",
      requirements:
        "Helpful backgrounds include robotics simulation, embodied AI, reinforcement learning, protocol design, education technology, data collection, or scientific workflow engineering. Practical engineering ability and careful experiment logging are important.",
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
        "AutoMath is designed to systematically search for low-hanging fruit in mathematics: problems that are valuable, computable, and easy to verify, such as verifiable computational math problems or mathematical questions that can be formalized. The project treats verification as the organizing principle. Agents propose candidate problems, solve or formalize them, collect new verified data, and use that data to iteratively improve the training and evaluation of reasoning models. A continuing theme is human-AI collaboration: researchers steer problem selection, inspect failures, and decide which verified artifacts should become datasets, benchmarks, or training signals.",
      researchArea: "AI4MATH / Verifiable Reasoning",
      startTime: "2026 Spring",
      endTime: "Ongoing",
      location: "Remote / Hybrid",
      requirements:
        "Helpful preparation includes mathematical problem solving, formal methods, theorem proving, symbolic reasoning, algorithms, LLM training and evaluation, or human-AI workflow design. Collaborators should be willing to analyze which problems are genuinely easy to verify and high-value.",
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
