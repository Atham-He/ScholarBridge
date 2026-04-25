#!/bin/bash

echo "🧪 个性化推荐功能快速测试"
echo "================================"
echo ""

# 检查数据库状态
echo "📊 数据库状态检查"
echo "------------------"

MENTOR_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM User WHERE role = 'MENTOR';")
echo "✅ 导师数量: $MENTOR_COUNT"

EXPLORATION_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM AIMentorExploration;")
echo "✅ 导师探索记录: $EXPLORATION_COUNT"

SIGNAL_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM AIUserWorkSignal;")
echo "✅ 用户兴趣信号: $SIGNAL_COUNT"

echo ""

# 检查推荐API
echo "🔍 测试推荐API"
echo "--------------"

# 获取测试用户会话（需要先登录）
echo "请确保已登录测试学生账号："
echo "  邮箱: student@demo.local"
echo "  密码: demo123"
echo ""

# 检查开发服务器状态
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "✅ 开发服务器运行中 (端口 3000)"
  echo ""
  echo "🌐 测试步骤："
  echo "  1. 访问: http://localhost:3000/login"
  echo "  2. 使用 student@demo.local / demo123 登录"
  echo "  3. 访问: http://localhost:3000/explore/ai/recommendations"
  echo "  4. 查看推荐结果（应包含导师推荐）"
else
  echo "❌ 开发服务器未运行"
  echo ""
  echo "请先启动开发服务器："
  echo "  cd backend"
  echo "  npm run dev"
fi

echo ""
echo "📚 测试数据"
echo "-----------"
echo "已有 $SIGNAL_COUNT 个兴趣信号"
echo "覆盖领域:"
sqlite3 dev.db "SELECT DISTINCT d.name, COUNT(*) as work_count FROM AIUserWorkSignal s JOIN AIWork w ON s.workId = w.id JOIN AIResearchNode n ON w.nodeId = n.id JOIN AIDomain d ON n.domainSlug = d.slug GROUP BY d.name;" 2>/dev/null || echo "  (无法获取详细信息)"

echo ""
echo "✨ 如果推荐页面显示导师推荐，说明功能正常！"
