# ScholarBridge 整合分析文档

## 项目概述

本文档分析了三个独立开发的组件的整合需求：
- **web/**: ScholarBridge前端UI设计（单个HTML文件）
- **supervisor_born/**: AI导师分身构建与运行系统（Node.js + Express）
- **backend/**: 完整的后端服务（Next.js + Prisma + SQLite）

## 1. API端点对齐分析

### 1.1 前端期望的API端点（web/）

```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/me
GET  /api/skills
GET  /api/skills/{slug}
POST /api/applications
GET  /api/applications
GET  /api/applications/{id}
PATCH /api/applications/{id}
POST /api/chat
GET  /api/conversations/{id}
GET  /api/notifications
GET  /api/mentor/dashboard
GET  /api/mentor/applications
```

### 1.2 后端已实现的API（backend/）

✅ **已完全匹配**:
- 所有认证端点 (`/api/auth/*`)
- 用户信息端点 (`/api/me`)
- Skills管理 (`GET/POST /api/skills`)
- 申请管理 (`GET/POST /api/applications`)
- 聊天功能 (`POST /api/chat`)
- 会话管理 (`GET /api/conversations/{id}`)
- 导师仪表板 (`/api/mentor/*`)
- 通知系统 (`GET /api/notifications`)

❌ **需要补充的端点**:
- `GET /api/applications/{id}` - 获取单个申请详情
- `PATCH /api/applications/{id}` - 更新申请状态（部分实现）

### 1.3 supervisor_born的API端点

```
GET  /api/health
GET  /api/personas
GET  /api/personas/:slug
GET  /api/personas/:slug/agent-card
POST /api/personas/build
POST /api/personas/:slug/update
POST /api/personas/:slug/chat
POST /api/personas/:slug/evaluate
```

**整合策略**: 将personas相关功能整合到backend的API中，作为Skills的扩展功能。

## 2. 数据模型映射分析

### 2.1 supervisor_born数据结构 → Prisma Schema

#### Persona存储结构
```javascript
// supervisor_born文件系统存储
data/personas/<slug>/
├── persona.json          // 导师画像
├── agent-card.md         // AI卡片
├── sources.json          // 证据源
├── chunks.json           // 检索块
├── input.json            // 输入记录
├── uploads/              // 上传文件
├── sessions/             // 聊天会话
└── evaluations/          // 学生评估
```

#### 对应Prisma模型扩展
```prisma
// 需要新增的模型
model Persona {
  id              String   @id @default(cuid())
  skillId         String   @unique  // 关联到Skill
  slug            String   @unique

  // Persona核心数据
  personaJson     Json     // 完整的persona对象
  agentCard       String   // agent-card.md内容

  // 证据数据
  sourcesJson     Json     // sources.json
  chunksJson      Json     // chunks.json
  inputJson       Json     // input.json

  // 元数据
  version         String
  authorizedBy    String
  consentNotes    String?
  llmProvider     String

  // 时间戳
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  builtAt         DateTime

  skill           Skill    @relation(fields: [skillId], references: [id])

  @@index([skillId])
}

model PersonaUpload {
  id              String   @id @default(cuid())
  personaId       String
  originalName    String
  storedPath      String
  mimeType        String
  size            Int
  parsedContent   String?  // 解析后的文本内容

  persona         Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@index([personaId])
}

model PersonaEvaluation {
  id              String   @id @default(cuid())
  personaId       String
  applicationId   String   @unique

  // 评估结果
  overallScore    Int
  recommendation  String   // do_not_progress, needs_human_review, recommend_interview, strong_recommendation

  // 详细评分
  researchFit     Json
  technicalDepth  Json
  communication   Json
  initiative      Json

  // 证据
  evidenceQuality Json
  evidenceBreakdown Json
  summary         String
  followUpQuestions Json

  createdAt       DateTime @default(now())

  persona         Persona     @relation(fields: [personaId], references: [id], onDelete: Cascade)
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([personaId])
  @@index([applicationId])
}
```

### 2.2 数据迁移策略

1. **保留现有数据结构**: backend的Prisma schema保持不变
2. **扩展Schema**: 添加Persona相关模型
3. **数据关联**: Persona通过skillId关联到现有的Skill模型
4. **迁移工具**: 提供从supervisor_born文件系统导入到数据库的工具

## 3. 前端整合策略

### 3.1 技术栈选择

**当前状态**:
- web/: 纯HTML + Vanilla JS + 内联CSS
- backend/: Next.js 16 + React 19 + Tailwind CSS

**整合方案**:
- ✅ 使用Next.js作为统一框架
- ✅ 将HTML转换为React组件
- ✅ 将内联CSS转换为Tailwind CSS + CSS Modules
- ✅ 保持现有的视觉设计风格

### 3.2 组件映射

| HTML页面 | Next.js路由 | React组件 |
|---------|------------|-----------|
| `#landing` | `/` | `LandingPage.tsx` |
| `#browse` | `/browse` | `BrowsePage.tsx` |
| `#profile` | `/s/[slug]` | `SkillDetailPage.tsx` |
| `#chat` | `/c/[id]` | `ChatPage.tsx` |
| `#dashboard` | `/mentor/dashboard` | `MentorDashboard.tsx` |
| `#applications` | `/student/applications` | `StudentApplications.tsx` |
| `#auth` | `/login`, `/register` | `AuthPage.tsx` |

### 3.3 样式迁移

**保留的设计系统**:
```css
/* 当前CSS变量 */
:root {
  --bg: #FAF8F5;
  --accent: #2C5F7C;
  --text: #1A1A1A;
  --font-display: 'Cormorant Garamond', serif;
  --font-body: 'DM Sans', sans-serif;
}
```

**Tailwind配置**:
```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5',
        accent: {
          DEFAULT: '#2C5F7C',
          light: '#4A8AA8'
        }
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['DM Sans', 'sans-serif']
      }
    }
  }
}
```

## 4. AI工作流整合

### 4.1 Persona构建工作流

**当前流程** (supervisor_born):
```
输入: 导师姓名 + 机构 + 公开链接 + 上传文件
  ↓
公开信息搜集 (Bing/Google/OpenAlex)
  ↓
文件解析 (PDF/DOCX/TXT/图片)
  ↓
证据切块和存储
  ↓
Persona蒸馏 (LLM或启发式)
  ↓
生成Agent Card
  ↓
存储到文件系统
```

**整合后流程**:
```
输入: Skill创建/更新 + Persona构建选项
  ↓
调用Persona构建API
  ↓
后台任务处理 (支持异步)
  ↓
存储到数据库 (Persona模型)
  ↓
关联到Skill
  ↓
自动更新Skill的AI配置
```

### 4.2 聊天功能整合

**backend现有聊天实现**:
```typescript
// 简单的基于mentor profile的prompt
const system = buildMentorSystemPrompt({
  mentorDisplayName,
  institution,
  title,
  profileMarkdown,
  researchSummary,
  openPositionsSummary
});
```

**supervisor_born的聊天实现**:
```javascript
// 基于检索增强的persona聊天
const retrievedChunks = rankChunks(chunks, query, 6);
const answer = await llmProvider.generateText(prompts);
return { answer, citations, retrievedChunks };
```

**整合方案**:
```typescript
// 增强的聊天服务
async function enhancedChat(conversationId: string, message: string) {
  // 1. 检查是否有Persona
  const persona = await getPersonaForSkill(skillId);

  if (persona) {
    // 使用Persona聊天 (RAG增强)
    return await chatWithPersona(persona, message, history);
  } else {
    // 回退到简单prompt
    return await simpleChat(skill, message, history);
  }
}
```

### 4.3 学生评估整合

**新增API端点**:
```
POST /api/personas/:slug/evaluate
POST /api/skills/:slug/evaluate-student
```

**整合到申请流程**:
```typescript
// 在申请状态更新时自动触发评估
async function evaluateApplication(applicationId: string) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      skill: { include: { persona: true } },
      student: { include: { studentProfile: true } },
      conversation: { include: { messages: true } }
    }
  });

  if (application.skill.persona) {
    const evaluation = await evaluateStudentFit({
      persona: application.skill.persona,
      studentProfile: application.student.studentProfile,
      transcript: application.conversation.messages
    });

    // 保存评估结果
    await db.personaEvaluation.create({
      data: {
        personaId: application.skill.persona.id,
        applicationId: application.id,
        ...evaluation
      }
    });
  }
}
```

## 5. 文件上传处理

### 5.1 当前实现差异

**supervisor_born**:
- 使用multer处理multipart/form-data
- 支持PDF/DOCX/TXT/图片
- 文件存储到本地`uploads/`目录

**backend**:
- Next.js内置文件处理
- 需要增强以支持多种文件格式

### 5.2 整合方案

```typescript
// app/api/personas/build/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();

  // 解析表单字段
  const name = formData.get('name') as string;
  const affiliation = formData.get('affiliation') as string;
  const authorizedBy = formData.get('authorizedBy') as string;

  // 处理文件上传
  const files = formData.getAll('files') as File[];
  const uploads = [];

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const parsed = await parseUploadedFile(file.name, Buffer.from(buffer));
    uploads.push({
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      parsedContent: parsed.content
    });
  }

  // 构建persona...
}
```

## 6. 公共信息搜集整合

### 6.1 supervisor_born的搜索能力

- 多搜索引擎支持 (Bing/Google/DuckDuckGo)
- OpenAlex学术数据集成
- 机构主页探测
- Google Scholar profile发现

### 6.2 整合策略

```typescript
// lib/persona/search.ts
export class PersonaSearchService {
  async searchPublicInfo(params: {
    name: string;
    affiliation: string;
    explicitUrls?: string[];
  }) {
    const results = await Promise.allSettled([
      this.webSearch.search(params),
      this.openAlex.search(params),
      this.institutionProbe.search(params),
      this.googleScholar.findProfile(params)
    ]);

    return this.aggregateResults(results);
  }
}
```

## 7. 环境配置整合

### 7.1 统一的环境变量

```bash
# 数据库
DATABASE_URL="file:./dev.db"

# Next.js配置
SESSION_SECRET="your-secret-key-min-32-chars"
NODE_ENV="development"

# Anthropic AI (现有)
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"

# Persona构建 (新增)
PERSONA_LLM_PROVIDER="anthropic"  // mock|openai|deepseek|anthropic
OPENAI_API_KEY="sk-..."
DEEPSEEK_API_KEY="sk-..."

# 公共搜索 (新增)
WEB_SEARCH_PROVIDER="multi"       // multi|bing|google|duckduckgo|none
BING_SEARCH_API_KEY=""
GOOGLE_SEARCH_API_KEY=""
GOOGLE_SEARCH_CX=""

# 文件上传 (新增)
MAX_UPLOAD_SIZE_MB="10"
ALLOWED_UPLOAD_TYPES="pdf,docx,doc,txt,md,png,jpg,jpeg"

# 数据目录 (用于兼容性)
DATA_DIR="./data"
```

## 8. 依赖整合

### 8.1 统一package.json

```json
{
  "dependencies": {
    // Next.js核心 (现有)
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",

    // 数据库 (现有)
    "@prisma/client": "^6.19.3",
    "prisma": "^6.19.3",

    // 认证 (现有)
    "iron-session": "^8.0.4",
    "bcryptjs": "^3.0.2",

    // AI集成 (现有 + 新增)
    "@anthropic-ai/sdk": "^0.82.0",
    "openai": "^4.0.0",

    // 文件解析 (来自supervisor_born)
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.8.0",
    "word-extractor": "^0.3.0",

    // 搜索 (来自supervisor_born)
    "cheerio": "^1.0.0",

    // 工具库
    "zod": "^4.3.6",
    "dotenv": "^16.6.1"
  }
}
```

## 9. 测试策略

### 9.1 单元测试
- Persona构建逻辑 (启发式蒸馏)
- 检索算法 (lexical ranking)
- 评估算法 (评分逻辑)

### 9.2 集成测试
- Persona构建完整流程
- 聊天API端到端测试
- 评估API测试

### 9.3 E2E测试
- 导师创建Skill → 构建Persona
- 学生浏览 → 申请 → 聊天
- 导师查看评估结果

## 10. 实施优先级

### P0 (核心功能)
1. 扩展Prisma Schema支持Persona
2. 实现Persona构建API
3. 整合聊天功能 (支持Persona)
4. 前端页面迁移 (Landing, Browse, Profile)

### P1 (增强功能)
5. 实现学生评估API
6. 前端聊天页面迁移
7. 文件上传处理
8. 公共信息搜集集成

### P2 (完善功能)
9. 前端导师仪表板迁移
10. 数据迁移工具
11. 监控和日志
12. 性能优化

## 11. 兼容性保证

### 11.1 向后兼容
- 保持现有API端点不变
- 现有数据结构保持兼容
- 渐进式迁移，允许共存

### 11.2 渐进式整合
1. 先整合核心功能
2. 逐步启用高级功能
3. 提供功能开关控制
4. 完善监控和回滚机制

## 12. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 数据模型冲突 | 高 | 仔细设计schema，保持兼容性 |
| 性能下降 | 中 | 异步处理，缓存优化 |
| AI成本增加 | 中 | 设置配额，使用mock模式 |
| 前端风格变化 | 低 | 严格保持视觉设计 |
| 文件上传安全 | 中 | 严格的类型和大小限制 |

## 结论

三个组件的整合是可行的，主要工作包括：
1. **数据层**: 扩展Prisma schema支持Persona
2. **API层**: 整合supervisor_born的workflows到Next.js API routes
3. **前端层**: 将HTML转换为React组件
4. **服务层**: 整合AI服务 (聊天、评估、搜索)

建议采用渐进式整合策略，优先实现核心功能，然后逐步添加高级特性。
