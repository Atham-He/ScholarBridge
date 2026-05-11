import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始初始化数据库...\n");

  const password = await bcrypt.hash("demo123", 10);

  // 创建测试导师
  const mentor = await prisma.user.upsert({
    where: {
      email_role: {
        email: "mentor@demo.local",
        role: "MENTOR",
      },
    },
    create: {
      email: "mentor@demo.local",
      passwordHash: password,
      role: "MENTOR",
      emailVerified: true,
      mentorProfile: {
        create: {
          displayName: "Prof. Jane Chen",
          institution: "MIT",
          department: "Computer Science",
          title: "Associate Professor",
          bioShort: "AI researcher focusing on reinforcement learning and robotics.",
          location: "Cambridge, MA",
          researchAreas: ["Reinforcement Learning", "Robotics", "Multi-agent Systems"],
        },
      },
    },
    update: {},
    include: { mentorProfile: true },
  });

  // 创建测试项目
  const existingProject = await prisma.project.count({
    where: { mentorUserId: mentor.id },
  });

  if (existingProject === 0) {
    await prisma.project.create({
      data: {
        mentorUserId: mentor.id,
        title: "PhD — AI Safety Research",
        description: "Research on safe reinforcement learning for autonomous systems. Focus on theoretical foundations and practical applications.",
        researchArea: "Artificial Intelligence",
        startTime: "2025-09",
        endTime: "2028-09",
        location: "On-site",
        requirements: "Strong math background, Python, PyTorch experience",
        capacity: 3,
        enrolled: 0,
        status: "OPEN",
      },
    });

    await prisma.project.create({
      data: {
        mentorUserId: mentor.id,
        title: "Research Intern — Multi-Agent Systems",
        description: "Summer internship on multi-agent coordination and communication.",
        researchArea: "Reinforcement Learning",
        startTime: "2025-06",
        endTime: "2025-09",
        location: "Remote",
        requirements: "Python, machine learning basics",
        capacity: 2,
        enrolled: 1,
        status: "OPEN",
      },
    });
  }

  // 创建测试学生
  await prisma.user.upsert({
    where: {
      email_role: {
        email: "student@demo.local",
        role: "STUDENT",
      },
    },
    create: {
      email: "student@demo.local",
      passwordHash: password,
      role: "STUDENT",
      emailVerified: true,
      studentProfile: {
        create: {
          displayName: "Alex Student",
          backgroundBrief: "Undergraduate in CS, interested in AI research.",
        },
      },
    },
    update: {},
  });

  console.log("  ✅ 数据库初始化完成！\n");
  console.log("📝 测试账号:");
  console.log("  Mentor:  mentor@demo.local / demo123");
  console.log("  Student: student@demo.local / demo123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
