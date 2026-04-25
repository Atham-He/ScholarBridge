# supervisor_born 中文说明

`supervisor_born` 是一个导师分身 agent 构建与运行项目。它的目标是：根据导师公开信息和用户上传资料，生成一个可聊天、可接收学生信息、可做预筛评估的导师分身 agent。

当前项目生成的是一个基于证据资料的 AI persona，用于介绍研究方向、和学生多轮交流、给出面向人工复核的学生匹配度建议。

## 项目结构

```text
supervisor_born/
├── .env.example                  # 环境变量模板
├── .gitignore                    # 忽略 node_modules、data、.env 等本地文件
├── package.json                  # npm 脚本和依赖
├── README.md                     # 英文 README
├── README.zh-CN.md               # 中文 README
├── supervisor_born_design.md     # 设计说明
├── data/                         # 默认运行数据目录，生成后出现，已被 gitignore
├── docs/                         # 补充设计/文档目录
├── examples/                     # 示例输入
│   ├── build-request.json        # 示例构建请求
│   ├── student_profile.json      # 示例学生信息
│   └── uploads/
│       ├── mentor_bio.txt        # 示例导师资料
│       └── project_brief.md      # 示例项目资料
├── public/                       # 浏览器 UI
│   ├── app.js                    # 前端请求逻辑：创建、更新、聊天、评估
│   ├── index.html                # 单页 UI
│   └── styles.css                # UI 样式
├── scripts/
│   ├── regression.mjs            # 回归测试
│   └── smoke.mjs                 # 零 key 端到端 smoke test
└── src/
    ├── cli.mjs                   # CLI 入口：build/update/chat/evaluate
    ├── config.mjs                # 配置读取：.env、provider、搜索、dataDir
    ├── parsers.mjs               # 上传文件解析：txt/md/pdf/doc/docx/png/jpg/jpeg
    ├── prompts.mjs               # 蒸馏、聊天、评估 prompt
    ├── retrieval.mjs             # 证据切块和检索排序
    ├── server.mjs                # Express API 和静态 UI 服务
    ├── services.mjs              # persona 蒸馏、agent card、聊天、评估服务
    ├── storage.mjs               # 文件系统存储
    ├── lib/
    │   └── utils.mjs             # 通用工具函数
    ├── providers/
    │   ├── llm.mjs               # LLM provider：mock/openai/deepseek/anthropic
    │   └── public.mjs            # 公开信息采集：Bing/Google、机构主页探测、Scholar、OpenAlex
    └── workflows/
        ├── buildPersona.mjs      # create/build workflow，新建 persona
        ├── updatePersona.mjs     # update workflow，更新已有 persona
        ├── chatPersona.mjs       # chat workflow，多轮对话
        └── evaluateStudent.mjs   # evaluate workflow，学生预筛评估
```

### 运行后生成的数据结构

默认情况下，生成的导师 agent 会存到 `data/personas/<slug>/`。可以通过 `DATA_DIR` 改成别的目录。

```text
data/personas/<slug>/
├── agent-card.md                 # 可读的 agent card
├── chunks.json                   # 从 sources 切出的检索片段
├── input.json                    # 构建/更新输入记录
├── persona.json                  # 最终导师 persona
├── sources.json                  # 公开信息 + 上传信息的证据源
├── uploads/                      # 被复制保存的上传文件
├── sessions/                     # 聊天 session 记录
└── evaluations/                  # 学生评估报告
```

`slug` 是精确定位 agent 的唯一标识。新建时会按 `name + affiliation + 8 位随机 hash` 生成，例如：

```text
jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4
```

连续创建同一个老师也会生成不同 slug，避免覆盖。更新、聊天、评估都应使用精确 slug。

## 用户详细使用方法

### 1. 安装依赖

项目要求 Node.js `>=20`。

```powershell
cd C:\Users\sqa22\Desktop\supervisor-skill\supervisor_born
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```powershell
Copy-Item .env.example .env
notepad .env
```

最小可运行配置如下。`mock` 模式不需要 API key，适合快速检查流程。

```env
PORT=3000
DATA_DIR=./data
LLM_PROVIDER=mock
WEB_SEARCH_PROVIDER=multi
MAX_PUBLIC_PAGES=6
MAX_PAPERS=8
FETCH_TIMEOUT_MS=15000
```

如果要实际调用 DeepSeek，把 `.env` 改成：

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的_deepseek_key
WEB_SEARCH_PROVIDER=multi
```

DeepSeek 当前按文本模型使用，默认模型是 `deepseek-chat`。图片上传会被记录为图片元数据，不会把图片内容当作视觉输入读取。

如果要使用 OpenAI-compatible provider：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=你的_openai_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_SUPPORTS_VISION=true
```

如果要增强公开搜索的稳定性，可以配置 Bing 或 Google 官方搜索 API：

```env
BING_SEARCH_API_KEY=
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_CX=
```

默认 `WEB_SEARCH_PROVIDER=multi` 会优先使用 Bing 和 Google 的搜索路径，并结合机构主页直探、Google Scholar best-effort 发现和 OpenAlex。没有搜索 API key 时，会退回 HTML 搜索解析；搜索引擎可能因为反爬、地区和个性化导致程序结果与浏览器搜索结果不同。

### 3. 运行 smoke test

先确认项目本身能跑通：

```powershell
npm run smoke
```

这个命令使用 `mock` provider，不需要 API key，也不会依赖真实网络搜索。

如果要跑回归测试：

```powershell
npm run regression
```

如果要跑带真实网络的公开信息采集测试：

```powershell
node .\scripts\regression.mjs --network
```

### 4. 启动浏览器 UI

```powershell
npm run dev
```

打开：

```text
http://localhost:3000
```

UI 里主要有四块：

- 生成导师分身：填写导师姓名、机构、授权人、公开链接、项目说明，上传文件后创建新 agent。
- 已有导师：查看已有 persona，点击某个 slug 后会自动填充 chat/update/evaluate 表单。
- Update selected persona：对已有 slug 追加公开链接、上传文件和项目文本，并重新蒸馏 persona。
- 对话/学生评估：用已选 slug 和学生信息进行聊天、评估。

### 5. 创建导师 agent

#### 方式 A：只给姓名、单位和上传文件，让 workflow 自动采集公开信息

适用于你不知道导师主页，或者希望系统自己先搜索主页、论文和 OpenAlex 信息。

```powershell
node src/cli.mjs build `
  --name "Jie Tang" `
  --affiliation "Tsinghua University, Department of Computer Science" `
  --authorized-by "demo-admin" `
  --upload ".\examples\uploads\mentor_bio.txt" `
  --upload ".\examples\uploads\project_brief.md"
```

Zhiyuan Liu 示例：

```powershell
node src/cli.mjs build `
  --name "Zhiyuan Liu" `
  --affiliation "Tsinghua University, Department of Computer Science" `
  --authorized-by "demo-admin" `
  --upload ".\examples\uploads\mentor_bio.txt" `
  --upload ".\examples\uploads\project_brief.md"
```

如果公开搜索成功，系统会把找到的主页、OpenAlex 作者信息、论文信息等写入 `sources.json`。

#### 方式 B：同时给导师主页和上传文件

如果你已经知道导师主页，建议显式传入，稳定性更高。

```powershell
node src/cli.mjs build `
  --name "Jie Tang" `
  --affiliation "Tsinghua University, Department of Computer Science" `
  --authorized-by "demo-admin" `
  --public-url "https://keg.cs.tsinghua.edu.cn/persons/jietang/" `
  --upload ".\examples\uploads\mentor_bio.txt" `
  --upload ".\examples\uploads\project_brief.md"
```

```powershell
node src/cli.mjs build `
  --name "Zhiyuan Liu" `
  --affiliation "Tsinghua University, Department of Computer Science" `
  --authorized-by "demo-admin" `
  --public-url "https://nlp.csai.tsinghua.edu.cn/~lzy/" `
  --upload ".\examples\uploads\mentor_bio.txt" `
  --upload ".\examples\uploads\project_brief.md"
```

创建成功后，终端会输出 JSON，其中最重要的是：

```json
{
  "slug": "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4",
  "sourceCount": 8,
  "chunkCount": 37,
  "publicSourceCount": 6,
  "uploadSourceCount": 2
}
```

后续聊天、评估、更新都用这个 `slug`。

#### 常用 build 参数

```text
--name                 导师姓名，必填
--affiliation          工作单位/院系，建议填写完整
--title                职称，可选，默认 Professor
--authorized-by        授权人/操作者，当前 CLI 必填
--consent-notes        授权说明，可选
--public-url           公开链接，可多次传入
--public-urls          多行公开链接字符串，可选
--upload               上传文件路径，可多次传入
--project-text         补充项目说明文本，可选
--skip-public-search   跳过 Bing/Google/机构主页搜索
--disable-openalex     跳过 OpenAlex 作者和论文采集
```

支持的上传格式：

```text
.txt, .text, .md, .pdf, .docx, .doc, .png, .jpg, .jpeg
```

### 6. 更新已有导师 agent

`create/build` 永远新建 agent，不覆盖旧 agent。要更新已有 agent，必须使用 `update` 并传入精确 slug。

```powershell
node src/cli.mjs update `
  --slug "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4" `
  --public-url "https://www.cs.tsinghua.edu.cn/csen/info/1303/4319.htm" `
  --upload ".\new_notes.pdf" `
  --project-text "新增筛选标准：要求学生展示一个可复现的图学习实验、ablation 和错误分析。"
```

update 的行为是“合并并重新蒸馏”：

- 保留原来的 sources。
- 追加新的 public sources、upload sources、project text。
- 按 URL、文件路径或 source id 去重。
- 重新生成 `sources.json`、`chunks.json`、`persona.json`、`agent-card.md`。
- 不改变 persona 的目录和 slug。

如果传入新的 `name`、`affiliation`、`title`，它们会作为同一个 agent 的 metadata 更新，不会新建目录。

### 7. 和导师 agent 对话

使用 `chat` 命令：

```powershell
node src/cli.mjs chat `
  --mentor "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4" `
  --message "老师您好，我对知识图谱、图学习和大模型结合很感兴趣。您的主要研究方向是什么？"
```

带学生信息：

```powershell
node src/cli.mjs chat `
  --mentor "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4" `
  --student-file ".\examples\student_profile.json" `
  --message "我做过一个小型知识图谱问答项目，也复现过一个 GNN baseline。您觉得我还缺什么？"
```

指定会话 ID 进行多轮对话：

```powershell
node src/cli.mjs chat `
  --mentor "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4" `
  --session "student-alice-001" `
  --student-file ".\examples\student_profile.json" `
  --message "如果我想申请科研实习，应该先准备哪些论文阅读、代码和实验材料？"
```

聊天记录会写入：

```text
data/personas/<slug>/sessions/<sessionId>.json
```

### 8. 评估学生匹配度

使用 `evaluate` 命令：

```powershell
node src/cli.mjs evaluate `
  --mentor "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4" `
  --student-file ".\examples\student_profile.json"
```

如果要把某个聊天 session 作为评估上下文：

```powershell
node src/cli.mjs evaluate `
  --mentor "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4" `
  --student-file ".\examples\student_profile.json" `
  --session "student-alice-001"
```

输出中的关键字段：

```json
{
  "overallScore": 74,
  "recommendation": "needs_human_review",
  "summary": "...",
  "evidenceQuality": {
    "evidenceBackedCount": 6,
    "hasStudentProfile": true,
    "hasTranscript": true,
    "lowEvidence": false
  }
}
```

`recommendation` 可能取值：

```text
do_not_progress
needs_human_review
recommend_interview
strong_recommendation
```

这些只是预筛建议，不是最终录取或拒绝决定。

评估报告会写入：

```text
data/personas/<slug>/evaluations/<evalId>.json
```

### 9. 使用 REST API

启动服务：

```powershell
npm run dev
```

下面的 multipart 示例使用 PowerShell 7 的 `Invoke-RestMethod -Form`。如果你使用旧版 Windows PowerShell，可以优先使用浏览器 UI、CLI，或改用 `curl.exe -F`。

健康检查：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/health"
```

查看已有 personas：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/personas"
```

创建 persona，multipart 上传文件：

```powershell
$form = @{
  name = "Jie Tang"
  affiliation = "Tsinghua University, Department of Computer Science"
  title = "Professor"
  authorizedBy = "demo-admin"
  publicUrls = "https://keg.cs.tsinghua.edu.cn/persons/jietang/"
  projectText = "学生筛选时关注问题定义、复现实验、ablation 和错误分析。"
  files = Get-Item ".\examples\uploads\mentor_bio.txt"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/personas/build" `
  -Form $form
```

更新 persona：

```powershell
$slug = "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4"
$form = @{
  publicUrls = "https://www.cs.tsinghua.edu.cn/csen/info/1303/4319.htm"
  projectText = "新增材料：要求学生展示可复现的实验报告。"
  files = Get-Item ".\examples\uploads\project_brief.md"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/personas/$slug/update" `
  -Form $form
```

聊天：

```powershell
$slug = "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4"
$body = @{
  sessionId = "student-alice-001"
  message = "老师您好，我对知识图谱和图学习感兴趣，应该先准备什么？"
  studentProfile = @{
    name = "Alice"
    background = "undergraduate"
    interests = @("knowledge graph", "graph learning")
    experience = @("reproduced a GNN baseline")
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/personas/$slug/chat" `
  -ContentType "application/json" `
  -Body $body
```

评估：

```powershell
$slug = "jie-tang-tsinghua-university-department-of-computer-science-a1b2c3d4"
$body = @{
  sessionId = "student-alice-001"
  studentProfile = @{
    name = "Alice"
    background = "undergraduate"
    interests = @("knowledge graph", "graph learning")
    experience = @("implemented a PyTorch GNN baseline", "wrote ablation notes")
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/personas/$slug/evaluate" `
  -ContentType "application/json" `
  -Body $body
```

### 10. 公开信息采集说明

创建或更新 persona 时，如果没有 `--skip-public-search`，workflow 会尝试采集公开信息：

- 用户显式传入的 `--public-url`。
- Bing/Google 搜索结果。
- 已知机构的主页候选探测，例如 Tsinghua 的 `keg.cs.tsinghua.edu.cn/persons/<handle>/`、`nlp.csai.tsinghua.edu.cn/~<handle>/`、`ml.cs.tsinghua.edu.cn/~<handle>/`。
- Google Scholar profile best-effort 发现。
- OpenAlex 作者 profile 和高引用论文。

如果没有提供导师主页，只提供姓名和单位，例如：

```powershell
node src/cli.mjs build `
  --name "Zhiyuan Liu" `
  --affiliation "Tsinghua University, Department of Computer Science" `
  --authorized-by "demo-admin" `
  --upload ".\examples\uploads\mentor_bio.txt" `
  --upload ".\examples\uploads\project_brief.md"
```

workflow 仍会尝试自动查找主页和论文。实测 Tsinghua 的 Jie Tang、Zhiyuan Liu、Jun Zhu 可以通过当前搜索与机构主页探测链路找到对应主页，但搜索引擎和 Google Scholar 不是强保证，生产环境建议配置官方搜索 API，并允许用户手动补充 `public-url`。

### 11. 常见问题

如果创建失败并提示没有 sources，通常是公开搜索没找到结果，且没有可解析上传文件。解决办法是显式传 `--public-url` 或上传 `.txt/.pdf/.docx` 等资料。

如果同名老师或同一老师要生成多个 agent，不要复用旧 slug 创建。直接再次运行 `build`，系统会生成一个新的随机 hash slug。

如果要修改已有 agent，不要再次 `build`，应使用 `update --slug <已有 slug>`。

如果 DeepSeek 下上传图片，当前只会记录图片文件元数据，不会读取图片内容。PDF、Word、txt、md 才是推荐的上传资料格式。

如果聊天或评估找不到 persona，检查传入的是不是精确 slug，而不是导师姓名。
