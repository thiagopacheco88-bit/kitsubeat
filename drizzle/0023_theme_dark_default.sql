-- drizzle/0023_theme_dark_default.sql
-- Remove 'system' from theme_preference enum: new default is 'dark'.
-- Existing 'system' rows are migrated to 'dark' (safe — system resolved
-- to OS pref which is unknowable server-side; dark is the app default).
--
-- Applied via: npx tsx scripts/apply-migrations.ts

-- Migrate existing 'system' values to 'dark' before tightening the constraint.
UPDATE "users" SET "theme_preference" = 'dark' WHERE "theme_preference" = 'system';

-- Update column default.
ALTER TABLE "users" ALTER COLUMN "theme_preference" SET DEFAULT 'dark';

-- Drop old constraint and recreate with only light|dark.
DO $$ BEGIN
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_theme_preference_check";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_theme_preference_check"
    CHECK ("theme_preference" IN ('light','dark'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
