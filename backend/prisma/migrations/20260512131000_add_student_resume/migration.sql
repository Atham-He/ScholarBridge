ALTER TABLE "StudentProfile" ADD COLUMN "resumeFileName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "resumeMimeType" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "resumeSize" INTEGER;
ALTER TABLE "StudentProfile" ADD COLUMN "resumeData" BLOB;
ALTER TABLE "StudentProfile" ADD COLUMN "resumeUploadedAt" DATETIME;
