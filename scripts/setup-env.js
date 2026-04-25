#!/usr/bin/env node

/**
 * ScholarBridge 环境配置工具
 * 帮助用户快速设置 .env 文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function setupEnv() {
  console.log('🔧 ScholarBridge 环境配置向导\n');

  const envExamplePath = path.join(__dirname, '..', '.env.example');
  const envPath = path.join(__dirname, '..', '.env');

  // 检查 .env 是否已存在
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env 文件已存在，是否覆盖？(y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ 取消配置');
      rl.close();
      return;
    }
  }

  // 读取 .env.example
  let envContent = fs.readFileSync(envExamplePath, 'utf-8');

  console.log('\n请选择 LLM 提供商:');
  console.log('1. OpenAI (推荐，支持视觉功能)');
  console.log('2. Anthropic Claude');
  console.log('3. DeepSeek (性价比高)');
  console.log('4. Mock 模式 (开发测试，无需 API Key)');

  const providerChoice = await question('\n请输入选项 (1-4): ');

  let llmProvider = 'mock';
  let apiKey = '';

  switch (providerChoice.trim()) {
    case '1':
      llmProvider = 'openai';
      apiKey = await question('请输入 OpenAI API Key: ');
      break;
    case '2':
      llmProvider = 'anthropic';
      apiKey = await question('请输入 Anthropic API Key: ');
      break;
    case '3':
      llmProvider = 'deepseek';
      apiKey = await question('请输入 DeepSeek API Key: ');
      break;
    case '4':
      llmProvider = 'mock';
      console.log('✅ 使用 Mock 模式，无需 API Key');
      break;
    default:
      console.log('❌ 无效选项，使用 Mock 模式');
      llmProvider = 'mock';
  }

  // 替换配置
  envContent = envContent.replace(/LLM_PROVIDER=".*?"/, `LLM_PROVIDER="${llmProvider}"`);

  if (llmProvider === 'openai' && apiKey) {
    envContent = envContent.replace(/OPENAI_API_KEY=""/, `OPENAI_API_KEY="${apiKey}"`);
  } else if (llmProvider === 'anthropic' && apiKey) {
    envContent = envContent.replace(/ANTHROPIC_API_KEY=""/, `ANTHROPIC_API_KEY="${apiKey}"`);
  } else if (llmProvider === 'deepseek' && apiKey) {
    envContent = envContent.replace(/DEEPSEEK_API_KEY=""/, `DEEPSEEK_API_KEY="${apiKey}"`);
  }

  // 写入 .env 文件
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ 环境配置完成！');
  console.log(`📁 配置文件: ${envPath}`);
  console.log(`🔧 LLM 提供商: ${llmProvider}`);

  if (llmProvider !== 'mock') {
    console.log('\n📝 下一步:');
    console.log('1. 你可以编辑 .env 文件来添加更多配置（如搜索服务 API）');
    console.log('2. 运行 npm run dev:all 启动所有服务');
  } else {
    console.log('\n📝 下一步:');
    console.log('1. 编辑 .env 文件，添加真实的 API Key');
    console.log('2. 运行 npm run dev:all 启动所有服务');
  }

  rl.close();
}

setupEnv().catch(console.error);