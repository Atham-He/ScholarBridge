import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/explore/recommendations - 获取个性化推荐
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // 获取用户的兴趣信号
    const signals = await db.aIUserWorkSignal.findMany({
      where: {
        userId: user.id,
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

    if (signals.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          domains: [],
          nodes: [],
          mentors: [],
          route: null,
          message: '标记更多感兴趣的工作来获得推荐'
        }
      });
    }

    // 基于规则生成推荐（MVP阶段）
    const recommendations = await generateRuleBasedRecommendations(signals);

    // 保存推荐快照（用于可解释性）
    await db.aIRecommendationSnapshot.create({
      data: {
        userId: user.id,
        version: '1.0',
        domains: recommendations.domains,
        nodes: recommendations.nodes,
        mentors: recommendations.mentors,
        route: recommendations.route ?? Prisma.JsonNull,
        signalCount: {
          total: signals.length,
          byDomain: countSignalsByDomain(signals)
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', success: false },
      { status: 500 }
    );
  }
}

async function generateRuleBasedRecommendations(signals: any[]) {
  // 统计领域和节点的兴趣
  const domainScores = new Map<string, { count: number; name: string; slug: string }>();
  const nodeScores = new Map<string, { count: number; title: string; slug: string; domainSlug: string }>();

  for (const signal of signals) {
    const domain = signal.work.node.domain;
    const node = signal.work.node;

    // 统计领域得分
    if (!domainScores.has(domain.slug)) {
      domainScores.set(domain.slug, {
        count: 0,
        name: domain.name,
        slug: domain.slug
      });
    }
    domainScores.get(domain.slug)!.count++;

    // 统计节点得分
    if (!nodeScores.has(node.slug)) {
      nodeScores.set(node.slug, {
        count: 0,
        title: node.title,
        slug: node.slug,
        domainSlug: node.domainSlug
      });
    }
    nodeScores.get(node.slug)!.count++;
  }

  // 生成推荐结果
  const totalSignals = signals.length;
  const domains = Array.from(domainScores.values())
    .map(d => ({
      domainId: d.slug,
      score: d.count / totalSignals,
      reasons: [`你标记了${d.count}个${d.name}相关的工作为感兴趣`]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const nodes = Array.from(nodeScores.values())
    .map(n => ({
      nodeId: n.slug,
      score: n.count / totalSignals,
      reasons: [`基于你对${n.title}相关内容的兴趣`]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 生成简单学习路线
  const route = generateLearningRoute(domains, nodes);

  // 生成导师推荐
  const mentors = await generateMentorRecommendations(domainScores, nodeScores);

  return {
    domains,
    nodes,
    mentors,
    route
  };
}

function countSignalsByDomain(signals: any[]) {
  const counts: Record<string, number> = {};
  for (const signal of signals) {
    const domainSlug = signal.work.node.domain.slug;
    counts[domainSlug] = (counts[domainSlug] || 0) + 1;
  }
  return counts;
}

async function generateMentorRecommendations(
  domainScores: Map<string, { count: number; name: string; slug: string }>,
  nodeScores: Map<string, { count: number; title: string; slug: string; domainSlug: string }>
): Promise<Array<{mentorId: string; score: number; reasons: string[]; mentor: any}>> {
  // 获取用户感兴趣的领域
  const interestedDomainSlugs = Array.from(domainScores.keys())
    .sort((a, b) => domainScores.get(b)!.count - domainScores.get(a)!.count)
    .slice(0, 3);

  if (interestedDomainSlugs.length === 0) {
    return [];
  }

  // 查找相关导师（基于 AIMentorExploration）
  const mentorExplorations = await db.aIMentorExploration.findMany({
    where: {
      domainSlug: {
        in: interestedDomainSlugs
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

  // 计算每个导师的匹配分数
  const mentorMatchScores = new Map<string, {
    mentorId: string;
    score: number;
    reasons: string[];
    mentor: any;
  }>();

  for (const exploration of mentorExplorations) {
    const mentor = exploration.mentor;
    if (!mentor.mentorProfile) continue;

    const domainSlug = exploration.domainSlug;
    const domainScore = domainScores.get(domainSlug);
    if (!domainScore) continue;

    // 基础分数：基于领域匹配度
    let score = domainScore.count;

    // 额外加分：如果导师的研究节点与用户兴趣节点匹配
    const mentorNodeSlugs = (exploration.nodeSlugs as string[]) || [];
    const userInterestedNodes = Array.from(nodeScores.keys());
    const matchingNodes = mentorNodeSlugs.filter(slug => userInterestedNodes.includes(slug));
    score += matchingNodes.length * 2;

    // 额外加分：如果导师的研究标签与用户兴趣节点匹配
    const mentorTags = (exploration.additionalTags as string[]) || [];
    const matchingTags = mentorTags.filter(tag =>
      userInterestedNodes.some(nodeSlug =>
        nodeSlug.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(nodeSlug.toLowerCase())
      )
    );
    score += matchingTags.length;

    if (!mentorMatchScores.has(mentor.id)) {
      const primarySkill = mentor.skills[0];
      mentorMatchScores.set(mentor.id, {
        mentorId: mentor.id,
        score: 0,
        reasons: [],
        mentor: {
          id: mentor.id,
          displayName: mentor.mentorProfile.displayName,
          institution: mentor.mentorProfile.institution,
          title: mentor.mentorProfile.title,
          location: mentor.mentorProfile.location,
          bioShort: mentor.mentorProfile.bioShort,
          skillSlug: primarySkill?.slug,
          skillTitle: primarySkill?.title,
          domainSlug: domainSlug,
          domainName: exploration.domain.name,
          domainColor: exploration.domain.accentColor
        }
      });
    }

    const match = mentorMatchScores.get(mentor.id)!;
    match.score += score;

    // 添加推荐理由
    if (!match.reasons.some(r => r.includes(exploration.domain.name))) {
      match.reasons.push(`研究领域与${exploration.domain.name}匹配`);
    }
    if (matchingNodes.length > 0) {
      match.reasons.push(`在${matchingNodes.length}个你感兴趣的研究方向上有专长`);
    }
    if (matchingTags.length > 0) {
      match.reasons.push(`研究兴趣与你标记的内容高度相关`);
    }
  }

  // 转换为数组并排序
  const mentors = Array.from(mentorMatchScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(m => ({
      mentorId: m.mentorId,
      score: Math.min(m.score / 10, 1), // 归一化到0-1
      reasons: m.reasons.slice(0, 3), // 最多显示3个理由
      mentor: m.mentor
    }));

  return mentors;
}

function generateLearningRoute(domains: any[], nodes: any[]) {
  if (domains.length === 0) return null;

  const mainDomain = domains[0];
  const relatedNodes = nodes.filter(n => {
    // 简单的关联逻辑：基于节点与领域的匹配
    return true; // 实际应该根据真实关系筛选
  }).slice(0, 3);

  return {
    title: `${mainDomain.domainId === 'logical-mathematical' ? '逻辑数理智能' : 'AI探索'}学习路线`,
    description: `基于你对${mainDomain.domainId}的兴趣，我们建议你从以下几个方面深入学习：`,
    steps: relatedNodes.map((node, index) => ({
      order: index + 1,
      title: node.nodeId,
      description: `探索${node.nodeId}的核心概念和应用`
    }))
  };
}
