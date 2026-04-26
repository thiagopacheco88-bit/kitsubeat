-- drizzle/0009_song_plays.sql
-- Play tracking — one row per first-play event per page mount.
--
-- Idempotent via (song_version_id, session_key) unique constraint: repeated
-- plays of the same song in one mount collapse to a single row.
--
-- Applied manually per project convention (IF NOT EXISTS guards — safe to re-apply).

CREATE TABLE IF NOT EXISTS "song_plays" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "song_version_id" uuid NOT NULL,
  "user_id" text,
  "session_key" text NOT NULL,
  "played_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "song_plays_version_session_unique" UNIQUE ("song_version_id", "session_key"),
  CONSTRAINT "song_plays_song_version_id_fk" FOREIGN KEY ("song_version_id") REFERENCES "song_versions"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "song_plays_song_version_id_idx" ON "song_plays" ("song_version_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "song_plays_user_id_idx" ON "song_plays" ("user_id");
