import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 找到刚才创建的导师（最新的 MENTOR 用户）
  const mentor = await prisma.user.findFirst({
    where: { role: "MENTOR" },
    orderBy: { createdAt: "desc" },
    include: { mentorProfile: true },
  });

  if (!mentor || !mentor.mentorProfile) {
    console.error("找不到导师");
    process.exit(1);
  }

  // 检查是否已有 Skill
  const existingSkill = await prisma.skill.findFirst({
    where: { ownerUserId: mentor.id },
  });

  if (existingSkill) {
    console.log("导师已有 Skill，跳过创建");
    console.log(`   Skill slug: ${existingSkill.slug}`);
    return;
  }

  const displayName = mentor.mentorProfile.displayName;
  const slug = `lab-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;

  const skill = await prisma.skill.create({
    data: {
      ownerUserId: mentor.id,
      slug,
      title: `${displayName.split(" ").slice(1).join(" ")} Lab — Research Opportunities`,
      profileMarkdown: [
        "## Lab Focus",
        "- Cutting-edge research in machine learning and AI",
        "- Interdisciplinary collaboration across engineering and sciences",
        "",
        "## What We Look For",
        "- Strong programming and mathematical background",
        "- Curiosity and willingness to explore novel ideas",
        "",
        "## FAQ",
        "Q: Funding?",
        "A: PhD and postdoc positions are fully funded.",
      ].join("\n"),
      status: "PUBLISHED",
      isPublic: true,
      publishedAt: new Date(),
      tags: ["Machine Learning", "AI", "Computer Vision", "NLP"],
      hIndex: 35,
      citationsDisplay: "5.2K",
      researchSummary:
        "Broad research interests spanning deep learning, computer vision, and natural language processing with focus on real-world applications.",
      publications: [
        { title: "Attention Is All You Need (Revisited)", detail: "NeurIPS 2024 · 120 citations" },
        { title: "Scalable Reinforcement Learning for Robotics", detail: "ICML 2024 · 89 citations" },
      ],
      agentActive: true,
      agentIntro: `AI agent for ${displayName}. Ask about research directions, open positions, and lab culture.`,
    },
  });

  // 创建几个示例项目
  await prisma.skillProject.createMany({
    data: [
      {
        skillId: skill.id,
        title: "PhD — Deep Learning for Scientific Discovery",
        description: "Developing neural network architectures for scientific simulation and discovery.",
        status: "OPEN",
        metaTags: ["Fall 2025", "Fully Funded", "PyTorch"],
        sortOrder: 0,
      },
      {
        skillId: skill.id,
        title: "Postdoc — Multi-modal Foundation Models",
        description: "Research on large-scale multi-modal learning and downstream adaptation.",
        status: "OPEN",
        metaTags: ["Immediate", "2 Years", "Transformers"],
        sortOrder: 1,
      },
    ],
  });

  console.log("✅ 已为导师补创建 Skill:");
  console.log(`   Skill slug: ${skill.slug}`);
  console.log(`   Skill title: ${skill.title}`);
  console.log("   现在刷新学生端 Discover 页面即可看到");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
