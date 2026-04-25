# ScholarBridge

AI-powered mentor-student matching platform - 基于人工智能的导师-学生匹配平台

## 🌟 特色功能

- **智能专业探索**: 8个AI领域的交互式探索工具
- **个性化推荐**: 基于兴趣匹配导师和研究方向
- **AI Persona系统**: 导师数字分身，提供24/7咨询服务
- **实时聊天**: 学生与导师AI Agent的智能对话
- **学生评估**: AI驱动的多维度学生能力评估

## 🚀 快速开始

```bash
# 克隆项目
git clone <your-repo-url>
cd ScholarBridge

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 SESSION_SECRET

# 初始化数据库
npm run db:generate
npm run db:migrate
npm run db:seed        # ⭐ 导入测试数据

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 开始使用！

详细说明请查看 [QUICKSTART.md](./QUICKSTART.md)

## 🧪 测试账号

| 角色 | 邮箱 | 密码 | 用途 |
|------|------|------|------|
| 导师 | `mentor@demo.local` | `demo123` | 发布项目、管理申请 |
| 学生 | `student@demo.local` | `demo123` | 浏览导师、申请项目、查看推荐 |
| 双角色 | `dual@test.com` | `test123` | 同时测试导师和学生功能 |

## 📊 技术栈

- **前端**: Next.js 16, React 19, Tailwind CSS 4
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **AI**: Anthropic Claude, OpenAI, DeepSeek
- **认证**: iron-session
- **语言**: TypeScript 5

## 🔄 团队协作 - 数据同步

**重要**: 我们使用 Prisma Seed 文件来同步测试数据，**不**提交数据库文件到 GitHub。

### 快速同步

```bash
# Clone 项目后
npm run db:seed    # 导入测试数据

# 团队成员更新后
git pull
npm run db:seed    # 重新导入测试数据
```

**详细说明**: 查看 [DATA_SYNC.md](./DATA_SYNC.md)

## 📚 文档

- **[QUICKSTART.md](./QUICKSTART.md)** - 快速开始指南
- **[DATA_SYNC.md](./DATA_SYNC.md)** - 数据同步详细说明
- **[CLAUDE.md](./CLAUDE.md)** - 项目架构和开发规范
- **[RECOMMENDATION_QUICK_START.md](./RECOMMENDATION_QUICK_START.md)** - 推荐功能测试

## 🛠️ 开发命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build           # 构建生产版本

# 数据库
npm run db:seed         # ⭐ 导入测试数据
npm run db:studio       # 打开 Prisma Studio

# 测试
npm test                # 运行测试
npm run type-check      # TypeScript 类型检查
```

## 📝 更新日志

### v1.0.0 (最新)
- ✅ 完整的导师-学生匹配系统
- ✅ AI Persona 构建和聊天
- ✅ AI 专业探索和推荐
- ✅ 24 位测试导师（8个领域）
- ✅ 个性化推荐功能

---

**Made with ❤️ by ScholarBridge Team**
