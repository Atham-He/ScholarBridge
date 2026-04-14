# Persona API 使用指南

## API端点概览

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/personas/build` | 构建新Persona |
| GET | `/api/personas` | 列出所有可用的Personas |
| GET | `/api/personas/[slug]` | 获取Persona详情 |
| GET | `/api/personas/[slug]/agent-card` | 获取Agent Card |
| POST | `/api/personas/[slug]/update` | 更新Persona |
| POST | `/api/personas/[slug]/chat` | 与Persona对话 |
| POST | `/api/personas/[slug]/evaluate` | 评估学生 |
| GET | `/api/personas/[slug]/evaluate?applicationId=xxx` | 获取评估结果 |
| GET | `/api/personas/[slug]/chat?sessionId=xxx` | 获取聊天历史 |

## 1. 构建Persona

### 请求

```bash
POST /api/personas/build
Content-Type: application/json

{
  "name": "李明",
  "affiliation": "北京大学计算机科学技术学院",
  "title": "副教授",
  "authorizedBy": "dept-admin",
  "consentNotes": "经本人同意创建",
  "projectText": "研究方向：自然语言处理、大语言模型、知识图谱。\n\n正在招募：对NLP和LLM感兴趣的学生，需要有较强的编程能力和数学基础。",
  "publicUrls": ["https://pku.edu.cn/~liming/"],
  "skillId": null
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "personaId": "clxxx...",
    "slug": "li-ming-北京大学计算机科学技术学院-a1b2c3d4",
    "skillId": "clxxx...",
    "persona": { ... },
    "sourceCount": 2,
    "chunkCount": 15
  }
}
```

## 2. 列出所有Personas

### 请求

```bash
GET /api/personas
GET /api/personas?includeUnpublished=true
GET /api/personas?onlyMyPersonas=true
```

### 响应

```json
{
  "success": true,
  "data": {
    "personas": [
      {
        "id": "clxxx...",
        "slug": "li-ming-北京大学计算机科学技术学院-a1b2c3d4",
        "mentor": {
          "name": "李明",
          "displayName": "李明",
          "institution": "北京大学",
          "title": "副教授"
        },
        "overview": "从事自然语言处理...",
        "researchTopics": [
          { "name": "NLP", "confidence": 0.9 }
        ],
        "methods": ["深度学习", "NLP"],
        "stats": {
          "sourceCount": 5,
          "chunkCount": 37
        }
      }
    ],
    "count": 1
  }
}
```

## 3. 获取Persona详情

### 请求

```bash
GET /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4
```

### 响应

```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "slug": "li-ming-北京大学计算机科学技术学院-a1b2c3d4",
    "persona": { ... },
    "agentCard": "# 李明 — Agent Card\n...",
    "buildStatus": "completed",
    "sourceCount": 5,
    "chunkCount": 37
  }
}
```

## 4. 获取Agent Card

### 请求

```bash
GET /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/agent-card
```

### 响应

```json
{
  "success": true,
  "data": {
    "slug": "li-ming-北京大学计算机科学技术学院-a1b2c3d4",
    "agentCard": "# 李明 — Agent Card\n\n## Identity\n...",
    "persona": {
      "name": "李明",
      "affiliation": "北京大学",
      "title": "副教授",
      "overview": "..."
    },
    "skill": {
      "id": "clxxx...",
      "slug": "li-ming-nlp",
      "title": "李明 - NLP研究",
      "agentActive": true
    }
  }
}
```

## 5. 更新Persona

### 请求

```bash
POST /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/update
Content-Type: application/json

{
  "projectText": "更新的项目描述：重点关注大语言模型的可解释性和安全性研究。",
  "publicUrls": ["https://pku.edu.cn/~liming/new-paper"]
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "personaId": "clxxx...",
    "slug": "li-ming-北京大学计算机科学技术学院-a1b2c3d4",
    "sourceCount": 6,
    "chunkCount": 42,
    "addedSourceCount": 1,
    "message": "Persona更新成功"
  }
}
```

## 6. 与Persona对话

### 请求（新对话）

```bash
POST /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/chat
Content-Type: application/json

{
  "message": "老师您好，我对您的大语言模型研究很感兴趣，请问您目前有什么开放的项目吗？",
  "studentProfile": {
    "name": "张三",
    "background": "清华大学计算机系大三学生",
    "interests": ["NLP", "深度学习"],
    "experience": ["实现过BERT模型", "参加过Kaggle竞赛"]
  }
}
```

### 请求（继续对话）

```bash
POST /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/chat
Content-Type: application/json

{
  "sessionId": "session_xxx",
  "message": "请问您对学生有什么具体的要求？"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "sessionId": "session_xxx",
    "answer": "我是李明导师的授权AI分身...很高兴你对我的研究感兴趣。目前我们有以下几个开放项目...",
    "citations": [
      { "sourceId": "src_xxx", "title": "项目描述" }
    ],
    "retrievedChunksCount": 6,
    "messageCount": 2,
    "persona": {
      "name": "李明",
      "slug": "li-ming-北京大学计算机科学技术学院-a1b2c3d4"
    }
  }
}
```

## 7. 获取聊天历史

### 请求

```bash
GET /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/chat?sessionId=session_xxx
```

### 响应

```json
{
  "success": true,
  "data": {
    "sessionId": "session_xxx",
    "turns": [
      {
        "role": "user",
        "message": "老师您好...",
        "answer": "我是李明导师...",
        "citations": [...],
        "timestamp": "2026-04-13T10:00:00Z"
      }
    ],
    "messageCount": 2,
    "lastMessageAt": "2026-04-13T10:05:00Z"
  }
}
```

## 8. 评估学生

### 请求（基于对话历史）

```bash
POST /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/evaluate
Content-Type: application/json

{
  "studentProfile": {
    "name": "张三",
    "background": "清华大学计算机系大三学生",
    "interests": ["NLP", "深度学习"],
    "experience": ["实现过BERT模型", "参加过Kaggle竞赛", "GPA: 3.8"]
  },
  "sessionId": "session_xxx"
}
```

### 请求（直接评估）

```bash
POST /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/evaluate
Content-Type: application/json

{
  "studentProfile": {
    "name": "李四",
    "background": "北京大学硕士生",
    "interests": ["知识图谱", "数据挖掘"],
    "experience": ["发表过一篇论文", "熟悉PyTorch"]
  },
  "applicationId": "app_xxx"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "evaluation": {
      "id": "eval_xxx",
      "researchFit": {
        "score": 85,
        "rationale": "学生的研究兴趣与导师方向高度匹配...",
        "evidence": ["src_xxx: 项目描述"]
      },
      "technicalDepth": {
        "score": 75,
        "rationale": "学生有实际项目经验...",
        "evidence": ["实现过BERT模型"]
      },
      "communication": {
        "score": 70,
        "rationale": "能够清晰表达问题...",
        "evidence": ["session transcript"]
      },
      "initiative": {
        "score": 80,
        "rationale": "展示出较强的主动性...",
        "evidence": ["参加过Kaggle竞赛"]
      },
      "overallScore": 77,
      "recommendation": "recommend_interview",
      "summary": "该生在NLP方向有较好的基础...",
      "followUpQuestions": [
        "请具体讲一个你独立复现并改进过的工作。",
        "你如何设计一组最小但有说服力的ablation？"
      ]
    },
    "summary": {
      "overallScore": 77,
      "recommendation": "recommend_interview",
      "recommendationLabel": "建议面试",
      "keyStrengths": ["研究匹配度高", "主动性强"],
      "areasForImprovement": ["改进沟通表达"]
    }
  }
}
```

## 9. 获取评估结果

### 请求

```bash
GET /api/personas/li-ming-北京大学计算机科学技术学院-a1b2c3d4/evaluate?applicationId=app_xxx
```

### 响应

```json
{
  "success": true,
  "data": {
    "id": "eval_xxx",
    "overallScore": 77,
    "recommendation": "recommend_interview",
    "researchFit": { ... },
    "technicalDepth": { ... },
    "communication": { ... },
    "initiative": { ... },
    "summary": "...",
    "followUpQuestions": [...],
    "evidenceQuality": {
      "evidenceBackedCount": 5,
      "hasStudentProfile": true,
      "hasTranscript": true
    },
    "createdAt": "2026-04-13T10:10:00Z"
  }
}
```

## 使用curl测试的完整示例

### 1. 构建Persona

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李明",
    "affiliation": "北京大学",
    "title": "副教授",
    "authorizedBy": "admin",
    "projectText": "研究方向：NLP和LLM"
  }'
```

### 2. 列出Personas

```bash
curl http://localhost:3000/api/personas
```

### 3. 获取Persona详情

```bash
curl http://localhost:3000/api/personas/li-ming-北京大学-a1b2c3d4
```

### 4. 开始对话

```bash
curl -X POST http://localhost:3000/api/personas/li-ming-北京大学-a1b2c3d4/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "老师您好，我对您的研究很感兴趣",
    "studentProfile": {
      "name": "张三",
      "background": "清华学生",
      "interests": ["NLP"]
    }
  }'
```

### 5. 评估学生

```bash
curl -X POST http://localhost:3000/api/personas/li-ming-北京大学-a1b2c3d4/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "studentProfile": {
      "name": "张三",
      "background": "清华学生",
      "experience": ["实现过BERT"]
    }
  }'
```

## 错误响应格式

所有API在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息（可选）"
  }
}
```

常见错误码：
- `UNAUTHORIZED`: 未授权（401）
- `FORBIDDEN`: 权限不足（403）
- `NOT_FOUND`: 资源不存在（404）
- `INVALID_INPUT`: 输入参数无效（400）
- `BUILD_ERROR`: 构建失败（500）
- `CHAT_ERROR`: 聊天失败（500）
- `EVALUATION_ERROR`: 评估失败（500）

## 配置要求

### 环境变量

```bash
# 必需
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-secret-key-minimum-32-characters"

# Persona LLM配置
PERSONA_LLM_PROVIDER="mock"  # mock|anthropic|openai|deepseek

# 如果使用真实的LLM
ANTHROPIC_API_KEY="sk-ant-..."  # anthropic
OPENAI_API_KEY="sk-..."          # openai
DEEPSEEK_API_KEY="sk-..."        # deepseek
```

### Mock模式

使用Mock模式不需要API key，适合开发测试：

```bash
PERSONA_LLM_PROVIDER="mock"
```

Mock模式的特点：
- 使用启发式算法生成Persona
- 使用基于规则的聊天回复
- 使用启发式评估算法
- 无需网络连接

### Anthropic模式

```bash
PERSONA_LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-haiku-latest"
```

### OpenAI模式

```bash
PERSONA_LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

### DeepSeek模式

```bash
PERSONA_LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-..."
```

## 权限说明

### 访问控制

- **公开Persona**: 任何登录用户都可以查看和使用
- **私有Persona**: 只有所有者可以访问
- **更新Persona**: 只有所有者可以更新
- **评估学生**: 导师所有者可以评估任何学生；学生可以自我评估

### 角色权限

| 操作 | 学生 | 导师（自己的） | 导师（公开的） |
|------|------|---------------|---------------|
| 查看Persona列表 | ✅ | ✅ | ✅ |
| 查看Persona详情 | ✅ | ✅ | ✅ |
| 与Persona对话 | ✅ | ✅ | ✅ |
| 构建Persona | ❌ | ✅ | ❌ |
| 更新Persona | ❌ | ✅ | ❌ |
| 评估学生 | ✅（自己） | ✅（任何人） | ❌ |

## 最佳实践

1. **分步构建**: 先使用简单的projectText构建，然后再更新添加更多内容
2. **会话管理**: 保存sessionId以便继续对话
3. **评估时机**: 建议在对话几轮后再评估，以获得更准确的结果
4. **错误处理**: 检查响应中的success字段，处理错误情况
5. **速率限制**: 注意API调用频率，避免过度请求

## 常见问题

### Q: 如何切换LLM提供商？

A: 修改`.env`文件中的`PERSONA_LLM_PROVIDER`环境变量，重启服务器即可。

### Q: Mock模式的质量如何？

A: Mock模式使用启发式算法，质量较低，仅用于开发测试。生产环境建议使用真实的LLM。

### Q: 如何提高评估准确性？

A: 提供更详细的学生档案，包括对话历史，可以提高评估准确性。

### Q: 支持哪些文件格式？

A: 目前支持文本格式（txt, md）。PDF和图片支持正在开发中。

### Q: 如何删除Persona？

A: 目前不支持直接删除，可以通过将关联的Skill设为私有来实现。
