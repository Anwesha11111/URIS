-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "internId" TEXT,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
