import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const mentorMediaRoot = path.join(projectRoot, "public", "mentor-media");

const mentorRecords = [
  {
    key: "wangjie",
    displayName: "王杰",
    email: "mentor.symbolicvideo.wangjie@scholarbridge.local",
    institution: "中国科学技术大学",
    department: "电子工程与信息科学系 · MIRA Lab",
    scholarUrl: "https://scholar.google.com/citations?user=OugG4dUAAAAJ&hl=en",
    bioShort:
      "聚焦图学习、强化学习与优化，关注结构化智能、复杂决策与学习驱动优化在真实系统中的落地。",
    location: "合肥",
    tags: ["图学习", "知识推理", "强化学习", "优化", "组合优化"],
    skillSlug: "wang-jie-mira-lab",
    skillTitle: "MIRA Lab — 图学习、强化学习与优化",
    hIndex: 35,
    citationsDisplay: "7,261",
    researchSummary:
      "研究主线覆盖图结构建模、动态决策与学习驱动优化，重点面向知识推理、复杂控制、芯片设计与混合整数规划等高约束场景。",
    profileMarkdown: [
      "## 研究主线",
      "- 图学习与知识推理：关注知识图谱多跳推理、属性图表示学习与结构化关系建模。",
      "- 鲁棒强化学习与智能决策：关注不确定环境中的稳定学习、保守策略优化与高成本试错场景。",
      "- 学习驱动优化与工程系统：探索机器学习进入芯片设计、组合优化与混合整数规划求解器的核心决策环节。",
      "",
      "## 代表性工作",
      "- ConE: Cone Embeddings for Multi-Hop Reasoning over Knowledge Graphs (NeurIPS 2021)",
      "- Label Deconvolution for Node Representation Learning on Large-scale Attributed Graphs against Learning Bias (TPAMI 2024)",
      "- Deep Model-Based Reinforcement Learning via Estimated Uncertainty and Conservative Policy Optimization (AAAI 2020)",
      "- A Hierarchical Adaptive Multi-Task Reinforcement Learning Framework for Multiplier Circuit Design (ICML 2024)",
      "- Learning to Cut via Hierarchical Sequence/Set Model for Efficient Mixed-Integer Programming (TPAMI 2024)",
      "",
      "## 适合关注的同学",
      "- 对结构化智能、知识推理、强化学习或复杂优化问题感兴趣。",
      "- 希望把机器学习方法推进到芯片、电路、调度或高约束工业系统。",
      "- 愿意在理论建模与真实工程问题之间来回切换。",
    ].join("\n"),
    publications: [
      {
        title: "ConE: Cone Embeddings for Multi-Hop Reasoning over Knowledge Graphs",
        detail: "NeurIPS 2021 · 知识图谱多跳推理与一阶逻辑表示",
      },
      {
        title:
          "Label Deconvolution for Node Representation Learning on Large-scale Attributed Graphs against Learning Bias",
        detail: "TPAMI 2024 · 大规模属性图表示学习",
      },
      {
        title:
          "Deep Model-Based Reinforcement Learning via Estimated Uncertainty and Conservative Policy Optimization",
        detail: "AAAI 2020 · 不确定性估计与保守策略优化",
      },
    ],
    projects: [
      {
        title: "图学习与知识推理",
        description:
          "围绕知识图谱多跳推理、属性图表示学习与结构化智能建模展开的长期研究方向。",
        status: "OPEN",
      },
      {
        title: "鲁棒强化学习与智能决策",
        description:
          "面向模型误差、不确定性与环境变化条件下的稳定强化学习与策略优化。",
        status: "OPEN",
      },
      {
        title: "学习驱动优化与工程系统",
        description:
          "将学习方法推进到芯片设计、组合优化与混合整数规划等工业级求解问题。",
        status: "OPEN",
      },
    ],
    videoSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/wangjie_image2_final_v1/video_render/wangjie_intro_image2_final_v1_video.mp4",
    posterSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/wangjie_image2_final_v1/slides_16x9/p1_profile_timeline.png",
  },
  {
    key: "wanxiaojun",
    displayName: "万小军",
    email: "mentor.symbolicvideo.wanxiaojun@scholarbridge.local",
    institution: "北京大学",
    department: "王选计算机研究所 · 语言计算与互联网挖掘研究室",
    title: "研究员",
    scholarUrl: "https://scholar.google.com/citations?user=lTTeBdkAAAAJ&hl=en&oi=ao",
    bioShort:
      "长期从事自然语言处理与文本挖掘研究，聚焦语言理解、内容生成与真实应用系统落地。",
    location: "北京",
    tags: ["自然语言处理", "文本挖掘", "自动文摘", "文本生成", "多模态 NLP"],
    skillSlug: "wan-xiaojun-nlp-lab",
    skillTitle: "语言计算与互联网挖掘研究室 — NLP 与文本挖掘",
    hIndex: 62,
    i10Index: 196,
    citationsDisplay: "15,122",
    researchSummary:
      "研究覆盖自动文摘、文本生成、情感分析、语义理解、多模态与多语言 NLP，持续推动 AI 写作与内容生产系统进入真实场景。",
    profileMarkdown: [
      "## 研究主线",
      "- 自动文摘与文本生成：关注长文本信息压缩、结构组织与面向任务目标的内容生成。",
      "- 语义分析与情感理解：研究文本中的语义关系、立场、情绪与上下文依赖。",
      "- 多模态、多语言与应用系统：推动 NLP 技术进入媒体、写作、知识服务等真实场景。",
      "",
      "## 研究特点",
      "- 从语言理解走向内容生产系统，而不仅停留在单点任务。",
      "- 同时关注算法问题与落地系统，多款 AI 写作机器人已经进入真实应用。",
      "- 研究方向与 ACL、IJCAI 等国际学术社区保持持续连接。",
      "",
      "## 适合关注的同学",
      "- 对自动文摘、文本生成、语义理解、情感分析感兴趣。",
      "- 希望研究可落地的内容生产、智能写作与知识服务系统。",
      "- 愿意在模型能力与实际产品场景之间做系统化工作。",
    ].join("\n"),
    publications: [
      {
        title: "自动文摘与文本生成",
        detail: "长期研究方向 · 聚焦长文本信息压缩、重写与生成质量控制",
      },
      {
        title: "语义分析、情感分析与语言理解",
        detail: "长期研究方向 · 聚焦语义结构、立场情绪与上下文依赖",
      },
      {
        title: "多模态、多语言 NLP 与 AI 写作系统",
        detail: "应用落地方向 · 已推动多款 AI 写作机器人进入真实内容生产场景",
      },
    ],
    projects: [
      {
        title: "自动文摘与文本生成",
        description: "围绕信息提炼、结构化内容生成与复杂语境下的文本重写展开研究。",
      },
      {
        title: "语义分析与情感理解",
        description: "关注更细粒度的语义关系、情绪立场识别与可靠语言理解。",
      },
      {
        title: "多模态与多语言内容生产",
        description: "推动 NLP 技术进入媒体、知识服务与真实应用系统。",
      },
    ],
    videoSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/wanxiaojun_imagegen_wangjie_v2/video_render/wanxiaojun_intro_imagegen_wangjie_v2_video.mp4",
    posterSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/wanxiaojun_imagegen_wangjie_v2/slides_16x9/p1_profile_timeline.png",
  },
  {
    key: "hushimin",
    displayName: "胡事民",
    email: "mentor.symbolicvideo.hushimin@scholarbridge.local",
    institution: "清华大学",
    department: "计算机科学与技术系",
    title: "教授",
    scholarUrl:
      "https://scholar.google.com/citations?view_op=search_authors&mauthors=Shimin+Hu+Tsinghua+University&hl=en&oi=ao",
    bioShort:
      "长期在计算机图形学与可视媒体方向开展研究，聚焦三维表示、视觉编辑、真实感重建与物理仿真。",
    location: "北京",
    tags: ["计算机图形学", "三维建模", "可视媒体编辑", "三维重建", "动画仿真"],
    skillSlug: "hu-shimin-graphics-lab",
    skillTitle: "视觉计算方向 — 图形学、三维重建与仿真",
    hIndex: 78,
    i10Index: 266,
    citationsDisplay: "34,354",
    researchSummary:
      "研究链条覆盖几何处理、可视媒体编辑、真实感绘制与复杂动画仿真，核心目标是让机器表示、编辑、重建并生成高质量三维与视觉内容。",
    profileMarkdown: [
      "## 研究主线",
      "- 几何处理与三维结构建模：关注形状表达、拓扑修复、参数化和结构分析。",
      "- 可视媒体编辑与交互合成：研究图像矢量化、显著性检测、草图驱动编辑与三维场景交互。",
      "- 真实感绘制、重建与动画仿真：覆盖 RGB-D 三维重建、多流体、多材料与流固耦合仿真。",
      "",
      "## 代表性方向",
      "- 基于积分不变量和特征敏感度量的几何处理",
      "- 拓扑一致的图像矢量化与 Sketch2Photo 等视觉编辑方法",
      "- 面向消费者级 RGB-D 设备的高精度三维重建与复杂环境动画仿真",
      "",
      "## 适合关注的同学",
      "- 对图形学、三维建模、视觉内容生成与编辑感兴趣。",
      "- 希望同时接触几何建模、交互系统与物理仿真。",
      "- 愿意把方法推进到数字内容工业或复杂视觉系统场景。",
    ].join("\n"),
    publications: [
      {
        title: "几何处理与三维结构建模",
        detail: "长期研究方向 · 聚焦积分不变量、特征敏感度量、拓扑修复与参数化",
      },
      {
        title: "Sketch2Photo 与可视媒体编辑",
        detail: "代表性方向 · 通过草图与搜索结合推进智能视觉编辑",
      },
      {
        title: "RGB-D 三维重建与复杂动画仿真",
        detail: "系统方向 · 聚焦真实感重建、多材料与流固耦合模拟",
      },
    ],
    projects: [
      {
        title: "几何处理与三维结构建模",
        description: "围绕复杂三维对象的表示质量、结构一致性与工程可编辑性展开研究。",
      },
      {
        title: "可视媒体编辑与交互合成",
        description: "研究视觉内容的智能辅助创作、结构编辑与交互式媒体合成。",
      },
      {
        title: "真实感重建与动画仿真",
        description: "推进三维重建、绘制与复杂动态世界仿真在统一视觉链条中协同工作。",
      },
    ],
    videoSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/hushimin_imagegen_wangjie_v2/video_render/hushimin_intro_imagegen_wangjie_v2_video.mp4",
    posterSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/hushimin_imagegen_wangjie_v2/slides_16x9/p1_profile_timeline.png",
  },
  {
    key: "sujianbo",
    displayName: "苏剑波",
    email: "mentor.symbolicvideo.sujianbo@scholarbridge.local",
    institution: "上海交通大学",
    department: "自动化与感知学院",
    title: "长聘教授",
    scholarUrl:
      "https://scholar.google.com/citations?view_op=search_authors&mauthors=Jianbo+Su+Shanghai+Jiao+Tong+University&hl=en&oi=ao",
    bioShort:
      "长期从事机器人与智能系统研究，聚焦多机器人协调、视觉伺服、SLAM 与多传感器融合。",
    location: "上海",
    tags: ["智能机器人", "多机器人协调", "视觉伺服", "SLAM", "多传感器融合"],
    skillSlug: "su-jianbo-robotics-lab",
    skillTitle: "机器人与智能系统 — 多机器人协调与视觉伺服",
    hIndex: 30,
    i10Index: 74,
    citationsDisplay: "3,144",
    researchSummary:
      "研究从机器人任务可完成性、多机器人协调，到运动控制、路径规划、SLAM 与多传感器融合，目标是构建具备感知、重构与持续优化能力的完整智能系统。",
    profileMarkdown: [
      "## 研究主线",
      "- 机器人表征空间与任务可完成性：关注任务集合、能力边界与系统模块自重构。",
      "- 运动控制、路径规划与视觉伺服：把控制理论、场景理解与稳定执行串联起来。",
      "- 多传感器融合与机器智能形成：研究跨时间、跨空间的信息融合与系统级智能。",
      "",
      "## 研究特点",
      "- 同时关注机器人如何感知、如何控制、如何协同组织。",
      "- 研究从单体执行体延展到群体机器人和可重构系统。",
      "- 强调复杂动态环境中的稳定运行与系统级智能。",
      "",
      "## 适合关注的同学",
      "- 对机器人、多机器人协调、视觉伺服、SLAM 感兴趣。",
      "- 希望做感知、控制与协同一体化的智能系统研究。",
      "- 愿意把方法推进到真实机器人或复杂动态环境场景。",
    ].join("\n"),
    publications: [
      {
        title: "机器人表征空间与系统模块自重构",
        detail: "长期研究方向 · 聚焦机器人能力边界、任务组织与系统重构",
      },
      {
        title: "视觉伺服、路径规划与 SLAM",
        detail: "系统方向 · 串联控制理论、真实环境感知与稳定执行",
      },
      {
        title: "多传感器融合与机器智能形成",
        detail: "高级方向 · 聚焦跨时间跨空间融合与系统级协作能力",
      },
    ],
    projects: [
      {
        title: "机器人表征空间与多机器人协调",
        description: "从任务可完成性、能力边界与系统重构角度理解群体机器人系统。",
      },
      {
        title: "运动控制、路径规划与视觉伺服",
        description: "让机器人在真实环境中稳定感知、持续修正并执行动作。",
      },
      {
        title: "多传感器融合与机器智能形成",
        description: "构建具备跨时间、跨空间融合能力的完整机器人智能系统。",
      },
    ],
    videoSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/sujianbo_imagegen_wangjie_v2/video_render/sujianbo_intro_imagegen_wangjie_v2_video.mp4",
    posterSourcePath:
      "/root/SymbolicVideo/docs/introduction/Supervisor/outputs/sujianbo_imagegen_wangjie_v2/slides_16x9/p1_profile_timeline.png",
  },
];

async function fileExists(filePath) {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureMedia(record) {
  const mentorDir = path.join(mentorMediaRoot, record.key);
  await fs.mkdir(mentorDir, { recursive: true });

  let introVideoUrl;
  let introVideoPosterUrl;

  if (await fileExists(record.videoSourcePath)) {
    const targetVideoPath = path.join(mentorDir, "intro.mp4");
    await fs.copyFile(record.videoSourcePath, targetVideoPath);
    introVideoUrl = `/mentor-media/${record.key}/intro.mp4`;
  }

  if (await fileExists(record.posterSourcePath)) {
    const targetPosterPath = path.join(mentorDir, "poster.png");
    await fs.copyFile(record.posterSourcePath, targetPosterPath);
    introVideoPosterUrl = `/mentor-media/${record.key}/poster.png`;
  }

  return { introVideoUrl, introVideoPosterUrl };
}

async function main() {
  const passwordHash = await bcrypt.hash("demo123", 10);

  for (const record of mentorRecords) {
    const media = await ensureMedia(record);

    const user = await prisma.user.upsert({
      where: {
        email_role: {
          email: record.email,
          role: UserRole.MENTOR,
        },
      },
      create: {
        email: record.email,
        passwordHash,
        role: UserRole.MENTOR,
        emailVerified: true,
      },
      update: {
        emailVerified: true,
      },
    });

    await prisma.mentorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: record.displayName,
        institution: record.institution,
        department: record.department,
        title: record.title,
        bioShort: record.bioShort,
        location: record.location,
        scholarUrl: record.scholarUrl,
        introVideoUrl: media.introVideoUrl,
        introVideoPosterUrl: media.introVideoPosterUrl,
      },
      update: {
        displayName: record.displayName,
        institution: record.institution,
        department: record.department,
        title: record.title,
        bioShort: record.bioShort,
        location: record.location,
        scholarUrl: record.scholarUrl ?? null,
        introVideoUrl: media.introVideoUrl ?? null,
        introVideoPosterUrl: media.introVideoPosterUrl ?? null,
      },
    });

    const skill = await prisma.skill.upsert({
      where: { slug: record.skillSlug },
      create: {
        ownerUserId: user.id,
        slug: record.skillSlug,
        title: record.skillTitle,
        profileMarkdown: record.profileMarkdown,
        status: "PUBLISHED",
        isPublic: true,
        publishedAt: new Date(),
        tags: record.tags,
        hIndex: record.hIndex,
        i10Index: record.i10Index,
        citationsDisplay: record.citationsDisplay,
        researchSummary: record.researchSummary,
        publications: record.publications,
        agentActive: true,
        agentIntro: `我是 ${record.displayName} 的 AI 导师助手，可以回答研究方向、代表工作与研究契合度相关问题。`,
      },
      update: {
        ownerUserId: user.id,
        title: record.skillTitle,
        profileMarkdown: record.profileMarkdown,
        status: "PUBLISHED",
        isPublic: true,
        tags: record.tags,
        hIndex: record.hIndex ?? null,
        i10Index: record.i10Index ?? null,
        citationsDisplay: record.citationsDisplay ?? null,
        researchSummary: record.researchSummary,
        publications: record.publications,
        agentActive: true,
        agentIntro: `我是 ${record.displayName} 的 AI 导师助手，可以回答研究方向、代表工作与研究契合度相关问题。`,
      },
    });

    await prisma.skillProject.deleteMany({
      where: { skillId: skill.id },
    });

    await prisma.skillProject.createMany({
      data: record.projects.map((project, index) => ({
        skillId: skill.id,
        title: project.title,
        description: project.description,
        status: project.status ?? "CLOSED",
        metaTags: ["Imported from SymbolicVideo"],
        sortOrder: index,
      })),
    });

    console.log(
      `Imported ${record.displayName} -> /s/${record.skillSlug} (${media.introVideoUrl ?? "no-video"})`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
