# ScholarBridge

ScholarBridge 是一个面向导师与学生匹配场景的 Web 平台。当前版本已经把原先 `supervisor_born` 的核心 persona 能力直接内嵌到了 `ScholarBridge/backend`：导师可以在前端创建自己的公开 Skill，同时构建一个多源证据驱动的导师智能体；学生可以浏览导师页面、发起申请、和导师智能体对话，系统会持续生成学生匹配评估结果。

## 包含的功能

- 导师端和学生端双角色系统。支持注册、登录、会话保持、导师面板、学生面板、公开导师页、申请记录与会话查看。
- 导师 Skill 发布。导师可以创建公开的 Skill 页面，填写标题、slug、公开介绍、研究方向、标签、论文摘要等基础信息。
- 导师智能体构建。创建 Skill 时，系统会同时构建一个关联的 persona，不再只是静态 Markdown 页。
- 多源证据输入。当前已接入的证据源包括：
  - 公开网页 URL
  - 自动公开检索
  - 普通上传文件：`txt`、`md`、`pdf`、`doc`、`docx`、`png`、`jpg`、`jpeg`
  - 微信导出聊天记录：`.txt`
  - 组会材料：`txt`、`md`、`srt`、`vtt`、`mp3`、`wav`、`m4a`、`mp4`、`mov`
  - 导师思考流程 / 科研品味问卷：`txt`、`md`、`pdf`、`doc`、`docx`
- 公开信息采集。支持根据导师姓名、单位、院系和给定 URL 搜集公开资料；当前检索链路可结合网页搜索和 OpenAlex。
- Persona 创建与更新分离。创建永远生成一个新 persona；后续通过 update 页面继续追加证据并重蒸馏，不覆盖别的同名导师实例。
- 导师风格学习。系统会尽量从微信记录、组会转写、问卷和公开材料中提取：
  - 研究方向
  - 说话风格
  - 组会反馈风格
  - 思考流程
  - 科研品味
- 学生对话。学生仍然从现有前端聊天页进入，但如果该 Skill 已有关联 persona，就会优先走新的导师 persona chat 链路，而不是旧的通用 prompt。
- 学生评估。系统会根据学生资料和聊天内容生成结构化评估，包括总体分数、推荐等级、证据质量、后续追问建议，并回写数据库。
- 组会音视频转写。支持通过 ASR 把导师组会录音或视频转为可学习证据；当前已实测过 `GLM-ASR-2512`。
- 证据持久化。数据库中会保存 `personaJson`、`sourcesJson`、`chunksJson`、评估结果与会话；上传文件会落盘到本地目录。
- 真实 provider 运行。支持：
  - `mock`
  - `deepseek`
  - `openai`
  - `anthropic`
  - `GLM-ASR` 作为音视频转写 provider

当前版本已经跑通过“前端创建导师 -> 多源上传 -> persona 更新 -> 学生聊天 -> 学生评估”的真实链路，但也有两个你需要知道的边界：

- 公开检索仍然可能出现作者消歧噪声，尤其是同名学者或论文作者名较常见时。
- 组会视频的 speaker attribution 还不算稳定，当前更可靠的是“把会议内容学进去”，而不是百分之百精确地区分每一句是谁说的。

## 使用方法

### 1. 环境要求

- Node.js `>= 20`
- npm
- SQLite
- `ffmpeg`

`ffmpeg` 不是为了启动前端，而是为了处理组会音视频。如果你要上传 `mp4`、`mov`、`mp3`、`wav` 这类材料，机器上必须能执行 `ffmpeg`，否则 ASR 链路会失败。

### 2. 目录准备

当前你只需要这个仓库本身，不需要额外准备 `supervisor_born/`。

推荐直接进入：

```text
ScholarBridge/backend
```

当前请从 `ScholarBridge/backend` 启动应用；根目录 `npm run dev` 也已经被代理到 `backend`。

### 3. 安装依赖

```powershell
cd C:\Users\sqa22\Desktop\supervisor-skill\ScholarBridge\backend
npm install
```

### 4. 配置 API 和环境变量

实际运行时读取的是 `backend/.env`，不是根目录的 `.env`。
先复制模板：

```powershell
Copy-Item .env.example .env
```

#### 4.1 推荐的配置

如果要真实测试导师智能体构建、聊天、更新和视频转写，建议配置成下面这样：

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-a-random-string-at-least-32-chars"

PERSONA_LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="你的 DeepSeek API Key"
DEEPSEEK_MODEL="deepseek-chat"

WEB_SEARCH_PROVIDER="multi"
OPENALEX_EMAIL="your_email@example.com"

# 可选，但强烈建议至少配一个搜索 provider
BING_SEARCH_API_KEY=""
BING_SEARCH_ENDPOINT="https://api.bing.microsoft.com/v7.0/search"
GOOGLE_SEARCH_API_KEY=""
GOOGLE_SEARCH_CX=""

ASR_PROVIDER="glm"
GLM_ASR_API_KEY="你的 GLM-ASR API Key"
GLM_ASR_BASE_URL="https://llmapi.paratera.com"
GLM_ASR_MODEL="GLM-ASR-2512"

FFMPEG_PATH="ffmpeg"

LLM_TIMEOUT_MS="180000"
DISTILL_EVIDENCE_BUDGET_CHARS="16000"
DISTILL_SOURCE_LIMIT="24"
DISTILL_STYLE_SIGNAL_LIMIT="6"

MAX_UPLOAD_SIZE_MB="50"
ALLOWED_UPLOAD_TYPES="pdf,docx,doc,txt,md,png,jpg,jpeg,gif,webp,mp4,mp3,wav,srt,vtt,m4a,mov"

NODE_ENV="development"
LOG_LEVEL="info"
```

说明如下：

- `PERSONA_LLM_PROVIDER`
  取值可为 `mock`、`deepseek`、`openai`、`anthropic`。
- `DEEPSEEK_API_KEY`
  用于 persona 构建、聊天和学生评估。
- `WEB_SEARCH_PROVIDER`
  推荐用 `multi`。不配 Bing/Google 也能运行，但公开资料召回会弱一些。
- `OPENALEX_EMAIL`
  当前实现会读取这个字段，用于 OpenAlex 请求标识。
- `ASR_PROVIDER="glm"`
  表示组会音视频走 GLM-ASR。
- `GLM_ASR_*`
  用于 `mp4/mp3/wav/mov` 的真实转写。
- `FFMPEG_PATH`
  如果 `ffmpeg` 已加入系统 PATH，保持 `ffmpeg` 即可；如果没有，就填绝对路径。
- `DISTILL_*`
  用于控制全量证据蒸馏时的上下文预算，能明显影响超时和稳定性。

#### 4.2 如果你不用 DeepSeek

如果要换成 OpenAI 兼容 provider，可以这样配：

```env
PERSONA_LLM_PROVIDER="openai"
OPENAI_API_KEY="你的 OpenAI-compatible API Key"
OPENAI_BASE_URL="你的兼容接口 base url"
OPENAI_MODEL="gpt-4o-mini"
```

如果要用 Anthropic：

```env
PERSONA_LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="你的 Anthropic API Key"
ANTHROPIC_MODEL="claude-3-7-sonnet-latest"
```

### 5. 初始化数据库

第一次运行建议执行：

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

执行完后会生成本地 SQLite 数据库，并写入 demo 账号与示例数据。

默认 demo 账号：

- 导师：`mentor@demo.local` / `demo123`
- 学生：`student@demo.local` / `demo123`
- 双角色测试账号：`dual@test.com` / `test123`

### 6. 启动服务

```powershell
npm run dev
```

默认访问地址：

```text
http://localhost:3000
```

### 7. 从前端创建导师智能体

这是当前推荐的使用路径，也是已经实测通过的主路径。

1. 用导师账号登录。
2. 打开 `http://localhost:3000/mentor/skills/new`。
3. 填写基础 Skill 信息：
   `Title`、`URL slug`、`Public skill profile (Markdown)`。
4. 展开 `Advanced Persona Inputs`。
5. 在 `Public URLs` 中填导师主页、Google Scholar、实验室主页、DBLP、OpenReview 等公开链接。每行一个 URL。
6. 如果不填 `Public URLs`，系统会尝试自动公开检索。
7. 在 `Additional project text` 中补充文本说明，例如导师简介、招生要求、研究重点。
8. 如果上传微信聊天记录，可以在 `WeChat mentor speaker hint` 填导师在聊天里的称呼，例如 `Prof. Wang`。
9. 如果上传组会 transcript 或视频，可以在 `Meeting speaker hint` 填导师在会议里的名字，例如 `Hongning Wang`。
10. 根据需要上传材料：
    `Upload files`
    `WeChat chat files`
    `Meeting transcript or media files`
    `Thinking questionnaire files`
11. 点击 `Save`。
12. 系统会创建：
    一个公开 Skill
    一个关联 persona
    一组 sources / chunks / agent card / 数据库记录
13. 创建成功后，页面会跳转到公开导师页 `/s/{skillSlug}`。

### 8. 更新已有导师智能体

如果一个导师已经构建过 persona，后续不需要重建 Skill，直接更新 persona 即可。

步骤如下：

1. 用导师账号登录。
2. 打开导师面板：`/mentor`。
3. 在 `Your Skills` 区域找到目标 Skill。
4. 点击 `Manage persona evidence` 或进入：
   `/mentor/skills/{skillSlug}/persona`
5. 在更新页继续追加：
   新的公开 URL
   新的上传材料
   新的微信聊天
   新的组会 transcript / 视频
   新的思考问卷
6. 提交后，系统会执行 update workflow：
   读取旧 persona
   合并旧 sources 和新 sources
   去重
   重建 chunks
   重蒸馏 persona
7. update 不会改 persona 的唯一 slug，只会更新该 persona 的证据和内容。

### 9. 学生如何使用

1. 用学生账号登录。
2. 打开 `/browse` 浏览公开导师。
3. 点击某个导师进入 `/s/{skillSlug}`。
4. 发起申请。
5. 进入聊天页后，学生继续使用原来的前端聊天体验。
6. 如果该 Skill 已经绑定且成功构建了 persona，`/api/chat` 会自动转到 persona chat/evaluate 链路。
7. 每轮聊天后，系统会更新：
   `Application.aiScore`
   `Application.aiFlagNotify`
   `PersonaEvaluation`
   `PersonaSession`

### 10. 数据和文件存放在哪里

当前版本会同时把数据存进数据库和本地文件系统。

- 数据库：`backend/dev.db`
- 上传文件：`backend/uploads/personas/<persona-slug>/...`
- persona 运行时缓存：`backend/persona-engine-cache/`

数据库里关键表包括：

- `Skill`
- `Persona`
- `PersonaUpload`
- `PersonaSession`
- `PersonaEvaluation`
- `Application`
- `Conversation`
- `Message`

如果你需要直接查看 persona 内容，可以访问：

- `GET /api/personas/{personaSlug}`
- `GET /api/personas/{personaSlug}/agent-card`

### 11. 常用命令

在 `backend/` 目录执行：

```powershell
npm run dev
npm run build
npm run start
npm run type-check
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:push
npm run db:studio
npm run persona:smoke
npm run persona:real-e2e
```

说明如下：

- `npm run type-check`
  检查 TypeScript 类型。
- `npm run persona:smoke`
  跑 mock provider 的最小集成测试。
- `npm run persona:real-e2e`
  跑真实 provider 的端到端测试。需要你提前配好 `DEEPSEEK_API_KEY`、`GLM_ASR_API_KEY`、`ffmpeg`。

### 12. 常见问题

#### 12.1 创建 persona 时报 runtime 模块加载错误

当前正常情况下不应该再出现“找不到 `supervisor_born`”这种错误，因为 persona runtime 已经内嵌在：

```text
backend/lib/persona/runtime/
```

如果这里报错，优先检查是否误删了该目录，或者 git 拉取不完整。

#### 12.2 前端能打开，但导师智能体构建失败

优先检查下面几项：

- `backend/.env` 是否存在
- `PERSONA_LLM_PROVIDER` 是否配置正确
- 对应 provider 的 API key 是否存在
- `backend/lib/persona/runtime/` 是否存在

#### 12.3 上传视频后失败

优先检查：

- 是否配置了 `ASR_PROVIDER=glm`
- 是否配置了 `GLM_ASR_API_KEY`
- `ffmpeg` 是否能在命令行直接执行
- 如果不在 PATH 中，是否设置了 `FFMPEG_PATH`
