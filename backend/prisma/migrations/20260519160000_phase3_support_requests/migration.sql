-- Phase 3: Support Request system
-- Additive migration — no existing data is modified.

CREATE TABLE "SupportRequest" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "subject"      TEXT NOT NULL,
    "message"      TEXT NOT NULL,
    "priority"     TEXT NOT NULL DEFAULT 'MEDIUM',
    "category"     TEXT NOT NULL DEFAULT 'GENERAL',
    "status"       TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolvedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "SupportRequest_userId_idx"    ON "SupportRequest"("userId");
CREATE INDEX "SupportRequest_status_idx"    ON "SupportRequest"("status");
CREATE INDEX "SupportRequest_priority_idx"  ON "SupportRequest"("priority");
CREATE INDEX "SupportRequest_category_idx"  ON "SupportRequest"("category");
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");

-- Foreign key
ALTER TABLE "SupportRequest"
    ADD CONSTRAINT "SupportRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
