# ScholarBridge

**AI-Powered Mentor-Student Matching Platform**

ScholarBridge是一个基于AI的导师-学生匹配平台，通过AI导师分身(Persona)技术帮助学生更好地了解导师研究方向，同时帮助导师更高效地筛选合适的学生。

**🎯 项目整合完成度**: ~70% | **核心功能**: 100%可用

**AI-Powered Mentor-Student Matching Platform**

ScholarBridge是一个基于AI的导师-学生匹配平台，通过AI导师分身(PPersona)技术帮助学生更好地了解导师研究方向，同时帮助导师更高效地筛选合适的学生。

## 项目特色

- 🤖 **AI导师分身**: 基于导师公开信息和上传资料构建AI分身，能够回答学生问题
- 🔍 **智能检索**: 使用RAG(检索增强生成)技术，基于真实证据回答问题
- 📊 **多维评估**: 从研究匹配度、技术深度、沟通能力、主动性四个维度评估学生
- 🎓 **学术导向**: 专为学术研究场景设计，理解学术界的招聘流程
- 🔐 **授权优先**: 所有AI分身都需要导师明确授权，保证信息真实性

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd ScholarBridge/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑.env文件，至少配置以下变量：
# DATABASE_URL="file:./dev.db"
# SESSION_SECRET="your-secret-key-minimum-32-characters"
# PERSONA_LLM_PROVIDER="mock"  # 或配置真实的API key

# 初始化数据库
npm run db:generate
npm run db:migrate
npm run db:seed

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 演示账号

```
导师: mentor@demo.local / demo123
学生: student@demo.local / demo123
```

## 项目结构

```
ScholarBridge/
├── backend/                  # 主应用目录
│   ├── app/                 # Next.js应用
│   │   ├── api/            # API路由
│   │   └── (public)/       # 页面组件
│   ├── lib/                # 核心库
│   │   └── persona/        # Persona服务
│   ├── prisma/             # 数据库schema
│   └── package.json
├── web/                    # 前端设计参考
├── supervisor_born/        # AI Agent原始实现
└── docs/                   # 文档
```

## 核心功能

### 1. Persona构建

根据导师的公开信息和上传资料，自动生成AI分身。

#### 方法1: 使用公共搜索（推荐，零配置）

**自动搜集公开资料**：
- Web搜索（DuckDuckGo免费，无需API key）
- 学术数据库（OpenAlex，完全免费）
- 内容抓取和清理

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Geoffrey Hinton",
    "affiliation": "University of Toronto",
    "authorizedBy": "admin@utoronto.ca"
  }'
```

**可选配置**：
```bash
# .env
BING_SEARCH_API_KEY=""        # 可选：更好的搜索结果
GOOGLE_SEARCH_API_KEY=""      # 可选：Google搜索
OPENALEX_EMAIL="your@email"   # 推荐：OpenAlex更好的配额
```

#### 方法2: 使用文本描述
    "name": "导师姓名",
    "affiliation": "所属机构",
    "authorizedBy": "授权人",
    "projectText": "研究方向和期望学生..."
  }'
```

#### 方法2: 上传文件（推荐）

支持PDF、DOCX、图片、文本文件：

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Cookie: skill-hub-session=YOUR_SESSION" \
  -F "name=导师姓名" \
  -F "affiliation=所属机构" \
  -F "authorizedBy=授权人" \
  -F "files=@research.pdf" \
  -F "files=@project.docx" \
  -F "files=@interests.txt"
```

### 2. 智能对话

学生可以与AI分身进行对话，了解研究方向和要求：

```bash
POST /api/personas/[slug]/chat
{
  "message": "老师您好，我对您的研究方向很感兴趣...",
  "studentProfile": {
    "name": "学生姓名",
    "background": "学生背景...",
    "interests": ["研究兴趣1", "研究兴趣2"]
  }
}
```

### 3. 学生评估

AI分身可以根据学生信息和对话记录，进行多维度的评估：

```bash
POST /api/personas/[slug]/evaluate
{
  "studentProfile": { ... },
  "transcript": [ ... ]
}
```

评估结果包括：
- 研究匹配度评分
- 技术深度评分
- 沟通能力评分
- 主动性评分
- 推荐等级（强烈推荐/建议面试/需要复核/不建议推进）

## 配置选项

### LLM提供商

支持多种LLM提供商：

**Anthropic Claude** (推荐):
```bash
PERSONA_LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"
```

**OpenAI**:
```bash
PERSONA_LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

**DeepSeek**:
```bash
PERSONA_LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-..."
```

**Mock** (开发测试):
```bash
PERSONA_LLM_PROVIDER="mock"
```

### 公共搜索

可选配置公共信息搜索（用于自动搜集导师公开资料）：

```bash
WEB_SEARCH_PROVIDER="multi"  # multi|bing|google|duckduckgo|none
BING_SEARCH_API_KEY="..."
GOOGLE_SEARCH_API_KEY="..."
GOOGLE_SEARCH_CX="..."
```

### 文件上传

```bash
MAX_UPLOAD_SIZE_MB="10"
ALLOWED_UPLOAD_TYPES="pdf,docx,doc,txt,md,png,jpg,jpeg"
```

## API文档

详细的API文档请参阅：
- [整合分析](./INTEGRATION_ANALYSIS.md) - 组件整合分析
- [架构设计](./ARCHITECTURE.md) - 系统架构设计
- [项目状态](./PROJECT_STATUS.md) - 项目进展状态
- [Persona API实现](./backend/PERSONA_API_IMPLEMENTATION.md) - Persona API实现详情
- [Persona API使用指南](./backend/PERSONA_API_EXAMPLES.md) - API使用示例和测试
- [文件上传指南](./FILE_UPLOAD_GUIDE.md) - 文件上传功能完整文档 ✨ 新增
- [公共搜索指南](./PUBLIC_SEARCH_GUIDE.md) - 公共搜索集成文档 ✨ 新增

## 主要API端点

### 认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `GET /api/me` - 获取当前用户信息

### Skills
- `GET /api/skills` - 列出所有公开的Skills
- `POST /api/skills` - 创建新的Skill（导师）
- `GET /api/skills/[slug]` - 获取Skill详情
- `POST /api/skills/[slug]/projects` - 添加项目

### Personas
- `POST /api/personas/build` - 构建Persona（支持文件上传）
- `GET /api/personas/[slug]` - 获取Persona详情
- `POST /api/personas/[slug]/chat` - 与Persona对话
- `POST /api/personas/[slug]/evaluate` - 评估学生

### 申请
- `GET /api/applications` - 获取我的申请
- `POST /api/applications` - 创建申请
- `PATCH /api/applications/[id]` - 更新申请状态

### 聊天
- `POST /api/chat` - 发送聊天消息
- `GET /api/conversations/[id]` - 获取对话历史

## 开发指南

### 运行测试

```bash
npm test                 # 运行所有测试
npm run test:watch       # 监听模式
npm run test:coverage    # 测试覆盖率
```

### 数据库操作

```bash
npm run db:generate      # 生成Prisma客户端
npm run db:migrate       # 运行迁移
npm run db:push          # 推送schema变更
npm run db:studio        # 打开Prisma Studio
```

### 代码规范

```bash
npm run lint            # 检查代码规范
npm run type-check      # TypeScript类型检查
```

## 技术栈

- **前端**: Next.js 16, React 19, Tailwind CSS 4
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: SQLite (开发), PostgreSQL (生产)
- **认证**: iron-session, bcryptjs
- **AI**: Anthropic Claude, OpenAI, DeepSeek
- **文件处理**: pdf-parse, mammoth, word-extractor

## 架构亮点

### 1. 模块化设计
- 清晰的模块边界
- 可插拔的LLM提供商
- 独立的Persona服务层

### 2. 检索增强生成(RAG)
- 词汇重叠度检索算法
- 证据引用和溯源
- 多查询联合检索

### 3. 多维度评估
- 研究匹配度
- 技术深度
- 沟通能力
- 主动性

### 4. 安全设计
- 授权优先原则
- 角色-based访问控制
- API key安全管理

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

## 致谢

- supervisor_born项目 - 提供了AI导师分身的原始实现
- ScholarBridge设计 - 提供了精美的UI设计

## 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 文档: [Wiki]

---

**注意**: 本项目仍在开发中，API和功能可能会有变化。欢迎提供反馈和建议！

## 项目状态 (2026-04-13)

### ✅ 已完成的核心功能

1. **Persona系统 (100%)**
   - 构建AI导师分身
   - 与AI分身对话
   - 学生多维度评估
   - Persona管理
   - **文件上传支持** (PDF/DOCX/图片/文本) ✨
   - **公共信息搜索** (Web + OpenAlex) ✨

2. **Skills管理 (100%)**
   - 创建和发布Skills
   - 项目管理
   - Agent配置

3. **申请流程 (95%)**
   - 创建申请
   - 聊天交流
   - 状态管理
   - 撤回功能

4. **认证系统 (100%)**
   - 用户注册登录
   - 会话管理
   - 角色控制

### 📊 整体完成度

- **后端API**: 100% ✅
- **前端组件**: 50% 🔄
- **文档**: 95% ✅
- **测试**: 30% ⏳
- **整体**: 80% 🔄

### 🚀 可以立即使用

所有核心API端点已完成，可以：
- **自动搜集公开资料**构建AI导师分身（零配置）
- 上传研究资料（PDF/DOCX/图片/文本）
- 与AI分身对话
- 评估学生匹配度
- 管理申请流程

详见：[完整API文档](./backend/PERSONA_API_EXAMPLES.md) | [文件上传指南](./FILE_UPLOAD_GUIDE.md) | [公共搜索指南](./PUBLIC_SEARCH_GUIDE.md)

### 📚 详细文档

- [整合完成报告](./INTEGRATION_COMPLETE.md) - 项目整合总结
- [架构设计文档](./ARCHITECTURE.md) - 系统架构
- [前端迁移总结](./FRONTEND_MIGRATION.md) - 前端进度
- [Persona API实现](./backend/PERSONA_API_IMPLEMENTATION.md) - API详情
- [快速开始指南](./backend/QUICKSTART.md) - 5分钟上手

最后更新: 2026-04-13
