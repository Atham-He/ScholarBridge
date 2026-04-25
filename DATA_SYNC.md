# 🔄 数据同步指南 - 团队协作

## 📋 问题

SQLite 数据库文件 (`dev.db`) **不应该**提交到 GitHub，因为：
- ❌ 文件很大，占用仓库空间
- ❌ 包含本地开发数据，不适合共享
- ❌ 容易产生合并冲突
- ❌ 每次更新都会改变文件内容

## ✅ 解决方案：使用 Prisma Seed

我们使用 **Prisma Seed 文件** (`prisma/seed.ts`) 来定义测试数据。

### 工作原理

1. **定义数据**: 在 `prisma/seed.ts` 中编写测试数据
2. **提交代码**: 将 `seed.ts` 提交到 GitHub
3. **团队同步**: 合作者运行 `npm run db:seed` 获得相同数据

## 🚀 快速开始

### 对于合作者（Clone 项目后）

```bash
# 1. Clone 项目
git clone <your-repo-url>
cd ScholarBridge

# 2. 安装依赖
npm install

# 3. 设置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 4. 初始化数据库
npm run db:generate    # 生成 Prisma Client
npm run db:migrate     # 运行数据库迁移
npm run db:seed        # ⭐ 导入测试数据

# 5. 启动开发服务器
npm run dev
```

### 对于开发者（修改测试数据后）

```bash
# 1. 修改 prisma/seed.ts 文件
# 添加或修改测试数据

# 2. 测试新的 seed 数据
npm run db:seed

# 3. 提交到 GitHub
git add prisma/seed.ts
git commit -m "update: 添加新的测试数据"
git push
```

## 📊 当前测试数据

### Seed 文件包含的数据

运行 `npm run db:seed` 后，数据库将包含：

#### 1. 测试用户账号
- **导师账号**: `mentor@demo.local` / `demo123`
- **学生账号**: `student@demo.local` / `demo123`
- **双角色账号**: `dual@test.com` / `test123` (同时是导师和学生)

#### 2. 测试导师（24位）
覆盖 8 个 AI 领域，每个领域 3 位导师：

| 领域 | 导师数量 | 代表导师 |
|------|----------|----------|
| 逻辑数理智能 | 3 | Dr. Catherine Zhang (MIT) |
| 语言文字智能 | 3 | Dr. Sarah Kim (CMU) |
| 视觉空间智能 | 3 | Dr. Emily Rodriguez (MIT) |
| 身体动觉智能 | 3 | Dr. Michael Brown (CMU) |
| 音乐节奏智能 | 3 | Dr. Thomas Anderson (MIT) |
| 人际交往智能 | 3 | Dr. Rachel Green (Stanford) |
| 内省智能 | 3 | Dr. Kevin Patel (DeepMind) |
| 自然观察智能 | 3 | Dr. Maria Lopez (MIT) |

每位导师包含：
- ✅ User 和 MentorProfile
- ✅ 公开的 Skill（研究方向、论文、H-index）
- ✅ 3 个开放项目（PhD、Postdoc、Intern）
- ✅ AI 领域探索记录 (AIMentorExploration)

#### 3. 测试兴趣信号
- 5 个用户兴趣标记（用于推荐功能测试）
- 覆盖逻辑数理智能领域

#### 4. 通知和会话
- 测试通知数据
- 示例会话数据

## 🛠️ Seed 文件结构

`prisma/seed.ts` 文件包含：

```typescript
async function main() {
  // 1. 创建基础测试用户
  // 2. 创建24位测试导师（8个领域 × 3位）
  // 3. 创建测试兴趣信号
}
```

### 添加新的测试数据

#### 添加新导师

在 `prisma/seed.ts` 中找到对应的领域，添加新的导师对象：

```typescript
{
  domainSlug: "logical-mathematical",
  domainName: "逻辑数理智能",
  mentors: [
    // ... 现有导师
    {
      name: "Dr. New Mentor",
      institution: "Stanford University",
      department: "Computer Science",
      title: "Professor",
      bioShort: "Research interests...",
      location: "Stanford, CA",
      researchInterests: ["AI", "ML"],
      labName: "New Lab",
      researchTopics: ["Topic 1", "Topic 2"],
    },
  ],
},
```

#### 添加新领域

1. 在 `domainsData` 数组中添加新领域
2. 在 `backend/data/explore/domains.json` 中添加领域定义
3. 运行 `npm run db:seed` 生成数据

## 📝 日常使用

### 重新生成测试数据

```bash
# 删除现有数据库并重新生成
rm dev.db
npm run db:migrate
npm run db:seed
```

### 更新 Seed 数据

```bash
# 1. 编辑 prisma/seed.ts

# 2. 重新运行 seed
npm run db:seed

# 3. 验证数据
sqlite3 dev.db "SELECT COUNT(*) FROM User WHERE role = 'MENTOR';"
# 应该返回 25（1个基础导师 + 24个测试导师）

# 4. 提交更改
git add prisma/seed.ts
git commit -m "update: 更新测试数据"
```

## 🔍 验证数据同步

合作者运行 seed 后，可以验证数据是否正确：

```bash
# 检查导师数量
sqlite3 dev.db "SELECT COUNT(*) FROM User WHERE role = 'MENTOR';"
# 预期: 25

# 检查学生数量
sqlite3 dev.db "SELECT COUNT(*) FROM User WHERE role = 'STUDENT';"
# 预期: 2

# 检查导师探索记录
sqlite3 dev.db "SELECT COUNT(*) FROM AIMentorExploration;"
# 预期: 24

# 检查兴趣信号
sqlite3 dev.db "SELECT COUNT(*) FROM AIUserWorkSignal;"
# 预期: 5
```

## 🎯 最佳实践

### DO ✅

- ✅ 将 `prisma/seed.ts` 提交到 GitHub
- ✅ 在 seed 文件中定义所有测试数据
- ✅ 使用有意义的测试数据（真实机构、真实研究方向）
- ✅ 添加注释说明数据的用途
- ✅ 定期更新 seed 数据以匹配代码变化

### DON'T ❌

- ❌ 不要提交 `dev.db` 或其他数据库文件
- ❌ 不要在 seed 中包含敏感信息（真实密码、邮箱等）
- ❌ 不要让 seed 文件过大（控制在 1000 行以内）
- ❌ 不要在 seed 中创建生产数据

## 🔄 数据同步流程图

```
开发者 A                           开发者 B
    |                                  |
    | 1. 修改 seed.ts                  |
    | 2. npm run db:seed              |
    | 3. 测试功能                      |
    | 4. git commit & push             |
    |                                  |
    |────────── 推送到 GitHub ──────────>
    |                                  |
    |                                  | 5. git pull
    |                                  | 6. npm run db:seed
    |                                  | 7. 获得相同数据
    |                                  | 8. 继续开发
```

## 📚 相关文件

- `prisma/seed.ts` - 测试数据定义
- `prisma/schema.prisma` - 数据库模型
- `.gitignore` - 排除数据库文件
- `package.json` - Seed 脚本配置
- `DATA_SYNC.md` - 本文档

## 🆘 常见问题

### Q: 为什么我的数据库文件被 git 跟踪了？

A: 检查 `.gitignore` 文件，确保包含：
```
*.db
*.db-journal
dev.db
```

然后运行：
```bash
git rm --cached dev.db
git commit -m "chore: 从 git 中移除数据库文件"
```

### Q: 运行 seed 时出错怎么办？

A: 检查以下几点：
1. 确保已运行 `npm run db:migrate`
2. 检查 `prisma/seed.ts` 语法是否正确
3. 查看错误日志，通常是数据约束问题

### Q: 如何重置数据库？

A: 运行以下命令：
```bash
rm dev.db
npm run db:migrate
npm run db:seed
```

### Q: Seed 数据会影响生产环境吗？

A: 不会！Seed 只在开发环境运行。生产环境使用自己的数据库和迁移脚本。

## 📞 需要帮助？

如果遇到问题：
1. 检查本文档的"常见问题"部分
2. 查看 Prisma 官方文档: https://www.prisma.io/docs/guides/database/seed-database
3. 联系项目维护者

---

**记住**: Seed 文件是团队协作的关键！保持它的更新和准确性。 🚀
