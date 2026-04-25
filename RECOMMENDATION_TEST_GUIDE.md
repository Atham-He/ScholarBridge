# 个性化推荐功能测试指南

## 功能概述

个性化推荐功能基于用户在AI专业探索中标记的兴趣工作，推荐相关的：
- AI方向（Domains）
- 研究节点（Nodes）
- **导师（Mentors）** ⭐ 新增功能
- 学习路线（Learning Route）

## 功能实现

### 1. API端点
**路径**: `/api/explore/recommendations`
**方法**: GET
**认证**: 需要登录

### 2. 导师推荐算法

推荐系统基于以下因素计算导师匹配分数：

1. **领域匹配** (基础分数)
   - 查找与用户感兴趣领域相关的导师
   - 基于 `AIMentorExploration` 表中的领域关联

2. **研究方向匹配** (+2分/匹配节点)
   - 如果导师的研究节点与用户兴趣节点匹配
   - 检查 `nodeSlugs` 字段

3. **研究标签匹配** (+1分/匹配标签)
   - 如果导师的研究标签与用户兴趣节点相关
   - 检查 `additionalTags` 字段

4. **分数归一化**
   - 最终分数归一化到 0-1 范围
   - 显示为百分比

### 3. 返回数据结构

```json
{
  "success": true,
  "data": {
    "domains": [...],
    "nodes": [...],
    "mentors": [
      {
        "mentorId": "user_id",
        "score": 0.85,
        "reasons": [
          "研究领域与逻辑数理智能匹配",
          "在2个你感兴趣的研究方向上有专长"
        ],
        "mentor": {
          "id": "user_id",
          "displayName": "Dr. Catherine Zhang",
          "institution": "MIT · Mathematics",
          "title": "Professor",
          "location": "Cambridge, MA",
          "bioShort": "...",
          "skillSlug": "logical-mathematical-dr.-zhang-...",
          "skillTitle": "Formal AI Lab — Formal Methods",
          "domainSlug": "logical-mathematical",
          "domainName": "逻辑数理智能",
          "domainColor": "#3B82F6"
        }
      }
    ],
    "route": {...}
  }
}
```

## 测试步骤

### 1. 准备测试数据

运行测试脚本创建测试信号：

```bash
cd backend
npx tsx scripts/test-recommendations.ts
```

这会为测试学生账号标记5个感兴趣的工作。

### 2. 登录测试账号

- **邮箱**: `student@demo.local`
- **密码**: `demo123`

### 3. 访问推荐页面

1. 登录后访问: `http://localhost:3000/explore/ai/recommendations`
2. 查看推荐结果

### 4. 验证导师推荐

推荐页面应显示：

- ✅ **推荐导师** 部分（如果有关联导师）
- ✅ 导师卡片包含：
  - 领域标签（带颜色）
  - 导师姓名和机构
  - 研究简介
  - 匹配度分数
  - 推荐理由
  - "了解更多"按钮

### 5. 测试不同场景

#### 场景1: 无兴趣信号
- 清空用户信号或使用新用户
- 访问推荐页面
- 应显示: "还没有推荐数据" 提示

#### 场景2: 有兴趣信号但无关联导师
- 标记一些没有相关导师的工作
- 应显示: 方向和节点推荐，但没有导师推荐

#### 场景3: 正常推荐
- 使用测试数据
- 应显示: 完整的推荐结果，包括导师

## 数据库表

### AIUserWorkSignal
存储用户对工作的兴趣标记：
- `userId`: 用户ID
- `workId`: 工作ID
- `signal`: 信号类型 ('like', 'dislike', 'later')

### AIMentorExploration
存储导师与领域的关联：
- `mentorUserId`: 导师用户ID
- `domainSlug`: 领域slug
- `nodeSlugs`: 研究节点slug列表
- `additionalTags`: 额外的研究标签

### AIRecommendationSnapshot
存储推荐快照（用于可解释性）：
- `userId`: 用户ID
- `version`: 推荐算法版本
- `domains`: 领域推荐结果
- `nodes`: 节点推荐结果
- `mentors`: 导师推荐结果
- `route`: 学习路线
- `signalCount`: 信号统计

## 导师创建脚本

为所有8个AI领域创建测试导师：

```bash
cd backend
npx tsx scripts/create-domain-mentors.ts
```

这会创建24位导师（每个领域3位），每位导师包含：
- User 和 MentorProfile
- 公开的 Skill（研究方向、论文、H-index等）
- 3个开放项目（PhD、Postdoc、Intern）
- AIMentorExploration 记录

## 自定义和扩展

### 调整推荐算法

编辑 `app/api/explore/recommendations/route.ts` 中的 `generateMentorRecommendations` 函数：

```typescript
// 调整基础分数权重
let score = domainScore.count * 2;  // 增加领域匹配权重

// 调整节点匹配分数
score += matchingNodes.length * 3;  // 增加节点匹配权重

// 调整返回的导师数量
.slice(0, 10)  // 返回前10位导师
```

### 自定义推荐理由

修改推荐理由生成逻辑：

```typescript
// 添加自定义推荐理由
if (score > 8) {
  match.reasons.push("高度匹配你的研究兴趣");
}
```

### 添加更多匹配因素

可以添加更多匹配因素，例如：
- 导师的语言能力
- 地理位置偏好
- 招生状态
- 合作论文

## 故障排查

### 问题1: 导师推荐为空

**可能原因**:
- 用户没有标记感兴趣的工作
- 标记的工作没有相关导师

**解决方法**:
- 运行 `test-recommendations.ts` 创建测试数据
- 运行 `create-domain-mentors.ts` 创建测试导师
- 确保 `AIMentorExploration` 表中有相关记录

### 问题2: 推荐页面不显示

**可能原因**:
- 用户未登录
- API返回错误

**解决方法**:
- 检查浏览器控制台错误
- 检查网络请求响应
- 确保用户已登录

### 问题3: 匹配度分数异常

**可能原因**:
- 分数归一化问题
- 信号数据异常

**解决方法**:
- 检查 `AIUserWorkSignal` 表数据
- 调整归一化算法

## 相关文件

- `app/api/explore/recommendations/route.ts` - 推荐API
- `app/explore/ai/recommendations/page.tsx` - 推荐页面
- `scripts/create-domain-mentors.ts` - 创建测试导师
- `scripts/test-recommendations.ts` - 创建测试数据
- `lib/explore/sync.ts` - 探索数据同步
