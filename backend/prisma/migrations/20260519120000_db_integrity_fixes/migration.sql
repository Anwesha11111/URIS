-- =============================================================================
-- Migration: db_integrity_fixes
-- Fixes 10 schema-level issues identified in the database audit:
--   1. Unique constraint on Review(internId, taskId) — prevents duplicate reviews
--   2. FK constraint on Alert.taskId — referential integrity
--   3. Composite index on ScoreHistory(internId, type, createdAt) — query perf
--   4. Composite index on Alert(internId, resolved) — query perf
--   5. UserTeam.role converted to enum — prevents invalid role strings
--   6. FK on InternDigest.internId — referential integrity
--   7. FK on SyncLog.internId — referential integrity (nullable)
--   8. FK on Activity.userId — referential integrity
--   9. FK on AuditLog.userId — referential integrity (nullable)
--  10. ScoreHistory pruning index — supports efficient TTL cleanup
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Unique constraint on Review(internId, taskId)
--    Prevents duplicate reviews for the same task at the DB level.
--    Application-level check in businessRules.js is a race-condition risk;
--    this constraint is the authoritative guard.
--    Only applies when taskId is not null (a review without a task is allowed).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "Review_internId_taskId_key"
  ON "Review"("internId", "taskId")
  WHERE "taskId" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. FK constraint on Alert.taskId → Task.id
--    Alerts referencing deleted or non-existent tasks are orphaned.
--    ON DELETE SET NULL: if a task is hard-deleted, the alert survives but
--    loses its task link (consistent with soft-delete pattern).
-- ---------------------------------------------------------------------------
ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- 3. Composite index on ScoreHistory(internId, type, createdAt DESC)
--    Every capacity/credibility/performance query filters by internId + type
--    and orders by createdAt DESC. The existing single-column internId index
--    forces a full scan of that intern's rows to apply the type filter.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ScoreHistory_internId_type_createdAt_idx"
  ON "ScoreHistory"("internId", "type", "createdAt" DESC);

-- ---------------------------------------------------------------------------
-- 4. Composite index on Alert(internId, resolved)
--    The most common alert query is WHERE internId = ? AND resolved = false.
--    Separate indexes on internId and resolved cannot be combined efficiently.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Alert_internId_resolved_idx"
  ON "Alert"("internId", "resolved");

-- ---------------------------------------------------------------------------
-- 5. UserTeam.role — add check constraint to enforce valid values
--    Converting to a Prisma enum requires a full migration cycle.
--    A CHECK constraint achieves the same safety without a type change.
-- ---------------------------------------------------------------------------
ALTER TABLE "UserTeam"
  ADD CONSTRAINT "UserTeam_role_check"
  CHECK ("role" IN ('member', 'lead'));

-- ---------------------------------------------------------------------------
-- 6. FK on InternDigest.internId → Intern.id
--    Digest rows must reference a real intern.
--    ON DELETE CASCADE: if an intern is removed, their digests go with them.
-- ---------------------------------------------------------------------------
ALTER TABLE "InternDigest"
  ADD CONSTRAINT "InternDigest_internId_fkey"
  FOREIGN KEY ("internId") REFERENCES "Intern"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. FK on SyncLog.internId → Intern.id (nullable)
--    Sync logs may have a null internId (system-level sync events).
--    ON DELETE SET NULL: if intern is removed, log survives for audit purposes.
-- ---------------------------------------------------------------------------
ALTER TABLE "SyncLog"
  ADD CONSTRAINT "SyncLog_internId_fkey"
  FOREIGN KEY ("internId") REFERENCES "Intern"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 8. FK on Activity.userId → User.id
--    Activity records must reference a real user.
--    ON DELETE CASCADE: if a user is removed, their activity log goes with them.
-- ---------------------------------------------------------------------------
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 9. FK on AuditLog.userId → User.id (nullable)
--    userId is null for system-generated events — that's intentional.
--    ON DELETE SET NULL: if a user is removed, audit entries survive for
--    compliance but lose the user link.
-- ---------------------------------------------------------------------------
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 10. ScoreHistory pruning support index
--     Supports efficient deletion of old score history rows:
--       DELETE FROM "ScoreHistory" WHERE "createdAt" < NOW() - INTERVAL '1 year'
--     Without this index, pruning scans the entire table.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ScoreHistory_createdAt_idx"
  ON "ScoreHistory"("createdAt");
