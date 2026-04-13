#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import PrismaClient from backend node_modules
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
import * as fs from 'fs';
import * as path from 'path';

// Set DATABASE_URL explicitly to point to the backend database
process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'backend', 'dev.db')}`;

const prisma = new PrismaClient();

async function preMigrationCheck() {
  console.log('🔍 Running pre-migration validation checks...\n');

  // Check 1: Verify email uniqueness (should all be unique currently)
  console.log('Check 1: Verifying email uniqueness...');
  const duplicateEmails = await prisma.$queryRaw`
    SELECT email, COUNT(*) as count FROM User GROUP BY email HAVING count > 1
  ` as any[];

  if (duplicateEmails.length > 0) {
    console.error('❌ Found duplicate emails:');
    duplicateEmails.forEach((row: any) => {
      console.error(`  - ${row.email}: ${row.count} records`);
    });
    console.error('\n⚠️  Migration cannot proceed safely. Please resolve duplicate emails first.');
    process.exit(1);
  }
  console.log('✅ All emails are unique\n');

  // Check 2: Count total users
  console.log('Check 2: Counting existing users...');
  const userCount = await prisma.user.count();
  console.log(`✅ Found ${userCount} existing users\n`);

  // Check 3: Verify database file exists and is accessible
  console.log('Check 3: Verifying database access...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database is accessible\n');
  } catch (error) {
    console.error('❌ Database access failed:', error);
    process.exit(1);
  }

  // Check 4: Create backup
  console.log('Check 4: Creating database backup...');
  const dbPath = path.join(process.cwd(), 'backend', 'dev.db');
  const backupPath = `backend/dev.db.backup-${Date.now()}`;

  try {
    if (!fs.existsSync(dbPath)) {
      console.error(`❌ Database file not found at: ${dbPath}`);
      process.exit(1);
    }

    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);
  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    process.exit(1);
  }

  console.log('✅ All pre-migration checks passed!');
  console.log('📝 Summary:');
  console.log(`  - Users to migrate: ${userCount}`);
  console.log(`  - Backup: ${backupPath}`);
  console.log('\n🚀 Safe to proceed with migration.');
}

preMigrationCheck()
  .catch((error) => {
    console.error('Fatal error during pre-migration check:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
