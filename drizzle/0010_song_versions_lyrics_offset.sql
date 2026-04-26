-- drizzle/0010_song_versions_lyrics_offset.sql
-- Add lyrics_offset_ms to song_versions — offset (ms) added to every synced_lrc
-- and verse timestamp at render time to correct intro-length drift between
-- LRCLIB's reference audio and the YouTube cut we embed.
--
-- Applied manually per project convention (IF NOT EXISTS guards — safe to re-apply).

ALTER TABLE "song_versions"
  ADD COLUMN IF NOT EXISTS "lyrics_offset_ms" integer DEFAULT 0 NOT NULL;
