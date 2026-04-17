-- DropIndex
DROP INDEX "EmailVerification_email_role_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "orcidId" TEXT,
    "orcidEmail" TEXT,
    "orcidName" TEXT,
    "lastLoginAt" DATETIME,
    "lastRoleAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationCode" TEXT
);
INSERT INTO "new_User" ("createdAt", "email", "id", "lastLoginAt", "lastRoleAt", "orcidEmail", "orcidId", "orcidName", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "lastLoginAt", "lastRoleAt", "orcidEmail", "orcidId", "orcidName", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_orcidId_key" ON "User"("orcidId");
CREATE INDEX "User_orcidId_idx" ON "User"("orcidId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "User_email_role_key" ON "User"("email", "role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
