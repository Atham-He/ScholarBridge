# Skill Hub / ScholarBridge（Demo）

导师–学生匹配演示：**线上界面与 `frontend-example/mentor_student_platform_ui.html` 为同一套 ScholarBridge 模版**（运行态副本为 `public/scholarbridge.html`，逻辑在 `public/scholarbridge/runtime.js`，通过 `credentials: 'include'` 调用本站 API）。导师发布 **Skill**、维护 **SkillProject**、Scholar 风格元数据；学生浏览、与 **AI 分身**对话；会话落库，并解析 `[[SCORE:x]]` / `[[NOTIFY_MENTOR]]`。申请支持流水线状态（对话中 / 审核中 / 面试 / 录取 / 未通过 / 撤回）。

## 技术栈

- Next.js 16（App Router）+ TypeScript
- Prisma + SQLite
- 会话：`iron-session`（HttpOnly Cookie）
- 密码：`bcryptjs`
- 可选：`ANTHROPIC_API_KEY` 启用 Claude；未配置时使用本地兜底回复

## 本地运行

```bash
cd skill-hub
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 演示账号（`db seed` 后）

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 导师 | mentor@demo.local | demo123 |
| 学生 | student@demo.local | demo123 |

种子数据含一条 **ScholarBridge 风格**公开 Skill（MIT CSAIL · Prof. Jane Chen 演示数据），slug：`zhang-lab-nlp`，并含 3 条课题（2 开放、1 已关闭）、学生侧 **申请材料 JSON** 与 **通知** 示例。

## 主要路由

| 路径 | 说明 |
|------|------|
| `/` | **ScholarBridge 全屏 UI**（iframe → `/scholarbridge.html`，模版像素级一致） |
| `/scholarbridge.html` | 同上页面可直接访问（含 Google Fonts 与内联样式） |
| `/register`、`/login` | 旧版 Next 注册/登录页（仍可作备用） |
| `/browse`、`/s/[slug]`、`/mentor`、`/student`、`/c/[id]` | 旧版 App Router 页面（维护/调试可用） |

## API 摘要

- `POST /api/auth/register`、`/api/auth/login`、`POST /api/auth/logout`（注册导师时可传 `location`）
- `GET /api/me`
- `GET/POST /api/skills`（POST 需导师；可带 `tags`、`hIndex`、`citationsDisplay`、`researchSummary`、`publications`、`agentIntro` 等，与 ScholarBridge 卡片/详情字段一致）
- `GET /api/skills/[slug]`（公开详情：导师、`projects`、`publications`、统计）
- `PATCH /api/skills/[slug]`（导师本人：更新 Skill 与发布状态）
- `POST /api/skills/[slug]/projects`（导师：新增开放课题）
- `PATCH/DELETE /api/projects/[id]`（导师：课题归属校验）
- `GET/POST /api/applications`（GET 返回 `materials`、流水线中英标签、`matchScorePercent`；POST 需学生）
- `POST /api/applications/[id]/withdraw`
- `PATCH /api/applications/[id]`（导师：更新 `status`、`interviewAt`）
- `GET /api/mentor/applications`
- `GET /api/mentor/dashboard`（待审申请、本周有消息的会话数、开放课题数、平均 AI 分等）
- `GET /api/notifications`（当前用户通知列表）
- `GET /api/conversations/[id]`
- `POST /api/chat`（学生，向当前会话追加消息并触发 AI；`WITHDRAWN`/`REJECTED` 不可再发）

## 生产环境注意

- 设置足够长的 `SESSION_SECRET`（≥32 字符）
- 更换数据库为 PostgreSQL 等
- 配置真实邮件验证与 HTTPS
- 审阅 AI 安全策略与内容合规
