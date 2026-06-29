-- Add internal verification token (UUID, never shown in UI)
ALTER TABLE "InternshipArchive" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "InternshipArchive_verificationToken_key" ON "InternshipArchive"("verificationToken");

-- Replace VerificationStatus enum: ACTIVE | REVOKED | EXPIRED
ALTER TYPE "VerificationStatus" RENAME TO "VerificationStatus_old";
CREATE TYPE "VerificationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

ALTER TABLE "InternshipArchive" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "InternshipArchive" ALTER COLUMN "verificationStatus" TYPE "VerificationStatus" USING (
  CASE "verificationStatus"::text
    WHEN 'REVOKED' THEN 'REVOKED'::"VerificationStatus"
    WHEN 'EXPIRED' THEN 'EXPIRED'::"VerificationStatus"
    ELSE 'ACTIVE'::"VerificationStatus"
  END
);
ALTER TABLE "InternshipArchive" ALTER COLUMN "verificationStatus" SET DEFAULT 'ACTIVE';

DROP TYPE "VerificationStatus_old";
