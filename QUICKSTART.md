# 🚀 快速开始 - 团队成员指南

## 一分钟设置

```bash
# 1. 安装依赖
npm install

# 2. 设置环境变量
cp .env.example .env
# 编辑 .env 文件（最少需要配置 SESSION_SECRET）

# 3. 初始化数据库
npm run db:generate    # 生成 Prisma Client
npm run db:migrate     # 创建数据库表
npm run db:seed        # ⭐ 导入测试数据

# 4. 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 开始使用！

## 🧪 测试账号

### 导师账号
- **邮箱**: `mentor@demo.local`
- **密码**: `demo123`
- **用途**: 测试导师功能、发布研究项目

### 学生账号
- **邮箱**: `student@demo.local`
- **密码**: `demo123`
- **用途**: 测试学生功能、申请项目、**查看个性化推荐**

### 双角色账号
- **邮箱**: `dual@test.com`
- **密码**: `test123`
- **用途**: 同时测试导师和学生功能

## 📊 测试数据概览

运行 `npm run db:seed` 后，你将获得：

- 👥 **27 个用户**: 3 个基础用户 + 24 位测试导师
- 🎓 **25 位导师**: 覆盖 8 个 AI 研究领域
- 🔬 **24 个研究方向**: 每个领域 3 位导师
- 📝 **75+ 个开放项目**: PhD、Postdoc、Intern 职位
- 🏷️ **5 个兴趣信号**: 用于测试推荐功能

## 🔥 快速测试推荐功能

1. 使用学生账号登录: `student@demo.local` / `demo123`
2. 访问: `http://localhost:3000/explore/ai/recommendations`
3. 查看推荐结果（应包含 3 位逻辑数理智能领域的导师）

## 📖 更多文档

- **[数据同步指南](./DATA_SYNC.md)** - 如何与团队同步测试数据
- **[推荐功能测试](./RECOMMENDATION_QUICK_START.md)** - 个性化推荐功能测试
- **[CLAUDE.md](./CLAUDE.md)** - 项目架构和开发指南

## 🔄 更新测试数据

如果团队成员更新了 `prisma/seed.ts`：

```bash
# 拉取最新代码
git pull

# 重新导入测试数据
npm run db:seed

# 启动服务器
npm run dev
```

## ⚠️ 常见问题

**Q: 找不到测试账号？**
A: 确保已运行 `npm run db:seed`

**Q: 推荐页面为空？**
A: 使用学生账号登录，seed 会自动创建兴趣信号

**Q: 数据库错误？**
A: 删除 `dev.db` 并重新运行迁移：
```bash
rm dev.db
npm run db:migrate
npm run db:seed
```

## 🆘 需要帮助？

- 📧 联系项目维护者
- 📚 查看 [DATA_SYNC.md](./DATA_SYNC.md) 了解数据同步机制
- 🐛 提交 Issue 到 GitHub

---

**准备好了吗？** 运行 `npm run dev` 开始开发！ 🚀
