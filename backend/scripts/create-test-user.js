#!/usr/bin/env node

/**
 * 创建测试用户脚本
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 创建测试用户...');

  const mentorEmail = 'test@mentor.com';
  const studentEmail = 'test@student.com';
  const password = await bcrypt.hash('test123', 10);

  // 创建导师用户
  const mentor = await prisma.user.upsert({
    where: { email: mentorEmail },
    update: {},
    create: {
      email: mentorEmail,
      passwordHash: password,
      role: 'MENTOR',
      mentorProfile: {
        create: {
          displayName: '测试导师',
          institution: '测试大学',
          department: '计算机科学',
          title: '教授',
          bioShort: '这是测试导师账号',
          location: '北京',
        },
      },
    },
  });

  console.log('✅ 创建导师用户:', mentor.email);

  // 创建学生用户
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      passwordHash: password,
      role: 'STUDENT',
      studentProfile: {
        create: {
          displayName: '测试学生',
          backgroundBrief: '这是测试学生账号',
        },
      },
    },
  });

  console.log('✅ 创建学生用户:', student.email);

  console.log('\n🎉 测试账号创建完成！');
  console.log('📋 登录信息:');
  console.log('  导师: test@mentor.com / test123');
  console.log('  学生: test@student.com / test123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());