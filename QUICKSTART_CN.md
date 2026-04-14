# ScholarBridge 快速开始指南

## 🚀 5分钟快速试用

### 前置要求

- **Node.js** >= 20.0.0
- **npm** 或 **yarn**
- **Git** (可选)

---

## 步骤1: 安装依赖 (2分钟)

```bash
# 进入后端目录
cd ScholarBridge/backend

# 安装依赖
npm install

# 这将安装所有必要的依赖包：
# - Next.js 16
# - React 19
# - Prisma ORM
# - PDF解析 (pdf-parse)
# - Word文档 (mammoth)
# - AI SDK (Anthropic/OpenAI)
# - 等等...
```

---

## 步骤2: 配置环境 (1分钟)

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env  # 或使用你喜欢的编辑器
```

**最小配置**（开发测试）:

```bash
# .env 文件内容

DATABASE_URL="file:./dev.db"
SESSION_SECRET="my-super-secret-key-at-least-32-characters-long"

# 使用Mock LLM（不需要API key，用于测试）
PERSONA_LLM_PROVIDER="mock"

# 公共搜索（可选，免费）
OPENALEX_EMAIL="your-email@example.com"
```

**可选配置**（生产环境）:

```bash
# 使用Anthropic Claude（推荐）
PERSONA_LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"

# 或使用OpenAI
# PERSONA_LLM_PROVIDER="openai"
# OPENAI_API_KEY="sk-..."
# OPENAI_MODEL="gpt-4o-mini"

# Web搜索（可选，免费使用DuckDuckGo）
# BING_SEARCH_API_KEY=""  # 可选：更好的搜索结果
```

---

## 步骤3: 初始化数据库 (1分钟)

```bash
# 生成Prisma客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# 填充示例数据
npm run db:seed
```

这将创建：
- ✅ SQLite数据库 (`prisma/dev.db`)
- ✅ 示例用户（导师和学生）
- ✅ 示例Skills/项目

---

## 步骤4: 启动开发服务器

```bash
# 启动开发服务器
npm run dev
```

你将看到：
```
   ▲ Next.js 16.2.2
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.x:3000

 ✓ Ready in 2.3s
```

访问 **http://localhost:3000**

---

## 步骤5: 开始使用

### 方式1: 使用Web界面

1. **访问主页**: http://localhost:3000
2. **点击 "Sign In"**
3. **使用演示账号登录**:

```
导师账号:
Email: mentor@demo.local
Password: demo123

学生账号:
Email: student@demo.local
Password: demo123
```

4. **浏览导师列表**: http://localhost:3000/browse
5. **查看导师详情**: 点击任意导师卡片
6. **开始聊天**: 与AI导师分身对话

### 方式2: 使用API测试

#### 测试1: 构建Persona（公共搜索）

```bash
# 使用公共搜索自动搜集资料
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=$(cat /tmp/session)" \
  -d '{
    "name": "Geoffrey Hinton",
    "affiliation": "University of Toronto",
    "authorizedBy": "admin@utoronto.ca"
  }'
```

#### 测试2: 与Persona对话

```bash
# 首先登录获取session
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@demo.local",
    "password": "demo123"
  }' \
  -c /tmp/session

# 与Persona对话
curl -X POST http://localhost:3000/api/personas/geoffrey-hinton-university-of-toronto/chat \
  -H "Content-Type: application/json" \
  -b /tmp/session \
  -d '{
    "message": "老师您好，我对深度学习很感兴趣",
    "studentProfile": {
      "name": "张三",
      "background": "本科生，计算机专业"
    }
  }'
```

#### 测试3: 上传文件构建Persona

```bash
# 准备测试文件
echo "我的研究方向是机器学习和自然语言处理。
目前专注于大语言模型的效率优化。" > /tmp/research.txt

# 使用文件上传
curl -X POST http://localhost:3000/api/personas/build \
  -F "name=Dr. Test Mentor" \
  -F "affiliation=Test University" \
  -F "authorizedBy=admin@test.edu" \
  -F "files=@/tmp/research.txt" \
  -H "Cookie: skill-hub-session=$(cat /tmp/session)"
```

---

## 📊 功能演示流程

### 场景: 学生浏览导师并交流

#### 1. 浏览导师列表
```bash
http://localhost:3000/browse
```
- 查看所有公开的导师
- 按研究兴趣筛选
- 查看AI分身状态

#### 2. 查看导师详情
```bash
# 点击任意导师卡片
# 例如: http://localhost:3000/s/dr-jane-chen-mit
```
- 查看导师简介
- 了解研究方向
- 查看开放职位

#### 3. 与AI分身对话
```bash
# 点击 "Chat Agent" 按钮
# 进入聊天界面
```

**示例对话**:
```
学生: 老师您好，我对您的研究方向很感兴趣

AI: 你好！很高兴听到你对我的研究感兴趣。
我主要研究机器学习和自然语言处理...
[基于真实研究资料的回答]

学生: 我之前实现过BERT模型，您觉得这样的经历有帮助吗？

AI: 非常好！BERT的实现经验说明你已经具备了：
1. Transformer架构的理解
2. PyTorch/TensorFlow的使用能力
[基于简历的个性化回复]
```

#### 4. 创建申请
```bash
# 点击 "Apply for Position"
# 填写申请表单
# 提交
```

#### 5. 查看申请状态
```bash
http://localhost:3000/applications
```
- 查看所有申请
- 跟踪申请进度
- 继续与导师沟通

---

## 🧪 运行测试套件

### 测试文件上传功能

```bash
cd backend

# 需要先登录获取session cookie
export SESSION_COOKIE="your-session-cookie-from-browser"

# 运行测试
node scripts/test-file-upload.mjs
```

### 测试公共搜索功能

```bash
cd backend

# 可选：配置API keys
export BING_SEARCH_API_KEY="..."
export OPENALEX_EMAIL="your@email.com"

# 运行测试
node scripts/test-public-search.mjs
```

### 测试Persona API

```bash
cd backend

# 完整API测试
node scripts/test-persona-api.mjs all
```

---

## 📱 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 数据库
npm run db:generate      # 生成Prisma客户端
npm run db:migrate       # 运行迁移
npm run db:push          # 推送schema变更
npm run db:studio        # 打开Prisma Studio（数据库GUI）

# 代码质量
npm run lint             # 检查代码规范
npm run type-check       # TypeScript类型检查

# 测试
npm test                 # 运行所有测试
npm run test:watch       # 监听模式
```

---

## 🎯 核心功能演示

### 1. Persona构建演示

#### 使用公共搜索（零配置）

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=$(cat /tmp/session)" \
  -d '{
    "name": "Yann LeCun",
    "affiliation": "Meta AI",
    "authorizedBy": "admin@meta.com"
  }'
```

**系统会自动**:
- 🔍 搜索Yann LeCu的公开资料
- 📚 获取OpenAlex论文列表
- 🌐 抓取相关网页内容
- 🤖 构建完整的AI分身

#### 使用上传文件

```bash
# 创建测试文件
cat > /tmp/mentor-info.txt << 'EOF'
# Dr. Jane Chen - Research Summary

## Research Interests
- Large Language Models
- Computer Vision
- Multimodal Learning

## Current Projects
- Efficient fine-tuning of LLMs
- Vision-language models

## Student Requirements
- Strong Python skills
- Experience with PyTorch
- Interest in AI research
EOF

# 上传构建
curl -X POST http://localhost:3000/api/personas/build \
  -F "name=Jane Chen" \
  -F "affiliation=MIT" \
  -F "authorizedBy=admin@mit.edu" \
  -F "files=@/tmp/mentor-info.txt" \
  -H "Cookie: skill-hub-session=$(cat /tmp/session)"
```

### 2. AI对话演示

```bash
# 开始对话
curl -X POST http://localhost:3000/api/personas/jane-chen-mit/chat \
  -H "Content-Type: application/json" \
  -b /tmp/session \
  -d '{
    "message": "老师您好，我想了解您目前的研究项目",
    "studentProfile": {
      "name": "李明",
      "background": "研究生，计算机科学",
      "experience": ["实现过GPT模型", "熟悉PyTorch"]
    }
  }'
```

**AI会**:
- 基于真实研究资料回答
- 引用相关论文和项目
- 根据学生背景个性化回复
- 提供相关建议

### 3. 学生评估演示

```bash
# 评估学生匹配度
curl -X POST http://localhost:3000/api/personas/jane-chen-mit/evaluate \
  -H "Content-Type: application/json" \
  -b /tmp/session \
  -d '{
    "studentProfile": {
      "name": "李明",
      "background": "研究生，计算机科学",
      "experience": ["实现过GPT模型", "熟悉PyTorch", "发表过一篇论文"],
      "interests": ["大语言模型", "计算机视觉"]
    },
    "transcript": [
      {"role": "student", "content": "我对您的大语言模型效率优化项目很感兴趣"},
      {"role": "assistant", "content": "很好！你有什么相关经验吗？"},
      {"role": "student", "content": "我实现过GPT-2的微调，使用了LoRA方法"}
    ]
  }'
```

**评估结果**:
- 研究匹配度评分
- 技术深度评分
- 沟通能力评分
- 主动性评分
- 推荐等级（强烈推荐/建议面试/需要复核/不建议推进）

---

## 🔧 故障排查

### 问题1: 依赖安装失败

```bash
# 清除缓存重试
rm -rf node_modules package-lock.json
npm install
```

### 问题2: 数据库迁移失败

```bash
# 删除数据库重新创建
rm prisma/dev.db
npm run db:migrate
npm run db:seed
```

### 问题3: 端口被占用

```bash
# 使用不同端口
PORT=3001 npm run dev
```

### 问题4: API返回401错误

```bash
# 需要先登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mentor@demo.local","password":"demo123"}' \
  -c /tmp/session

# 使用session cookie
curl http://localhost:3000/api/skills \
  -b /tmp/session
```

### 问题5: Persona构建失败

**检查**:
1. 环境变量是否正确配置
2. LLM provider是否设置
3. 如果使用anthropic/openai，检查API key

**解决**:
```bash
# 使用mock provider测试
# 在 .env 中设置:
PERSONA_LLM_PROVIDER="mock"
```

---

## 📖 下一步

### 学习资源

1. **完整文档**:
   - [README.md](../README.md) - 项目概述
   - [FILE_UPLOAD_GUIDE.md](../FILE_UPLOAD_GUIDE.md) - 文件上传指南
   - [PUBLIC_SEARCH_GUIDE.md](../PUBLIC_SEARCH_GUIDE.md) - 公共搜索指南

2. **API文档**:
   - [backend/PERSONA_API_EXAMPLES.md](../backend/PERSONA_API_EXAMPLES.md) - API示例
   - [backend/PERSONA_API_IMPLEMENTATION.md](../backend/PERSONA_API_IMPLEMENTATION.md) - 实现细节

3. **架构文档**:
   - [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统架构
   - [INTEGRATION_COMPLETE.md](../INTEGRATION_COMPLETE.md) - 整合报告

### 尝试更多功能

#### 作为导师:
1. 创建自己的Skill
2. 构建AI分身
3. 查看学生申请
4. 评估学生匹配度

#### 作为学生:
1. 浏览导师列表
2. 与AI分身对话
3. 创建申请
4. 查看申请状态

#### 作为开发者:
1. 探索API端点
2. 查看数据库结构
3. 运行测试套件
4. 阅读源代码

### 自定义和扩展

#### 修改UI主题
```css
/* app/globals.css */
:root {
  --bg: #FAF8F5;
  --accent: #2C5F7C;
  /* ... */
}
```

#### 添加新的LLM provider
```typescript
// lib/persona/llm.ts
export class CustomLLMProvider implements LLMProvider {
  kind = 'custom';
  async generateText(prompts: string[]): Promise<string> {
    // 你的实现
  }
}
```

#### 扩展Persona功能
```typescript
// lib/persona/builder.ts
// 自定义蒸馏逻辑
async function customDistill(params) {
  // 你的实现
}
```

---

## 💡 提示

### 开发技巧

1. **热重载**: 修改代码后会自动刷新
2. **数据库查看**: 使用 `npm run db:studio`
3. **日志查看**: 终端会显示所有请求日志
4. **调试**: 使用浏览器DevTools或VS Code调试器

### 最佳实践

1. **使用Mock LLM**进行快速开发测试
2. **定期备份数据库** (`cp prisma/dev.db prisma/dev.db.backup`)
3. **提交前运行类型检查** (`npm run type-check`)
4. **查看Prisma文档**学习更多数据库操作

---

## 🆘 获取帮助

### 常见问题

**Q: 如何切换LLM provider?**
```bash
# 编辑 .env
PERSONA_LLM_PROVIDER="anthropic"  # 或 openai, deepseek, mock
```

**Q: 如何重置数据库?**
```bash
rm prisma/dev.db
npm run db:migrate
npm run db:seed
```

**Q: 如何查看日志?**
```bash
# 日志直接显示在运行 npm run dev 的终端
```

**Q: API返回错误怎么办?**
1. 检查终端的错误日志
2. 确认已登录（有session cookie）
3. 验证环境变量配置
4. 查看本文档的故障排查部分

### 更多资源

- **GitHub Issues**: 报告问题
- **源代码**: 查看实现细节
- **测试脚本**: 学习API用法

---

## 🎉 开始使用

现在你已经准备好使用ScholarBridge了！

**快速访问**:
- 🌐 主页: http://localhost:3000
- 📚 导师列表: http://localhost:3000/browse
- 🔐 登录: http://localhost:3000/login

**演示账号**:
- 导师: `mentor@demo.local` / `demo123`
- 学生: `student@demo.local` / `demo123`

祝你使用愉快！🚀
