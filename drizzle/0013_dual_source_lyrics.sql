-- drizzle/0013_dual_source_lyrics.sql
-- Phase 13.5: Dual-source lyrics — preserve canonical (lrclib/genius) AND
-- whisper transcriptions side-by-side instead of overwriting on validator flips.
--
-- Background:
--   The previous flow stored a single lyrics source per song_version. When the
--   03b validator flagged a song as REJECT, 04b would overwrite raw_lyrics with
--   Whisper text and 05-insert-db would push only the active version to Neon.
--   The original lrclib lyrics survived only as a quarantine file in
--   data/lyrics-cache/_rejected/, never visible from the DB.
--
--   With Demucs+WhisperX (kCov +0.24 mean uplift) we now want to:
--     1. Keep both sources permanently, in the DB, for review and rollback.
--     2. Re-run the validator on stem-quality data without risk of data loss.
--     3. Power a future side-by-side manual review UI.
--
-- Shape:
--   canonical_lyrics: { source, raw_lyrics, synced_lrc, fetched_at }
--   whisper_lyrics:   { model, raw_lyrics, words, kcov_against_canonical, transcribed_at }
--   The existing synced_lrc / raw_lyrics / lyrics_source columns continue to
--   represent the ACTIVE rendered lyrics — no renderer change required.
--
-- Applied manually per project convention (IF NOT EXISTS guards — safe to re-apply).

ALTER TABLE "song_versions"
  ADD COLUMN IF NOT EXISTS "canonical_lyrics" jsonb,
  ADD COLUMN IF NOT EXISTS "whisper_lyrics" jsonb;

COMMENT ON COLUMN "song_versions"."canonical_lyrics" IS
  'Frozen canonical lyrics from lrclib/genius. Shape: {source, raw_lyrics, synced_lrc, fetched_at}. Never overwritten by validator flips.';

COMMENT ON COLUMN "song_versions"."whisper_lyrics" IS
  'Frozen Whisper transcription. Shape: {model, raw_lyrics, words, kcov_against_canonical, transcribed_at}. Updated when Demucs+WhisperX repass produces a new transcription.';
