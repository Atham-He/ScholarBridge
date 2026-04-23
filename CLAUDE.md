# ScholarBridge

AI-powered mentor-student matching platform.

## 项目概述

ScholarBridge 是一个智能导师-学生匹配平台，核心功能包括：
- 导师发布研究方向和项目
- 学生申请并与导师沟通
- AI Persona（导师分身）构建、聊天与学生评估

## 技术栈

| 类别 | 技术 |
|------|------|
| Framework | Next.js 16.2.2 (App Router) |
| UI | React 19.2.4, Tailwind CSS 4 |
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | iron-session |
| AI | Anthropic Claude, OpenAI, DeepSeek |
| Language | TypeScript 5 |
| Testing | Jest |

## 项目结构

```
ScholarBridge/
├── backend/                    # 主要开发目录
│   ├── app/                    # Next.js App Router 页面
│   │   ├── api/                # API 路由
│   │   │   ├── auth/           # 认证: login, register, logout, verify-email, send-code
│   │   │   ├── skills/         # 导师技能/研究方向
│   │   │   ├── applications/   # 申请管理
│   │   │   ├── personas/       # AI Persona (build, chat, evaluate, agent-card)
│   │   │   ├── chat/           # 聊天
│   │   │   └── conversations/  # 会话
│   │   ├── (public)/           # 公开页面
│   │   ├── login/, register/   # 认证页面
│   │   ├── mentor/             # 导师页面
│   │   └── student/            # 学生页面
│   ├── lib/                    # 核心库
│   │   ├── persona/            # Persona 服务 (builder, chat, evaluation, retrieval, llm)
│   │   ├── auth.ts             # 认证工具
│   │   ├── db.ts               # Prisma 客户端
│   │   ├── session.ts          # 会话管理
│   │   └── validation.ts       # Zod 验证
│   ├── prisma/
│   │   └── schema.prisma       # 数据模型
│   └── components/             # React 组件
├── docs/                       # 文档
└── package.json
```

## 环境变量

```bash
# .env (复制自 .env.example)
DATABASE_URL="file:./dev.db"
SESSION_SECRET="<32字符密钥>"
NODE_ENV="development"

# AI 配置
PERSONA_LLM_PROVIDER="mock"  # mock | anthropic | openai | deepseek
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
DEEPSEEK_API_KEY="sk-..."
```

## 开发

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:generate
npm run db:migrate
npm run db:seed

# 启动开发服务器
npm run dev

# 构建生产
npm run build
npm run start

# 测试
npm test
```

## 核心模块

### Persona 系统

AI 导师分身的核心模块，位于 `backend/lib/persona/`：

- **builder.ts** - 构建 Persona：收集公共信息、解析文件、文本分块、LLM 蒸馏
- **chat.ts** - RAG 增强聊天：检索相关证据、构建 Prompt、返回带引用的回复
- **evaluation.ts** - 学生评估：四维度评分（研究匹配、技术深度、沟通、主动性）
- **retrieval.ts** - 检索服务：词汇重叠度算法
- **llm.ts** - LLM 提供商抽象（mock/anthropic/openai/deepseek）

### 数据模型

主要模型：`User`, `Skill`, `SkillProject`, `Application`, `Conversation`, `Message`, `Persona`, `PersonaEvaluation`

Persona 与 Skill 一对一关联，Skill 与 Application 一对多关联。

## 代码规范

- 使用 TypeScript strict 模式
- API 路由使用 Zod 验证输入
- 会话认证使用 iron-session
- 错误处理：统一 `ApiResponse` 格式

## 注意事项

- 前端代码主要在 `backend/` 目录下（已整合）
- 默认使用 SQLite 开发，PostgreSQL 用于生产
