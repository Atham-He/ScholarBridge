# AI专业探索功能设计文档

**日期**: 2026-04-24
**版本**: 1.0
**作者**: Claude + 用户协作设计

## 1. 概述

### 1.1 功能简介

为学生提供AI专业探索体验，帮助他们在申请导师前了解AI各研究方向，通过浏览代表工作表达兴趣，并获得个性化推荐。

### 1.2 核心目标

1. 帮学生快速理解人工智能专业是什么
2. 把AI专业拆成可浏览的领域分支和研究节点
3. 每个研究节点提供代表性工作，供学生表达兴趣
4. 根据兴趣信号生成方向、项目和导师推荐
5. 建立导师数据库与导师Profile
6. 最终落到ScholarBridge的导师连接场景

### 1.3 功能范围

包含7个核心模块：
1. AI专业Overview
2. 领域分支与三层研究结构
3. 研究节点详情
4. Milestone代表工作浏览
5. Agent匹配与推荐
6. 导师地图/数据库
7. 导师Profile

## 2. 架构设计

### 2.1 整体架构

采用**功能模块化**方案：
- 在现有`backend/app`中添加独立的`/explore`功能模块
- 复用现有基础设施（认证、数据库、UI组件）
- URL路径独立（`/explore/*`），不影响现有功能

### 2.2 目录结构

```
backend/
├── app/
│   ├── explore/                      # AI专业探索功能入口
│   │   ├── page.tsx                  # /explore - Overview
│   │   ├── ai/
│   │   │   ├── [directionSlug]/      # 方向详情
│   │   │   │   ├── page.tsx
│   │   │   │   └── [layer]/
│   │   │   │       └── [nodeSlug]/
│   │   │   │           ├── page.tsx  # 研究节点
│   │   │   │           └── works/page.tsx
│   │   │   └── recommendations/page.tsx
│   │   └── mentors/
│   │       ├── page.tsx              # 导师地图
│   │       └── [mentorId]/page.tsx   # 导师Profile
│   └── api/explore/                  # API端点
├── lib/explore/                      # 核心业务逻辑
│   ├── data.ts                       # 数据访问层
│   ├── matching.ts                   # 匹配算法
│   └── sync.ts                       # 数据同步
├── data/explore/                     # 初始数据文件
│   ├── domains.json
│   ├── research-nodes.json
│   └── works.json
└── components/explore/               # UI组件
    ├── shell/                        # 布局组件
    ├── overview/                     # Overview图谱
    ├── direction/                    # 三层结构
    └── cards/                        # 各种卡片
```

### 2.3 URL设计

- `/explore` - AI专业Overview
- `/explore/ai/logical-mathematical` - 逻辑数理智能方向
- `/explore/ai/logical-mathematical/theory/sft` - 理论层SFT节点
- `/explore/ai/logical-mathematical/theory/sft/works` - 代表工作浏览
- `/explore/ai/recommendations` - Agent推荐
- `/explore/mentors` - 导师地图
- `/explore/mentors/[mentorId]` - 导师Profile

## 3. 数据模型

### 3.1 数据库模型

新增以下Prisma模型：

```prisma
model AIDomain {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  shortName   String
  description String
  accentColor String
  icon        String?
  order       Int      @default(0)

  researchNodes AIResearchNode[]
  mentorExplorations AIMentorExploration[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
}

model AIResearchLayer {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String
  icon        String?
  order       Int      @default(0)

  nodes AIResearchNode[]
}

model AIResearchNode {
  id          String   @id @default(cuid())
  slug        String
  title       String
  summary     String
  description String
  tags        Json?
  layerKey    String
  domainSlug  String

  layer   AIResearchLayer  @relation(fields: [layerKey], references: [key])
  domain  AIDomain         @relation(fields: [domainSlug], references: [slug], onDelete: Cascade)
  works   AIWork[]

  mentorExplorations AIMentorExploration[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([domainSlug, slug])
  @@index([domainSlug])
  @@index([layerKey])
}

model AIWork {
  id          String   @id @default(cuid())
  slug        String   @unique
  nodeId      String
  title       String
  type        String   // 'paper' | 'project' | 'system' | 'benchmark'
  year        Int
  authors     String
  venueOrOrg  String
  summary     String
  whyMilestone String
  tags        Json?
  url         String
  thumbnail   String?

  node AIResearchNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  userSignals AIUserWorkSignal[]

  createdAt DateTime @default(now())

  @@index([nodeId])
  @@index([type])
}

model AIUserWorkSignal {
  id        String   @id @default(cuid())
  userId    String
  workId    String
  signal    String   // 'like' | 'dislike' | 'later'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  work AIWork @relation(fields: [workId], references: [id], onDelete: Cascade)

  @@unique([userId, workId])
  @@index([userId])
  @@index([workId])
}

// 设计说明：用户对同一工作只能有一个当前有效的信号（通过unique约束）。
// 如果用户修改信号（如从like改为later），通过updatedAt更新现有记录。
// 推荐算法使用最新的signal值，不追踪历史变化。

model AIMentorExploration {
  id              String   @id @default(cuid())
  mentorUserId    String
  domainSlug      String
  nodeSlugs       Json?      // 关联研究节点slug列表
  workSlugs       Json?      // 关联工作slug列表
  videoUrl        String?    // 90秒介绍视频
  additionalTags  Json?      // 额外的研究标签

  mentor User     @relation(fields: [mentorUserId], references: [id], onDelete: Cascade)
  domain AIDomain @relation(fields: [domainSlug], references: [slug], onDelete: Cascade)
  nodes AIResearchNode[] @relation("NodeExplorations")

  @@unique([mentorUserId, domainSlug])
  @@index([mentorUserId])
  @@index([domainSlug])
}

model AIRecommendationSnapshot {
  id          String   @id @default(cuid())
  userId      String
  version     String   // 推荐算法版本号，如'1.0', '1.1'
  domains     Json     // [{domainId, score, reasons}]
  nodes       Json     // [{nodeId, score, reasons}]
  mentors     Json     // [{mentorId, score, reasons}]
  route       Json?    // 学习路线
  signalCount Json     // 生成推荐时的信号统计（用于可解释性）
  generatedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, generatedAt(sort: Desc)])
}
```

### 3.2 数据文件

**初始数据在文件中**，通过同步脚本导入数据库：

- `data/explore/domains.json` - 8个智能方向
- `data/explore/research-nodes.json` - 研究节点
- `data/explore/works.json` - 代表工作

**MVP阶段**：每个方向提供1-2个示例节点，每节点2-3个示例工作

**示例范围**：
- 逻辑数理智能：3个方向节点（SFT、Lean、AI4Math）
- 其他7个方向：每个1个示例节点
- 总计约10个节点，20-30个代表工作

## 4. API设计

### 4.1 公开API（无需登录）

```typescript
GET /api/explore
// 返回所有AI方向列表
// 安全考虑：添加速率限制（60 req/min per IP）

GET /api/explore/ai/[directionSlug]
// 返回方向详情（三层结构、研究节点）
// 安全考虑：添加速率限制（60 req/min per IP）

GET /api/explore/ai/[directionSlug]/[layer]/[nodeSlug]
// 返回研究节点详情
// 安全考虑：添加速率限制（120 req/min per IP）

GET /api/explore/mentors
// 返回导师地图列表（支持tags筛选）
// 安全考虑：添加速率限制（60 req/min per IP）

GET /api/explore/mentors/[mentorId]
// 返回导师Profile详情
// 安全考虑：添加速率限制（60 req/min per IP）
```

### 4.2 需要登录的API

```typescript
POST /api/explore/signals
// 标记兴趣（like/dislike/later）

GET /api/explore/signals
// 获取当前用户的所有兴趣标记

GET /api/explore/recommendations
// 获取个性化推荐（复用Persona系统）
```

### 4.3 管理API

```typescript
POST /api/explore/sync
// 从data/explore/*.json同步数据到数据库
// 需要管理员权限
```

## 5. 前端架构

### 5.1 组件结构

```
components/explore/
├── shell/
│   ├── ExploreShell.tsx           # 主布局容器
│   ├── ExploreSidebar.tsx         # 模块导航
│   ├── ExploreHeader.tsx          # 面包屑、进度
│   └── ExploreInspector.tsx       # 右侧信息面板
├── overview/
│   ├── IntelligenceMap.tsx        # Overview图谱
│   └── DomainNode.tsx             # 方向节点
├── direction/
│   ├── DirectionDetail.tsx        # 方向详情
│   ├── ThreeLayerLayout.tsx       # 三层结构布局
│   └── NodeCard.tsx               # 节点卡片
├── research-node/
│   ├── NodeDetail.tsx             # 节点详情
│   └── RelatedNodes.tsx           # 相关节点
├── works/
│   ├── WorksBrowser.tsx           # 工作浏览
│   ├── WorkCard.tsx               # 工作卡片
│   └── WorkDetailModal.tsx        # 详情弹窗
├── matching/
│   ├── AgentRecommendations.tsx   # 推荐页面
│   ├── DomainMatchCard.tsx        # 匹配卡片
│   └── RouteCard.tsx              # 路线卡片
└── mentors/
    ├── MentorMap.tsx              # 导师地图
    ├── MentorCard.tsx             # 导师卡片
    └── MentorProfile.tsx          # 导师Profile
```

### 5.2 状态管理

```typescript
// hooks/useExploreSignals.ts
export function useExploreSignals() {
  const [signals, setSignals] = useState<Record<string, SignalType>>({});
  const user = useCurrentUser();

  const toggleSignal = useCallback((workId: string, signal: SignalType) => {
    setSignals(prev => ({ ...prev, [workId]: signal }));
    if (user) {
      fetch('/api/explore/signals', {
        method: 'POST',
        body: JSON.stringify({ workId, signal })
      });
    } else {
      localStorage.setItem('explore_signals', JSON.stringify(signals));
    }
  }, [user]);

  return { signals, toggleSignal };
}
```

### 5.3 设计系统

**复用现有UI组件**：
- Card组件（米色配色、8px圆角）
- Badge组件（gold/green/blue/red变体）
- Button、Input等基础组件

**CSS变量**：
- 使用现有的`:root`变量
- 支持深色模式

## 6. Agent匹配实现

### 6.1 复用Persona系统

为AI探索创建专门的Persona（`ai-explore-guide`），复用现有RAG和LLM能力：

```typescript
export async function generateRecommendations(signals: AIUserWorkSignal[]) {
  // 1. 获取AI探索指南Persona
  const persona = await db.persona.findUnique({
    where: { slug: 'ai-explore-guide' }
  });

  // 2. 构建用户兴趣上下文
  const likedWorks = await getWorksByIds(
    signals.filter(s => s.signal === 'like').map(s => s.workId)
  );

  // 3. 调用Persona chat生成推荐
  const prompt = `基于学生兴趣：${JSON.stringify(userContext)}，生成推荐...`;
  const response = await chatWithPersona(persona, prompt);

  // 4. 解析结构化响应
  const recommendations = parseRecommendations(response);

  // 5. 保存快照（可解释性）
  await db.aIRecommendationSnapshot.create({ data: recommendations });

  return recommendations;
}
```

### 6.2 响应解析

```typescript
function parseRecommendations(llmResponse: string): RecommendationResult {
  try {
    // 尝试解析LLM返回的JSON（如果使用了structured output）
    const parsed = JSON.parse(llmResponse);
    return validateRecommendationSchema(parsed);
  } catch {
    // 降级到规则匹配（fallback）
    return fallbackRuleBasedMatching(userSignals);
  }
}

// 验证推荐结果格式
function validateRecommendationSchema(data: any): RecommendationResult {
  return {
    domains: data.domains.map(d => ({
      domainId: d.domainId,
      score: Math.min(1, Math.max(0, d.score)),
      reasons: Array.isArray(d.reasons) ? d.reasons : []
    })),
    nodes: data.nodes?.map(n => ({
      nodeId: n.nodeId,
      score: Math.min(1, Math.max(0, n.score)),
      reasons: Array.isArray(n.reasons) ? n.reasons : []
    })) || [],
    mentors: data.mentors?.map(m => ({
      mentorId: m.mentorId,
      score: Math.min(1, Math.max(0, m.score)),
      reasons: Array.isArray(m.reasons) ? m.reasons : []
    })) || [],
    route: data.route || null
  };
}

// 降级规则匹配（当LLM解析失败时）
function fallbackRuleBasedMatching(signals: AIUserWorkSignal[]): RecommendationResult {
  const likedWorks = signals.filter(s => s.signal === 'like');
  const tags = countTags(likedWorks);
  const domains = countDomains(likedWorks);

  return {
    domains: domains.map(d => ({
      domainId: d.domainSlug,
      score: d.count / likedWorks.length,
      reasons: [`你标记了${d.count}个${d.name}相关的工作为感兴趣`]
    })),
    // 类似处理nodes和mentors...
  };
}
```

**设计说明**：
- 优先使用LLM结构化输出，失败时降级到规则匹配
- 确保推荐结果始终有合理的分数和理由
- 分数归一化到[0,1]区间

### 6.3 Persona构建

从domains.json、nodes.json、works.json构建知识库，每个研究节点作为证据源。

## 7. 导师系统整合

### 7.1 混合方式整合

- **基本信息**：复用`MentorProfile`
- **研究方向**：复用`Skill.tags`和`Skill.projects`
- **AI探索特有**：使用`AIMentorExploration`关联表

### 7.1.1 数据迁移策略

**现有导师迁移到AI探索系统**：

```typescript
// backend/scripts/migrate-mentors-to-explore.ts
export async function migrateMentorsToExplore() {
  // 1. 找到所有有公开Skill的导师
  const mentorsWithSkills = await db.user.findMany({
    where: {
      role: 'MENTOR',
      skills: { some: { status: 'PUBLISHED', isPublic: true } }
    },
    include: {
      mentorProfile: true,
      skills: { where: { status: 'PUBLISHED' } }
    }
  });

  // 2. 为每个导师创建AIMentorExploration记录
  for (const mentor of mentorsWithSkills) {
    // 从Skill.tags推断domainSlug
    const domainSlug = inferDomainFromTags(mentor.skills);

    // 创建或更新AIMentorExploration
    await db.aIMentorExploration.upsert({
      where: { mentorUserId_domainSlug: { mentorUserId: mentor.id, domainSlug } },
      create: {
        mentorUserId: mentor.id,
        domainSlug,
        additionalTags: extractUniqueTags(mentor.skills),
        // nodeSlugs和workSlugs由内容团队后续手动关联
      },
      update: {}
    });
  }

  return { migrated: mentorsWithSkills.length };
}
```

**迁移时机**：
- 首次部署AI探索功能时自动运行
- 后续通过管理API手动触发更新

```prisma
model AIMentorExploration {
  mentorUserId    String
  domainSlug      String
  nodeSlugs       Json?      // 关联研究节点
  workSlugs       Json?      // 关联工作
  videoUrl        String?    // 90秒介绍视频
  additionalTags  Json?      // 额外标签
}
```

### 7.2 导师地图

- 按tags筛选导师
- 支持多标签组合
- 排序：匹配度、代表作数量、地区

### 7.3 导师Profile

- 基本信息（从MentorProfile）
- 研究方向（从Skill.tags）
- 项目、代表作（从Skill.projects、Skill.publications）
- 90秒介绍视频（从AIMentorExploration.videoUrl）

## 8. 访问控制

**混合模式**：
- 浏览内容：公开访问
- 标记兴趣、查看推荐：需要登录
- 收藏导师、保存路线：需要登录

## 9. 数据管理

### 9.1 数据同步

```typescript
// lib/explore/sync.ts
export async function syncExploreData(options?: { force?: boolean }) {
  // 1. 读取JSON文件
  const domains = JSON.parse(fs.readFileSync('data/explore/domains.json'));
  const nodes = JSON.parse(fs.readFileSync('data/explore/research-nodes.json'));
  const works = JSON.parse(fs.readFileSync('data/explore/works.json'));

  // 2. 使用Prisma upsert导入
  const stats = { domainsCreated: 0, domainsUpdated: 0, conflicts: 0 };

  for (const domain of domains.domains) {
    const existing = await db.aIDomain.findUnique({
      where: { slug: domain.slug }
    });

    if (existing && !options.force) {
      // 检测冲突：数据库中的数据与文件不同
      const hasChanges = detectDomainChanges(existing, domain);
      if (hasChanges) {
        stats.conflicts++;
        console.warn(`Conflict detected for domain ${domain.slug}, skipping. Use force=true to overwrite.`);
        continue;
      }
    }

    await db.aIDomain.upsert({
      where: { slug: domain.slug },
      update: options.force ? domain : {}, // force=true时文件覆盖数据库
      create: domain
    });

    if (existing) stats.domainsUpdated++;
    else stats.domainsCreated++;
  }

  // 类似处理nodes和works...

  return stats;
}

function detectDomainChanges(existing: any, fileData: any): boolean {
  // 比较关键字段是否不同
  return existing.name !== fileData.name ||
         existing.description !== fileData.description ||
         existing.order !== fileData.order;
}
```

**冲突解决策略**：
- 默认模式（force=false）：检测到冲突时跳过，记录警告
- 强制模式（force=true）：文件数据覆盖数据库
- 返回统计信息，包括冲突数量

**使用场景**：
- 初始导入：使用force=true
- 日常更新：默认模式，人工审查冲突后决定是否强制同步

### 9.2 数据模板

提供JSON Schema文档，便于内容团队填充数据。

## 10. 错误处理

### 10.1 统一错误格式

```typescript
export function exploreErrorResponse(error: string, status: number = 500) {
  return NextResponse.json(
    { error, success: false },
    { status }
  );
}
```

### 10.2 验证和错误码

- 400: 参数错误
- 401: 未登录
- 404: 资源不存在
- 500: 服务器错误

## 11. 测试策略

### 11.1 API测试

```typescript
describe('Explore API', () => {
  it('应该返回所有AI方向');
  it('未登录用户标记兴趣应该返回401');
  it('应该正确同步数据到数据库');
});
```

### 11.2 前端测试

- 组件单元测试
- Hook测试
- E2E测试（关键流程）

**E2E测试场景**：

```typescript
describe('AI Explore E2E', () => {
  describe('探索流程', () => {
    it('完整探索流程：Overview → 方向 → 节点 → 工作浏览', async () => {
      // 1. 访问/explore，看到8个方向
      await page.goto('/explore');
      await expect(page.locator('[data-testid="domain-node"]')).toHaveCount(8);

      // 2. 点击"逻辑数理智能"，进入方向详情
      await page.click('[data-testid="domain-logical-mathematical"]');
      await expect(page).toHaveURL(/\/explore\/ai\/logical-mathematical/);

      // 3. 验证三层结构展示
      await expect(page.locator('[data-testid="layer-theory"]')).toBeVisible();
      await expect(page.locator('[data-testid="layer-infrastructure"]')).toBeVisible();
      await expect(page.locator('[data-testid="layer-application"]')).toBeVisible();

      // 4. 点击一个研究节点
      await page.click('[data-testid="node-sft"]');
      await expect(page).toHaveURL(/\/explore\/ai\/logical-mathematical\/theory\/sft/);

      // 5. 浏览代表工作
      await page.click('[data-testid="browse-works-button"]');
      await expect(page.locator('[data-testid="work-card"]')).toHaveCount.greaterThan(0);
    });
  });

  describe('兴趣标记流程', () => {
    it('未登录用户可以标记兴趣（保存在localStorage）', async () => {
      await page.goto('/explore/ai/logical-mathematical/theory/sft/works');
      await page.click('[data-testid="work-gpt-3"] [data-testid="like-button"]');

      // 验证localStorage
      const signals = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('explore_signals') || '{}')
      );
      expect(signals).toHaveProperty('gpt-3-paper', 'like');
    });

    it('登录用户标记兴趣同步到服务器', async () => {
      // 登录
      await loginAsTestStudent();

      await page.goto('/explore/ai/logical-mathematical/theory/sft/works');
      await page.click('[data-testid="work-gpt-3"] [data-testid="like-button"]');

      // 验证API调用
      const response = await page.waitForResponse('/api/explore/signals');
      expect(response.status()).toBe(200);
    });
  });

  describe('推荐流程', () => {
    it('标记兴趣后查看推荐，推荐包含可解释理由', async () => {
      await loginAsTestStudent();

      // 标记3个work为感兴趣
      await markWorksAsLiked(['gpt-3-paper', 'lean-code', 'ai4math']);

      // 访问推荐页面
      await page.goto('/explore/ai/recommendations');

      // 验证推荐结果包含理由
      const firstRecommendation = page.locator('[data-testid="domain-card"]').first();
      await expect(firstRecommendation.locator('[data-testid="reason"]')).toBeVisible();
      await expect(firstRecommendation.locator('[data-testid="reason"]'))
        .toContainText(/因为你喜欢|基于你的兴趣/);
    });
  });

  describe('导师探索流程', () => {
    it('导师地图支持按tags筛选', async () => {
      await page.goto('/explore/mentors');

      // 选择tags
      await page.selectOption('[data-testid="tag-filter"]', 'AI4Math');
      await page.click('[data-testid="apply-filter"]');

      // 验证筛选结果
      const mentors = page.locator('[data-testid="mentor-card"]');
      for (const card of await mentors.all()) {
        await expect(card).toContainText('AI4Math');
      }
    });

    it('导师Profile展示完整信息', async () => {
      await page.goto('/explore/mentors/test-mentor-id');

      // 验证基本信息
      await expect(page.locator('[data-testid="mentor-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="mentor-institution"]')).toBeVisible();

      // 验证研究方向
      await expect(page.locator('[data-testid="research-tags"]')).toBeVisible();

      // 验证项目和代表作
      await expect(page.locator('[data-testid="projects-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="publications-list"]')).toBeVisible();
    });
  });
});
```

## 12. 性能优化

- **数据缓存**：React Cache / SWR
- **数据库索引**：常用查询字段
- **懒加载**：图片懒加载
- **分页**：导师地图分页

## 13. 验收标准

### MVP验收

**核心流程验收**（至少1个完整方向，如逻辑数理智能）：
- [ ] 能从`/explore`进入AI专业Overview
- [ ] Overview展示AI专业介绍和8个方向的导航
- [ ] 点击"逻辑数理智能"进入方向详情
- [ ] 展示三层结构（理论层、基础设施层、应用层）
- [ ] 每层至少包含1个研究节点卡片
- [ ] 点击研究节点进入节点详情页
- [ ] 节点详情展示2-3个代表工作
- [ ] 用户可以对工作标记兴趣（like/dislike/later）
- [ ] 标记兴趣后可以访问`/explore/ai/recommendations`查看推荐
- [ ] 推荐结果包含可解释的理由
- [ ] 可以访问`/explore/mentors`查看导师地图
- [ ] 导师地图支持按tags筛选
- [ ] 点击导师卡片进入导师Profile
- [ ] 导师Profile展示基本信息、研究方向、项目、代表作

**数据范围**：
- [ ] 至少1个完整方向（逻辑数理智能）：3个节点，每节点2-3个work
- [ ] 其他7个方向：每个1个示例节点
- [ ] 总计约10个节点，20-30个代表工作
- [ ] 至少2个测试导师（有完整的Profile信息）

### 正式版验收

- [ ] 代表工作不再使用placeholder
- [ ] 导师数据库字段完整
- [ ] 用户兴趣信号写入后端
- [ ] Agent推荐有可解释理由
- [ ] 视频可真实播放
- [ ] 移动端适配完成

## 14. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 内容量大（390个work） | MVP用示例数据，后续逐步填充 |
| 导师版权问题 | 使用官方授权或非真人avatar |
| UI复杂度高 | 使用现有设计系统，简化实现 |
| 推荐可信度 | MVP用规则匹配，后续升级LLM |
| 数据维护成本 | 提供管理界面或数据同步工具 |

## 15. 后续迭代方向

1. **内容完善**：填充所有8个方向的数据
2. **交互优化**：添加更多反馈机制
3. **推荐算法**：升级到深度学习模型
4. **多语言支持**：英文版本
5. **移动端优化**：专用移动端布局
6. **数据分析**：用户行为分析和推荐优化
