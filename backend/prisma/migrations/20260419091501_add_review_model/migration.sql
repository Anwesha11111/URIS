-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "timeliness" DOUBLE PRECISION NOT NULL,
    "initiative" DOUBLE PRECISION NOT NULL,
    "complexity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
