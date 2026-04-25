import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Skyler", "Dakota"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
const institutions = ["Stanford University", "MIT", "UC Berkeley", "CMU", "Harvard University", "Caltech", "Princeton University", "University of Washington"];
const departments = ["Computer Science", "Electrical Engineering", "AI Lab", "EECS", "Machine Learning Department", "Robotics Institute"];
const titles = ["Professor", "Associate Professor", "Assistant Professor", "Distinguished Professor"];
const locations = ["Stanford, CA", "Cambridge, MA", "Berkeley, CA", "Pittsburgh, PA", "Cambridge, UK", "Pasadena, CA", "Seattle, WA"];
const bios = [
  "Focusing on deep learning and computer vision with applications in autonomous systems.",
  "Research interests include NLP, reinforcement learning, and human-AI collaboration.",
  "Leading a lab on trustworthy AI and robust machine learning.",
  "Exploring the intersection of robotics and machine learning for real-world deployment.",
  "Passionate about democratizing AI education and mentoring the next generation of researchers.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const firstName = pick(firstNames);
  const lastName = pick(lastNames);
  const displayName = `Dr. ${firstName} ${lastName}`;
  const email = `dev.mentor.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@example.com`;
  const password = await bcrypt.hash("demo123", 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: password,
      role: UserRole.MENTOR,
      emailVerified: true,
      mentorProfile: {
        create: {
          displayName,
          institution: pick(institutions),
          department: pick(departments),
          title: pick(titles),
          bioShort: pick(bios),
          location: pick(locations),
        },
      },
    },
    include: { mentorProfile: true },
  });

  // 创建公开的 Skill，这样学生端 Discover 才能看到
  const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-lab-${Date.now()}`;
  const skill = await prisma.skill.create({
    data: {
      ownerUserId: user.id,
      slug,
      title: `${lastName} Lab — ${pick(["AI & ML", "Robotics", "NLP", "Computer Vision", "Systems"])}`,
      profileMarkdown: [
        "## Lab Focus",
        "- Cutting-edge research with real-world impact",
        "- Collaborative and inclusive research environment",
        "",
        "## What We Look For",
        "- Strong technical background and curiosity",
        "- Passion for solving challenging problems",
        "",
        "## FAQ",
        "Q: Funding?",
        "A: All positions are fully funded.",
      ].join("\n"),
      status: "PUBLISHED",
      isPublic: true,
      publishedAt: new Date(),
      tags: [pick(["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Robotics", "Systems"]), pick(["AI", "RL", "Transformers"])],
      hIndex: Math.floor(20 + Math.random() * 40),
      citationsDisplay: `${(3 + Math.random() * 10).toFixed(1)}K`,
      agentActive: true,
      agentIntro: `AI agent for ${displayName}. Ask about research, positions, and lab culture.`,
    },
  });

  // 创建一些开放项目
  await prisma.skillProject.createMany({
    data: [
      {
        skillId: skill.id,
        title: `PhD — ${pick(["Deep Learning", "Safe RL", "Multi-modal AI", "Generative Models"])}`,
        description: "Fully funded PhD position with competitive stipend.",
        status: "OPEN",
        metaTags: ["Fall 2025", "Fully Funded"],
        sortOrder: 0,
      },
      {
        skillId: skill.id,
        title: `Research Intern — ${pick(["Summer 2025", "Fall 2025"])}`,
        description: "Great opportunity for undergraduates to gain research experience.",
        status: "OPEN",
        metaTags: ["Undergrad", "Paid"],
        sortOrder: 1,
      },
    ],
  });

  console.log("✅ 随机导师已创建（含 Skill + 项目）:");
  console.log(`   邮箱: ${user.email}`);
  console.log(`   密码: demo123`);
  console.log(`   姓名: ${user.mentorProfile?.displayName}`);
  console.log(`   学校: ${user.mentorProfile?.institution}`);
  console.log(`   Skill slug: ${skill.slug}`);
  console.log("   学生端 Discover 页面可直接看到");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
