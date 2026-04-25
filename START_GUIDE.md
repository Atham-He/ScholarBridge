# ScholarBridge 启动指南

## 🚀 快速开始

### 1. 交互式配置（推荐）

```bash
npm run setup
```

按照提示选择 LLM 提供商并输入 API Key，系统会自动生成配置文件。

### 2. 一键启动所有服务

```bash
npm run dev:all
```

这将启动：
- **Backend (Next.js)**: http://localhost:3001
- **Supervisor Born (Persona Service)**: http://localhost:3002

## 📝 统一配置说明

现在所有配置都在项目根目录的 `.env` 文件中管理，不再需要分别配置多个 `.env` 文件！

### 配置文件结构

```bash
ScholarBridge/
├── .env                  # 🔥 统一配置文件（所有服务共享）
├── .env.example          # 配置模板
├── backend/              # 后端服务
└── supervisor_born/      # Persona 服务
```

### 环境变量说明

#### 基础配置
```bash
# 服务端口
BACKEND_PORT=3001         # Backend 服务端口
SUPERVISOR_PORT=3002      # Supervisor Born 服务端口

# 数据库
DATABASE_URL="file:./backend/dev.db"
SESSION_SECRET="your-secret-key"
```

#### LLM 配置（选择一个）
```bash
# 选择提供商
LLM_PROVIDER="openai"     # openai | anthropic | deepseek | mock

# OpenAI（推荐）
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"

# Anthropic Claude
ANTHROPIC_API_KEY="sk-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"

# DeepSeek（性价比高）
DEEPSEEK_API_KEY="sk-..."
```

#### 搜索服务（可选）
```bash
# 多个搜索引擎
WEB_SEARCH_PROVIDER="multi"

# OpenAlex（免费，推荐）
OPENALEX_EMAIL="your-email@example.com"

# Bing 搜索（可选）
BING_SEARCH_API_KEY="..."

# Google 搜索（可选）
GOOGLE_SEARCH_API_KEY="..."
GOOGLE_SEARCH_CX="..."
```

## 🔧 手动配置

如果不想使用交互式配置，可以手动创建 `.env` 文件：

```bash
# 复制模板
cp .env.example .env

# 编辑配置
nano .env  # 或使用你喜欢的编辑器
```

## 🎯 OpenAI 兼容配置

项目支持所有 OpenAI 格式的 API：

### 标准 OpenAI
```bash
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

### DeepSeek（OpenAI 兼容）
```bash
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.deepseek.com/v1"
OPENAI_MODEL="deepseek-chat"
```

### 其他兼容服务
只需修改 `OPENAI_BASE_URL` 即可使用任何 OpenAI 兼容的服务。

## 📂 其他命令

### 单独启动服务

```bash
# 只启动 Backend
npm run dev:backend

# 只启动 Supervisor Born
npm run dev:supervisor
```

### 数据库操作

```bash
# 生成 Prisma 客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# 推送数据库 schema
npm run db:push

# 打开数据库管理界面
npm run db:studio
```

### 测试和构建

```bash
# 运行测试
npm test

# 类型检查
npm run type-check

# 构建生产版本
npm run build
```

## 🧪 测试配置

### 验证服务状态

启动成功后，访问：
- **Backend**: http://localhost:3001
- **Supervisor Born**: http://localhost:3002

### 创建测试 Persona

```bash
cd supervisor_born
node src/cli.mjs build \
  --name "Test Mentor" \
  --affiliation "Test University" \
  --authorized-by "admin" \
  --public-url "https://example.com"
```

## 💡 开发建议

1. **首次使用**: 运行 `npm run setup` 交互式配置
2. **快速开发**: 使用 `LLM_PROVIDER="mock"` 无需 API Key
3. **生产环境**: 配置 `openai` 或 `anthropic` 获得最佳效果
4. **搜索功能**: 至少配置一个搜索引擎（Bing/Google）或使用免费的 OpenAlex

## ⚠️ 注意事项

- 根目录的 `.env` 文件会被所有服务读取
- 如需修改配置，只需编辑根目录的 `.env` 文件
- 重启服务以应用新配置
- 不要将 `.env` 文件提交到版本控制
