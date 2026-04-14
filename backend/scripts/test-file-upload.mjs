#!/usr/bin/env node

/**
 * File Upload Test Script
 * 测试Persona构建API的文件上传功能
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

/**
 * 创建测试文件（如果不存在）
 */
async function createTestFiles() {
  const testDir = TEST_FILES_DIR;

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建测试文本文件
  const testTextPath = path.join(testDir, 'research-interests.txt');
  if (!fs.existsSync(testTextPath)) {
    fs.writeFileSync(testTextPath, `
Research Interests - Dr. Jane Chen

Overview:
My research focuses on machine learning and natural language processing, with a particular emphasis on large language models and their applications in scientific discovery.

Key Research Areas:
1. Large Language Models (LLMs)
   - Transformer architecture improvements
   - Efficient training methods
   - Model compression and optimization

2. Natural Language Understanding
   - Semantic representation learning
   - Cross-lingual transfer learning
   - Commonsense reasoning

3. AI for Science
   - Scientific document understanding
   - Knowledge graph construction
   - Automated hypothesis generation

Current Projects:
- "Efficient Fine-tuning of Large Language Models" - Developing parameter-efficient methods for adapting LLMs to scientific domains
- "Multi-modal Scientific AI" - Building systems that understand text, equations, and figures in scientific papers
- "Knowledge-Augmented Language Models" - Integrating structured knowledge into LLMs for improved reasoning

Student Requirements:
- Strong programming skills (Python, PyTorch)
- Background in machine learning and NLP
- Ability to read and implement research papers
- Interest in AI for scientific applications

Contact:
 jane.chen@university.edu
 https://janechen.university.edu
    `.trim());
    success(`Created test file: ${testTextPath}`);
  }

  // 创建测试Markdown文件
  const testMarkdownPath = path.join(testDir, 'project-description.md');
  if (!fs.existsSync(testMarkdownPath)) {
    fs.writeFileSync(testMarkdownPath, `
# Open Position: Research Assistant in LLM Efficiency

## About the Lab
We are a research group focused on making large language models more efficient and accessible. Our work spans from fundamental research to practical applications.

## Position Description
We are looking for motivated students to work on:

1. **Parameter-Efficient Fine-tuning**
   - LoRA, Adapter, and Prefix tuning methods
   - Multi-task learning scenarios
   - Domain adaptation for scientific text

2. **Model Compression**
   - Quantization techniques
   - Knowledge distillation
   - Pruning strategies

3. **Inference Optimization**
   - KV-cache optimization
   - Batch processing strategies
   - Memory-efficient attention

## Requirements
- Strong Python programming skills
- Experience with PyTorch or TensorFlow
- Coursework in machine learning/deep learning
- Ability to work independently

## Preferred Qualifications
- Experience with large language models
- Publications in ML conferences (NeurIPS, ICML, ACL, etc.)
- Strong mathematical background

## What You'll Gain
- Hands-on experience with cutting-edge AI research
- Mentorship for publishing in top conferences
- Access to compute resources
- Collaborative research environment

## How to Apply
Please prepare:
1. Your CV
2. Transcript
3. Brief description of your research experience
4. Why you're interested in this position

Contact: jane.chen@university.edu
    `.trim());
    success(`Created test file: ${testMarkdownPath}`);
  }

  return { testTextPath, testMarkdownPath };
}

/**
 * 测试1: 使用projectText构建Persona (baseline)
 */
async function testBuildWithProjectText(sessionCookie) {
  info('\n=== Test 1: Build Persona with projectText ===');

  try {
    const response = await fetch(`${API_BASE}/api/personas/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `skill-hub-session=${sessionCookie}`
      },
      body: JSON.stringify({
        name: 'Test Mentor',
        affiliation: 'Test University',
        authorizedBy: 'test@example.com',
        projectText: 'Research in machine learning and AI.'
      })
    });

    const data = await response.json();

    if (data.success) {
      success('Persona built successfully with projectText');
      info(`  - Slug: ${data.data.slug}`);
      info(`  - Persona ID: ${data.data.personaId}`);
      info(`  - Sources: ${data.data.sourceCount}`);
      info(`  - Chunks: ${data.data.chunkCount}`);
      return data.data.slug;
    } else {
      error('Failed to build persona');
      error(`  Error: ${JSON.stringify(data.error)}`);
      return null;
    }
  } catch (err) {
    error(`Request failed: ${err.message}`);
    return null;
  }
}

/**
 * 测试2: 使用multipart/form-data上传单个文件
 */
async function testUploadSingleFile(sessionCookie) {
  info('\n=== Test 2: Upload Single File (Multipart) ===');

  const { testTextPath } = await createTestFiles();

  try {
    const fileBuffer = fs.readFileSync(testTextPath);
    const formData = new FormData();

    formData.append('name', 'Test Mentor with File');
    formData.append('affiliation', 'Test University');
    formData.append('authorizedBy', 'test@example.com');
    formData.append('projectText', 'Additional context about research interests.');

    // 创建File对象（在Node.js中使用Buffer）
    const file = new Blob([fileBuffer], { type: 'text/plain' });
    formData.append('files', file, 'research-interests.txt');

    const response = await fetch(`${API_BASE}/api/personas/build`, {
      method: 'POST',
      headers: {
        'Cookie': `skill-hub-session=${sessionCookie}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      success('Persona built successfully with file upload');
      info(`  - Slug: ${data.data.slug}`);
      info(`  - Sources: ${data.data.sourceCount}`);
      info(`  - Upload sources: ${data.data.uploadSourceCount}`);
      return data.data.slug;
    } else {
      error('Failed to build persona with file');
      error(`  Error: ${JSON.stringify(data.error)}`);
      return null;
    }
  } catch (err) {
    error(`Request failed: ${err.message}`);
    return null;
  }
}

/**
 * 测试3: 上传多个文件
 */
async function testUploadMultipleFiles(sessionCookie) {
  info('\n=== Test 3: Upload Multiple Files ===');

  const { testTextPath, testMarkdownPath } = await createTestFiles();

  try {
    const formData = new FormData();

    formData.append('name', 'Test Mentor with Multiple Files');
    formData.append('affiliation', 'Test University');
    formData.append('authorizedBy', 'test@example.com');

    // 上传多个文件
    const textBuffer = fs.readFileSync(testTextPath);
    const textFile = new Blob([textBuffer], { type: 'text/plain' });
    formData.append('files', textFile, 'research-interests.txt');

    const mdBuffer = fs.readFileSync(testMarkdownPath);
    const mdFile = new Blob([mdBuffer], { type: 'text/markdown' });
    formData.append('files', mdFile, 'project-description.md');

    const response = await fetch(`${API_BASE}/api/personas/build`, {
      method: 'POST',
      headers: {
        'Cookie': `skill-hub-session=${sessionCookie}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      success('Persona built successfully with multiple files');
      info(`  - Slug: ${data.data.slug}`);
      info(`  - Total sources: ${data.data.sourceCount}`);
      info(`  - Upload sources: ${data.data.uploadSourceCount}`);
      return data.data.slug;
    } else {
      error('Failed to build persona with multiple files');
      error(`  Error: ${JSON.stringify(data.error)}`);
      return null;
    }
  } catch (err) {
    error(`Request failed: ${err.message}`);
    return null;
  }
}

/**
 * 测试4: 获取Persona详情（验证文件内容已解析）
 */
async function testGetPersonaDetails(slug, sessionCookie) {
  info('\n=== Test 4: Get Persona Details ===');

  try {
    const response = await fetch(`${API_BASE}/api/personas/${slug}`, {
      headers: {
        'Cookie': `skill-hub-session=${sessionCookie}`
      }
    });

    const data = await response.json();

    if (data.success) {
      success('Retrieved persona details');
      info(`  - Persona version: ${data.data.persona.version}`);
      info(`  - Research topics: ${data.data.persona.researchTopics?.length || 0}`);
      info(`  - Methods: ${data.data.persona.methods?.length || 0}`);

      // 显示sources
      if (data.data.sources && data.data.sources.length > 0) {
        info(`  - Sources (${data.data.sources.length}):`);
        data.data.sources.forEach((source, i) => {
          info(`    ${i + 1}. ${source.title} (${source.kind})`);
          info(`       Content length: ${source.content?.length || 0} chars`);
        });
      }

      return true;
    } else {
      error('Failed to get persona details');
      return false;
    }
  } catch (err) {
    error(`Request failed: ${err.message}`);
    return false;
  }
}

/**
 * 测试5: 验证文件大小限制
 */
async function testFileSizeLimit(sessionCookie) {
  info('\n=== Test 5: File Size Limit Validation ===');

  try {
    const formData = new FormData();

    formData.append('name', 'Test Mentor');
    formData.append('affiliation', 'Test University');
    formData.append('authorizedBy', 'test@example.com');

    // 创建一个超过限制的大文件 (11MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');
    const largeFile = new Blob([largeBuffer], { type: 'text/plain' });
    formData.append('files', largeFile, 'large-file.txt');

    const response = await fetch(`${API_BASE}/api/personas/build`, {
      method: 'POST',
      headers: {
        'Cookie': `skill-hub-session=${sessionCookie}`
      },
      body: formData
    });

    const data = await response.json();

    if (!data.success && data.error?.code === 'INVALID_UPLOAD') {
      success('File size limit validation works correctly');
      info(`  - Error: ${data.error.message}`);
      return true;
    } else {
      error('File size limit validation failed');
      return false;
    }
  } catch (err) {
    error(`Request failed: ${err.message}`);
    return false;
  }
}

/**
 * 主测试流程
 */
async function main() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║  File Upload Functionality Test Suite          ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');

  // 检查API是否运行
  info('\nChecking API availability...');
  try {
    await fetch(`${API_BASE}/api/skills`);
    success('API is running');
  } catch {
    error('API is not accessible. Please start the development server first.');
    info('Run: cd backend && npm run dev');
    process.exit(1);
  }

  // 获取session cookie（简化版，实际应该先登录）
  info('\nNote: This test requires a valid mentor session.');
  info('Please ensure you are logged in as a mentor.');

  const sessionCookie = process.env.SESSION_COOKIE || 'your-session-cookie-here';

  if (sessionCookie === 'your-session-cookie-here') {
    error('No session cookie provided.');
    info('Set SESSION_COOKIE environment variable:');
    info('  export SESSION_COOKIE="your-cookie-value"');
    info('\nOr login first and extract the cookie from browser dev tools.');
    process.exit(1);
  }

  // 运行测试
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  };

  try {
    const slug1 = await testBuildWithProjectText(sessionCookie);
    results.test1 = !!slug1;

    const slug2 = await testUploadSingleFile(sessionCookie);
    results.test2 = !!slug2;

    if (slug2) {
      results.test4 = await testGetPersonaDetails(slug2, sessionCookie);
    }

    const slug3 = await testUploadMultipleFiles(sessionCookie);
    results.test3 = !!slug3;

    results.test5 = await testFileSizeLimit(sessionCookie);

  } catch (err) {
    error(`Test execution failed: ${err.message}`);
  }

  // 总结
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║  Test Results Summary                          ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  log(`\nTotal: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');

  Object.entries(results).forEach(([test, passed]) => {
    const testName = test.replace('test', 'Test ');
    log(`${passed ? '✓' : '✗'} ${testName}`, passed ? 'green' : 'red');
  });

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

// 运行测试
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
