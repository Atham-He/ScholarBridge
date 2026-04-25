#!/usr/bin/env node

/**
 * ScholarBridge 统一启动脚本
 * 从根目录加载环境变量并启动所有服务
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// 加载根目录的 .env 文件
const envPath = resolve(__dirname, '..', '.env');
const { error, parsed } = config({ path: envPath });

if (error) {
  console.warn('Warning: .env file not found, using default values');
}

// 获取环境变量或使用默认值
const backendPort = parsed?.BACKEND_PORT || process.env.BACKEND_PORT || '3001';
const supervisorPort = parsed?.SUPERVISOR_PORT || process.env.SUPERVISOR_PORT || '3002';

console.log('🚀 Starting ScholarBridge with unified configuration...');
console.log(`📁 Config file: ${envPath}`);
console.log(`🔧 Backend port: ${backendPort}`);
console.log(`🔧 Supervisor port: ${supervisorPort}`);
console.log('');

// 准备环境变量
const env = {
  ...process.env,
  ...parsed,
  PORT: supervisorPort, // supervisor_born 使用 PORT 环境变量
};

// 启动的服务列表
const services = [
  {
    name: 'Backend',
    cwd: join(__dirname, '..', 'backend'),
    command: 'npm',
    args: ['run', 'dev'],
    env: { ...env, PORT: backendPort },
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'Supervisor Born',
    cwd: join(__dirname, '..', 'supervisor_born'),
    command: 'npm',
    args: ['run', 'dev'],
    env: { ...env, PORT: supervisorPort },
    color: '\x1b[35m', // Magenta
  },
];

// 启动所有服务
const processes = services.map(service => {
  console.log(`${service.color}Starting ${service.name}...\x1b[0m`);

  const proc = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: service.env,
    stdio: 'inherit',
    shell: true,
  });

  proc.on('error', (err) => {
    console.error(`${service.color}Error starting ${service.name}:\x1b[0m`, err);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${service.color}${service.name} exited with code ${code}\x1b[0m`);
    }
  });

  return proc;
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping all services...');
  processes.forEach(proc => proc.kill());
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Stopping all services...');
  processes.forEach(proc => proc.kill());
  process.exit(0);
});

console.log('\x1b[32m✅ All services started!\x1b[0m');
console.log('\n📊 Services:');
console.log(`  • Backend: \x1b[36mhttp://localhost:${backendPort}\x1b[0m`);
console.log(`  • Supervisor Born: \x1b[35mhttp://localhost:${supervisorPort}\x1b[0m`);
console.log('\n按 Ctrl+C 停止所有服务\n');

// 保持进程运行
process.stdin.resume();