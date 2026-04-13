-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MentorProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "department" TEXT,
    "title" TEXT,
    "bioShort" TEXT,
    "location" TEXT,
    CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "backgroundBrief" TEXT,
    "materialsJson" JSONB,
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "profileMarkdown" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "tags" JSONB,
    "hIndex" INTEGER,
    "citationsDisplay" TEXT,
    "researchSummary" TEXT,
    "publications" JSONB,
    "agentActive" BOOLEAN NOT NULL DEFAULT true,
    "agentIntro" TEXT,
    "scholarSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Skill_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "metaTags" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SkillProject_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentUserId" TEXT NOT NULL,
    "mentorUserId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CHATTING',
    "aiScore" REAL,
    "aiFlagNotify" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" DATETIME,
    "interviewAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_mentorUserId_fkey" FOREIGN KEY ("mentorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    CONSTRAINT "Conversation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "personaJson" JSONB NOT NULL,
    "agentCard" TEXT NOT NULL,
    "sourcesJson" JSONB NOT NULL,
    "chunksJson" JSONB NOT NULL,
    "inputJson" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT '0.1.0',
    "authorizedBy" TEXT NOT NULL,
    "consentNotes" TEXT,
    "llmProvider" TEXT NOT NULL DEFAULT 'mock',
    "llmModel" TEXT,
    "buildStatus" TEXT NOT NULL DEFAULT 'pending',
    "buildError" TEXT,
    "builtAt" DATETIME,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "publicSourceCount" INTEGER NOT NULL DEFAULT 0,
    "uploadSourceCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Persona_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonaUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personaId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "parsedContent" TEXT,
    "parseError" TEXT,
    "sourceId" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonaUpload_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonaEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personaId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "researchFit" JSONB NOT NULL,
    "technicalDepth" JSONB NOT NULL,
    "communication" JSONB NOT NULL,
    "initiative" JSONB NOT NULL,
    "evidenceQuality" JSONB NOT NULL,
    "evidenceBreakdown" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "followUpQuestions" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonaEvaluation_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonaEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonaSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personaId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnsJson" JSONB NOT NULL,
    "studentProfile" JSONB,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonaSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_ownerUserId_idx" ON "Skill"("ownerUserId");

-- CreateIndex
CREATE INDEX "SkillProject_skillId_idx" ON "SkillProject"("skillId");

-- CreateIndex
CREATE INDEX "Application_mentorUserId_idx" ON "Application"("mentorUserId");

-- CreateIndex
CREATE INDEX "Application_studentUserId_idx" ON "Application"("studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_studentUserId_skillId_key" ON "Application"("studentUserId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_applicationId_key" ON "Conversation"("applicationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_skillId_key" ON "Persona"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_slug_key" ON "Persona"("slug");

-- CreateIndex
CREATE INDEX "Persona_skillId_idx" ON "Persona"("skillId");

-- CreateIndex
CREATE INDEX "Persona_slug_idx" ON "Persona"("slug");

-- CreateIndex
CREATE INDEX "Persona_buildStatus_idx" ON "Persona"("buildStatus");

-- CreateIndex
CREATE INDEX "PersonaUpload_personaId_idx" ON "PersonaUpload"("personaId");

-- CreateIndex
CREATE INDEX "PersonaUpload_sourceId_idx" ON "PersonaUpload"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaEvaluation_applicationId_key" ON "PersonaEvaluation"("applicationId");

-- CreateIndex
CREATE INDEX "PersonaEvaluation_personaId_idx" ON "PersonaEvaluation"("personaId");

-- CreateIndex
CREATE INDEX "PersonaEvaluation_applicationId_idx" ON "PersonaEvaluation"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaSession_sessionId_key" ON "PersonaSession"("sessionId");

-- CreateIndex
CREATE INDEX "PersonaSession_personaId_idx" ON "PersonaSession"("personaId");

-- CreateIndex
CREATE INDEX "PersonaSession_sessionId_idx" ON "PersonaSession"("sessionId");
