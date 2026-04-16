-- Migration: Exercise Engine — Phase 8
-- Creates user_song_progress table for per-user song-level progress tracking.
-- Stars are derived at read time via deriveStars() — never stored as a column.

CREATE TABLE IF NOT EXISTS "user_song_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "song_version_id" uuid NOT NULL REFERENCES "song_versions"("id"),
  "completion_pct" real DEFAULT 0 NOT NULL,
  "ex1_2_3_best_accuracy" real,
  "ex4_best_accuracy" real,
  "sessions_completed" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_song_progress_user_version_unique" UNIQUE ("user_id", "song_version_id")
);--> statement-breakpoint

-- Index on user_id for fast per-user progress lookups
CREATE INDEX IF NOT EXISTS "user_song_progress_user_id_idx" ON "user_song_progress" ("user_id");
