-- Add portfolio fields to Intern table
ALTER TABLE "Intern" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Intern" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "Intern" ADD COLUMN IF NOT EXISTS "profilePic" TEXT;
ALTER TABLE "Intern" ADD COLUMN IF NOT EXISTS "contactNumber" TEXT;
ALTER TABLE "Intern" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "Intern" ADD COLUMN IF NOT EXISTS "skills" TEXT[] NOT NULL DEFAULT '{}';

-- Create unique index on slug (nullable unique)
CREATE UNIQUE INDEX IF NOT EXISTS "Intern_slug_key" ON "Intern"("slug");

-- Auto-populate slug from id for existing interns that don't have one
UPDATE "Intern" SET "slug" = id WHERE "slug" IS NULL;
