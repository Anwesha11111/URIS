-- Phase 5: Extend SupportRequest with internalNotes, closedById, and assignedToId index.
-- Also migrates existing UUID-based IDs to cuid-compatible TEXT (already TEXT, no change needed).
-- Additive migration — no existing data is modified or deleted.

-- Add internalNotes column (admin/ops only — never returned to interns)
ALTER TABLE "SupportRequest"
    ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

-- Add closedById column (who resolved/closed the request)
ALTER TABLE "SupportRequest"
    ADD COLUMN IF NOT EXISTS "closedById" TEXT;

-- Add index on assignedToId for efficient assignment queries
CREATE INDEX IF NOT EXISTS "SupportRequest_assignedToId_idx"
    ON "SupportRequest"("assignedToId");
