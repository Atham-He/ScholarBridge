#!/usr/bin/env node

/**
 * API 配置测试脚本
 * 验证 OpenAI 格式 API 是否配置正确
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// 加载配置
const envPath = resolve(__dirname, '..', '.env');
const { parsed } = config({ path: envPath });

console.log('🧪 测试 OpenAI 格式 API 配置...\n');

// 获取配置
const apiKey = parsed?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = parsed?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
const model = parsed?.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

console.log('📋 配置信息:');
console.log(`  API Key: ${apiKey ? `${apiKey.slice(0, 10)}...` : '❌ 未配置'}`);
console.log(`  Base URL: ${baseURL || '❌ 未配置'}`);
console.log(`  Model: ${model || '❌ 未配置'}`);
console.log('');

if (!apiKey || !baseURL) {
  console.error('❌ API 配置不完整，请检查 .env 文件');
  process.exit(1);
}

// 测试 API 连接
async function testAPI() {
  try {
    console.log('🔌 测试 API 连接...');

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，请简单回复"测试成功"'
        }
      ],
      max_tokens: 50,
    });

    console.log('✅ API 连接成功！');
    console.log('📝 响应内容:');
    console.log(`  ${response.choices[0].message.content}`);
    console.log('');
    console.log('🎉 API 配置验证完成，可以正常使用！');

  } catch (error) {
    console.error('❌ API 连接失败:');
    console.error(`  错误类型: ${error.name}`);
    console.error(`  错误信息: ${error.message}`);

    if (error.response) {
      console.error(`  HTTP 状态: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data)}`);
    }

    console.error('\n💡 建议检查:');
    console.error('  1. API Key 是否正确');
    console.error('  2. Base URL 是否正确');
    console.error('  3. 模型名称是否正确');
    console.error('  4. 网络连接是否正常');

    process.exit(1);
  }
}

testAPI();