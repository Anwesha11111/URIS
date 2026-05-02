-- Add taskId to Review table (nullable for backward compat with existing rows)
ALTER TABLE "Review" ADD COLUMN "taskId" TEXT;

-- Add foreign key to Task table
ALTER TABLE "Review" ADD CONSTRAINT "Review_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for duplicate-review lookups
CREATE INDEX "Review_taskId_idx" ON "Review"("taskId");
