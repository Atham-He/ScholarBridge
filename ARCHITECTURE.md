# ScholarBridge 统一架构设计

## 1. 项目结构

### 1.1 最终目录结构

```
scholarbridge/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.example
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
│   │   ├── me/route.ts
│   │   ├── skills/
│   │   │   ├── route.ts
│   │   │   └── [slug]/
│   │   │       ├── route.ts
│   │   │       └── projects/route.ts
│   │   ├── applications/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── withdraw/route.ts
│   │   ├── chat/
│   │   │   └── route.ts
│   │   ├── conversations/
│   │   │   └── [id]/route.ts
│   │   ├── mentor/
│   │   │   ├── dashboard/route.ts
│   │   │   └── applications/route.ts
│   │   ├── notifications/route.ts
│   │   ├── projects/
│   │   │   └── [id]/route.ts
│   │   └── personas/
│   │       ├── build/route.ts          # NEW: 构建persona
│   │       ├── [slug]/
│   │       │   ├── route.ts            # NEW: 获取persona
│   │       │   ├── update/route.ts     # NEW: 更新persona
│   │       │   ├── chat/route.ts       # NEW: Persona聊天
│   │       │   ├── evaluate/route.ts   # NEW: 学生评估
│   │       │   └── agent-card/route.ts # NEW: 获取agent card
│   │       └── search/route.ts         # NEW: 公共信息搜索
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Landing page
│   │   ├── browse/
│   │   │   └── page.tsx               # 浏览导师
│   │   └── s/
│   │       └── [slug]/
│   │           └── page.tsx           # 导师详情
│   ├── chat/
│   │   └── [id]/
│   │       └── page.tsx               # 聊天页面
│   ├── (student)/
│   │   ├── layout.tsx
│   │   └── applications/
│   │       └── page.tsx               # 学生申请列表
│   ├── (mentor)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       └── page.tsx               # 导师仪表板
│   └── (auth)/
│       ├── layout.tsx
│       ├── login/
│       │   └── page.tsx
│       └── register/
│           └── page.tsx
├── components/
│   ├── ui/                            # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   └── Select.tsx
│   ├── layout/                        # 布局组件
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── mentor/                        # 导师相关组件
│   │   ├── MentorCard.tsx
│   │   ├── MentorProfile.tsx
│   │   ├── ProjectCard.tsx
│   │   └── PublicationList.tsx
│   ├── chat/                          # 聊天组件
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── AgentSidebar.tsx
│   │   └── TypingIndicator.tsx
│   ├── application/                   # 申请组件
│   │   ├── ApplicationCard.tsx
│   │   ├── ApplicationStatus.tsx
│   │   └── ApplicationForm.tsx
│   └── persona/                       # Persona组件 (NEW)
│       ├── PersonaBuilder.tsx
│       ├── PersonaStatus.tsx
│       ├── PersonaSources.tsx
│       └── EvaluationReport.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── validation.ts
│   ├── prompt.ts
│   └── scholarbridge.ts
│   └── persona/                       # Persona库 (NEW)
│       ├── builder.ts                 # Persona构建
│       ├── chat.ts                    # Persona聊天
│       ├── evaluation.ts              # 学生评估
│       ├── search.ts                  # 公共搜索
│       ├── parser.ts                  # 文件解析
│       ├── retrieval.ts               # 检索
│       ├── llm.ts                     # LLM提供商
│       └── storage.ts                 # Persona存储
├── public/
│   ├── fonts/
│   ├── images/
│   └── scholarbridge.html             # 保留原始HTML作为参考
├── scripts/
│   ├── migrate-personas.ts            # 数据迁移脚本
│   ├── seed-personas.ts               # Persona种子数据
│   └── test-persona-build.ts          # 测试脚本
└── tests/
    ├── unit/
    │   ├── persona/
    │   │   ├── builder.test.ts
    │   │   ├── retrieval.test.ts
    │   │   └── evaluation.test.ts
    │   └── chat.test.ts
    ├── integration/
    │   ├── api/
    │   │   ├── personas.test.ts
    │   │   └── chat.test.ts
    │   └── workflows/
    │       └── build-persona.test.ts
    └── e2e/
        ├── mentor-flow.test.ts
        └── student-flow.test.ts
```

### 1.2 模块边界

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Public    │  │   Student   │  │       Mentor        │ │
│  │   Pages     │  │   Pages     │  │       Pages         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                            ↓                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    UI Components                       │ │
│  │  Button, Card, ChatInterface, PersonaBuilder, etc.    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │   Auth   │  │  Skills  │  │   Chat   │  │  Personas  │ │
│  │   APIs   │  │   APIs   │  │   APIs   │  │    APIs    │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Skill &    │  │  Persona     │  │   Application    │ │
│  │  Application │  │  Workflows   │  │   Workflows      │ │
│  │  Management  │  │  (NEW)       │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       Service Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │   Auth &    │  │    LLM      │  │   Public Search     ││
│  │  Session    │  │  Providers  │  │   Services          ││
│  └─────────────┘  └─────────────┘  └─────────────────────┘│
│  ┌───────────────────────────────────────────────────────┐│
│  │            Persona Services (NEW)                     ││
│  │  • Builder  • Chat  • Evaluation  • Search  • Parser  ││
│  └───────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    Prisma ORM                          │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │
│  │  PostgreSQL │  │    SQLite   │  │   File Storage    │ │
│  │ (Production)│  │ (Development│  │  (Uploads Cache)  │ │
│  └─────────────┘  └─────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Anthropic│  │  OpenAI  │  │ DeepSeek │  │ OpenAlex/  │ │
│  │   Claude │  │          │  │          │  │  Scholar    │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. 数据模型设计

### 2.1 扩展Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // 开发环境，生产环境使用postgresql
  url      = env("DATABASE_URL")
}

// ============= 现有模型 (保持不变) =============

enum UserRole {
  MENTOR
  STUDENT
}

enum SkillStatus {
  DRAFT
  PUBLISHED
}

enum ProjectStatus {
  OPEN
  CLOSED
}

enum ApplicationStatus {
  CHATTING
  UNDER_REVIEW
  INTERVIEW_SCHEDULED
  ACCEPTED
  REJECTED
  WITHDRAWN
}

enum MessageRole {
  USER
  ASSISTANT
  MENTOR
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         UserRole
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  mentorProfile  MentorProfile?
  studentProfile StudentProfile?

  skills Skill[] @relation("MentorSkills")

  applicationsAsStudent Application[] @relation("StudentApps")
  applicationsAsMentor  Application[] @relation("MentorApps")

  notifications Notification[]
}

model MentorProfile {
  userId      String  @id
  displayName String
  institution String
  department  String?
  title       String?
  bioShort    String?
  location    String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model StudentProfile {
  userId          String @id
  displayName     String
  backgroundBrief String?
  materialsJson   Json?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Skill {
  id              String      @id @default(cuid())
  ownerUserId     String
  slug            String      @unique
  title           String
  profileMarkdown String
  status          SkillStatus @default(DRAFT)
  isPublic        Boolean     @default(false)
  publishedAt     DateTime?

  tags             Json?
  hIndex           Int?
  citationsDisplay String?
  researchSummary  String?
  publications     Json?
  agentActive      Boolean  @default(true)
  agentIntro       String?
  scholarSyncedAt  DateTime?

  // 关联Persona
  persona          Persona?

  owner User @relation("MentorSkills", fields: [ownerUserId], references: [id], onDelete: Cascade)

  applications Application[]
  projects     SkillProject[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerUserId])
}

model SkillProject {
  id          String        @id @default(cuid())
  skillId     String
  title       String
  description String
  status      ProjectStatus @default(OPEN)
  metaTags    Json?
  sortOrder   Int           @default(0)

  skill Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@index([skillId])
}

model Application {
  id            String              @id @default(cuid())
  studentUserId String
  mentorUserId  String
  skillId       String
  status        ApplicationStatus   @default(CHATTING)
  aiScore       Float?
  aiFlagNotify  Boolean             @default(false)
  lastMessageAt DateTime?
  interviewAt   DateTime?

  student User @relation("StudentApps", fields: [studentUserId], references: [id], onDelete: Cascade)
  mentor  User @relation("MentorApps", fields: [mentorUserId], references: [id], onDelete: Cascade)
  skill   Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

  conversation Conversation?
  evaluation    PersonaEvaluation? // 关联评估结果

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([studentUserId, skillId])
  @@index([mentorUserId])
  @@index([studentUserId])
}

model Conversation {
  id            String @id @default(cuid())
  applicationId String @unique

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  messages    Message[]
}

model Message {
  id             String      @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String
  createdAt      DateTime    @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ============= 新增Persona相关模型 =============

model Persona {
  id              String   @id @default(cuid())
  skillId         String   @unique
  slug            String   @unique

  // Persona核心数据 (JSON存储，保持与supervisor_born兼容)
  personaJson     Json     // 完整的persona对象
  agentCard       String   // agent-card.md内容

  // 证据数据
  sourcesJson     Json     // sources.json - 证据源列表
  chunksJson      Json     // chunks.json - 检索块
  inputJson       Json     // input.json - 构建输入记录

  // 元数据
  version         String   @default("0.1.0")
  authorizedBy    String
  consentNotes    String?
  llmProvider     String   @default("mock") // mock|openai|anthropic|deepseek
  llmModel        String?

  // 构建状态
  buildStatus     String   @default("pending") // pending|building|completed|failed
  buildError      String?
  builtAt         DateTime?

  // 统计
  sourceCount     Int      @default(0)
  publicSourceCount Int    @default(0)
  uploadSourceCount Int    @default(0)
  chunkCount      Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  skill           Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  uploads         PersonaUpload[]
  evaluations     PersonaEvaluation[]
  sessions        PersonaSession[]

  @@index([skillId])
  @@index([slug])
  @@index([buildStatus])
}

model PersonaUpload {
  id              String   @id @default(cuid())
  personaId       String

  // 文件信息
  originalName    String
  storedPath      String
  mimeType        String
  size            Int

  // 解析结果
  parsedContent   String?  // 文本内容
  parseError      String?

  // 元数据
  sourceId        String   // 对应sources.json中的id
  uploadedAt      DateTime @default(now())

  persona         Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@index([personaId])
  @@index([sourceId])
}

model PersonaEvaluation {
  id              String   @id @default(cuid())
  personaId       String
  applicationId   String   @unique

  // 评估结果
  overallScore    Int
  recommendation  String   // do_not_progress|needs_human_review|recommend_interview|strong_recommendation

  // 详细评分 (JSON格式)
  researchFit     Json     // {score, rationale, evidence}
  technicalDepth  Json     // {score, rationale, evidence}
  communication   Json     // {score, rationale, evidence}
  initiative      Json     // {score, rationale, evidence}

  // 证据质量
  evidenceQuality Json     // {evidenceBackedCount, hasStudentProfile, hasTranscript, lowEvidence}
  evidenceBreakdown Json   // {evidenceBacked: [], inferred: []}

  // 总结
  summary         String
  followUpQuestions Json   // ["问题1", "问题2", ...]

  createdAt       DateTime @default(now())

  persona         Persona     @relation(fields: [personaId], references: [id], onDelete: Cascade)
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([personaId])
  @@index([applicationId])
}

model PersonaSession {
  id              String   @id @default(cuid())
  personaId       String
  sessionId       String   @unique

  // 会话数据
  turnsJson       Json     // 聊天记录 [{role, message, answer, citations, retrievedChunks, timestamp}]

  // 元数据
  studentProfile  Json?    // 学生档案
  messageCount    Int      @default(0)
  lastMessageAt   DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  persona         Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@index([personaId])
  @@index([sessionId])
}
```

### 2.2 数据关系图

```
User (1) ──┐
           ├──> (1) Skill (1) ──> (1) Persona
           │         │
           │         ├──> (N) SkillProject
           │         │
           │         └──> (N) Application (N) <──┐ User (N)
           │                   │                  │
           │                   ├──> (1) Conversation
           │                   │         │
           │                   │         └──> (N) Message
           │                   │
           │                   └──> (1) PersonaEvaluation
           │
           └──> (N) Notification
```

## 3. API网关设计

### 3.1 路由组织

```
/api
├── /auth              # 认证相关
│   ├── POST /login
│   ├── POST /register
│   └── POST /logout
├── /me                # 当前用户信息
│   └── GET /
├── /skills            # Skills管理
│   ├── GET  /                      # 列表
│   ├── POST /                      # 创建
│   ├── GET  /:slug                 # 详情
│   └── POST /:slug/projects        # 添加项目
├── /applications       # 申请管理
│   ├── GET  /                      # 我的申请
│   ├── POST /                      # 创建申请
│   ├── GET  /:id                   # 申请详情
│   ├── PATCH /:id                  # 更新状态
│   └── POST /:id/withdraw          # 撤回
├── /chat              # 聊天
│   └── POST /                       # 发送消息
├── /conversations     # 会话
│   └── GET  /:id                   # 获取会话
├── /mentor            # 导师功能
│   ├── GET  /dashboard             # 仪表板
│   └── GET  /applications          # 申请列表
├── /notifications      # 通知
│   └── GET  /                       # 我的通知
├── /projects          # 项目管理
│   ├── PATCH /:id                  # 更新项目
│   └── DELETE /:id                 # 删除项目
└── /personas          # Persona功能 (NEW)
    ├── POST /build                 # 构建Persona
    ├── GET  /:slug                 # 获取Persona
    ├── POST /:slug/update          # 更新Persona
    ├── GET  /:slug/agent-card      # 获取Agent Card
    ├── POST /:slug/chat            # Persona聊天
    ├── POST /:slug/evaluate        # 学生评估
    └── POST /search                # 公共信息搜索
```

### 3.2 API版本控制

```typescript
// 通过中间件支持版本控制
// app/api/v1/... 和 app/api/v2/...
// 当前版本默认为 v1
```

### 3.3 请求/响应标准化

```typescript
// 统一响应格式
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// 错误处理中间件
export function withApiHandler<T>(
  handler: (req: NextRequest, context: any) => Promise<ApiResponse<T>>
) {
  return async (req: NextRequest, context: any) => {
    try {
      const result = await handler(req, context);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误'
        }
      }, { status: 500 });
    }
  };
}
```

## 4. 配置管理

### 4.1 环境变量结构

```bash
# .env.example

# ============= 应用配置 =============
NODE_ENV="development"
PORT="3000"
APP_URL="http://localhost:3000"

# ============= 数据库 =============
DATABASE_URL="file:./prisma/dev.db"
# DATABASE_URL="postgresql://user:password@localhost:5432/scholarbridge"  # 生产环境

# ============= 会话与认证 =============
SESSION_SECRET="your-secret-key-minimum-32-characters-long"
BCRYPT_ROUNDS="10"

# ============= AI服务 =============

# Anthropic Claude (主要AI服务)
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"

# OpenAI (可选)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"

# DeepSeek (可选)
DEEPSEEK_API_KEY="sk-..."

# ============= Persona构建 =============
PERSONA_LLM_PROVIDER="anthropic"  # mock|openai|anthropic|deepseek
PERSONA_DEFAULT_MODEL="claude-3-5-haiku-latest"

# ============= 公共搜索 =============
WEB_SEARCH_PROVIDER="multi"        # multi|bing|google|duckduckgo|none
BING_SEARCH_API_KEY=""
BING_SEARCH_ENDPOINT="https://api.bing.microsoft.com/v7.0/search"
GOOGLE_SEARCH_API_KEY=""
GOOGLE_SEARCH_CX=""

# OpenAlex学术数据
OPENALEX_API_BASE="https://api.openalex.org"

# 搜索配置
MAX_PUBLIC_PAGES="6"
MAX_PAPERS="8"
FETCH_TIMEOUT_MS="15000"

# ============= 文件上传 =============
MAX_UPLOAD_SIZE_MB="10"
ALLOWED_UPLOAD_TYPES="pdf,docx,doc,txt,md,png,jpg,jpeg"
UPLOAD_DIR="./uploads"

# ============= 缓存 =============
REDIS_URL=""  # 可选：生产环境使用Redis缓存

# ============= 日志 =============
LOG_LEVEL="info"  # debug|info|warn|error
LOG_FORMAT="json" # json|text

# ============= 功能开关 =============
FEATURE_PERSONA_BUILD="true"
FEATURE_PUBLIC_SEARCH="true"
FEATURE_AI_EVALUATION="true"
FEATURE_STUDENT_EVALUATION="true"
```

### 4.2 配置验证

```typescript
// lib/config.ts
import { z } from 'zod';

const envSchema = z.object({
  // 数据库
  DATABASE_URL: z.string().min(1),

  // 会话
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AI服务
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-latest'),

  // Persona
  PERSONA_LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'deepseek']).default('mock'),

  // 搜索
  WEB_SEARCH_PROVIDER: z.enum(['multi', 'bing', 'google', 'duckduckgo', 'none']).default('none'),
  BING_SEARCH_API_KEY: z.string().optional().default(''),
  GOOGLE_SEARCH_API_KEY: z.string().optional().default(''),

  // 文件上传
  MAX_UPLOAD_SIZE_MB: z.coerce.number().min(1).max(100).default(10),
  ALLOWED_UPLOAD_TYPES: z.string().default('pdf,docx,doc,txt,md'),

  // 功能开关
  FEATURE_PERSONA_BUILD: z.coerce.boolean().default(true),
  FEATURE_PUBLIC_SEARCH: z.coerce.boolean().default(true),
});

export const env = envSchema.parse(process.env);
```

## 5. 服务架构

### 5.1 Persona服务层

```typescript
// lib/persona/builder.ts
export class PersonaBuilder {
  constructor(
    private llmProvider: LLMProvider,
    private searchService: PublicSearchService,
    private parser: FileParser,
    private storage: PersonaStorage
  ) {}

  async build(params: BuildPersonaParams): Promise<Persona> {
    // 1. 验证输入
    // 2. 搜集公共信息
    // 3. 解析上传文件
    // 4. 构建证据块
    // 5. 蒸馏Persona
    // 6. 生成Agent Card
    // 7. 持久化存储
  }
}

// lib/persona/chat.ts
export class PersonaChat {
  constructor(private llmProvider: LLMProvider) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    // 1. 加载Persona
    // 2. 检索相关证据
    // 3. 构建Prompt
    // 4. 调用LLM
    // 5. 返回响应和引用
  }
}

// lib/persona/evaluation.ts
export class StudentEvaluator {
  constructor(private llmProvider: LLMProvider) {}

  async evaluate(params: EvaluationParams): Promise<EvaluationResult> {
    // 1. 加载Persona
    // 2. 收集学生信息
    // 3. 加载对话历史
    // 4. 多维度评估
    // 5. 生成建议
  }
}
```

### 5.2 LLM提供商抽象

```typescript
// lib/persona/llm.ts
export interface LLMProvider {
  kind: 'mock' | 'openai' | 'anthropic' | 'deepseek';

  generateText(prompts: string[]): Promise<string>;
  generateJson(prompts: string[]): Promise<any>;
  generateVision(image: Buffer, prompt: string): Promise<string>;
}

export class AnthropicProvider implements LLMProvider {
  kind = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(prompts: string[]): Promise<string> {
    // 实现Anthropic调用
  }

  async generateJson(prompts: string[]): Promise<any> {
    // 实现结构化输出
  }
}

// 工厂函数
export function createLLMProvider(config: {
  provider: string;
  apiKey?: string;
  model?: string;
}): LLMProvider {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey!, config.model!);
    case 'openai':
      return new OpenAIProvider(config.apiKey!, config.model!);
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

### 5.3 检索服务

```typescript
// lib/persona/retrieval.ts
export interface Chunk {
  id: string;
  sourceId: string;
  title: string;
  text: string;
  chunkIndex: number;
}

export class RetrievalService {
  // 简单的lexical检索 (v1)
  rankChunks(query: string, chunks: Chunk[], topK: number = 6): Chunk[] {
    const queryLower = query.toLowerCase();
    const scores = chunks.map(chunk => ({
      chunk,
      score: this.overlapScore(queryLower, chunk.text.toLowerCase())
    }));

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.chunk);
  }

  private overlapScore(query: string, text: string): number {
    // 实现词汇重叠度计算
  }
}

// v2可以升级为向量检索
export class VectorRetrievalService extends RetrievalService {
  constructor(private embeddingService: EmbeddingService) {
    super();
  }

  async rankChunks(query: string, chunks: Chunk[]): Promise<Chunk[]> {
    // 使用embedding和向量相似度
  }
}
```

## 6. 安全架构

### 6.1 认证流程

```
┌─────────────┐
│   用户      │
└──────┬──────┘
       │ 1. POST /api/auth/login
       │    {email, password}
       ↓
┌─────────────────────────┐
│   API Route /login      │
│   - 验证输入             │
│   - 查询用户             │
│   - bcrypt验证密码       │
└──────┬──────────────────┘
       │ 2. 创建会话
       ↓
┌─────────────────────────┐
│   iron-session          │
│   - 加密cookie          │
│   - HTTPOnly            │
│   - 14天有效期          │
└──────┬──────────────────┘
       │ 3. 返回响应
       ↓
┌─────────────────────────┐
│   客户端                 │
│   - 存储cookie           │
│   - 后续请求自动携带     │
└─────────────────────────┘
```

### 6.2 授权中间件

```typescript
// middleware.ts
import { getToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路由
  const publicPaths = ['/', '/browse', '/login', '/register'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 检查认证
  const session = await getToken(request);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 角色检查
  if (pathname.startsWith('/mentor') && session.role !== 'MENTOR') {
    return NextResponse.redirect(new URL('/browse', request.url));
  }

  if (pathname.startsWith('/student') && session.role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/mentor/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 6.3 API速率限制

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1分钟
});

export async function rateLimitMiddleware(
  identifier: string,
  limit: number = 10
): Promise<{ success: boolean; remaining?: number }> {
  const count = (rateLimit.get(identifier) as number) || 0;

  if (count >= limit) {
    return { success: false };
  }

  rateLimit.set(identifier, count + 1);
  return { success: true, remaining: limit - count - 1 };
}
```

## 7. 部署架构

### 7.1 开发环境

```
┌──────────────────────────────────────────┐
│         开发机 (localhost:3000)           │
│  ┌────────────────────────────────────┐ │
│  │  Next.js Dev Server                │ │
│  │  - 热重载                          │ │
│  │  - 快速刷新                        │ │
│  │  - 详细错误堆栈                    │ │
│  └────────────────────────────────────┘ │
│              ↓                            │
│  ┌────────────────────────────────────┐ │
│  │  SQLite (prisma/dev.db)            │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 7.2 生产环境

```
                    ┌─────────────────┐
                    │   CDN/WAF       │
                    │  (静态资源)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼───────┐   ┌───────▼──────┐
│  Next.js App  │   │  Next.js App   │   │  Next.js App │
│  Instance 1   │   │  Instance 2    │   │  Instance 3  │
└───────┬───────┘   └────────┬───────┘   └───────┬──────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │  (主数据库)      │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Redis Cache    │
                    │  (可选)         │
                    └─────────────────┘

外部服务:
- Anthropic Claude API
- OpenAI API
- Bing/Google Search API
- OpenAlex API
```

### 7.3 Docker部署

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依赖安装
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: scholarbridge
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 8. 监控与日志

### 8.1 日志结构

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['req.headers.authorization'],
});

// 使用示例
logger.info({
  context: 'persona_build',
  personaId: 'xxx',
  duration: 1234,
}, 'Persona build completed');
```

### 8.2 性能监控

```typescript
// lib/metrics.ts
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  recordTiming(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
  }

  getStats(name: string) {
    const timings = this.metrics.get(name) || [];
    if (timings.length === 0) return null;

    const sorted = [...timings].sort((a, b) => a - b);
    return {
      count: timings.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: timings.reduce((a, b) => a + b, 0) / timings.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}
```

## 9. 测试架构

### 9.1 测试金字塔

```
        ┌─────────┐
        │   E2E   │  ← Playwright (关键用户流程)
        │   10%   │
        ├─────────┤
        │  集成测试 │  ← API Routes + Database
        │   30%   │
        ├─────────┤
        │  单元测试  │  ← 纯函数逻辑
        │   60%   │
        └─────────┘
```

### 9.2 测试配置

```typescript
// jest.config.js
import { defaults as tsjPreset } from 'ts-jest/presets';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

## 10. 扩展性设计

### 10.1 插件系统

```typescript
// lib/plugins.ts
export interface Plugin {
  name: string;
  version: string;

  // 生命周期钩子
  onPersonaBuild?(context: BuildContext): Promise<void>;
  onChatMessage?(context: ChatContext): Promise<void>;
  onEvaluation?(context: EvaluationContext): Promise<void>;
}

export class PluginManager {
  private plugins: Plugin[] = [];

  register(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  async executeHook<T extends keyof Plugin>(
    hook: T,
    ...args: Parameters<NonNullable<Plugin[T]>>
  ) {
    for (const plugin of this.plugins) {
      const fn = plugin[hook];
      if (fn) {
        await fn.apply(plugin, args as any);
      }
    }
  }
}
```

### 10.2 事件总线

```typescript
// lib/events.ts
import { EventEmitter } from 'events';

export enum EventBusEvents {
  PERSONA_BUILT = 'persona:built',
  PERSONA_UPDATED = 'persona:updated',
  APPLICATION_CREATED = 'application:created',
  APPLICATION_STATUS_CHANGED = 'application:status_changed',
  CHAT_MESSAGE_SENT = 'chat:message:sent',
  EVALUATION_COMPLETED = 'evaluation:completed',
}

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

export const eventBus = new EventBus();

// 使用示例
eventBus.on(EventBusEvents.PERSONA_BUILT, async (persona) => {
  // 触发通知、索引更新等
});
```

## 总结

这个统一架构设计：

1. **清晰分层**: 表示层、API层、业务逻辑层、服务层、数据层分离
2. **模块化**: Persona功能作为独立模块，易于维护和扩展
3. **向后兼容**: 保留现有API和数据结构，渐进式迁移
4. **可扩展**: 插件系统和事件总线支持未来功能扩展
5. **生产就绪**: 完整的安全、监控、日志、测试策略

下一步可以开始实施具体的代码迁移和功能开发。
