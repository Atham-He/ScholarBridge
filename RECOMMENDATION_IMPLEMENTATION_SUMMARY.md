# 个性化推荐功能实现总结

## 实现内容

### 1. 导师推荐算法 ✅

**文件**: `backend/app/api/explore/recommendations/route.ts`

实现了 `generateMentorRecommendations` 函数，基于用户兴趣推荐相关导师。

**推荐逻辑**:
1. 获取用户感兴趣的AI领域（最多3个）
2. 查找这些领域的相关导师（基于 `AIMentorExploration` 表）
3. 计算每个导师的匹配分数：
   - 基础分：领域匹配度
   - 加分：研究方向节点匹配（+2分/节点）
   - 加分：研究标签匹配（+1分/标签）
4. 归一化分数到 0-1 范围
5. 返回前6位匹配导师

**返回数据结构**:
```typescript
{
  mentorId: string,
  score: number,           // 0-1 匹配度
  reasons: string[],       // 推荐理由
  mentor: {
    id, displayName, institution, title, location, bioShort,
    skillSlug, skillTitle,
    domainSlug, domainName, domainColor
  }
}
```

### 2. 推荐页面UI ✅

**文件**: `backend/app/explore/ai/recommendations/page.tsx`

添加了"推荐导师"部分，显示：

- ✅ 领域标签（带颜色）
- ✅ 导师姓名、机构、职位
- ✅ 地理位置
- ✅ 研究简介（限制2行）
- ✅ 匹配度分数（百分比）
- ✅ 推荐理由列表
- ✅ "了解更多"按钮（链接到导师详情页）

### 3. 测试数据 ✅

**文件**: `backend/scripts/test-recommendations.ts`

创建测试脚本，为测试学生账号标记5个感兴趣的工作。

**运行方式**:
```bash
cd backend
npx tsx scripts/test-recommendations.ts
```

**测试账号**:
- 邮箱: `student@demo.local`
- 密码: `demo123`

### 4. 测试导师 ✅

**文件**: `backend/scripts/create-domain-mentors.ts`

为8个AI领域各创建3位测试导师，共24位。

**导师覆盖领域**:
1. 逻辑数理智能 - Dr. Catherine Zhang, Dr. Robert Chen, Dr. Maria Santos
2. 语言文字智能 - Dr. Sarah Kim, Dr. James Wilson, Dr. Li Wei
3. 视觉空间智能 - Dr. Emily Rodriguez, Dr. David Park, Dr. Anna Mueller
4. 身体动觉智能 - Dr. Michael Brown, Dr. Yuki Tanaka, Dr. Jessica Garcia
5. 音乐节奏智能 - Dr. Thomas Anderson, Dr. Lisa Chen, Dr. Erik Johansson
6. 人际交往智能 - Dr. Rachel Green, Dr. Daniel Lee, Dr. Sophie Martin
7. 内省智能 - Dr. Kevin Patel, Dr. Amanda Foster, Dr. Hiroshi Nakamura
8. 自然观察智能 - Dr. Maria Lopez, Dr. James Wright, Dr. Priya Sharma

**运行方式**:
```bash
cd backend
npx tsx scripts/create-domain-mentors.ts
```

## 测试流程

### 1. 创建测试数据
```bash
# 创建测试导师
npx tsx scripts/create-domain-mentors.ts

# 创建测试兴趣信号
npx tsx scripts/test-recommendations.ts
```

### 2. 登录测试账号
- 访问: `http://localhost:3000/login`
- 邮箱: `student@demo.local`
- 密码: `demo123`

### 3. 访问推荐页面
- 访问: `http://localhost:3000/explore/ai/recommendations`
- 查看推荐结果

### 4. 验证功能
- ✅ 显示"推荐导师"部分
- ✅ 显示最多6位导师
- ✅ 每位导师显示完整信息
- ✅ 匹配度分数正确
- ✅ 推荐理由合理
- ✅ "了解更多"按钮可点击

## 数据流程

```
用户标记兴趣工作
    ↓
AIUserWorkSignal 表记录
    ↓
访问推荐页面
    ↓
API: /api/explore/recommendations
    ↓
获取用户兴趣信号
    ↓
计算领域和节点得分
    ↓
查找相关导师 (AIMentorExploration)
    ↓
计算导师匹配分数
    ↓
返回推荐结果
    ↓
保存推荐快照 (AIRecommendationSnapshot)
    ↓
页面显示推荐结果
```

## 关键数据表

### AIUserWorkSignal
存储用户的兴趣标记：
- userId: 用户ID
- workId: 工作ID
- signal: 信号类型 ('like', 'dislike', 'later')

### AIMentorExploration
存储导师与领域的关联：
- mentorUserId: 导师用户ID
- domainSlug: 领域slug
- nodeSlugs: 研究节点slug列表 (JSON)
- additionalTags: 额外的研究标签 (JSON)

### AIRecommendationSnapshot
存储推荐快照：
- userId: 用户ID
- version: 推荐算法版本
- domains: 领域推荐结果 (JSON)
- nodes: 节点推荐结果 (JSON)
- mentors: 导师推荐结果 (JSON)
- route: 学习路线 (JSON)
- signalCount: 信号统计 (JSON)

## 自定义和扩展

### 调整推荐算法

编辑 `app/api/explore/recommendations/route.ts`:

```typescript
// 调整基础分数权重
let score = domainScore.count * 2;

// 调整节点匹配分数
score += matchingNodes.length * 3;

// 调整标签匹配分数
score += matchingTags.length * 2;

// 调整返回导师数量
.slice(0, 10)  // 返回前10位

// 调整分数归一化
score: Math.min(m.score / 15, 1)  // 使用不同除数
```

### 添加更多匹配因素

可以在计算分数时添加更多因素：

```typescript
// 地理位置
if (mentor.mentor.location === preferredLocation) {
  score += 2;
}

// 语言能力
if (mentor.languages.includes(userPreferredLanguage)) {
  score += 1;
}

// 招生状态
if (mentor.hasOpenPositions) {
  score += 3;
}
```

## 文件清单

### 新增文件
- `scripts/create-domain-mentors.ts` - 创建测试导师
- `scripts/test-recommendations.ts` - 创建测试数据
- `RECOMMENDATION_TEST_GUIDE.md` - 测试指南

### 修改文件
- `app/api/explore/recommendations/route.ts` - 实现导师推荐
- `app/explore/ai/recommendations/page.tsx` - 显示导师推荐

## 注意事项

1. **用户登录**: 推荐功能需要用户登录才能使用
2. **兴趣信号**: 用户需要先标记感兴趣的工作才能获得推荐
3. **导师关联**: 导师必须通过 `AIMentorExploration` 表与领域关联才能被推荐
4. **分数归一化**: 当前使用简单的除法归一化，可以根据需要调整
5. **性能优化**: 如果导师数量很多，可以考虑添加缓存或使用更高效的算法

## 后续改进建议

1. **机器学习**: 使用机器学习模型替代基于规则的推荐
2. **实时更新**: 用户标记新兴趣时实时更新推荐
3. **多样性**: 确保推荐结果的多样性，避免所有导师都来自同一领域
4. **反馈循环**: 允许用户对推荐结果进行反馈，优化算法
5. **A/B测试**: 测试不同的推荐算法和权重配置
