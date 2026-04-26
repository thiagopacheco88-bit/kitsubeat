-- drizzle/0011_song_language.sql
-- Add language column to songs — ISO 639-1 vocal language code. Default "ja"
-- so existing rows remain in the learning catalog. Non-JP rows (AoT OSTs in
-- German/English/Latin) are flagged by scripts/seed/backfill-song-language.ts
-- and filtered out of the learning UI by queries.ts.
--
-- Applied manually per project convention (IF NOT EXISTS guards — safe to re-apply).

ALTER TABLE "songs"
  ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'ja' NOT NULL;
