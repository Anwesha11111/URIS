-- Manual, non-destructive migration for enterprise soft reservations
-- Creates:
--   - enum ReservationStatus
--   - table soft_reservations (modeled after Prisma model SoftReservation)
--
-- Notes:
-- - Assumes schema name is `public`.
-- - Uses uuid generation via gen_random_uuid() (Postgres pgcrypto). If your DB
--   lacks pgcrypto, you may replace with uuid_generate_v4().

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReservationStatus') THEN
    CREATE TYPE "ReservationStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','EXPIRED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "soft_reservations" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "taskId"        TEXT NOT NULL,
  "candidateId"   TEXT NOT NULL,
  "reservedById"  TEXT NOT NULL,
  "status"        "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"    TIMESTAMPTZ NOT NULL,
  "respondedAt"  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS "soft_reservations_taskId_idx" ON "soft_reservations"("taskId");
CREATE INDEX IF NOT EXISTS "soft_reservations_candidateId_idx" ON "soft_reservations"("candidateId");
CREATE INDEX IF NOT EXISTS "soft_reservations_status_idx" ON "soft_reservations"("status");
CREATE INDEX IF NOT EXISTS "soft_reservations_expiresAt_idx" ON "soft_reservations"("expiresAt");

COMMIT;

