-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('OUTSTANDING', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'SATISFACTORY');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('HIGHLY_RECOMMENDED', 'RECOMMENDED', 'RECOMMENDED_WITH_RESERVATIONS', 'NOT_EVALUATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "InternshipArchiveStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "InternshipArchive" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "email" TEXT NOT NULL,
    "department" TEXT,
    "reportingLead" TEXT,
    "currentRole" "Role" NOT NULL,
    "internshipRole" "Role" NOT NULL,
    "internshipStartDate" DATE,
    "internshipEndDate" DATE,
    "duration" TEXT,
    "status" "InternshipArchiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "workCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyContributions" TEXT,
    "featuredAchievements" TEXT,
    "adminReview" TEXT,
    "performanceRating" "PerformanceRating",
    "recommendationStatus" "RecommendationStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
    "internalNotes" TEXT,
    "verificationId" TEXT,
    "verificationUrl" TEXT,
    "certificateNumber" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "qrGenerated" BOOLEAN NOT NULL DEFAULT false,
    "qrImagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InternshipArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternshipArchive_internId_key" ON "InternshipArchive"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipArchive_verificationId_key" ON "InternshipArchive"("verificationId");

-- CreateIndex
CREATE INDEX "InternshipArchive_status_idx" ON "InternshipArchive"("status");

-- CreateIndex
CREATE INDEX "InternshipArchive_internshipEndDate_idx" ON "InternshipArchive"("internshipEndDate");

-- CreateIndex
CREATE INDEX "InternshipArchive_verificationStatus_idx" ON "InternshipArchive"("verificationStatus");

-- AddForeignKey
ALTER TABLE "InternshipArchive" ADD CONSTRAINT "InternshipArchive_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
