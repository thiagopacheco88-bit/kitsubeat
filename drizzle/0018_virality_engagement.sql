-- drizzle/0018_virality_engagement.sql
-- Phase 14.4: Virality & Engagement — all schema changes in one atomic file (D-24)
--
-- Applied via: tsx scripts/apply-migrations.ts (auto-discovered alphabetically).
-- DO NOT use drizzle-kit migrate — see Phase 11.6 pitfall re: corrupted journal.

BEGIN;

-- 1. Users table extensions (3 new columns)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "social_activity_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "streak_saver_token" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "streak_saver_pending" boolean NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD CONSTRAINT IF NOT EXISTS "users_streak_saver_token_check"
    CHECK (streak_saver_token IN (0, 1));

--> statement-breakpoint

-- 2. activity_events table (song-mastery events for the home ticker)
CREATE TABLE IF NOT EXISTS "activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL CHECK (event_type = 'song_mastered'),
  "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
  "song_version_id" uuid NOT NULL REFERENCES "song_versions"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "song_id")
);

CREATE INDEX IF NOT EXISTS "activity_events_created_at_idx"
  ON "activity_events" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "activity_events_user_id_idx"
  ON "activity_events" ("user_id");

--> statement-breakpoint

-- 3. email_sent_log table (idempotency guard for all transactional emails)
CREATE TABLE IF NOT EXISTS "email_sent_log" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" text NOT NULL CHECK (kind IN ('daily_reminder', 'weekly_recap')),
  "period_key" text NOT NULL,
  "sent_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "kind", "period_key")
);

COMMIT;
