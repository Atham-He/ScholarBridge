# Enhanced Authentication System Design

**Date:** 2025-04-13
**Author:** AI Assistant
**Status:** Design Phase
**Version:** 1.0

## Overview

This document outlines the design for enhancing the ScholarBridge authentication system to support:
1. ORCID integration for academic identity login
2. Email verification for secure registration
3. Dual-role support (one email can have both student and mentor accounts)

## Current System Analysis

### Existing Architecture
- **Authentication Method:** Email/password only
- **Role System:** Single role per user (MENTOR or STUDENT)
- **Database Schema:** `email` field is unique in User table
- **Session Management:** iron-session with single userId

### Current Limitations
- No academic identity verification (ORCID)
- Email registration lacks verification - vulnerable to fake accounts
- One email cannot have both student and mentor accounts
- No role switching capability

## Design Goals

1. **Academic Identity Integration** - Enable ORCID OAuth login
2. **Enhanced Security** - Email verification for registration
3. **User Flexibility** - Support dual-role accounts per email
4. **Smooth UX** - Seamless role switching without re-login
5. **Cost-Effective** - Use free email service tier

## Proposed Architecture

### Data Model Changes

#### 1. User Table (Modified)

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

  emailVerifications EmailVerification[]
  securityEvents   SecurityEvent[]

  @@unique([email, role])  // KEY CHANGE: One email can have STUDENT + MENTOR
  @@index([orcidId])
  @@index([email])
}
```

**Key Changes:**
- Removed `email` unique constraint
- Added `@@unique([email, role])` for dual-role support
- Added ORCID fields (`orcidId`, `orcidEmail`, `orcidName`)
- Made `passwordHash` optional
- Added `lastRoleAt` for role switching logic
- Added security events tracking

#### 2. EmailVerification Table (New)

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
```

**Purpose:** Store email verification codes with 15-minute expiry and replay protection

#### 3. ORCIDAccount Table (New)

```prisma
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
```

**Purpose:** Cache ORCID profile data and tokens for API access

#### 4. SecurityEvent Table (New)

```prisma
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

**Purpose:** Audit trail for security monitoring and compliance

### Authentication Flow Designs

#### 1. Email Registration with Verification

```
┌─────────────────┐
│ Registration    │
│ Page            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User enters:    │
│ • Email         │
│ • Role (STUDENT │
│   or MENTOR)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate 6-digit│
│ verification    │
│ code            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send email via  │
│ Tencent Cloud SES│
│ (or console log │
│  in dev)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User enters     │
│ verification    │
│ code            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify code &   │
│ expiry (15min)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create password │
│ (optional for   │
│  ORCID users)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create User with│
│ email+role combo│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auto login &    │
│ redirect to     │
│ role dashboard  │
└─────────────────┘
```

**Error Handling:**
- Invalid code: Show "验证码错误，请重试"
- Expired code: Show "验证码已过期，请重新获取"
- Email+role exists: Show "该邮箱已注册{role}账号，请直接登录"

#### 2. ORCID OAuth Login Flow

```
┌─────────────────┐
│ User clicks     │
│ "ORCID Login"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Redirect to     │
│ ORCID OAuth     │
│ authorization   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User authorizes │
│ on ORCID        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ORCID returns   │
│ authorization   │
│ code            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Exchange code   │
│ for access token│
│ & fetch profile │
│ (orcid, name,   │
│  email)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check if       │
│ orcidId exists  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ EXISTS │ │ DOESN'T EXIST    │
└───┬────┘ └──────┬───────────┘
    │             │
    │             ▼
    │      ┌──────────────────┐
    │      │ Show role        │
    │      │ selection page   │
    │      │ (STUDENT or      │
    │      │  MENTOR)         │
    │      └──────┬───────────┘
    │             │
    │             ▼
    │      ┌──────────────────┐
    │      │ Create User with │
    │      │ orcidId+role     │
    │      └──────┬───────────┘
    │             │
    └──────┬──────┘
           │
           ▼
    ┌──────────────────┐
    │ Auto login &     │
    │ redirect to role │
    │ dashboard        │
    └──────────────────┘
```

**Auto-Link Logic (SECURE):**
- If ORCID email matches existing user email, **DO NOT auto-link** (security vulnerability)
- Instead, show confirmation page: "We found an existing account with your ORCID email. Do you want to link these accounts?"
- Require user to authenticate existing account before linking
- If user is logged in, offer to link ORCID to current account with explicit confirmation
- Otherwise create new account with selected role

#### 3. Role Switching Flow (SECURE)

```
┌─────────────────┐
│ User logged in  │
│ as STUDENT      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ System checks   │
│ if same email   │
│ has MENTOR role │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ YES    │ │ NO               │
└───┬────┘ └────┬─────────────┘
    │             │
    │             ▼
    │      ┌──────────────────┐
    │      │ Show switcher in │
    │      │ top nav:         │
    │      │ "当前：学生 👤"   │
    │      │ with dropdown    │
    │      └──────────────────┘
    │             │
    ▼             ▼
┌────────────────────────────────────┐
│ User clicks "切换到导师身份 👨‍🏫" │
└────────┬───────────────────────────┘
         │
         ▼
┌─────────────────┐
│ SECURITY CHECK: │
│ Verify both     │
│ accounts belong │
│ to same email   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ VALID  │ │ INVALID          │
└───┬────┘ └────┬─────────────┘
    │             │
    │             ▼
    │      ┌──────────────────┐
    │      │ Log security     │
    │      │ event, deny      │
    │      │ switch           │
    │      └──────────────────┘
    │             │
    ▼             ▼
┌─────────────────┐
│ Update session  │
│ userId & role to│
│ MENTOR account  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log security    │
│ event           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update lastRoleAt│
│ for both roles  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Redirect to     │
│ mentor dashboard│
└─────────────────┘
```

**Security Validation:**
```typescript
// Critical security checks before role switch
const currentUser = await getCurrentUser();
const targetRoleUser = await db.user.findFirst({
  where: {
    email: currentUser.email,
    role: 'MENTOR'
  }
});

// Prevent cross-user account hijacking
if (!targetRoleUser) {
  throw new Error('Target role account not found');
}

if (targetRoleUser.email !== currentUser.email) {
  await logSecurityEvent('ROLE_SWITCH_DENIED', {
    reason: 'Email mismatch',
    currentUserId: currentUser.id,
    targetUserId: targetRoleUser.id
  });
  throw new Error('Account ownership verification failed');
}

// Update session with new role
session.userId = targetRoleUser.id;
session.role = 'MENTOR';
await session.save();
```

**Default Role Logic:**
- First login: Use the registered role
- Subsequent logins: Use role with most recent `lastRoleAt`
- Manual switch: Update `lastRoleAt` for new role

## Technical Implementation

### Session Data Structure (Critical Change)

The current session structure only stores `userId`, but with dual-role support, we need to track which specific role is active.

```typescript
// lib/session.ts
export type SessionData = {
  userId?: string;
  role?: UserRole;  // NEW: Track active role
  lastRoleSwitchAt?: Date;  // NEW: For security tracking
  oauthState?: string;  // NEW: For OAuth CSRF protection
};
```

**Impact:** All authentication endpoints must update session to include `role` field.

### Database Query Performance Impact

With the `@@unique([email, role])` constraint, common queries must be updated:

**Before (BROKEN):**
```typescript
// This query breaks because email is no longer unique
const user = await db.user.findUnique({ where: { email } });
```

**After (CORRECT):**
```typescript
// Must use findMany for email lookups
const users = await db.user.findMany({
  where: { email },
  include: { mentorProfile: true, studentProfile: true }
});

// Or find by email+role combo
const user = await db.user.findUnique({
  where: {
    email_role: { email, role: 'STUDENT' }
  },
  include: { studentProfile: true }
});
```

**Migration Required:** All existing code using `findUnique({ where: { email } })` must be updated.

### Email Service Integration

#### Service Choice: Tencent Cloud SES
- **Free Tier:** 1000 emails/month
- **Delivery Rate:** High for China recipients
- **API Complexity:** Simple HTTP POST
- **Setup Time:** ~10 minutes

#### Abstraction Interface

```typescript
// lib/email.ts
interface EmailService {
  sendVerification(email: string, code: string, role: UserRole): Promise<void>;
}

class DevelopmentEmailService implements EmailService {
  async sendVerification(email: string, code: string, role: UserRole) {
    console.log(`📧 [DEV MODE] Verification Code for ${email} (${role}): ${code}`);
  }
}

class TencentEmailService implements EmailService {
  private apiKey: string;
  private endpoint: string;

  async sendVerification(email: string, code: string, role: UserRole) {
    // Implementation using Tencent Cloud SES API
  }
}

// Factory based on environment
export const emailService: EmailService =
  process.env.NODE_ENV === 'development'
    ? new DevelopmentEmailService()
    : new TencentEmailService();
```

#### Verification Code Design
- **Format:** 6-digit numeric (e.g., "123456")
- **Storage:** Hashed using bcrypt in database
- **Expiry:** 15 minutes from creation
- **Rate Limiting:** Max 3 codes per email per hour
- **Security:** Failed attempt limit (3 tries) then require new code

### ORCID Integration

#### OAuth Configuration & Security

```typescript
// ORCID API endpoints
const ORCID_CONFIG = {
  sandbox: {
    authorizationUrl: "https://sandbox.orcid.org/oauth/authorize",
    tokenUrl: "https://sandbox.orcid.org/oauth/token",
    apiUrl: "https://api.sandbox.orcid.org",
    clientId: process.env.ORCID_CLIENT_ID_SANDBOX,
    clientSecret: process.env.ORCID_CLIENT_SECRET_SANDBOX
  },
  production: {
    authorizationUrl: "https://orcid.org/oauth/authorize",
    tokenUrl: "https://orcid.org/oauth/token",
    apiUrl: "https://api.orcid.org",
    clientId: process.env.ORCID_CLIENT_ID_PROD,
    clientSecret: process.env.ORCID_CLIENT_SECRET_PROD
  }
};

// OAuth State Management (CSRF Protection)
function generateOAuthState(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function storeOAuthState(session: Session, state: string): Promise<void> {
  session.oauthState = state;
  await session.save();
}

async function validateOAuthState(session: Session, state: string): Promise<boolean> {
  if (session.oauthState !== state) {
    await logSecurityEvent('OAUTH_STATE_MISMATCH', {
      sessionState: session.oauthState,
      receivedState: state
    });
    return false;
  }
  // Clear used state to prevent replay
  session.oauthState = undefined;
  await session.save();
  return true;
}
```

#### Scope Requirements
- `/authenticate` - Get user's ORCID iD
- `/person/read` - Get user's name and email

#### Implementation API Routes
```
POST  /api/auth/orcid/authorize     - Initiate OAuth flow
GET   /api/auth/orcid/callback      - Handle OAuth callback
POST  /api/auth/orcid/select-role   - Role selection for new users
POST  /api/auth/orcid/link          - Link ORCID to existing account
```

### Database Migration Strategy

#### Phase 1: Backup & Assessment
```bash
# Backup existing database
cp dev.db dev.db.backup

# Check for potential conflicts
SELECT email, COUNT(*) as count FROM User GROUP BY email HAVING count > 1;
```

#### Phase 2: Schema Migration (Non-Destructive)
```bash
# Add new columns to existing User table
ALTER TABLE User ADD COLUMN orcidId TEXT UNIQUE DEFAULT NULL;
ALTER TABLE User ADD COLUMN orcidEmail TEXT DEFAULT NULL;
ALTER TABLE User ADD COLUMN orcidName TEXT DEFAULT NULL;
ALTER TABLE User ADD COLUMN lastLoginAt DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE User ADD COLUMN lastRoleAt DATETIME DEFAULT CURRENT_TIMESTAMP;

# Create new constraint (allows existing single-role users)
CREATE UNIQUE INDEX IF NOT EXISTS User_email_role_key ON User(email, role);

# Create index for email lookups (since email no longer unique)
CREATE INDEX IF NOT EXISTS User_email_key ON User(email);

# Create ORCID index
CREATE INDEX IF NOT EXISTS User_orcidId_key ON User(orcidId);

# Create new tables
CREATE TABLE EmailVerification (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  role TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  verified INTEGER DEFAULT 0,
  usedAt DATETIME,
  attemptCount INTEGER DEFAULT 0,
  lastAttemptAt DATETIME,
  ipAddress TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT,
  UNIQUE(email, role)
);

CREATE TABLE ORCIDAccount (
  id TEXT PRIMARY KEY,
  orcidId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatarUrl TEXT,
  accessToken TEXT,
  refreshToken TEXT,
  tokenExpiresAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SecurityEvent (
  id TEXT PRIMARY KEY,
  userId TEXT,
  eventType TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  metadata TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Phase 3: Data Validation & Testing
- Verify existing user data integrity
- Test email uniqueness constraint
- Validate role-specific queries work correctly
- Test backward compatibility

#### Phase 4: Seed New Test Data
- Create test users with both student and mentor roles
- Add test email verification codes
- Create test ORCID accounts
- Add security events for testing

### Security Considerations

#### Email Verification Security
1. **Code Hashing:** Store bcrypt hash of verification code
2. **Rate Limiting:** Limit verification attempts per IP/email
3. **Expiry Enforcement:** Strict 15-minute expiry check
4. **One-time Use:** Mark codes as used after verification

#### ORCID Security
1. **State Parameter:** Use OAuth state to prevent CSRF
2. **Token Storage:** Store access tokens securely, never expose to client
3. **Auto-link Authorization:** Require user confirmation before linking accounts
4. **Session Security:** Update session immediately after role switch

#### Password Security (Maintained)
- Continue using bcrypt with 10 rounds
- Optional for ORCID-only users
- Password strength validation maintained

## API Endpoint Changes

### New Endpoints

```
# Email Verification
POST /api/auth/send-code        - Send verification code
POST /api/auth/verify-email     - Verify code and complete registration
POST /api/auth/resend-code      - Resend verification code

# ORCID Authentication
GET  /api/auth/orcid/authorize  - Initiate ORCID OAuth
GET  /api/auth/orcid/callback   - Handle ORCID callback
POST /api/auth/orcid/select-role - Select role for ORCID registration
POST /api/auth/orcid/link       - Link ORCID to existing account

# Role Switching
GET  /api/auth/available-roles  - Get available roles for current user
POST /api/auth/switch-role      - Switch to different role
```

### Modified Endpoints

```
POST /api/auth/register         - Now requires email verification
POST /api/auth/login            - Returns available roles
GET  /api/auth/me               - Includes role switch info
```

## Frontend Changes

### Registration Page Updates

#### Email Registration Flow
```tsx
// Step 1: Email & Role Selection
<EmailRoleForm
  onSubmit={(email, role) => sendVerificationCode(email, role)}
/>

// Step 2: Verification Code Input
<VerificationCodeForm
  email={email}
  role={role}
  onVerified={(code) => completeRegistration(code)}
  onResend={() => sendVerificationCode(email, role)}
/>

// Step 3: Password Creation (optional)
<PasswordCreationForm
  onSubmit={(password) => createAccount(password)}
  optional={true}  // Skip for ORCID users
/>
```

#### ORCID Registration Flow
```tsx
// ORCID Login Button
<ORCIDLoginButton
  onClick={() => window.location.href = '/api/auth/orcid/authorize'}
/>

// Role Selection (for new ORCID users)
<RoleSelectionForm
  orcidProfile={orcidData}
  onSelect={(role) => createORCIDAccount(role)}
/>
```

### Login Page Enhancements

```tsx
<LoginForm>
  {/* Existing email/password login */}
  <EmailPasswordLogin />

  {/* ORCID Login Option */}
  <ORCIDLoginButton />

  {/* Forgot password link */}
  <ForgotPasswordLink />
</LoginForm>
```

### Role Switcher Component

```tsx
// Top navigation component
<RoleSwitcher
  currentRole={session.role}
  availableRoles={user.availableRoles}
  onSwitch={(newRole) => switchRole(newRole)}
/>

// Renders as:
// "当前：学生 👤" with dropdown showing:
// - "切换到导师身份 👨‍🏫" (if available)
// - "添加导师身份" (if not available)
```

## Implementation Phases

### Phase 1: Database & Core Auth (Week 1)
- [ ] Implement database migration
- [ ] Create email verification tables
- [ ] Create ORCID account tables
- [ ] Update User model
- [ ] Seed test data

### Phase 2: Email Verification (Week 1-2)
- [ ] Implement email service abstraction
- [ ] Create verification code generation
- [ ] Implement Tencent Cloud SES integration
- [ ] Build verification API endpoints
- [ ] Create frontend verification flow
- [ ] Add rate limiting and security

### Phase 3: ORCID Integration (Week 2-3)
- [ ] Set up ORCID OAuth application
- [ ] Implement OAuth flow
- [ ] Create ORCID API endpoints
- [ ] Build role selection page
- [ ] Implement account linking logic
- [ ] Test sandbox and production environments

### Phase 4: Role Switching (Week 3-4)
- [ ] Implement available roles API
- [ ] Create role switch endpoint
- [ ] Build role switcher UI component
- [ ] Update session management
- [ ] Handle permission checks for role-specific actions

### Phase 5: Testing & Refinement (Week 4)
- [ ] End-to-end testing of registration flows
- [ ] Security testing (rate limiting, CSRF, etc.)
- [ ] UX testing and refinement
- [ ] Documentation updates
- [ ] Performance optimization

## Success Criteria

### Functional Requirements
- ✅ Users can register with email verification (6-digit code, 15min expiry)
- ✅ Users can login via ORCID OAuth
- ✅ One email can have both student and mentor accounts
- ✅ Users can switch between roles without re-login
- ✅ System defaults to most recently used role

### Non-Functional Requirements
- ✅ Email delivery rate > 95% (Tencent Cloud SES)
- ✅ Verification code expiry enforced strictly
- ✅ ORCID OAuth flow completes in < 10 seconds
- ✅ Role switching completes in < 1 second
- ✅ All new features maintain existing security standards

### User Experience Goals
- ✅ Registration time < 2 minutes for email flow
- ✅ ORCID login time < 30 seconds
- ✅ Role switching feels instant and seamless
- ✅ Clear error messages and guidance
- ✅ Mobile-friendly interfaces

## Future Enhancements

### Potential Improvements (Out of Scope)
1. **Email Template System** - Customizable email templates
2. **Multiple ORCID Accounts** - Support linking multiple ORCID iDs
3. **Social Login Expansion** - Add Google, LinkedIn, WeChat
4. **Two-Factor Authentication** - SMS or authenticator app
5. **Account Merge** - Merge duplicate accounts manually
6. **Login History** - Show user's login history and active sessions

### Monitoring & Analytics
1. **Registration Funnel Analytics** - Track where users drop off
2. **Email Delivery Metrics** - Monitor delivery rates and failures
3. **ORCID Conversion Rates** - Track ORCID adoption
4. **Role Switching Patterns** - Understand how users switch roles
5. **Security Event Logging** - Track suspicious activities

## References

### ORCID Documentation
- [ORCID OAuth 2.0 Documentation](https://info.orcid.org/documentation/integration-guide/oauth-2-0/)
- [ORCID API Documentation](https://info.orcid.org/documentation/integration-guide/rest-api/)
- [ORCID Member API vs Public API](https://info.orcid.org/documentation/integration-guide/member-api-vs-public-api/)

### Email Services
- [Tencent Cloud SES Documentation](https://cloud.tencent.com/document/product/1284)
- [Aliyun DirectMail Documentation](https://help.aliyun.com/product/29412.html)

### Security Best Practices
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

**Document Status:** Ready for implementation planning
**Next Steps:** Create detailed implementation plan with tasks and timelines
