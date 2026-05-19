import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding unified ScholarBridge demo data...");

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
          bioShort: "Interested in NLP and trustworthy AI research.",
          backgroundBrief: "Undergraduate researcher with Python, PyTorch, and NLP project experience.",
          interests: ["NLP", "AI Safety"],
          skills: ["Python", "PyTorch", "Transformers"],
        },
      },
    },
  });

  const priya = await prisma.user.create({
    data: {
      email: "priya@demo.local",
      passwordHash,
      emailVerified: true,
      profile: {
        create: {
          displayName: "Priya Shah",
          institution: "Stanford University",
          department: "Computer Science",
          title: "PhD Candidate",
          education: "PhD Computer Science",
          bioShort: "PhD candidate publishing projects while applying to collaborations.",
          researchAreas: ["Human-AI Interaction", "NLP"],
          interests: ["Human-AI Interaction", "NLP", "Evaluation"],
          skills: ["Python", "User Studies", "LLM Evaluation"],
          aiAgentEnabled: true,
          aiHardWeight: 45,
          aiFitWeight: 55,
        },
      },
    },
  });

  const chen = await prisma.user.create({
    data: {
      email: "chen@demo.local",
      passwordHash,
      emailVerified: true,
      profile: {
        create: {
          displayName: "Prof. Jane Chen",
          institution: "MIT",
          department: "Computer Science",
          title: "Research Lead",
          bioShort: "AI researcher focusing on reinforcement learning and robotics.",
          location: "Cambridge, MA",
          researchAreas: ["Reinforcement Learning", "Robotics", "Multi-agent Systems"],
          aiAgentEnabled: true,
          aiHardWeight: 60,
          aiFitWeight: 40,
        },
      },
    },
  });

  const safetyProject = await prisma.project.create({
    data: {
      ownerUserId: chen.id,
      title: "AI Safety for Autonomous Systems",
      description: "Research on safe reinforcement learning for autonomous systems, combining theoretical foundations and practical robotics experiments.",
      researchArea: "Artificial Intelligence",
      startTime: "2026-09",
      endTime: "2028-09",
      location: "On-site",
      requirements: "Strong math background, Python, PyTorch, and reinforcement learning experience.",
      capacity: 3,
      status: "OPEN",
    },
  });

  const nlpProject = await prisma.project.create({
    data: {
      ownerUserId: priya.id,
      title: "LLM Evaluation for Research Assistants",
      description: "Build evaluation methods for AI research assistants that help applicants discover and compare research opportunities.",
      researchArea: "NLP",
      startTime: "2026-06",
      endTime: "2026-12",
      location: "Remote",
      requirements: "Experience with LLM APIs, evaluation design, or human-centered research.",
      capacity: 2,
      status: "OPEN",
    },
  });

  await prisma.savedProject.create({
    data: {
      userId: alex.id,
      projectId: safetyProject.id,
    },
  });

  await prisma.application.create({
    data: {
      applicantUserId: alex.id,
      ownerUserId: chen.id,
      projectId: safetyProject.id,
      coverLetter: "I have worked on PyTorch-based RL experiments and would like to contribute to safety evaluation.",
      status: "pending",
      aiHardScore: 78,
      aiFitScore: 84,
      aiScoreSummary: "Strong academic signals, and the applicant's RL project experience aligns well with the project focus.",
      aiScoredAt: new Date(),
    },
  });

  await prisma.application.create({
    data: {
      applicantUserId: priya.id,
      ownerUserId: chen.id,
      projectId: safetyProject.id,
      coverLetter: "My HAI background may help with evaluating safety behavior in user-facing systems.",
      status: "rejected",
      ownerFeedback: "Your profile is strong, but this project currently needs deeper RL systems experience.",
      aiHardScore: 86,
      aiFitScore: 58,
      aiScoreSummary: "Strong overall profile, but the fit with the reinforcement learning experimentation focus is only moderate.",
      aiScoredAt: new Date(),
    },
  });

  await prisma.application.create({
    data: {
      applicantUserId: alex.id,
      ownerUserId: priya.id,
      projectId: nlpProject.id,
      coverLetter: "I am interested in LLM evaluation and have built a small retrieval QA benchmark.",
      status: "accepted",
      ownerFeedback: "Good fit. Please prepare a short summary of your benchmark work.",
      aiHardScore: 74,
      aiFitScore: 88,
      aiScoreSummary: "The applicant's NLP and evaluation background is highly relevant to this project.",
      aiScoredAt: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log("Demo users: alex@demo.local, priya@demo.local, chen@demo.local");
  console.log("Password: demo123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
