-- drizzle/0017_dual_card_kind_and_verse_domination.sql
-- Phase 11.6: dual FSRS cards per word + per-verse domination + denormalized track pct
--
-- Idempotent: safe to re-apply. All ALTERs use IF NOT EXISTS / IF EXISTS guards.
-- DESTRUCTIVE: deletes all user_vocab_mastery rows (per CONTEXT D-01 / SPEC-REQ-4 wipe-and-restart).
-- Applied manually via: tsx scripts/apply-migrations.ts (NOT drizzle-kit migrate per project convention).
--
-- DO NOT run `npm run db:generate` — drizzle journal is corrupted from Phase 11.4 popularity_rank
-- drift + Phase 11.5 hand-writes + Phase 14 theme-prefs. Hand-write 0017 directly. See 11.6-RESEARCH §Pitfall 1.

BEGIN;

-- 1. Wipe existing user_vocab_mastery rows (CONTEXT D-01: makes NOT NULL on new card_kind safe)
DELETE FROM "user_vocab_mastery";

-- 2. Create card_kind enum
DO $$ BEGIN
  CREATE TYPE "card_kind" AS ENUM ('romaji_meaning','kanji_kana');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Drop the existing natural-key uniqueness (NOT the surrogate id PK — verified RESEARCH A7)
ALTER TABLE "user_vocab_mastery"
  DROP CONSTRAINT IF EXISTS "user_vocab_mastery_user_vocab_unique";

-- 4. Add card_kind column NOT NULL (table is empty after DELETE — safe)
ALTER TABLE "user_vocab_mastery"
  ADD COLUMN IF NOT EXISTS "card_kind" "card_kind" NOT NULL;

-- 5. New composite uniqueness — replaces the prior (user_id, vocab_item_id) unique
ALTER TABLE "user_vocab_mastery"
  ADD CONSTRAINT "user_vocab_mastery_user_vocab_kind_unique"
    UNIQUE ("user_id","vocab_item_id","card_kind");

-- 6. user_verse_domination table (CONTEXT D-02)
CREATE TABLE IF NOT EXISTS "user_verse_domination" (
  "user_id"         text NOT NULL,
  "song_version_id" uuid NOT NULL REFERENCES "song_versions"("id") ON DELETE CASCADE,
  "verse_number"    integer NOT NULL,
  "dominated_at"    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id","song_version_id","verse_number")
);

CREATE INDEX IF NOT EXISTS "user_verse_domination_user_song_idx"
  ON "user_verse_domination" ("user_id","song_version_id");

-- 7. Denormalized per-track pct columns on user_song_progress (CONTEXT D-03)
ALTER TABLE "user_song_progress"
  ADD COLUMN IF NOT EXISTS "vocab_track_pct"             numeric(5,2),
  ADD COLUMN IF NOT EXISTS "grammar_track_pct"           numeric(5,2),
  ADD COLUMN IF NOT EXISTS "kanji_track_pct"             numeric(5,2),
  ADD COLUMN IF NOT EXISTS "advanced_drills_unlocked_at" timestamptz;

COMMIT;
