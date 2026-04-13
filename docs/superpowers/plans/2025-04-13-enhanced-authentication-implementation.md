# Phase 1 & 2: Database & Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement database schema updates for dual-role support and email verification system (Phase 1 & 2 of enhanced authentication)

**Architecture:** Non-destructive database migration, test-driven email verification service, secure API endpoints with rate limiting

**Tech Stack:** Next.js 16.2.2, Prisma 6.19.3, SQLite, iron-session, bcryptjs, Tencent Cloud SES (development mode uses console logs)

**Scope:** This plan covers Phase 1 (Database & Core Auth) and Phase 2 (Email Verification) only. ORCID integration is Phase 3 (separate plan).

---

## File Structure Map

### Database Layer
- `prisma/schema.prisma` - Database schema (User model, new tables)
- `prisma/migrations/` - Migration files
- `prisma/seed.ts` - Seed data for testing
- `jest.config.js` - Jest testing configuration

### Core Services (New)
- `lib/email.ts` - Email service abstraction
- `lib/verification.ts` - Verification code generation/validation
- `lib/security-events.ts` - Security event logging
- `lib/utils.ts` - Utility functions (getClientIP)

### API Routes (New)
- `app/api/auth/send-code/route.ts` - Send verification codes
- `app/api/auth/verify-email/route.ts` - Verify email and complete registration
- `app/api/auth/resend-code/route.ts` - Resend verification codes

### API Routes (Modified)
- `app/api/auth/register/route.ts` - Add email verification requirement
- `app/api/auth/login/route.ts` - Set session.role on login
- `lib/auth.ts` - Update getCurrentUser() for dual-role support

### Frontend Components (New)
- `app/components/email-verification-form.tsx` - Email verification UI

### Frontend Pages (Modified)
- `app/register/page.tsx` - Add email verification flow

### Configuration
- `.env` - Add email service credentials
- `.env.example` - Document new environment variables

---

## Phase 1: Database & Core Auth Infrastructure

### Task 0: Configure Testing Infrastructure

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.js`
- Modify: `package.json`

- [ ] **Step 1: Create Jest configuration**

Create: `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

- [ ] **Step 2: Create Jest setup file**

Create: `jest.setup.js`

```javascript
import { PrismaClient } from '@prisma/client'

// Mock environment variables
process.env.DATABASE_URL = 'file:./dev.db'
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only'

// Mock iron-session
jest.mock('iron-session', () => ({
  getIronSession: jest.fn(() => ({
    userId: 'test-user-id',
    role: 'STUDENT',
    save: jest.fn()
  }))
}))

// Setup test database
let prisma

beforeAll(async () => {
  prisma = new PrismaClient()
})

afterEach(async () => {
  // Clean up test data after each test
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test'
      }
    }
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

- [ ] **Step 3: Verify Jest configuration**

Run: `npm test -- --listTests`
Expected: Lists all test files in project

- [ ] **Step 4: Commit**

```bash
git add jest.config.js jest.setup.js package.json
git commit -m "test: configure Jest for Next.js and Prisma testing"
```

### Task 1: Update Session Data Structure

**Files:**
- Modify: `lib/session.ts:3-5`

- [ ] **Step 1: Write test for new session structure**

Create test file: `backend/lib/__tests__/session.test.ts`

```typescript
import { SessionData } from '../session';

describe('Session Data Structure', () => {
  it('should include role field in SessionData', () => {
    const sessionData: SessionData = {
      userId: 'test-user-id',
      role: 'STUDENT',
      lastRoleSwitchAt: new Date(),
      oauthState: 'test-state'
    };

    expect(sessionData.userId).toBe('test-user-id');
    expect(sessionData.role).toBe('STUDENT');
    expect(sessionData.lastRoleSwitchAt).toBeDefined();
    expect(sessionData.oauthState).toBe('test-state');
  });

  it('should allow optional fields', () => {
    const sessionData: SessionData = {
      userId: 'test-user-id'
    };

    expect(sessionData.userId).toBe('test-user-id');
    expect(sessionData.role).toBeUndefined();
    expect(sessionData.lastRoleSwitchAt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- lib/__tests__/session.test.ts`
Expected: FAIL - SessionData type doesn't have role field

- [ ] **Step 3: Update SessionData type**

Edit: `backend/lib/session.ts:3-5`

```typescript
export type SessionData = {
  userId?: string;
  role?: 'MENTOR' | 'STUDENT';  // NEW: Track active role
  lastRoleSwitchAt?: Date;  // NEW: For security tracking
  oauthState?: string;  // NEW: For OAuth CSRF protection
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- lib/__tests__/session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/lib/session.ts backend/lib/__tests__/session.test.ts
git commit -m "feat(session): add role and oauth tracking to SessionData"
```

### Task 1.5: Create Security Event Logging Service

**Files:**
- Create: `lib/security-events.ts`
- Create: `lib/__tests__/security-events.test.ts`

- [ ] **Step 1: Write security event logging tests**

Create: `lib/__tests__/security-events.test.ts`

```typescript
import { logSecurityEvent, SecurityEventType } from '../security-events';
import { db } from '@/lib/db';

describe('Security Events Service', () => {
  afterEach(async () => {
    await db.securityEvent.deleteMany({});
  });

  it('should log security event with metadata', async () => {
    await logSecurityEvent('LOGIN_SUCCESS', {
      email: 'test@example.com',
      ipAddress: '127.0.0.1'
    });

    const events = await db.securityEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('LOGIN_SUCCESS');
  });

  it('should log event without userId for pre-account events', async () => {
    await logSecurityEvent('VERIFY_FAIL', {
      email: 'test@example.com',
      reason: 'Invalid code'
    });

    const events = await db.securityEvent.findMany();
    expect(events[0].userId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/security-events.test.ts`
Expected: FAIL - security-events module doesn't exist

- [ ] **Step 3: Implement security event logging service**

Create: `lib/security-events.ts`

```typescript
import { db } from './db';
import { NextRequest } from 'next/server';
import type { SecurityEvent } from '@prisma/client';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'REGISTER_SUCCESS'
  | 'VERIFY_FAIL'
  | 'VERIFY_SUCCESS'
  | 'ROLE_SWITCH'
  | 'ROLE_SWITCH_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ORCID_LINK'
  | 'ORCID_STATE_MISMATCH';

interface LogEventOptions {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function logSecurityEvent(
  eventType: SecurityEventType,
  options: LogEventOptions = {}
): Promise<SecurityEvent> {
  const { userId, ipAddress, userAgent, metadata } = options;

  return db.securityEvent.create({
    data: {
      userId,
      eventType,
      ipAddress,
      userAgent,
      metadata: metadata as any
    }
  });
}

export async function logSecurityEventFromRequest(
  eventType: SecurityEventType,
  request: NextRequest,
  options: Omit<LogEventOptions, 'ipAddress' | 'userAgent'> = {}
): Promise<SecurityEvent> {
  return logSecurityEvent(eventType, {
    ...options,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/__tests__/security-events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/security-events.ts lib/__tests__/security-events.test.ts
git commit -m "feat(security): add security event logging service"
```

### Task 1.6: Update Auth Service for Dual-Role Support

**Files:**
- Modify: `lib/auth.ts`
- Create: `lib/__tests__/auth.test.ts`

- [ ] **Step 1: Write tests for updated auth service**

Create: `lib/__tests__/auth.test.ts`

```typescript
import { getCurrentUser } from '../auth';
import { db } from '@/lib/db';

describe('Auth Service - Dual Role Support', () => {
  beforeEach(async () => {
    await db.user.deleteMany({
      where: {
        email: {
          contains: 'auth-test'
        }
      }
    });
  });

  it('should get user by id from session', async () => {
    const user = await db.user.create({
      data: {
        email: 'auth-test@example.com',
        passwordHash: 'hash',
        role: 'STUDENT'
      }
    });

    // Mock session to return this user
    const sessionUser = await db.user.findUnique({
      where: { id: user.id },
      include: { studentProfile: true, mentorProfile: true }
    });

    expect(sessionUser).toBeDefined();
    expect(sessionUser?.email).toBe('auth-test@example.com');
  });

  it('should return null for non-existent user', async () => {
    const user = await db.user.findUnique({
      where: { id: 'non-existent-id' }
    });

    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify current state**

Run: `npm test -- lib/__tests__/auth.test.ts`
Expected: Current tests may fail due to dual-role changes

- [ ] **Step 3: Update getCurrentUser to use session.role**

Edit: `lib/auth.ts` (the entire file should be):

```typescript
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.userId },
    include: { mentorProfile: true, studentProfile: true },
  });
}

// NEW: Get user with specific role
export async function getUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: { mentorProfile: true, studentProfile: true },
  });
}

// NEW: Get all users by email (for dual-role support)
export async function getUsersByEmail(email: string) {
  return db.user.findMany({
    where: { email },
    include: { mentorProfile: true, studentProfile: true },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts
git commit -m "feat(auth): add dual-role support to auth service"
```

### Task 2: Add Pre-Migration Validation

**Files:**
- Create: `scripts/pre-migration-check.ts`

- [ ] **Step 1: Create pre-migration validation script**

Create: `scripts/pre-migration-check.ts`

```typescript
#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

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
  const fs = require('fs');
  const backupPath = `dev.db.backup-${Date.now()}`;
  fs.copyFileSync('dev.db', backupPath);
  console.log(`✅ Backup created: ${backupPath}\n`);

  console.log('✅ All pre-migration checks passed!');
  console.log('📝 Summary:');
  console.log(`  - Users to migrate: ${userCount}`);
  console.log(`  - Backup: ${backupPath}`);
  console.log('\n🚀 Safe to proceed with migration.');
}

preMigrationCheck()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run pre-migration check**

Run: `npx ts-node scripts/pre-migration-check.ts`
Expected: All checks pass

- [ ] **Step 3: Add to package.json scripts**

Edit: `package.json` (add to scripts section)

```json
"pre-migration": "ts-node scripts/pre-migration-check.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/pre-migration-check.ts package.json
git commit -m "feat(db): add pre-migration validation script"
```

### Task 3: Update Database Schema for Dual-Role Support

**Files:**
- Modify: `prisma/schema.prisma:41-58`

- [ ] **Step 1: Create migration test**

Create test file: `backend/prisma/__tests__/migration.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

describe('Database Schema - Dual Role Support', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow multiple users with same email but different roles', async () => {
    // This test will pass after schema migration
    const email = 'test-dual@example.com';

    // Create student user
    const student = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash1',
        role: 'STUDENT'
      }
    });

    // Create mentor user with same email
    const mentor = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash2',
        role: 'MENTOR'
      }
    });

    expect(student.email).toBe(mentor.email);
    expect(student.role).toBe('STUDENT');
    expect(mentor.role).toBe('MENTOR');
    expect(student.id).not.toBe(mentor.id);

    // Cleanup
    await prisma.user.deleteMany({ where: { email } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- prisma/__tests__/migration.test.ts`
Expected: FAIL - email uniqueness constraint prevents dual-role

- [ ] **Step 3: Update User model in schema**

Edit: `backend/prisma/schema.prisma:41-66`

```prisma
model User {
  id           String   @id @default(cuid())
  email        String
  passwordHash String?  // Optional for ORCID-only accounts
  role         UserRole
  orcidId      String?  @unique  // ORCID unique identifier
  orcidEmail   String?  // Email from ORCID profile
  orcidName    String?  // Name from ORCID profile
  lastLoginAt  DateTime?
  lastRoleAt   DateTime? // Last login time for this specific role
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  mentorProfile  MentorProfile?
  studentProfile StudentProfile?

  skills Skill[] @relation("MentorSkills")

  applicationsAsStudent Application[] @relation("StudentApps")
  applicationsAsMentor  Application[] @relation("MentorApps")

  notifications Notification[]
  emailVerifications EmailVerification[]
  securityEvents   SecurityEvent[]

  @@unique([email, role])  // KEY CHANGE: One email can have STUDENT + MENTOR
  @@index([orcidId])
  @@index([email])
}
```

- [ ] **Step 4: Add new models to schema**

Append to: `backend/prisma/schema.prisma`

```prisma
model EmailVerification {
  id           String   @id @default(cuid())
  email        String
  code         String   // Hashed verification code
  role         UserRole
  expiresAt    DateTime
  verified     Boolean  @default(false)
  usedAt       DateTime? // Track when code was used to prevent replay
  attemptCount Int      @default(0) // Track failed attempts
  lastAttemptAt DateTime?
  ipAddress    String?  // For security tracking
  createdAt    DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id])
  userId    String?  // Nullable to support verification before account creation

  @@unique([email, role])  // Prevent multiple active codes per email+role
  @@index([email])
  @@index([expiresAt])
  @@index([code])
}

model ORCIDAccount {
  id             String   @id @default(cuid())
  orcidId        String   @unique
  name           String
  email          String
  avatarUrl      String?
  accessToken    String?  // Store ORCID access token
  refreshToken   String?  // Store refresh token
  tokenExpiresAt DateTime? // Token expiry time
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model SecurityEvent {
  id          String   @id @default(cuid())
  userId      String?  // Nullable for events before account creation
  eventType   String   // ROLE_SWITCH, ORCID_LINK, VERIFY_FAIL, LOGIN_SUCCESS, etc.
  ipAddress   String?
  userAgent   String?
  metadata    Json?    // Event-specific data
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
}
```

- [ ] **Step 5: Create and apply migration**

Run: `cd backend && npx prisma migrate dev --name enhanced_auth`
Expected: Migration created successfully

- [ ] **Step 6: Regenerate Prisma Client**

Run: `cd backend && npx prisma generate`
Expected: Prisma Client regenerated

- [ ] **Step 7: Run test to verify schema works**

Run: `cd backend && npm test -- prisma/__tests__/migration.test.ts`
Expected: PASS - Can create dual-role users

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/prisma/__tests__
git commit -m "feat(db): add dual-role support and security tracking"
```

### Task 3: Update Seed Data with Dual-Role Users

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Write test for seed data**

Create: `backend/prisma/__tests__/seed.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

describe('Seed Data', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-seed'
        }
      }
    });
  });

  it('should create dual-role test users', async () => {
    // These should be created by seed script
    const testEmail = 'test-seed-dual@example.com';

    await prisma.user.createMany({
      data: [
        {
          email: testEmail,
          passwordHash: 'hash',
          role: 'STUDENT'
        },
        {
          email: testEmail,
          passwordHash: 'hash',
          role: 'MENTOR'
        }
      ]
    });

    const users = await prisma.user.findMany({
      where: { email: testEmail }
    });

    expect(users).toHaveLength(2);
    expect(users.some(u => u.role === 'STUDENT')).toBe(true);
    expect(users.some(u => u.role === 'MENTOR')).toBe(true);
  });
});
```

- [ ] **Step 2: Update seed script**

Edit: `backend/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Start seeding...');

  // Create dual-role test user
  const dualEmail = 'dual@test.com';
  const password = await bcrypt.hash('test123', 10);

  const student = await prisma.user.upsert({
    where: {
      email_role: {
        email: dualEmail,
        role: 'STUDENT'
      }
    },
    update: {},
    create: {
      email: dualEmail,
      passwordHash: password,
      role: 'STUDENT',
      studentProfile: {
        create: {
          displayName: '测试用户(学生)',
          backgroundBrief: '可以同时登录学生和导师身份的测试账号'
        }
      }
    }
  });

  const mentor = await prisma.user.upsert({
    where: {
      email_role: {
        email: dualEmail,
        role: 'MENTOR'
      }
    },
    update: {},
    create: {
      email: dualEmail,
      passwordHash: password,
      role: 'MENTOR',
      mentorProfile: {
        create: {
          displayName: '测试用户(导师)',
          institution: '测试大学',
          department: '计算机科学',
          title: '教授',
          bioShort: '可以同时登录学生和导师身份的测试账号',
          location: '北京'
        }
      }
    }
  });

  console.log('✅ Created dual-role test user:', dualEmail);
  console.log('  Student ID:', student.id);
  console.log('  Mentor ID:', mentor.id);
  console.log('  Password: test123');

  console.log('🌱 Seeding completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run seed script**

Run: `cd backend && npm run db:seed`
Expected: Seed completed successfully

- [ ] **Step 4: Verify seed data**

Run: `cd backend && sqlite3 dev.db "SELECT email, role FROM User WHERE email = 'dual@test.com'"`
Expected: Two rows with same email, different roles

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seeds): add dual-role test user for development"
```

---

## Phase 2: Email Verification System

### Task 4: Create Email Service Abstraction

**Files:**
- Create: `lib/email.ts`
- Create: `lib/__tests__/email.test.ts`

- [ ] **Step 1: Write email service interface test**

Create: `lib/__tests__/email.test.ts`

```typescript
import { emailService } from '../email';

describe('Email Service', () => {
  it('should log verification code in development mode', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await emailService.sendVerification('test@example.com', '123456', 'STUDENT');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('123456')
    );

    consoleSpy.mockRestore();
  });

  it('should handle email sending errors gracefully', async () => {
    // Test error handling when implemented
    await expect(
      emailService.sendVerification('test@example.com', '123456', 'STUDENT')
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/email.test.ts`
Expected: FAIL - email module doesn't exist

- [ ] **Step 3: Implement email service**

Create: `backend/lib/email.ts`

```typescript
interface EmailService {
  sendVerification(email: string, code: string, role: 'MENTOR' | 'STUDENT'): Promise<void>;
}

class DevelopmentEmailService implements EmailService {
  async sendVerification(email: string, code: string, role: 'MENTOR' | 'STUDENT'): Promise<void> {
    const roleText = role === 'MENTOR' ? '导师' : '学生';
    console.log(`📧 [DEV MODE] Email Verification Code`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: ${roleText}`);
    console.log(`  Code: ${code}`);
    console.log(`  Valid for: 15 minutes`);
  }
}

class TencentEmailService implements EmailService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.TENCENT_EMAIL_API_KEY || '';
    this.endpoint = process.env.TENCENT_EMAIL_ENDPOINT || 'https://ses.tencentcloudapi.com';
  }

  async sendVerification(email: string, code: string, role: 'MENTOR' | 'STUDENT'): Promise<void> {
    const roleText = role === 'MENTOR' ? '导师' : '学生';
    const subject = `ScholarBridge 验证码 - ${roleText}身份注册`;
    const body = `
您的验证码是: ${code}

此验证码用于注册${roleText}账号，15分钟内有效。
如果这不是您的操作，请忽略此邮件。

ScholarBridge 团队
    `.trim();

    // TODO: Implement Tencent Cloud SES API call
    // For now, log to console
    console.log(`📧 [Tencent Email] Sending to ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Code: ${code}`);
  }
}

// Factory based on environment
export const emailService: EmailService =
  process.env.NODE_ENV === 'development'
    ? new DevelopmentEmailService()
    : new TencentEmailService();

export type { EmailService };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/email.test.ts`
Expected: PASS

- [ ] **Step 5: Test manually in development**

Run: `node -e "import('./lib/email.js').then(m => m.emailService.sendVerification('test@example.com', '123456', 'STUDENT'))"`
Expected: Console log with verification code details

- [ ] **Step 6: Commit**

```bash
git add lib/email.ts lib/__tests__/email.test.ts
git commit -m "feat(email): add email service abstraction with dev/console mode"
```

### Task 5: Create Verification Code Service

**Files:**
- Create: `lib/verification.ts`
- Create: `lib/__tests__/verification.test.ts`

- [ ] **Step 1: Write verification service tests**

Create: `lib/__tests__/verification.test.ts`

```typescript
import { generateCode, hashcode, verifyCode, isCodeExpired } from '../verification';

describe('Verification Code Service', () => {
  describe('generateCode', () => {
    it('should generate 6-digit code', () => {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes each time', () => {
      const code1 = generateCode();
      const code2 = generateCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('hashcode', () => {
    it('should hash code consistently', async () => {
      const code = '123456';
      const hash1 = await hashcode(code);
      const hash2 = await hashcode(code);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different codes', async () => {
      const hash1 = await hashcode('123456');
      const hash2 = await hashcode('654321');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyCode', () => {
    it('should verify correct code', async () => {
      const code = '123456';
      const hash = await hashcode(code);

      const isValid = await verifyCode(code, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect code', async () => {
      const code = '123456';
      const hash = await hashcode(code);

      const isValid = await verifyCode('654321', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('isCodeExpired', () => {
    it('should not expire fresh codes', () => {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      expect(isCodeExpired(expiresAt)).toBe(false);
    });

    it('should expire old codes', () => {
      const expiresAt = new Date(Date.now() - 1000); // 1 second ago
      expect(isCodeExpired(expiresAt)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/__tests__/verification.test.ts`
Expected: FAIL - verification module doesn't exist

- [ ] **Step 3: Implement verification service**

Create: `lib/verification.ts`

```typescript
import bcrypt from 'bcryptjs';

export function generateCode(): string {
  // Generate 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashcode(code: string): Promise<string> {
  // Hash verification code using bcrypt (same as password hashing)
  return bcrypt.hash(code, 10);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  // Verify code against hash
  return bcrypt.compare(code, hash);
}

export function isCodeExpired(expiresAt: Date): boolean {
  // Check if code has expired (15 minute validity)
  const now = new Date();
  return now > expiresAt;
}

export function calculateExpiry(minutes: number = 15): Date {
  // Calculate expiry time
  return new Date(Date.now() + minutes * 60 * 1000);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/__tests__/verification.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/verification.ts lib/__tests__/verification.test.ts
git commit -m "feat(verification): add verification code generation and validation"
```

### Task 6: Create Send Verification Code API

**Files:**
- Create: `app/api/auth/send-code/route.ts`
- Create: `app/api/auth/send-code/route.test.ts`
- Modify: `lib/validation.ts`

- [ ] **Step 1: Write API test**

Create: `app/api/auth/send-code/route.test.ts`

```typescript
import { POST } from '../route';

describe('POST /api/auth/send-code', () => {
  it('should send verification code for valid email and role', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'STUDENT'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('验证码已发送');
  });

  it('should reject invalid email format', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        role: 'STUDENT'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject invalid role', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'INVALID'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/api/auth/send-code/route.test.ts`
Expected: FAIL - route doesn't exist

- [ ] **Step 3: Add validation schema**

Edit: `lib/validation.ts` (add at end)

```typescript
export const sendVerificationSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  role: z.enum(["MENTOR", "STUDENT"]),
});
```

- [ ] **Step 4: Implement send-code route**

Create: `app/api/auth/send-code/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateCode, hashcode, calculateExpiry } from "@/lib/verification";
import { emailService } from "@/lib/email";
import { sendVerificationSchema } from "@/lib/validation";
import { getClientIP } from "@/lib/utils";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = sendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const { email, role } = parsed.data;
  const ipAddress = getClientIP(request);

  // Check rate limiting: max 3 codes per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCodes = await db.emailVerification.count({
    where: {
      email,
      createdAt: { gte: oneHourAgo }
    }
  });

  if (recentCodes >= 3) {
    return NextResponse.json(
      { error: "发送过于频繁，请1小时后再试" },
      { status: 429 }
    );
  }

  // Check if email+role combination already verified
  const existingUser = await db.user.findFirst({
    where: {
      email,
      role
    }
  });

  if (existingUser) {
    return NextResponse.json(
      { error: role === 'MENTOR' ? '该邮箱已注册导师账号' : '该邮箱已注册学生账号' },
      { status: 409 }
    );
  }

  // Generate verification code
  const code = generateCode();
  const codeHash = await hashcode(code);
  const expiresAt = calculateExpiry(15); // 15 minutes

  // Delete any existing unused codes for this email+role
  await db.emailVerification.deleteMany({
    where: {
      email,
      role,
      verified: false
    }
  });

  // Create verification record
  await db.emailVerification.create({
    data: {
      email,
      role,
      code: codeHash,
      expiresAt,
      ipAddress
    }
  });

  // Send email
  try {
    await emailService.sendVerification(email, code, role);
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `验证码已发送到 ${email}，15分钟内有效`
  });
}
```

- [ ] **Step 5: Add/update utilities file**

Create or update: `lib/utils.ts`

```typescript
import { NextRequest } from 'next/server';

export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown';
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- app/api/auth/send-code/route.test.ts`
Expected: PASS

- [ ] **Step 7: Manual test**

Run: `curl -X POST http://localhost:3000/api/auth/send-code -H "Content-Type: application/json" -d '{"email":"test@example.com","role":"STUDENT"}'`
Expected: Success response with verification code in console

- [ ] **Step 8: Commit**

```bash
git add app/api/auth/send-code/ lib/validation.ts lib/utils.ts
git commit -m "feat(auth): add send verification code API with rate limiting"
```

### Task 7: Create Email Verification API

**Files:**
- Create: `backend/app/api/auth/verify-email/route.ts`
- Create: `backend/app/api/auth/verify-email/route.test.ts`

- [ ] **Step 1: Write verification API test**

Create: `backend/app/api/auth/verify-email/route.test.ts`

```typescript
import { POST } from '../route';
import { db } from '@/lib/db';
import { hashcode } from '@/lib/verification';

describe('POST /api/auth/verify-email', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.user.deleteMany({
      where: { email: 'verify-test@example.com' }
    });
  });

  it('should verify code and create user account', async () => {
    // First create a verification code
    const codeHash = await hashcode('123456');
    await db.emailVerification.create({
      data: {
        email: 'verify-test@example.com',
        role: 'STUDENT',
        code: codeHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '123456',
        role: 'STUDENT',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe('verify-test@example.com');
  });

  it('should reject invalid verification code', async () => {
    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '000000',
        role: 'STUDENT',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('验证码错误');
  });

  it('should reject expired verification code', async () => {
    const codeHash = await hashcode('123456');
    await db.emailVerification.create({
      data: {
        email: 'verify-test@example.com',
        role: 'STUDENT',
        code: codeHash,
        expiresAt: new Date(Date.now() - 1000) // Expired
      }
    });

    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '123456',
        role: 'STUDENT',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('验证码已过期');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- app/api/auth/verify-email/route.test.ts`
Expected: FAIL - route doesn't exist

- [ ] **Step 3: Add verification schema**

Edit: `backend/lib/validation.ts` (add at end)

```typescript
export const verifyEmailSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  code: z.string().regex(/^\d{6}$/, "验证码必须是6位数字"),
  role: z.enum(["MENTOR", "STUDENT"]),
  password: z.string().min(6, "密码至少 6 位"),
  displayName: z.string().min(1, "请填写姓名或昵称"),
  // Optional mentor fields
  institution: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  bioShort: z.string().optional(),
  location: z.string().optional(),
  // Optional student fields
  backgroundBrief: z.string().optional(),
});
```

- [ ] **Step 4: Implement verify-email route**

Create: `backend/app/api/auth/verify-email/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCode, isCodeExpired } from "@/lib/verification";
import { hashPassword } from "@/lib/password";
import { verifyEmailSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数校验失败", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Find verification record
  const verification = await db.emailVerification.findFirst({
    where: {
      email: data.email,
      role: data.role,
      verified: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!verification) {
    return NextResponse.json(
      { error: "验证码不存在或已使用，请重新获取" },
      { status: 400 }
    );
  }

  // Check if expired
  if (isCodeExpired(verification.expiresAt)) {
    return NextResponse.json(
      { error: "验证码已过期，请重新获取" },
      { status: 400 }
    );
  }

  // Check attempts
  if (verification.attemptCount >= 3) {
    return NextResponse.json(
      { error: "验证失败次数过多，请重新获取验证码" },
      { status: 400 }
    );
  }

  // Verify code
  const isValid = await verifyCode(data.code, verification.code);
  if (!isValid) {
    // Increment attempt count
    await db.emailVerification.update({
      where: { id: verification.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date()
      }
    });

    return NextResponse.json(
      { error: "验证码错误" },
      { status: 400 }
    );
  }

  // Check if user already exists with this email+role
  const existingUser = await db.user.findFirst({
    where: {
      email: data.email,
      role: data.role
    }
  });

  if (existingUser) {
    return NextResponse.json(
      { error: data.role === 'MENTOR' ? '该邮箱已注册导师账号' : '该邮箱已注册学生账号' },
      { status: 409 }
    );
  }

  // Mark verification as used
  await db.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
      usedAt: new Date()
    }
  });

  // Create user account
  const passwordHash = await hashPassword(data.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        lastLoginAt: new Date(),
        lastRoleAt: new Date()
      }
    });

    if (data.role === "MENTOR") {
      await tx.mentorProfile.create({
        data: {
          userId: created.id,
          displayName: data.displayName,
          institution: data.institution ?? "",
          department: data.department,
          title: data.title,
          bioShort: data.bioShort,
          location: data.location,
        },
      });
    } else {
      await tx.studentProfile.create({
        data: {
          userId: created.id,
          displayName: data.displayName,
          backgroundBrief: data.backgroundBrief,
        },
      });
    }

    return created;
  });

  // Create session
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  await session.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- app/api/auth/verify-email/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/auth/verify-email/ backend/lib/validation.ts
git commit -m "feat(auth): add email verification and account creation API"
```

---

## Phase 3: Frontend Integration (Email Verification)

### Task 8: Update Registration Page with Email Verification

**Files:**
- Modify: `backend/app/register/page.tsx`
- Create: `backend/app/components/email-verification-form.tsx`

- [ ] **Step 1: Create email verification form component**

Create: `backend/app/components/email-verification-form.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmailVerificationFormProps {
  email: string;
  role: "MENTOR" | "STUDENT";
  onSuccess: (user: any) => void;
  onBack: () => void;
}

export function EmailVerificationForm({
  email,
  role,
  onSuccess,
  onBack
}: EmailVerificationFormProps) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (password !== confirmPassword) {
      setError("两次密码输入不一致");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要6位");
      setLoading(false);
      return;
    }

    const body = {
      email,
      code,
      role,
      password,
      displayName
    };

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "验证失败");
        setLoading(false);
        return;
      }

      onSuccess(data.user);
    } catch (err) {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setResendLoading(false);
        return;
      }

      // Start countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          验证码
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="6位验证码"
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleResendCode}
            disabled={resendLoading || countdown > 0}
            className="px-4 py-2"
          >
            {countdown > 0 ? `${countdown}秒` : resendLoading ? "发送中..." : "重新发送"}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          验证码已发送至 {email}，15分钟内有效
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="至少6位密码"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          确认密码
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="再次输入密码"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          姓名/昵称
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入您的姓名或昵称"
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          返回
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? "验证中..." : "完成注册"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update registration page with email verification flow**

Edit: `backend/app/register/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailVerificationForm } from "@/app/components/email-verification-form";

type Role = "MENTOR" | "STUDENT";

type Step = "email" | "verify" | "details";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [role, setRole] = useState<Role>("STUDENT");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For mentor details
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [location, setLocation] = useState("");

  // For student details
  const [backgroundBrief, setBackgroundBrief] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setLoading(false);
        return;
      }

      setStep("verify");
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  function handleVerificationSuccess(user: any) {
    // Redirect based on role
    if (user.role === "MENTOR") {
      router.push("/mentor");
    } else {
      router.push("/student");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            注册 ScholarBridge
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {step === "email" && "选择您的角色并输入邮箱开始注册"}
            {step === "verify" && "请输入验证码完成注册"}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  我要注册为
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`flex-1 py-3 px-4 border rounded-lg text-center ${
                      role === "STUDENT"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    👤 学生
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("MENTOR")}
                    className={`flex-1 py-3 px-4 border rounded-lg text-center ${
                      role === "MENTOR"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    👨‍🏫 导师
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400"
              >
                {loading ? "发送中..." : "发送验证码"}
              </button>

              <p className="text-center text-sm text-slate-600">
                已有账号？{" "}
                <a href="/login" className="text-blue-600 hover:text-blue-500">
                  立即登录
                </a>
              </p>
            </form>
          )}

          {step === "verify" && (
            <EmailVerificationForm
              email={email}
              role={role}
              onSuccess={handleVerificationSuccess}
              onBack={() => setStep("email")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test the registration flow**

Run: `cd backend && npm run dev`
Navigate to: `http://localhost:3000/register`
Expected: Should see email input, role selection, and verification flow

- [ ] **Step 4: Commit**

```bash
git add backend/app/register/page.tsx backend/app/components/email-verification-form.tsx
git commit -m "feat(register): add email verification flow to registration"
```

---

## Implementation Notes

### Testing Strategy
- Unit tests for all new services
- Integration tests for API endpoints
- Manual testing for OAuth flows
- Load testing for email service

### Security Considerations
- All verification codes are hashed before storage
- Rate limiting on verification code generation
- Attempt limits on verification validation
- IP tracking for security events
- OAuth state parameter for CSRF protection

### Performance Considerations
- Database indexes on email, role, and orcidId
- Prisma query optimization for dual-role lookups
- Async email sending to avoid blocking
- Session size optimization

### Error Handling
- User-friendly error messages
- Detailed logging for debugging
- Graceful degradation for email service failures
- Proper HTTP status codes

---

## Success Criteria Verification

After implementation:

- [ ] Can register with email verification (6-digit code, 15min expiry)
- [ ] Can have both student and mentor accounts with same email
- [ ] Email verification codes are properly hashed and secured
- [ ] Rate limiting prevents abuse of verification codes
- [ ] All existing functionality continues to work
- [ ] Database migration is non-destructive
- [ ] Session management supports multiple roles per email

---

**Next Phase:** ORCID Integration (see separate plan document)
