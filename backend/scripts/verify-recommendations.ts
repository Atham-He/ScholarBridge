import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 验证推荐数据...\n");

  // 获取测试学生
  const student = await prisma.user.findFirst({
    where: {
      email: "student@demo.local",
      role: "STUDENT"
    }
  });

  if (!student) {
    console.error("❌ 测试学生不存在");
    process.exit(1);
  }

  // 获取用户信号
  const signals = await prisma.aIUserWorkSignal.findMany({
    where: {
      userId: student.id,
      signal: 'like'
    },
    include: {
      work: {
        include: {
          node: {
            include: {
              domain: true
            }
          }
        }
      }
    }
  });

  console.log(`📊 用户兴趣信号: ${signals.length} 个`);
  signals.forEach(signal => {
    console.log(`  - ${signal.work.title}`);
    console.log(`    领域: ${signal.work.node.domain.name}`);
    console.log(`    节点: ${signal.work.node.title}\n`);
  });

  // 获取感兴趣的领域
  const domainSlugs = Array.from(new Set(signals.map(s => s.work.node.domainSlug)));
  console.log(`\n🎯 感兴趣的领域 (${domainSlugs.length} 个):`);
  domainSlugs.forEach(slug => {
    const domain = signals.find(s => s.work.node.domainSlug === slug)?.work.node.domain;
    console.log(`  - ${domain?.name} (${slug})`);
  });

  // 查找相关导师
  const mentorExplorations = await prisma.aIMentorExploration.findMany({
    where: {
      domainSlug: {
        in: domainSlugs
      }
    },
    include: {
      mentor: {
        include: {
          mentorProfile: true,
          skills: {
            where: {
              status: 'PUBLISHED',
              isPublic: true
            }
          }
        }
      },
      domain: true
    }
  });

  console.log(`\n👨‍🏫 找到相关导师: ${mentorExplorations.length} 位\n`);

  // 按领域分组显示
  const byDomain = new Map<string, typeof mentorExplorations>();
  mentorExplorations.forEach(exp => {
    if (!byDomain.has(exp.domainSlug)) {
      byDomain.set(exp.domainSlug, []);
    }
    byDomain.get(exp.domainSlug)!.push(exp);
  });

  byDomain.forEach((explorations, domainSlug) => {
    console.log(`${explorations[0].domain.name}:`);
    explorations.forEach(exp => {
      console.log(`  - ${exp.mentor.mentorProfile?.displayName || 'N/A'}`);
      console.log(`    ${exp.mentor.mentorProfile?.institution || 'N/A'}`);
      const skill = exp.mentor.skills[0];
      if (skill) {
        console.log(`    研究方向: ${skill.title}`);
        console.log(`    Skill: ${skill.slug}`);
      }
      console.log("");
    });
  });

  console.log("✅ 推荐数据验证完成！");
  console.log("\n💡 现在可以登录学生账号并访问推荐页面查看效果");
  console.log("   http://localhost:3000/explore/ai/recommendations");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
