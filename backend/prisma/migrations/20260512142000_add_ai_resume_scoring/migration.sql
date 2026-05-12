ALTER TABLE "MentorProfile" ADD COLUMN "aiAgentEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MentorProfile" ADD COLUMN "aiAgentPrompt" TEXT;
ALTER TABLE "MentorProfile" ADD COLUMN "aiHardWeight" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "MentorProfile" ADD COLUMN "aiFitWeight" INTEGER NOT NULL DEFAULT 50;

ALTER TABLE "StudentProfile" ADD COLUMN "resumeText" TEXT;

ALTER TABLE "Application" ADD COLUMN "aiHardScore" REAL;
ALTER TABLE "Application" ADD COLUMN "aiFitScore" REAL;
ALTER TABLE "Application" ADD COLUMN "aiScoreSummary" TEXT;
ALTER TABLE "Application" ADD COLUMN "aiScoreError" TEXT;
ALTER TABLE "Application" ADD COLUMN "aiScoredAt" DATETIME;
