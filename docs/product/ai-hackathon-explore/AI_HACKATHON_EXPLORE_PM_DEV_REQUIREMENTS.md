# AI Major Hackathon Explore 需求对接文档

目标读者：PM、产品设计、前端开发、后端开发、数据/内容运营  
目标来源页面：`http://localhost:3000/explore/ai-u`  
落地目标项目：ScholarBridge  
更新时间：2026-04-22

## 1. 背景与目标

我们需要把 Lean4Edu 中 `/explore/ai-u` 的「人工智能 - 黑客松版」体验抽象成 ScholarBridge 可实现的产品需求。该体验不是单一页面，而是一组围绕 AI 专业探索、研究方向浏览、代表工作反馈、导师匹配和导师 Profile 的完整功能链路。

核心目标：

1. 帮学生快速理解人工智能专业是什么。
2. 把 AI 专业拆成可浏览的领域分支和研究节点。
3. 每个研究节点提供代表性 Paper / Project / System，供学生表达兴趣。
4. 根据兴趣信号生成方向、项目和导师推荐。
5. 建立导师数据库与导师 Profile，展示研究方向、项目、代表作、联系方式和代表工作视频。
6. 让 PM、开发、内容团队可以据此拆任务、建表、设计 API、补素材和验收。

## 2. 体验范围

本需求包覆盖 7 个功能模块：

1. AI 专业 Overview
2. 领域分支与三层研究结构
3. 研究节点详情
4. Milestone 代表工作浏览
5. 兴趣反馈与 Agent 匹配
6. 导师地图 / 导师数据库
7. 导师 Profile / 代表工作介绍视频

不覆盖：

- 完整用户认证流程
- 支付、申请、邮件投递等正式求学申请流程
- 真实视频托管与转码系统
- 大模型 Agent 的具体提示词与成本策略

## 3. 用户流程

### 3.1 主流程

```txt
学生进入 AI 专业入口
  -> 浏览 AI 专业 Overview
  -> 选择一个智能/研究大方向
  -> 查看该方向的理论层、基础设施层、应用层
  -> 点击具体研究节点
  -> 浏览该节点 5 个代表工作
  -> 对每个工作标记 感兴趣 / 不感兴趣 / 稍后再看
  -> Agent 汇总兴趣信号
  -> 推荐交叉研究方向和学习路线
  -> 进入导师地图
  -> 按 tag 筛选导师
  -> 查看导师 Profile
  -> 收藏导师或加入个人路线
```

### 3.2 PM 视角的用户价值

- 低门槛：学生先看图谱和 high-level 分类，不直接进入复杂论文列表。
- 可反馈：学生用简单按钮表达兴趣，不需要填写复杂问卷。
- 可解释：Agent 推荐必须说明推荐依据，而不是只给分数。
- 可转化：最终落到导师、项目、代表作和联系方式，能服务 ScholarBridge 的导师连接场景。

## 4. 信息架构

### 4.1 页面级结构

建议采用控制台式布局：

- 左侧 Sidebar：7 个模块导航。
- 顶部 Header：面包屑、学习状态、步骤进度。
- 主内容区：展示当前模块核心交互。
- 右侧 Inspector：展示当前选择对象、匹配理由、信号统计和下一步操作。

### 4.2 模块导航

| 顺序 | 模块 | 目标 |
| --- | --- | --- |
| 1 | Overview | 解释 AI 专业整体图景 |
| 2 | Direction Detail | 展示领域分支和三层结构 |
| 3 | Research Node | 展示具体研究节点 |
| 4 | Milestone Works | 浏览代表工作并反馈兴趣 |
| 5 | Agent Matching | 根据兴趣生成推荐 |
| 6 | Mentor Map | 按标签浏览导师数据库 |
| 7 | Mentor Profile | 查看导师详情和视频 |

## 5. 功能需求

### 5.1 AI 专业 Overview

目标：给学生一个专业总览，解释「智能的本质」以及 AI 可以研究什么。

页面内容：

- 中心节点：`智能的本质`
- 中心节点说明：感知、表征、推理、行动、反馈
- 外圈方向节点：
  - 语言智能
  - 空间智能
  - 逻辑数理智能
  - 肢体动觉智能
  - 音乐智能
  - 人际关系智能
  - 自省智能
  - 自然辨识智能

交互：

- 点击任一方向进入该方向的 Direction Detail。
- Inspector 展示当前选中方向简介和进入按钮。

开发要求：

- 方向节点必须数据驱动。
- 每个方向必须有 `id / label / shortName / description / accentColor / icon / layers`。
- Overview 图谱需要响应式适配，移动端不能文字重叠。

### 5.2 领域分支与三层结构

目标：把每个 AI 大方向拆成 PM 和学生都能理解的研究结构。

每个方向拆成三层：

- 理论层：研究目标、模型原理、训练目标、推理机制。
- 基础设施层：数据、评测、训练系统、工具链、部署环境。
- 应用层：真实场景、产品方向、科研/行业应用。

示例：逻辑数理智能

- 理论层：SFT、RLHF / RLAIF、PPO / GRPO / XXPO、Verifier、Process Reward
- 基础设施层：Lean、数学数据集、Proof Search、评测器、推理轨迹存储
- 应用层：AI4Math、AI4Science、代码推理、自动形式化、科研助手

交互：

- 选择方向后展示三列结构。
- 点击任意研究节点进入 Research Node。
- 每个节点卡片展示标题、摘要、tags 和 `5 works` 标识。

开发要求：

- 层级和节点需要后续从数据文件或数据库读取。
- 节点必须能关联到代表工作和导师 tags。

### 5.3 研究节点详情

目标：解释具体研究节点是什么，并提供继续探索入口。

页面内容：

- 所属方向
- 所属层级
- 节点标题
- 节点简介
- 节点 tags
- 同层相关节点
- 5 个代表工作预览

交互：

- 点击同层节点切换当前节点。
- 点击 `浏览 5 个代表工作` 进入 Milestone Works。

开发要求：

- 相关节点不应只依赖同层 sibling，后续要支持基于 tag / citation / prerequisite 的真实关系。
- 节点应支持收藏或加入学习路线。

### 5.4 Milestone 代表工作浏览

目标：每个研究节点提供 5 个 milestone 级代表工作，让学生通过 Paper / Project 判断兴趣。

每个代表工作需要字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定 ID |
| `nodeId` | 所属研究节点 |
| `title` | 工作名称 |
| `type` | Paper / Project / System / Benchmark |
| `year` | 年份 |
| `authors` | 作者或团队 |
| `venueOrOrg` | 会议、期刊、机构或项目组织 |
| `summary` | 面向学生的 1-2 句简介 |
| `whyMilestone` | 为什么它是 milestone |
| `tags` | 推荐和筛选标签 |
| `url` | 论文 / 项目 / 官网链接 |
| `thumbnail` | 缩略图 |

卡片交互：

- `感兴趣`
- `不感兴趣`
- `稍后再看`
- 点击卡片进入详情弹窗或详情页

状态要求：

- 本地即时反馈。
- 登录后同步到后端。
- 同一个 work 再次点击同一状态应取消选择。

验收标准：

- 每个研究节点固定展示 5 个代表工作。
- 标记兴趣后 Agent 匹配结果实时变化。
- 刷新页面后兴趣状态不丢失。

### 5.5 兴趣反馈与 Agent 匹配

目标：用学生对代表工作的反馈生成可解释推荐。

输入信号：

- liked works
- disliked works
- saved works
- 浏览过的方向
- 浏览过的节点
- 已收藏导师
- 用户原始兴趣画像，可选接入 RIASEC 或 ScholarBridge profile

输出：

- Top 方向匹配
- 推荐研究节点
- 交叉研究方向
- 推荐代表工作
- 推荐导师
- 下一步学习路线

必须展示推荐解释：

- 哪些 liked works 支撑该推荐
- 哪些 tags 重合
- 该方向与导师研究方向如何匹配
- 置信度或匹配分数

示例推荐：

- `AI4Math + Formal Methods`
- `视觉语言行动 Agent`
- `AI4Science 科研助手`

开发要求：

- MVP 可先用启发式打分。
- 正式版应有后端 API 保存 signal 并生成推荐。
- 推荐结果要可复现、可追踪版本。

建议 API：

```txt
POST /api/explore/ai-hackathon/signals
GET  /api/explore/ai-hackathon/recommendations
POST /api/explore/ai-hackathon/routes
```

### 5.6 导师地图 / 导师数据库

目标：把学生兴趣从「方向」和「代表工作」落到真实导师。

导师数据库字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定 ID |
| `name` | 导师姓名 |
| `title` | 职称 |
| `affiliation` | 学校 / 机构 |
| `labName` | 实验室 |
| `countryOrRegion` | 地区 |
| `tags` | AI4Math、NLP、Alignment 等 |
| `researchDirections` | 研究方向 |
| `projects` | 代表项目 |
| `publications` | 代表作 |
| `contactEmail` | 联系邮箱 |
| `profileUrl` | 官方主页 |
| `labUrl` | 实验室主页 |
| `admissionInfoUrl` | 招生信息 |
| `videoUrl` | 代表工作视频 |
| `avatar` | 头像 |
| `relatedNodeIds` | 关联研究节点 |
| `relatedWorkIds` | 关联 milestone works |

导师地图功能：

- 按 tag 筛选。
- 支持多标签组合筛选。
- 支持排序：匹配度、代表作数量、最近活跃、地区、学校。
- 支持选中多个导师对比。
- 支持收藏导师或加入路线。

当前 MVP tags：

- AI4Math
- NLP
- Computer Vision
- Robotics
- AI4Science
- Alignment
- Audio AI
- HCI

### 5.7 导师 Profile

目标：让学生从导师卡片进入完整导师详情，理解导师是否适合自己。

Profile 页面内容：

- 基本信息：姓名、职称、学校、实验室、地区。
- 研究方向：结构化标签和自然语言说明。
- 项目：代表项目列表。
- 代表作：论文 / 系统 / benchmark 列表。
- 联系方式：官方主页、实验室主页、邮箱、招生说明。
- 1 分 30 秒代表工作介绍视频。
- 适合你的原因：基于学生兴趣和导师研究方向的解释。
- 相关 milestone works：导师与哪些工作或节点有关。

视频要求：

- MVP：视频封面 + 章节列表。
- 正式版：真实播放器，支持 `videoUrl`、字幕、章节跳转。
- 视频时长目标：90 秒。

## 6. 数据与后端需求

### 6.1 推荐数据表

建议实体：

- `AIDomain`
- `AIResearchLayer`
- `AIResearchNode`
- `AIWork`
- `AIMentor`
- `AIMentorProject`
- `AIMentorPublication`
- `AIUserWorkSignal`
- `AIUserRoute`
- `AIRecommendationSnapshot`

### 6.2 Signal 存储

```ts
type WorkSignal = {
  userId: string;
  workId: string;
  signal: 'like' | 'dislike' | 'later';
  createdAt: string;
  updatedAt: string;
};
```

### 6.3 推荐结果结构

```ts
type RecommendationResult = {
  domains: Array<{ domainId: string; score: number; reasons: string[] }>;
  nodes: Array<{ nodeId: string; score: number; reasons: string[] }>;
  mentors: Array<{ mentorId: string; score: number; reasons: string[] }>;
  route: {
    title: string;
    steps: Array<{ type: 'read' | 'project' | 'mentor' | 'course'; targetId: string; title: string }>;
  };
};
```

## 7. 内容运营需求

### 7.1 代表工作补全

每个研究节点需要 5 个高质量 work。内容运营应按以下标准选择：

- 领域 milestone 级别。
- 对本科生或高中生能解释清楚。
- 有可靠来源链接。
- 能映射到具体导师或研究团队更好。
- 覆盖 Paper / Project / Benchmark / System，不只堆论文。

### 7.2 导师信息补全

导师数据必须优先来自官方主页、实验室主页、Google Scholar、DBLP、Semantic Scholar、学校目录等可信来源。

禁止：

- 使用未授权真人头像。
- 把生成头像伪装成真实照片。
- 未确认邮箱或招生状态时展示为确定信息。

## 8. 素材需求

### 8.1 需要的项目素材

| 类型 | 数量 | 用途 |
| --- | --- | --- |
| 品牌 icon | 1 | Sidebar / 页面识别 |
| AI 助手图 | 1 | Sidebar 辅助说明 |
| Overview 图谱背景 | 1 | 智能本质图谱 |
| 8 个智能方向 icon | 8 | Overview 节点 |
| 三层结构 icon | 3 | 理论层 / 基础设施层 / 应用层 |
| 核心研究节点缩略图 | 20+ | 节点详情、推荐卡 |
| Milestone work 缩略图 | 每 work 1 张 | 代表工作卡片 |
| Agent 推荐缩略图 | 3-6 | 路线推荐卡 |
| 导师头像 | 每导师 1 张 | 导师地图、Profile |
| 视频封面 | 每导师/视频 1 张 | 90 秒介绍视频 |

### 8.2 当前随包参考图

`ui-reference/` 下包含 7 张 UI 参考图：

1. `01-overview-intelligence-map.png`
2. `02-direction-detail-three-layers.png`
3. `03-research-node-detail.png`
4. `04-milestone-work-browser.png`
5. `05-agent-matching-route.png`
6. `06-mentor-map.png`
7. `07-mentor-profile-video.png`

这些图只作为 UI 结构和视觉方向参考，不应直接作为最终商业素材的唯一来源。

## 9. 前端实现建议

建议模块拆分：

```txt
components/ai-hackathon/
  AIHackathonShell.tsx
  AIHackathonSidebar.tsx
  AIHackathonHeader.tsx
  AIHackathonInspector.tsx
  screens/
    OverviewScreen.tsx
    DirectionScreen.tsx
    ResearchNodeScreen.tsx
    MilestoneWorksScreen.tsx
    AgentMatchingScreen.tsx
    MentorMapScreen.tsx
    MentorProfileScreen.tsx
  cards/
    WorkCard.tsx
    MentorCard.tsx
    DomainMatchCard.tsx
  hooks/
    useWorkSignals.ts
    useAIRecommendations.ts
```

## 10. 验收标准

### MVP 验收

- 能从入口进入 AI 专业黑客松版。
- Overview 展示 AI 专业介绍和 8 个方向。
- 每个方向展示三层结构。
- 每个研究节点展示 5 个代表工作。
- 用户可以对代表工作标记兴趣。
- Agent 匹配页能根据兴趣信号变化推荐结果。
- 导师地图能按 tag 筛选。
- 导师 Profile 展示项目、研究方向、代表作、联系方式和视频封面。

### 正式版验收

- 代表工作不再使用 placeholder。
- 导师数据库字段完整。
- 用户兴趣信号写入后端。
- Agent 推荐有可解释理由并可保存路线。
- 视频可真实播放。
- 所有图片素材版权明确或为自生成商用素材。
- 移动端无文字重叠和横向溢出。

## 11. 当前风险

1. 内容量大：8 个方向、约 78 个节点，如果每节点 5 个 work，总计约 390 个代表工作。
2. 导师版权：真实导师头像和视频必须使用官方授权或改成非真人 avatar。
3. 推荐可信度：纯前端启发式推荐不足以支撑正式产品，需要后端和推荐解释。
4. 数据维护：内容不能长期写死在 React 组件中，需要抽到数据层。
5. UI 复杂度：Overview 图谱、Inspector、导师地图都需要单独做移动端设计。

