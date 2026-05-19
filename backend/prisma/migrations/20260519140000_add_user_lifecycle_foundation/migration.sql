-- =============================================================================
-- Migration: add_user_lifecycle_foundation
-- Phase 1 — Enterprise user lifecycle foundation.
--
-- Changes:
--   1. Create UserStatus enum (ACTIVE, INACTIVE, ARCHIVED, REMOVED)
--   2. Create ArchivedUser table for non-destructive user archival snapshots
--
-- Safety guarantees:
--   - No existing tables or columns are modified
--   - No data is migrated or deleted
--   - Fully backward compatible — existing auth logic is unaffected
--   - The existing User.status TEXT column continues to drive auth ("active" |
--     "pending" | "alumni") and is NOT changed by this migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. UserStatus enum
--    Typed lifecycle states used by the ArchivedUser model.
--    Will gradually replace the free-text User.status column in a future
--    migration once all call-sites are updated.
-- ---------------------------------------------------------------------------
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'REMOVED');

-- ---------------------------------------------------------------------------
-- 2. ArchivedUser table
--    Stores a point-in-time JSON snapshot of a User record at archival time.
--    The original User row is preserved — this is purely additive.
--
--    originalId  — references the User.id (no FK to allow archival of deleted
--                  users in future; kept as a plain unique string for safety)
--    snapshot    — full JSONB snapshot of the user at archival time
--    status      — current lifecycle state of the archived record
--    archivedAt  — timestamp of archival
--    archivedById — admin who triggered archival (nullable for system events)
-- ---------------------------------------------------------------------------
CREATE TABLE "ArchivedUser" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "originalId"   TEXT        NOT NULL,
  "snapshot"     JSONB       NOT NULL,
  "status"       "UserStatus" NOT NULL DEFAULT 'ARCHIVED',
  "archivedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "archivedById" TEXT,

  CONSTRAINT "ArchivedUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ArchivedUser_originalId_key" UNIQUE ("originalId")
);

-- Indexes for common query patterns
CREATE INDEX "ArchivedUser_originalId_idx" ON "ArchivedUser"("originalId");
CREATE INDEX "ArchivedUser_archivedAt_idx" ON "ArchivedUser"("archivedAt");
CREATE INDEX "ArchivedUser_status_idx"     ON "ArchivedUser"("status");
