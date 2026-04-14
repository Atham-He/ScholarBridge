#!/usr/bin/env node

/**
 * Persona API 测试脚本
 *
 * 使用方法：
 *   node scripts/test-persona-api.mjs [command]
 *
 * 命令：
 *   build     - 测试构建Persona
 *   list      - 测试列出Personas
 *   get       - 测试获取Persona详情
 *   chat      - 测试与Persona对话
 *   evaluate  - 测试评估学生
 *   all       - 运行所有测试
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// 模拟的认证token（需要先登录获取）
const AUTH_COOKIE = 'skill-hub-session=your-session-cookie-here';

// 测试数据
const TEST_MENTOR = {
  name: '张伟',
  affiliation: '清华大学计算机系',
  title: '教授',
  authorizedBy: 'test-admin',
  projectText: `研究方向：机器学习、深度学习、自然语言处理。

研究内容：
1. 大语言模型的训练与优化
2. 多模态学习
3. 知识图谱与推理

期望学生：
- 有扎实的数学基础
- 熟悉PyTorch或TensorFlow
- 能够独立进行科研
- 有良好的沟通能力`
};

const TEST_STUDENT = {
  name: '李明',
  background: '北京大学计算机系大四学生',
  interests: ['NLP', '深度学习', '知识图谱'],
  experience: [
    '实现过BERT模型用于文本分类',
    '参加过Kaggle竞赛并获得银牌',
    'GPA: 3.9',
    '熟悉PyTorch和TensorFlow'
  ]
};

/**
 * 发送HTTP请求
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': AUTH_COOKIE,
    ...options.headers
  };

  console.log(`\n📡 ${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log(`📦 Body:`, JSON.stringify(options.body, null, 2));
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    throw error;
  }
}

/**
 * 测试构建Persona
 */
async function testBuild() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 构建Persona');
  console.log('='.repeat(60));

  const result = await request('/api/personas/build', {
    method: 'POST',
    body: TEST_MENTOR
  });

  if (result.success) {
    console.log(`\n✨ Persona构建成功！`);
    console.log(`   Slug: ${result.data.slug}`);
    console.log(`   Persona ID: ${result.data.personaId}`);
    console.log(`   Skill ID: ${result.data.skillId}`);

    // 保存slug用于后续测试
    global.testSlug = result.data.slug;
    global.testPersonaId = result.data.personaId;
    global.testSkillId = result.data.skillId;
  }

  return result;
}

/**
 * 测试列出Personas
 */
async function testList() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 列出Personas');
  console.log('='.repeat(60));

  const result = await request('/api/personas');

  if (result.success) {
    console.log(`\n✨ 找到 ${result.data.count} 个Personas`);
    result.data.personas.forEach((persona, index) => {
      console.log(`   ${index + 1}. ${persona.mentor.name} - ${persona.slug}`);
      console.log(`      状态: ${persona.buildStatus}`);
      console.log(`      来源: ${persona.stats.sourceCount}个`);
    });
  }

  return result;
}

/**
 * 测试获取Persona详情
 */
async function testGet() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 获取Persona详情');
  console.log('='.repeat(60));

  const slug = global.testSlug;
  if (!slug) {
    console.log('⚠️  跳过：需要先运行build测试');
    return null;
  }

  const result = await request(`/api/personas/${slug}`);

  if (result.success) {
    console.log(`\n✨ Persona详情：`);
    console.log(`   名称: ${result.data.persona.mentor.name}`);
    console.log(`   机构: ${result.data.persona.mentor.affiliation}`);
    console.log(`   概述: ${result.data.persona.overview.substring(0, 100)}...`);
    console.log(`   研究主题: ${result.data.persona.researchTopics.map(t => t.name).join(', ')}`);
  }

  return result;
}

/**
 * 测试获取Agent Card
 */
async function testAgentCard() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 获取Agent Card');
  console.log('='.repeat(60));

  const slug = global.testSlug;
  if (!slug) {
    console.log('⚠️  跳过：需要先运行build测试');
    return null;
  }

  const result = await request(`/api/personas/${slug}/agent-card`);

  if (result.success) {
    console.log(`\n✨ Agent Card：`);
    console.log(`   ${result.data.agentCard.split('\n').slice(0, 10).join('\n   ')}...`);
  }

  return result;
}

/**
 * 测试与Persona对话
 */
async function testChat() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 与Persona对话');
  console.log('='.repeat(60));

  const slug = global.testSlug;
  if (!slug) {
    console.log('⚠️  跳过：需要先运行build测试');
    return null;
  }

  const result = await request(`/api/personas/${slug}/chat`, {
    method: 'POST',
    body: {
      message: '老师您好，我对您的研究方向很感兴趣，请问您对招收学生有什么要求？',
      studentProfile: TEST_STUDENT
    }
  });

  if (result.success) {
    console.log(`\n✨ 对话成功！`);
    console.log(`   Session ID: ${result.data.sessionId}`);
    console.log(`   消息数: ${result.data.messageCount}`);
    console.log(`   回复: ${result.data.answer.substring(0, 200)}...`);

    // 保存sessionId用于继续对话
    global.testSessionId = result.data.sessionId;
  }

  return result;
}

/**
 * 测试继续对话
 */
async function testChatContinue() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 继续对话');
  console.log('='.repeat(60));

  const slug = global.testSlug;
  const sessionId = global.testSessionId;

  if (!slug || !sessionId) {
    console.log('⚠️  跳过：需要先运行chat测试');
    return null;
  }

  const result = await request(`/api/personas/${slug}/chat`, {
    method: 'POST',
    body: {
      sessionId,
      message: '请问您目前有哪些开放的研究项目？'
    }
  });

  if (result.success) {
    console.log(`\n✨ 继续对话成功！`);
    console.log(`   消息数: ${result.data.messageCount}`);
  }

  return result;
}

/**
 * 测试评估学生
 */
async function testEvaluate() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 评估学生');
  console.log('='.repeat(60));

  const slug = global.testSlug;
  if (!slug) {
    console.log('⚠️  跳过：需要先运行build测试');
    return null;
  }

  const result = await request(`/api/personas/${slug}/evaluate`, {
    method: 'POST',
    body: {
      studentProfile: TEST_STUDENT,
      sessionId: global.testSessionId
    }
  });

  if (result.success) {
    console.log(`\n✨ 评估成功！`);
    console.log(`   总分: ${result.data.evaluation.overallScore}`);
    console.log(`   推荐: ${result.data.summary.recommendationLabel}`);
    console.log(`   优势: ${result.data.summary.keyStrengths.join(', ')}`);
    console.log(`   待改进: ${result.data.summary.areasForImprovement.join(', ')}`);

    // 保存evaluationId
    global.testEvaluationId = result.data.evaluation.id;
  }

  return result;
}

/**
 * 测试更新Persona
 */
async function testUpdate() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 更新Persona');
  console.log('='.repeat(60));

  const slug = global.testSlug;
  if (!slug) {
    console.log('⚠️  跳过：需要先运行build测试');
    return null;
  }

  const result = await request(`/api/personas/${slug}/update`, {
    method: 'POST',
    body: {
      projectText: `更新后的项目描述：
重点关注大语言模型的可解释性、安全性和对齐问题。

开放职位：
1. LLM对齐研究助理
2. 多模态学习研究助理

新增要求：
- 对AI安全有浓厚兴趣
- 有相关论文阅读经验`
    }
  });

  if (result.success) {
    console.log(`\n✨ Persona更新成功！`);
    console.log(`   新增来源: ${result.data.addedSourceCount}个`);
    console.log(`   总来源: ${result.data.sourceCount}个`);
    console.log(`   总块: ${result.data.chunkCount}个`);
  }

  return result;
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('开始运行Persona API测试');
  console.log('API地址:', BASE_URL);
  console.log(''.padEnd(60, '='));

  const results = {
    build: null,
    list: null,
    get: null,
    agentCard: null,
    chat: null,
    chatContinue: null,
    evaluate: null,
    update: null
  };

  try {
    results.build = await testBuild();
    results.list = await testList();
    results.get = await testGet();
    results.agentCard = await testAgentCard();
    results.chat = await testChat();
    results.chatContinue = await testChatContinue();
    results.evaluate = await testEvaluate();
    results.update = await testUpdate();

    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));

    const summary = Object.entries(results).map(([name, result]) => {
      const status = result && result.success ? '✅' : '❌';
      return `${status} ${name}`;
    });

    summary.forEach(line => console.log(line));

    const passed = Object.values(results).filter(r => r && r.success).length;
    const total = Object.keys(results).length;

    console.log(`\n总计: ${passed}/${total} 通过`);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'build':
      await testBuild();
      break;
    case 'list':
      await testList();
      break;
    case 'get':
      await testGet();
      break;
    case 'chat':
      await testChat();
      break;
    case 'evaluate':
      await testEvaluate();
      break;
    case 'update':
      await testUpdate();
      break;
    case 'all':
      await runAllTests();
      break;
    default:
      console.log(`
Usage: node scripts/test-persona-api.mjs [command]

Commands:
  build     - Test building a new persona
  list      - Test listing all personas
  get       - Test getting persona details
  chat      - Test chatting with a persona
  evaluate  - Test evaluating a student
  update    - Test updating a persona
  all       - Run all tests

Environment:
  API_BASE_URL - API base URL (default: http://localhost:3000)
  AUTH_COOKIE  - Authentication cookie (required)

Example:
  API_BASE_URL=http://localhost:3000 \\
  AUTH_COOKIE="skill-hub-session=xxx" \\
  node scripts/test-persona-api.mjs all
      `);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
