# Persona API 快速开始指南

本指南将帮助你在5分钟内完成Persona的构建和使用。

## 前置准备

### 1. 启动项目

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### 2. 登录获取Cookie

访问 http://localhost:3000/login 并登录，然后从浏览器开发者工具中复制cookie。

或者使用演示账号：
```
导师: mentor@demo.local / demo123
学生: student@demo.local / demo123
```

## 方法1: 使用测试脚本（推荐）

### 1. 设置环境变量

```bash
export API_BASE_URL="http://localhost:3000"
export AUTH_COOKIE="skill-hub-session=你的cookie"
```

### 2. 运行所有测试

```bash
node scripts/test-persona-api.mjs all
```

这将自动测试所有API端点。

### 3. 运行特定测试

```bash
# 只测试构建
node scripts/test-persona-api.mjs build

# 只测试对话
node scripts/test-persona-api.mjs chat

# 只测试评估
node scripts/test-persona-api.mjs evaluate
```

## 方法2: 使用curl

### 步骤1: 构建Persona

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=你的cookie" \
  -d '{
    "name": "李明",
    "affiliation": "清华大学计算机系",
    "title": "教授",
    "authorizedBy": "admin",
    "projectText": "研究方向：自然语言处理和大语言模型。期待有编程基础的学生加入。"
  }'
```

保存返回的`slug`，例如：`li-ming-清华大学计算机系-a1b2c3d4`

### 步骤2: 列出所有Personas

```bash
curl http://localhost:3000/api/personas \
  -H "Cookie: skill-hub-session=你的cookie"
```

### 步骤3: 获取Persona详情

```bash
curl http://localhost:3000/api/personas/li-ming-清华大学计算机系-a1b2c3d4 \
  -H "Cookie: skill-hub-session=你的cookie"
```

### 步骤4: 开始对话

```bash
curl -X POST http://localhost:3000/api/personas/li-ming-清华大学计算机系-a1b2c3d4/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=你的cookie" \
  -d '{
    "message": "老师您好，我对您的研究很感兴趣，请问您对招收学生有什么要求？",
    "studentProfile": {
      "name": "张三",
      "background": "北京大学大四学生",
      "interests": ["NLP", "深度学习"],
      "experience": ["实现过BERT模型", "熟悉PyTorch"]
    }
  }'
```

保存返回的`sessionId`用于继续对话。

### 步骤5: 继续对话

```bash
curl -X POST http://localhost:3000/api/personas/li-ming-清华大学计算机系-a1b2c3d4/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=你的cookie" \
  -d '{
    "sessionId": "上一步返回的sessionId",
    "message": "请问您目前有哪些开放的研究项目？"
  }'
```

### 步骤6: 评估学生

```bash
curl -X POST http://localhost:3000/api/personas/li-ming-清华大学计算机系-a1b2c3d4/evaluate \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=你的cookie" \
  -d '{
    "studentProfile": {
      "name": "张三",
      "background": "北京大学大四学生",
      "interests": ["NLP", "深度学习"],
      "experience": ["实现过BERT模型", "参加过Kaggle竞赛", "GPA: 3.8"]
    },
    "sessionId": "对话的sessionId"
  }'
```

## 方法3: 使用JavaScript/TypeScript

```typescript
const BASE_URL = 'http://localhost:3000';
const cookie = 'skill-hub-session=你的cookie';

async function buildPersona() {
  const response = await fetch(`${BASE_URL}/api/personas/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      name: '李明',
      affiliation: '清华大学',
      authorizedBy: 'admin',
      projectText: '研究NLP和LLM'
    })
  });

  const result = await response.json();
  console.log('构建成功:', result.data.slug);
  return result.data.slug;
}

async function chatWithPersona(slug: string) {
  const response = await fetch(`${BASE_URL}/api/personas/${slug}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      message: '老师您好',
      studentProfile: {
        name: '张三',
        background: '北大大四学生'
      }
    })
  });

  const result = await response.json();
  console.log('回复:', result.data.answer);
  return result.data.sessionId;
}

// 使用
(async () => {
  const slug = await buildPersona();
  await chatWithPersona(slug);
})();
```

## 常见场景

### 场景1: 导师创建AI分身

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -H "Cookie: cookie" \
  -d '{
    "name": "你的名字",
    "affiliation": "你的机构",
    "authorizedBy": "你的名字",
    "projectText": "你的研究方向和招生要求..."
  }'
```

### 场景2: 学生咨询导师

```bash
curl -X POST http://localhost:3000/api/personas/[slug]/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: cookie" \
  -d '{
    "message": "老师您好，我对您的研究很感兴趣...",
    "studentProfile": {
      "name": "你的名字",
      "background": "你的背景",
      "experience": ["你的经历"]
    }
  }'
```

### 场景3: 导师评估学生

```bash
curl -X POST http://localhost:3000/api/personas/[slug]/evaluate \
  -H "Content-Type: application/json" \
  -H "Cookie: cookie" \
  -d '{
    "studentProfile": {
      "name": "学生名字",
      "background": "学生背景",
      "experience": ["学生经历1", "经历2"]
    }
  }'
```

## 配置真实AI功能

默认使用Mock模式，无需API key。要使用真实AI：

### Anthropic Claude

```bash
# 在.env文件中添加
PERSONA_LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"
```

### OpenAI

```bash
PERSONA_LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

### DeepSeek

```bash
PERSONA_LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-..."
```

## 故障排查

### 问题1: 认证失败

**错误**: `UNAUTHORIZED`

**解决**:
1. 确保已登录
2. 检查cookie是否正确
3. 确认cookie未过期

### 问题2: 权限不足

**错误**: `FORBIDDEN`

**解决**:
1. 确认登录账号角色
2. 导师才能构建Persona
3. 私有Persona只有所有者能访问

### 问题3: Persona不存在

**错误**: `NOT_FOUND`

**解决**:
1. 检查slug是否正确
2. 使用`GET /api/personas`列出所有可用的
3. 确认Persona已构建完成

### 问题4: Mock模式质量低

**问题**: 回复太简单或不相关

**解决**:
1. 配置真实的API key
2. 切换到anthropic或openai提供商
3. 提供更详细的项目描述

## 下一步

1. **阅读完整文档**:
   - [API实现文档](./PERSONA_API_IMPLEMENTATION.md)
   - [API使用指南](./PERSONA_API_EXAMPLES.md)

2. **集成到应用**:
   - 在前端添加构建Persona界面
   - 集成聊天功能
   - 展示评估结果

3. **扩展功能**:
   - 添加文件上传支持
   - 集成公共信息搜索
   - 实现向量检索

## 支持

- 查看日志: `npm run dev`的终端输出
- 检查数据库: `npm run db:studio`
- 运行测试: `npm test`

---

**最后更新**: 2026-04-13
**版本**: 1.0.0
