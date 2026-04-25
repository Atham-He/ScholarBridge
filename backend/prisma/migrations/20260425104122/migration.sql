-- CreateTable
CREATE TABLE "AIDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIResearchLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AIResearchNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" JSONB,
    "layerKey" TEXT NOT NULL,
    "domainSlug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIResearchNode_layerKey_fkey" FOREIGN KEY ("layerKey") REFERENCES "AIResearchLayer" ("key") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AIResearchNode_domainSlug_fkey" FOREIGN KEY ("domainSlug") REFERENCES "AIDomain" ("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "authors" TEXT NOT NULL,
    "venueOrOrg" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyMilestone" TEXT NOT NULL,
    "tags" JSONB,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIWork_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "AIResearchNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIUserWorkSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIUserWorkSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIUserWorkSignal_workId_fkey" FOREIGN KEY ("workId") REFERENCES "AIWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIMentorExploration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mentorUserId" TEXT NOT NULL,
    "domainSlug" TEXT NOT NULL,
    "nodeSlugs" JSONB,
    "workSlugs" JSONB,
    "videoUrl" TEXT,
    "additionalTags" JSONB,
    CONSTRAINT "AIMentorExploration_mentorUserId_fkey" FOREIGN KEY ("mentorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIMentorExploration_domainSlug_fkey" FOREIGN KEY ("domainSlug") REFERENCES "AIDomain" ("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIRecommendationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "domains" JSONB NOT NULL,
    "nodes" JSONB NOT NULL,
    "mentors" JSONB NOT NULL,
    "route" JSONB,
    "signalCount" JSONB NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIRecommendationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AIDomain_slug_key" ON "AIDomain"("slug");

-- CreateIndex
CREATE INDEX "AIDomain_slug_idx" ON "AIDomain"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AIResearchLayer_key_key" ON "AIResearchLayer"("key");

-- CreateIndex
CREATE INDEX "AIResearchNode_domainSlug_idx" ON "AIResearchNode"("domainSlug");

-- CreateIndex
CREATE INDEX "AIResearchNode_layerKey_idx" ON "AIResearchNode"("layerKey");

-- CreateIndex
CREATE UNIQUE INDEX "AIResearchNode_domainSlug_slug_key" ON "AIResearchNode"("domainSlug", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "AIWork_slug_key" ON "AIWork"("slug");

-- CreateIndex
CREATE INDEX "AIWork_nodeId_idx" ON "AIWork"("nodeId");

-- CreateIndex
CREATE INDEX "AIWork_type_idx" ON "AIWork"("type");

-- CreateIndex
CREATE INDEX "AIUserWorkSignal_userId_idx" ON "AIUserWorkSignal"("userId");

-- CreateIndex
CREATE INDEX "AIUserWorkSignal_workId_idx" ON "AIUserWorkSignal"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "AIUserWorkSignal_userId_workId_key" ON "AIUserWorkSignal"("userId", "workId");

-- CreateIndex
CREATE INDEX "AIMentorExploration_mentorUserId_idx" ON "AIMentorExploration"("mentorUserId");

-- CreateIndex
CREATE INDEX "AIMentorExploration_domainSlug_idx" ON "AIMentorExploration"("domainSlug");

-- CreateIndex
CREATE UNIQUE INDEX "AIMentorExploration_mentorUserId_domainSlug_key" ON "AIMentorExploration"("mentorUserId", "domainSlug");

-- CreateIndex
CREATE INDEX "AIRecommendationSnapshot_userId_idx" ON "AIRecommendationSnapshot"("userId");

-- CreateIndex
CREATE INDEX "AIRecommendationSnapshot_userId_generatedAt_idx" ON "AIRecommendationSnapshot"("userId", "generatedAt" DESC);
