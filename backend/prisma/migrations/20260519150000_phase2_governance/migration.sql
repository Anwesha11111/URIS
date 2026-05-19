-- =============================================================================
-- Migration: phase2_governance
-- Phase 2 — Enterprise governance foundation.
--
-- Changes:
--   1. UserRoleHistory — append-only role change audit trail
--   2. LoginLog        — login attempt logging (IP, user-agent, success/fail)
--   3. BlockedIP       — IP block list enforced by middleware
--
-- Safety guarantees:
--   - No existing tables or columns are modified
--   - No data is migrated or deleted
--   - Fully backward compatible
--   - All tables are additive only
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. UserRoleHistory
--    Append-only audit trail of every role change.
--    previousRole / newRole reference the Role enum (already exists).
-- ---------------------------------------------------------------------------
CREATE TABLE "UserRoleHistory" (
  "id"           TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"       TEXT    NOT NULL,
  "previousRole" "Role"  NOT NULL,
  "newRole"      "Role"  NOT NULL,
  "changedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "changedById"  TEXT,
  "reason"       TEXT,

  CONSTRAINT "UserRoleHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserRoleHistory_userId_idx"    ON "UserRoleHistory"("userId");
CREATE INDEX "UserRoleHistory_changedAt_idx" ON "UserRoleHistory"("changedAt");

-- ---------------------------------------------------------------------------
-- 2. LoginLog
--    Records every login attempt with IP and user-agent for security auditing.
--    userId is nullable — failed attempts for unknown emails have no userId.
-- ---------------------------------------------------------------------------
CREATE TABLE "LoginLog" (
  "id"          TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT,
  "email"       TEXT    NOT NULL,
  "ipAddress"   TEXT    NOT NULL,
  "userAgent"   TEXT,
  "success"     BOOLEAN NOT NULL,
  "failReason"  TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginLog_userId_idx"    ON "LoginLog"("userId");
CREATE INDEX "LoginLog_ipAddress_idx" ON "LoginLog"("ipAddress");
CREATE INDEX "LoginLog_email_idx"     ON "LoginLog"("email");
CREATE INDEX "LoginLog_createdAt_idx" ON "LoginLog"("createdAt");
CREATE INDEX "LoginLog_success_idx"   ON "LoginLog"("success");

-- ---------------------------------------------------------------------------
-- 3. BlockedIP
--    IP block list. Enforced by middleware before any route handler runs.
--    expiresAt = NULL means permanent block.
-- ---------------------------------------------------------------------------
CREATE TABLE "BlockedIP" (
  "id"          TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "ipAddress"   TEXT    NOT NULL,
  "reason"      TEXT,
  "blockedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt"   TIMESTAMPTZ,
  "blockedById" TEXT,

  CONSTRAINT "BlockedIP_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "BlockedIP_ipAddress_key"     UNIQUE ("ipAddress")
);

CREATE INDEX "BlockedIP_ipAddress_idx" ON "BlockedIP"("ipAddress");
CREATE INDEX "BlockedIP_expiresAt_idx" ON "BlockedIP"("expiresAt");
