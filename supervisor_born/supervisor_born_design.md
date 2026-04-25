# supervisor_born 详细设计文档

## 1. 目标

`supervisor_born` 的目标不是简单把导师“模仿得像”，而是把导师**授权的知识、风格、项目和筛选标准**结构化为一个可部署到平台上的 agent。该 agent 需要完成四类任务：

1. 向学生解释导师的研究方向、方法偏好和项目情况。
2. 以导师授权的风格与学生对话，但必须明确说明自己是 AI 分身。
3. 接收学生背景、研究兴趣、问题历史，形成可审阅的学生档案。
4. 基于透明的 rubric 输出“建议是否进一步真人面试”的报告，而不是替导师作最终决定。

## 2. 范围

### 2.1 v1 解决的问题

- 从公开信息构建初始导师画像
- 从上传材料增强画像和说话风格
- 生成平台可调用的 persona bundle
- 提供聊天与学生评估能力
- 全链路保存 provenance

### 2.2 v1 不解决的问题

- 不做导师电脑后台“无感监控”
- 不做自动录取/拒绝
- 不接入私有 IM 或校内系统
- 不承诺人格完整复刻
- 不替导师签署、承诺经费或发 offer

## 3. 与原始 supervisor 的关系

原始 `supervisor` 的核心骨架是：

1. 输入导师姓名 + 机构
2. 多源公开搜索
3. 接收上传材料
4. AI 分析
5. 生成结构化 JSON 档案
6. 生成 skill 并用于对话

`supervisor_born` 沿用了这个骨架，但将输出对象从“本地 skill”扩展为“平台 persona bundle + runtime”。

## 4. 核心设计原则

### 4.1 授权优先
只有“授权导师”才能发布到平台。构建输入中必须带有 `authorizedBy` 与可选 `consentNotes`。

### 4.2 检索优先于幻觉
agent 先从证据块中检索，再基于检索结果回答；没有证据时应显式表达不确定性。

### 4.3 人在环
学生评估结果只输出：
- `do_not_progress`
- `needs_human_review`
- `recommend_interview`
- `strong_recommendation`

不直接输出“录取”这类具有决定性的标签。

### 4.4 溯源
所有回答与评估都尽量附带 source id 或 title，方便导师审阅。

### 4.5 分层人格
分身的“像不像”被拆成四层：
- 事实层：研究方向、论文、项目
- 方法层：偏好的问题定义与方法学
- 筛选层：导师关心的学生信号
- 表达层：语气和说话风格

v1 先保证前三层，表达层是锦上添花。

## 5. 总体架构

```text
                ┌─────────────────────────────────────────┐
                │           supervisor_born              │
                └─────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐        ┌────────────────┐       ┌─────────────────┐
│ Public Crawl │        │ Upload Parsing │       │ Runtime Layer   │
│ - web search │        │ - txt/md       │       │ - chat          │
│ - homepage   │        │ - pdf          │       │ - eval          │
│ - OpenAlex   │        │ - doc/docx     │       │ - sessions      │
└──────┬───────┘        │ - png/jpg      │       └────────┬────────┘
       │                └───────┬────────┘                │
       └──────────────┬──────────┴──────────┬─────────────┘
                      ▼                     ▼
              ┌─────────────────────────────────┐
              │ Evidence Store / Chunk Index    │
              │ - sources.json                  │
              │ - chunks.json                   │
              │ - uploads/                      │
              └────────────────┬────────────────┘
                               ▼
                   ┌─────────────────────────┐
                   │ Persona Distillation    │
                   │ - profile JSON          │
                   │ - agent-card.md         │
                   │ - rubric                │
                   └────────────┬────────────┘
                                ▼
                    ┌────────────────────────┐
                    │ Platform Exposure      │
                    │ - API                  │
                    │ - browser UI           │
                    │ - exportable bundle    │
                    └────────────────────────┘
```

## 6. 端到端 workflow

### Step 0: 授权登记
输入：
- mentor name
- affiliation
- authorizedBy
- consentNotes
- optional public URLs
- optional uploads

输出：
- `input.json`

### Step 1: 工作区初始化
为导师生成 slug，例如：
- `Geoffrey Hinton` -> `geoffrey-hinton`
- `Yann LeCun` -> `yann-lecun`

目录：
```text
data/personas/<slug>/
```

### Step 2: 公开信息搜集
公共信息来源分为三类：

1. 直接给定 URL  
   例如导师主页、实验室主页、Scholar 页面。

2. Web search  
   查询模板：
   - `<name> <affiliation> professor`
   - `<name> <affiliation> lab`
   - `<name> <affiliation> research`

3. OpenAlex author / works  
   用于获取作者条目与代表论文。

该阶段输出 `sources.json` 中的 public sources，字段包括：
- `id`
- `origin = public`
- `kind = webpage | paper`
- `title`
- `url`
- `content`
- `metadata`

### Step 3: 上传材料解析
支持：
- txt / md
- pdf
- docx / doc
- png / jpg / jpeg

不同文件进入不同 parser：
- text parser：直接读文本
- pdf parser：抽取文字
- docx parser：抽取 raw text
- doc parser：用旧 Word extractor
- image parser：优先使用 vision LLM，fallback 为占位摘要

输出同样进入 `sources.json`，字段：
- `origin = upload`
- `kind = upload_text | upload_document | upload_image`

### Step 4: 证据块切分
将所有 source 切为 chunk：
- 目标长度：约 1200 字符
- overlap：约 180 字符
- 保存 `sourceId`, `title`, `origin`, `chunkIndex`

输出：
- `chunks.json`

### Step 5: 蒸馏 persona
蒸馏器读取 `sources + chunks`，输出 `persona.json`。结构包含：

```json
{
  "version": "0.1.0",
  "createdAt": "...",
  "mentor": {
    "name": "...",
    "slug": "...",
    "affiliation": "...",
    "title": "...",
    "homepage": "..."
  },
  "authorization": {
    "authorized": true,
    "authorizedBy": "...",
    "consentNotes": "..."
  },
  "overview": "...",
  "researchTopics": [
    {"name": "...", "confidence": 0.8, "evidence": ["src_1"]}
  ],
  "methods": ["..."],
  "currentProjects": [
    {
      "title": "...",
      "summary": "...",
      "requiredSkills": ["..."],
      "fitSignals": ["..."]
    }
  ],
  "communicationStyle": {
    "voiceSummary": "...",
    "doSay": ["..."],
    "avoid": ["..."]
  },
  "mentorshipStyle": {
    "expectations": ["..."],
    "preferredStudents": ["..."],
    "screeningQuestions": ["..."]
  },
  "screeningRubric": {
    "hardRequirements": ["..."],
    "positiveSignals": ["..."],
    "concerns": ["..."]
  },
  "guardrails": ["..."],
  "provenance": {
    "sourceCount": 12,
    "publicSourceCount": 7,
    "uploadSourceCount": 5,
    "topSources": ["src_1", "src_3"]
  }
}
```

### Step 6: 生成 agent card
生成 `agent-card.md`，包含：
- 身份说明
- 行为边界
- 允许回答的问题
- 必须升级到真人的问题
- 输出风格
- 学生评估格式

### Step 7: 发布到平台
平台层暴露以下 API：
- build persona
- list personas
- get persona
- chat
- evaluate

### Step 8: 导师审阅
真实产品里，导师需要在发布前确认：
- 研究方向是否准确
- 项目描述是否可公开
- 筛选条件是否合意
- 是否允许学生看到该分身
- 是否启用“学生自动初筛”

该 MVP 已为这一步预留数据结构，但未实现完整审批 UI。

## 7. 聊天 runtime 设计

### 7.1 输入
- `slug`
- `sessionId`
- `message`
- optional `studentProfile`

### 7.2 处理
1. 读取 persona 与 chunks
2. 用 lexical ranker 检索 top-k evidence
3. 将 persona + evidence + session history 组织成 prompt
4. 由 LLM 或 mock provider 生成回答
5. 保存 turn 到 `sessions/<sessionId>.json`

### 7.3 输出
- `answer`
- `citations`
- `sessionId`
- `retrievedChunks`

### 7.4 行为约束
agent 必须：
- 明确自己是 AI 分身
- 只基于授权资料与公开信息回答
- 对经费、录取、保密项目类问题保守处理
- 不得伪造“我已经决定录取你”

## 8. 学生评估 workflow

### 8.1 输入
- `studentProfile`
- optional transcript
- optional sessionId

### 8.2 评分维度
- `researchFit`：研究方向与项目匹配度
- `technicalDepth`：技术/方法掌握情况
- `communication`：表达清晰度与研究表述能力
- `initiative`：主动性、自驱与做事证据
- `overallScore`

### 8.3 输出等级
- `do_not_progress`
- `needs_human_review`
- `recommend_interview`
- `strong_recommendation`

### 8.4 透明性
每个维度必须附带：
- `score`
- `rationale`
- `evidence`
- `followUpQuestions`

## 9. Provider 设计

### 9.1 mock
- 无 API key
- 依赖 heuristic distillation
- 适合 smoke test、本地开发和集成测试

### 9.2 openai
- 使用 OpenAI-compatible `/chat/completions`
- 支持 JSON 输出
- 支持 vision image parser

### 9.3 anthropic
- 使用 Messages API
- 支持 JSON-ish 输出解析
- 支持 image content

## 10. 数据治理与安全

### 10.1 数据分级
- Public: 论文、主页、可公开项目描述
- Authorized Upload: 导师主动上传材料
- Runtime Student Data: 学生提交信息与聊天记录

### 10.2 v1 安全要求
- 所有 persona 必须记录 `authorizedBy`
- 评估结果仅作建议
- 所有聊天记录可删除
- 学生个人信息仅保存在本地 `data/` 中
- 上传原始文件与解析文本分开存储

### 10.3 不应做的事情
- 未经授权抓取私人聊天
- 在未声明 AI 身份时冒充导师
- 用 AI 评估直接作为录取决定
- 把未公开项目自动暴露给学生

## 11. 检索与评估方案

### 11.1 v1 检索
采用 lexical overlap ranker，优点是：
- 无额外依赖
- 易解释
- 本地可跑

缺点是：
- 召回与语义泛化较弱

### 11.2 v2 升级方向
- embeddings + vector store
- paragraph-level citation tracing
- re-ranker
- mentor-edited FAQ cache

## 12. API 设计

### POST `/api/personas/build`
multipart/form-data:
- `name`
- `affiliation`
- `authorizedBy`
- `consentNotes`
- `publicUrls`
- `projectText`
- `files[]`

### GET `/api/personas`
返回 persona summary 列表

### GET `/api/personas/:slug`
返回 `persona.json`

### POST `/api/personas/:slug/chat`
json:
```json
{
  "sessionId": "optional",
  "message": "我想加入你的组",
  "studentProfile": {
    "name": "Alice",
    "background": "CS undergraduate",
    "interests": ["representation learning", "multimodal models"]
  }
}
```

### POST `/api/personas/:slug/evaluate`
json:
```json
{
  "sessionId": "optional",
  "studentProfile": {
    "name": "Alice",
    "background": "...",
    "experience": ["reproduced a CVPR paper", "PyTorch"]
  }
}
```

## 13. 可运行 MVP 说明

这个仓库提供的是一个**能直接跑通主链路**的 MVP：

- `npm run smoke`：无 key、无网络，跑 mock 流程
- `npm install && npm run dev`：启动平台
- `node src/cli.mjs build ...`：构建 persona
- `node src/cli.mjs chat ...`：与 persona 对话
- `node src/cli.mjs evaluate ...`：评估学生

## 14. 未来演化

### P1
- 导师审核 UI
- 学生申请管线
- FAQ + project cards
- persona version diff

### P2
- vector retrieval
- institution auth
- analytics dashboard
- webhook to CRM / ATS / campus systems

### P3
- mentor-controlled passive capture plugin
- stronger style learning from approved dialogue
- live project state sync
