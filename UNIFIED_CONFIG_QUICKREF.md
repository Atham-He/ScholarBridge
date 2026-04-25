# ScholarBridge 统一配置 - 快速参考

## 🎯 一键启动流程

```bash
# 1. 交互式配置（首次使用）
npm run setup

# 2. 启动所有服务
npm run dev:all
```

## 📁 配置文件位置

**现在只需配置一个文件：**

```
ScholarBridge/.env          # 🔥 统一配置（所有服务共享）
```

**不再需要：**
- ❌ `backend/.env`
- ❌ `supervisor_born/.env`

## 🚀 常用命令

| 命令 | 说明 |
|------|------|
| `npm run setup` | 交互式配置向导 |
| `npm run dev:all` | 启动所有服务 |
| `npm run dev:backend` | 只启动 Backend (端口 3001) |
| `npm run dev:supervisor` | 只启动 Supervisor (端口 3002) |

## ⚙️ 最小配置示例

### 开发测试（无需 API Key）

```bash
# .env 文件
LLM_PROVIDER="mock"
BACKEND_PORT=3001
SUPERVISOR_PORT=3002
```

### 生产环境配置

```bash
# .env 文件
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-your-key-here"
OPENAI_MODEL="gpt-4o-mini"
BACKEND_PORT=3001
SUPERVISOR_PORT=3002
```

### DeepSeek 配置（高性价比）

```bash
# .env 文件
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-your-deepseek-key"
OPENAI_BASE_URL="https://api.deepseek.com/v1"
OPENAI_MODEL="deepseek-chat"
```

## 🎨 配置特性

✅ **统一管理** - 所有配置在一个文件中
✅ **热重载** - 修改配置后重启服务即可
✅ **默认值** - 未配置的项目使用安全默认值
✅ **环境变量** - 支持通过环境变量覆盖配置
✅ **端口管理** - 自动管理服务端口，避免冲突

## 🔍 服务地址

启动后访问：
- **Backend**: http://localhost:3001
- **Supervisor Born**: http://localhost:3002

## 📖 完整文档

详细配置说明请查看：
- `START_GUIDE.md` - 完整启动指南
- `.env.example` - 配置模板和说明

## 🛠️ 故障排除

### 端口冲突
```bash
# 检查端口占用
lsof -i :3001
lsof -i :3002

# 杀死占用进程
kill -9 <PID>
```

### 配置不生效
```bash
# 确保 .env 文件在项目根目录
ls -la .env

# 重启服务
npm run dev:all
```

### 数据库错误
```bash
# 初始化数据库
npm run db:push
```

## 💡 最佳实践

1. **开发环境**: 使用 `LLM_PROVIDER="mock"` 快速测试
2. **API Key**: 不要将 `.env` 文件提交到 Git
3. **端口配置**: 默认端口已经优化，一般不需要修改
4. **搜索功能**: 配置 `OPENALEX_EMAIL` 获得免费的学术搜索
