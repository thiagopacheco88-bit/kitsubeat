-- drizzle/0007_advanced_exercises.sql
-- Phase 10: Advanced Exercises & Full Mastery — data-layer foundation.
--
-- Note on migration numbering: the plan asked for 0006_advanced_exercises.sql,
-- but 0006_review_daily_counter.sql already exists (Phase 11 Plan 05 used it).
-- Using 0007 to avoid collision. Applied manually per STATE.md decision
-- "Migration written manually" (drizzle-kit generate interactive due to
-- unregistered 0001 migration in journal).
--
-- Adds:
--   1. Three new best-accuracy columns on user_song_progress
--        ex5_best_accuracy → grammar_conjugation (bonus badge)
--        ex6_best_accuracy → listening_drill (drives Star 3)
--        ex7_best_accuracy → sentence_order  (bonus badge)
--      All real + nullable (NULL means "not yet attempted").
--      Stars are STILL derived at read time via deriveStars() — never stored.
--
--   2. user_exercise_song_counters table — per-user, per-exercise-family
--      song-set membership tracker. Enforces the FREE-05 quota gate:
--        listening family       → 10 distinct songs free
--        advanced_drill family  → 3 distinct songs free (shared Ex5 + Ex7)
--      Unique constraint on (user_id, exercise_family, song_version_id) makes
--      INSERT ... ON CONFLICT DO NOTHING idempotent for the "first attempt"
--      counter-increment semantic (see Plan 06 pitfall 5).

ALTER TABLE "user_song_progress"
  ADD COLUMN IF NOT EXISTS "ex5_best_accuracy" real,
  ADD COLUMN IF NOT EXISTS "ex6_best_accuracy" real,
  ADD COLUMN IF NOT EXISTS "ex7_best_accuracy" real;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_exercise_song_counters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "exercise_family" text NOT NULL,
  "song_version_id" uuid NOT NULL REFERENCES "song_versions"("id"),
  "first_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_exercise_song_counters_user_family_version_unique"
    UNIQUE ("user_id", "exercise_family", "song_version_id")
);
--> statement-breakpoint

-- Index for COUNT(*) WHERE user_id=X AND exercise_family=Y — the quota-check hot path.
CREATE INDEX IF NOT EXISTS "user_exercise_song_counters_user_family_idx"
  ON "user_exercise_song_counters" ("user_id", "exercise_family");
