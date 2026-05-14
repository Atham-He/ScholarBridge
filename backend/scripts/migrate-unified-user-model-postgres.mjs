import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function run(sql) {
  await db.$executeRawUnsafe(sql);
}

async function main() {
  await run(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'mentorUserId'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'ownerUserId'
      ) THEN
        ALTER TABLE "Project" RENAME COLUMN "mentorUserId" TO "ownerUserId";
      END IF;
    END $$;
  `);

  await run(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'studentUserId'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'applicantUserId'
      ) THEN
        ALTER TABLE "Application" RENAME COLUMN "studentUserId" TO "applicantUserId";
      END IF;
    END $$;
  `);

  await run(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'mentorUserId'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'ownerUserId'
      ) THEN
        ALTER TABLE "Application" RENAME COLUMN "mentorUserId" TO "ownerUserId";
      END IF;
    END $$;
  `);

  await run(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'mentorFeedback'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'ownerFeedback'
      ) THEN
        ALTER TABLE "Application" RENAME COLUMN "mentorFeedback" TO "ownerFeedback";
      END IF;
    END $$;
  `);

  await run(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'SavedProject' AND column_name = 'studentUserId'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'SavedProject' AND column_name = 'userId'
      ) THEN
        ALTER TABLE "SavedProject" RENAME COLUMN "studentUserId" TO "userId";
      END IF;
    END $$;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "Profile" (
      "userId" TEXT NOT NULL PRIMARY KEY,
      "displayName" TEXT NOT NULL,
      "institution" TEXT,
      "department" TEXT,
      "title" TEXT,
      "education" TEXT,
      "bioShort" TEXT,
      "backgroundBrief" TEXT,
      "location" TEXT,
      "contactEmail" TEXT,
      "phone" TEXT,
      "website" TEXT,
      "researchAreas" JSONB,
      "interests" JSONB,
      "skills" JSONB,
      "materialsJson" JSONB,
      "status" TEXT NOT NULL DEFAULT 'active',
      "resumeFileName" TEXT,
      "resumeMimeType" TEXT,
      "resumeSize" INTEGER,
      "resumeData" BYTEA,
      "resumeText" TEXT,
      "resumeUploadedAt" TIMESTAMP(3),
      "aiAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
      "aiAgentPrompt" TEXT,
      "aiHardWeight" INTEGER NOT NULL DEFAULT 50,
      "aiFitWeight" INTEGER NOT NULL DEFAULT 50,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "ORCIDAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orcidId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "avatarUrl" TEXT,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "tokenExpiresAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    INSERT INTO "Profile" (
      "userId",
      "displayName",
      "status",
      "aiAgentEnabled",
      "aiHardWeight",
      "aiFitWeight",
      "updatedAt"
    )
    SELECT
      u."id",
      INITCAP(SPLIT_PART(u."email", '@', 1)),
      'active',
      true,
      50,
      50,
      CURRENT_TIMESTAMP
    FROM "User" u
    WHERE NOT EXISTS (
      SELECT 1
      FROM "Profile" p
      WHERE p."userId" = u."id"
    );
  `);

  await run(`DROP INDEX IF EXISTS "User_email_role_key";`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  await run(`CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");`);
  await run(`CREATE INDEX IF NOT EXISTS "EmailVerification_email_idx" ON "EmailVerification"("email");`);
  await run(`CREATE INDEX IF NOT EXISTS "EmailVerification_expiresAt_idx" ON "EmailVerification"("expiresAt");`);
  await run(`CREATE INDEX IF NOT EXISTS "EmailVerification_code_idx" ON "EmailVerification"("code");`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "ORCIDAccount_orcidId_key" ON "ORCIDAccount"("orcidId");`);
  await run(`CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");`);
  await run(`CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");`);
  await run(`CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");`);

  console.log("Unified user model migration applied successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to migrate PostgreSQL schema:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
