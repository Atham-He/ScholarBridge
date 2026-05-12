-- CreateTable
CREATE TABLE "SavedProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentUserId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedProject_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "StudentProfile" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SavedProject_studentUserId_idx" ON "SavedProject"("studentUserId");

-- CreateIndex
CREATE INDEX "SavedProject_projectId_idx" ON "SavedProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedProject_studentUserId_projectId_key" ON "SavedProject"("studentUserId", "projectId");
