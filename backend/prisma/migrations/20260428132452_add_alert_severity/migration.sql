-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'warning';

-- CreateIndex
CREATE INDEX "Alert_internId_idx" ON "Alert"("internId");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_resolved_idx" ON "Alert"("resolved");
