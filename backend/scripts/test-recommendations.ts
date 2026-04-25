import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 创建测试推荐数据...\n");

  // 获取测试用户（使用之前创建的student用户）
  const student = await prisma.user.findFirst({
    where: {
      email: "student@demo.local",
      role: "STUDENT"
    }
  });

  if (!student) {
    console.error("❌ 测试学生用户不存在，请先运行 seed.ts");
    process.exit(1);
  }

  console.log(`✅ 找到测试学生: ${student.email}`);

  // 获取一些工作来标记
  const works = await prisma.aIWork.findMany({
    take: 5,
    include: {
      node: {
        include: {
          domain: true
        }
      }
    }
  });

  if (works.length === 0) {
    console.error("❌ 数据库中没有工作数据，请先运行 explore sync");
    process.exit(1);
  }

  console.log(`\n📚 找到 ${works.length} 个工作\n`);

  // 清理旧的信号
  await prisma.aIUserWorkSignal.deleteMany({
    where: { userId: student.id }
  });
  console.log("🗑️  清理旧的信号数据\n");

  // 创建新的兴趣信号
  for (const work of works) {
    await prisma.aIUserWorkSignal.create({
      data: {
        userId: student.id,
        workId: work.id,
        signal: "like"
      }
    });

    console.log(`  ✅ 标记感兴趣: ${work.title}`);
    console.log(`     领域: ${work.node.domain.name}`);
    console.log(`     节点: ${work.node.title}\n`);
  }

  console.log("\n✨ 测试数据创建完成！");
  console.log(`📧 测试学生账号: ${student.email} / demo123`);
  console.log(`🔗 测试推荐页面: http://localhost:3000/explore/ai/recommendations`);
  console.log("\n💡 现在可以登录学生账号并访问推荐页面查看效果");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
