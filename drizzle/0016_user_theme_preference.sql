-- drizzle/0016_user_theme_preference.sql
-- Phase 14: theme preference column on users (system | light | dark).
--
-- Idempotent: safe to re-apply. ALTER uses ADD COLUMN IF NOT EXISTS guard.
-- CHECK constraint added via DO $$ BEGIN ... EXCEPTION WHEN duplicate_object pattern (matches 0015 idiom).
-- Applied manually via: npx tsx scripts/apply-migrations.ts (NOT drizzle-kit migrate per project convention — Phase 11.4 D-01).

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "theme_preference" text NOT NULL DEFAULT 'system';

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_theme_preference_check"
    CHECK ("theme_preference" IN ('system','light','dark'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
