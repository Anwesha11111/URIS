-- AlterTable
ALTER TABLE "Intern" ADD COLUMN     "overrideScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "planeTaskId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "complexity" DOUBLE PRECISION NOT NULL,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "hasBlocker" BOOLEAN NOT NULL DEFAULT false,
    "blockerType" TEXT,
    "skills" TEXT[],
    "deadline" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredibilityScore" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "updateFrequency" DOUBLE PRECISION NOT NULL,
    "deadlineAdherence" DOUBLE PRECISION NOT NULL,
    "throughputAccuracy" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityScore" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "baseCapacity" DOUBLE PRECISION NOT NULL,
    "tli" DOUBLE PRECISION NOT NULL,
    "credibility" DOUBLE PRECISION NOT NULL,
    "finalCapacity" DOUBLE PRECISION NOT NULL,
    "capacityLabel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapacityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taskId" TEXT,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_planeTaskId_key" ON "Task"("planeTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "CredibilityScore_internId_key" ON "CredibilityScore"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityScore_internId_key" ON "CapacityScore"("internId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredibilityScore" ADD CONSTRAINT "CredibilityScore_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityScore" ADD CONSTRAINT "CapacityScore_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
