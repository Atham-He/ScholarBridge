import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const mentorEmail = "mentor@demo.local";
  const studentEmail = "student@demo.local";
  const password = await bcrypt.hash("demo123", 10);

  const mentor = await prisma.user.upsert({
    where: {
      email_role: {
        email: mentorEmail,
        role: "MENTOR",
      },
    },
    create: {
      email: mentorEmail,
      passwordHash: password,
      role: "MENTOR",
      mentorProfile: {
        create: {
          displayName: "Prof. Jane Chen",
          institution: "MIT · CSAIL",
          department: "Electrical Engineering and Computer Science",
          title: "Associate Professor",
          bioShort:
            "I lead the Autonomous Systems Lab at MIT CSAIL, focusing on multi-agent RL and real-world robotics.",
          location: "Cambridge, MA",
        },
      },
    },
    update: {
      mentorProfile: {
        update: {
          displayName: "Prof. Jane Chen",
          institution: "MIT · CSAIL",
          department: "Electrical Engineering and Computer Science",
          title: "Associate Professor",
          bioShort:
            "I lead the Autonomous Systems Lab at MIT CSAIL, focusing on multi-agent RL and real-world robotics.",
          location: "Cambridge, MA",
        },
      },
    },
    include: { mentorProfile: true },
  });

  const skill = await prisma.skill.upsert({
    where: { slug: "zhang-lab-nlp" },
    create: {
      ownerUserId: mentor.id,
      slug: "zhang-lab-nlp",
      title: "Autonomous Systems Lab — Safe MARL & Robotics",
      profileMarkdown: [
        "## Lab focus",
        "- Multi-agent reinforcement learning under uncertainty",
        "- Safety and sim-to-real transfer for autonomous systems",
        "",
        "## What we look for",
        "- Strong math / control background; RL experience is a plus",
        "- Interest in deployment (campus shuttles, traffic scenarios)",
        "",
        "## FAQ",
        "Q: Funding?",
        "A: PhD positions are fully funded (RA/TA); details vary by year.",
      ].join("\n"),
      status: "PUBLISHED",
      isPublic: true,
      publishedAt: new Date(),
      tags: ["Reinforcement Learning", "Multi-agent Systems", "Robotics", "Game Theory", "Safe AI"],
      hIndex: 42,
      citationsDisplay: "8.2K",
      researchSummary:
        "Strong focus on multi-agent coordination under uncertainty. Recurring themes: safety guarantees, emergent communication, scalable decentralization, and sim-to-real transfer. (Demo summary aligned with ScholarBridge UI.)",
      publications: [
        {
          title: "Decentralized Safe MARL via Barrier Certificates",
          detail: "NeurIPS 2024 · Chen et al. · 312 citations",
        },
        {
          title: "Emergent Language in Cooperative Games",
          detail: "ICML 2023 · Chen, Liu, Park · 201 citations",
        },
        {
          title: "Scalable Multi-Agent Policy Optimization",
          detail: "ICLR 2023 · Chen et al. · 487 citations",
        },
        {
          title: "Real-World Deployment of Cooperative Agents",
          detail: "CoRL 2022 · 159 citations",
        },
      ],
      agentActive: true,
      agentIntro:
        "AI agent trained on publications and lab openings. Can answer questions and forward your application to Prof. Chen.",
      scholarSyncedAt: new Date(),
    },
    update: {
      title: "Autonomous Systems Lab — Safe MARL & Robotics",
      profileMarkdown: [
        "## Lab focus",
        "- Multi-agent reinforcement learning under uncertainty",
        "- Safety and sim-to-real transfer for autonomous systems",
        "",
        "## What we look for",
        "- Strong math / control background; RL experience is a plus",
        "",
        "## FAQ",
        "Q: Funding?",
        "A: PhD positions are fully funded (RA/TA); details vary by year.",
      ].join("\n"),
      tags: ["Reinforcement Learning", "Multi-agent Systems", "Robotics", "Game Theory", "Safe AI"],
      hIndex: 42,
      citationsDisplay: "8.2K",
      researchSummary:
        "Strong focus on multi-agent coordination under uncertainty. Recurring themes: safety guarantees, emergent communication, scalable decentralization, and sim-to-real transfer. (Demo summary aligned with ScholarBridge UI.)",
      publications: [
        {
          title: "Decentralized Safe MARL via Barrier Certificates",
          detail: "NeurIPS 2024 · Chen et al. · 312 citations",
        },
        {
          title: "Emergent Language in Cooperative Games",
          detail: "ICML 2023 · Chen, Liu, Park · 201 citations",
        },
        {
          title: "Scalable Multi-Agent Policy Optimization",
          detail: "ICLR 2023 · Chen et al. · 487 citations",
        },
        {
          title: "Real-World Deployment of Cooperative Agents",
          detail: "CoRL 2022 · 159 citations",
        },
      ],
      agentIntro:
        "AI agent trained on publications and lab openings. Can answer questions and forward your application to Prof. Chen.",
      scholarSyncedAt: new Date(),
      agentActive: true,
      status: "PUBLISHED",
      isPublic: true,
    },
  });

  const existingProjects = await prisma.skillProject.count({
    where: { skillId: skill.id },
  });
  if (existingProjects === 0) {
    await prisma.skillProject.createMany({
      data: [
        {
          skillId: skill.id,
          title: "PhD — Safe MARL for Autonomous Vehicles",
          description:
            "Developing safety-constrained multi-agent RL frameworks for mixed autonomy traffic, with real-world deployment on MIT campus shuttles.",
          status: "OPEN",
          metaTags: ["Fall 2025", "Fully Funded", "PyTorch"],
          sortOrder: 0,
        },
        {
          skillId: skill.id,
          title: "Postdoc — Emergent Communication in MARL",
          description:
            "Studying how language emerges among collaborative agents — bridging grounded language learning and game-theoretic communication.",
          status: "OPEN",
          metaTags: ["Immediate", "2 Years", "NLP + RL"],
          sortOrder: 1,
        },
        {
          skillId: skill.id,
          title: "Research Intern — Multi-Agent Coordination",
          description: "Summer internship on scalable coordination for large multi-agent systems.",
          status: "CLOSED",
          metaTags: ["Summer 2025", "Filled"],
          sortOrder: 2,
        },
      ],
    });
  }

  const student = await prisma.user.upsert({
    where: {
      email_role: {
        email: studentEmail,
        role: "STUDENT",
      },
    },
    create: {
      email: studentEmail,
      passwordHash: password,
      role: "STUDENT",
      studentProfile: {
        create: {
          displayName: "Alex Student",
          backgroundBrief: "Undergraduate in CS; interest in safe RL and robotics.",
          materialsJson: [
            { name: "CV_Fall2025.pdf", statusLabel: "Updated 3 days ago" },
            { name: "Research_Statement.pdf", statusLabel: "Updated 1 week ago" },
            { name: "Transcript_Unofficial.pdf", statusLabel: "Uploaded 2 weeks ago" },
          ],
        },
      },
    },
    update: {
      studentProfile: {
        update: {
          displayName: "Alex Student",
          materialsJson: [
            { name: "CV_Fall2025.pdf", statusLabel: "Updated 3 days ago" },
            { name: "Research_Statement.pdf", statusLabel: "Updated 1 week ago" },
            { name: "Transcript_Unofficial.pdf", statusLabel: "Uploaded 2 weeks ago" },
          ],
        },
      },
    },
  });

  const notifCount = await prisma.notification.count({
    where: { userId: student.id },
  });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: student.id,
          message:
            "Prof. Jane Chen's agent sent you a message about your application",
          read: false,
        },
        {
          userId: student.id,
          message: "Interview scheduled with Prof. Jane Chen for March 28, 2025",
          read: true,
        },
      ],
    });
  }

  // Create dual-role test user
  const dualEmail = "dual@test.com";
  const dualPassword = await bcrypt.hash("test123", 10);

  const dualStudent = await prisma.user.upsert({
    where: {
      email_role: {
        email: dualEmail,
        role: "STUDENT",
      },
    },
    create: {
      email: dualEmail,
      passwordHash: dualPassword,
      role: "STUDENT",
      studentProfile: {
        create: {
          displayName: "测试用户(学生)",
          backgroundBrief: "可以同时登录学生和导师身份的测试账号",
        },
      },
    },
    update: {},
  });

  const dualMentor = await prisma.user.upsert({
    where: {
      email_role: {
        email: dualEmail,
        role: "MENTOR",
      },
    },
    create: {
      email: dualEmail,
      passwordHash: dualPassword,
      role: "MENTOR",
      mentorProfile: {
        create: {
          displayName: "测试用户(导师)",
          institution: "测试大学",
          department: "计算机科学",
          title: "教授",
          bioShort: "可以同时登录学生和导师身份的测试账号",
          location: "北京",
        },
      },
    },
    update: {},
  });

  console.log("Seed OK. Demo accounts:");
  console.log(`  Mentor   ${mentorEmail} / demo123`);
  console.log(`  Student  ${studentEmail} / demo123`);
  console.log(`  Dual     ${dualEmail} / test123 (Student + Mentor)`);
  console.log(`  Public skill slug: ${skill.slug}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
