-- drizzle/0015_admin_lyrics_editor.sql
-- Phase 11.5: Admin Lyrics Editor — versioned lyrics, drafts, video swap audit,
-- pipeline + quality status columns.
--
-- Idempotent: safe to re-apply. All ALTERs use IF NOT EXISTS / IF EXISTS guards.
-- Backfill at the bottom is also idempotent (NOT EXISTS guard on existing lyrics_versions row per song).
-- Applied manually via: tsx scripts/apply-migrations.ts (NOT drizzle-kit migrate per project convention).

-- ============================================================================
-- 1. Enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "lyrics_version_source" AS ENUM ('auto','ai-assist','human','regen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "pipeline_status" AS ENUM ('idle','rerun_in_progress','rerun_failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "quality_status" AS ENUM ('active','flagged_wrong_song','flagged_unfixable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. lyrics_versions — indefinite-retention version history
-- ============================================================================

CREATE TABLE IF NOT EXISTS "lyrics_versions" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "song_version_id"     uuid NOT NULL REFERENCES "song_versions"("id") ON DELETE NO ACTION,
  "version_number"      integer NOT NULL,
  "source"              "lyrics_version_source" NOT NULL,
  "editor_id"           text NULL,                  -- Clerk user_id; null when source='auto'
  "verses"              jsonb NOT NULL,
  "parent_version_id"   uuid NULL REFERENCES "lyrics_versions"("id") ON DELETE NO ACTION,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "lyrics_versions_song_version_id_version_number_unique"
    UNIQUE ("song_version_id", "version_number")
);

CREATE INDEX IF NOT EXISTS "lyrics_versions_song_version_id_created_at_idx"
  ON "lyrics_versions" ("song_version_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "lyrics_versions_song_version_id_source_idx"
  ON "lyrics_versions" ("song_version_id", "source");

COMMENT ON TABLE "lyrics_versions" IS
  'Phase 11.5: indefinite-retention snapshot per published lyrics edit. source IN (auto,ai-assist,human,regen). parent_version_id self-FK powers gap-analysis CTE: for each human row find its parent ai-assist row and diff.';

-- ============================================================================
-- 3. lyrics_drafts — single row per (song, editor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "lyrics_drafts" (
  "song_version_id"      uuid NOT NULL REFERENCES "song_versions"("id") ON DELETE CASCADE,
  "editor_id"            text NOT NULL,
  "base_version_id"      uuid NOT NULL REFERENCES "lyrics_versions"("id") ON DELETE NO ACTION,
  "verses"               jsonb NOT NULL,
  "dirty_verse_numbers"  integer[] NOT NULL DEFAULT '{}',
  "updated_at"           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("song_version_id", "editor_id")
);

COMMENT ON TABLE "lyrics_drafts" IS
  'Phase 11.5: per-editor in-flight draft. base_version_id used for stale-publish detection (D-18). dirty_verse_numbers scopes Regenerate Lessons (D-07).';

-- ============================================================================
-- 4. song_video_history — video swap audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS "song_video_history" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "song_version_id"     uuid NOT NULL REFERENCES "song_versions"("id") ON DELETE CASCADE,
  "old_youtube_id"      text NULL,
  "new_youtube_id"      text NOT NULL,
  "changed_at"          timestamptz NOT NULL DEFAULT now(),
  "changed_by"          text NOT NULL,    -- Clerk user_id
  "reason"              text NULL
);

CREATE INDEX IF NOT EXISTS "song_video_history_song_version_id_changed_at_idx"
  ON "song_video_history" ("song_version_id", "changed_at" DESC);

-- ============================================================================
-- 5. song_versions — new columns
-- ============================================================================

ALTER TABLE "song_versions"
  ADD COLUMN IF NOT EXISTS "active_lyrics_version_id" uuid NULL
    REFERENCES "lyrics_versions"("id") ON DELETE NO ACTION,
  ADD COLUMN IF NOT EXISTS "pipeline_status" "pipeline_status" NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS "pipeline_step"   text NULL,
  ADD COLUMN IF NOT EXISTS "pipeline_started_at" timestamptz NULL;

CREATE INDEX IF NOT EXISTS "song_versions_pipeline_status_idx"
  ON "song_versions" ("pipeline_status")
  WHERE "pipeline_status" <> 'idle';   -- partial index, tiny; matters because most rows are idle

-- ============================================================================
-- 6. songs — quality columns
-- ============================================================================

ALTER TABLE "songs"
  ADD COLUMN IF NOT EXISTS "quality_status" "quality_status" NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "quality_notes"  text NULL;

CREATE INDEX IF NOT EXISTS "songs_quality_status_idx"
  ON "songs" ("quality_status")
  WHERE "quality_status" <> 'active';

-- ============================================================================
-- 7. Backfill — every existing song_versions row that has a lesson gets a
--    source='auto' lyrics_versions row, and active_lyrics_version_id points at it
-- ============================================================================

WITH inserted AS (
  INSERT INTO "lyrics_versions"
    ("song_version_id", "version_number", "source", "editor_id", "verses", "parent_version_id", "created_at")
  SELECT
    sv.id,
    1,
    'auto',
    NULL,
    COALESCE(sv.lesson->'verses', '[]'::jsonb),
    NULL,
    sv.created_at
  FROM "song_versions" sv
  WHERE sv.lesson IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "lyrics_versions" lv WHERE lv.song_version_id = sv.id
    )
  RETURNING id, song_version_id
)
UPDATE "song_versions" sv
   SET active_lyrics_version_id = inserted.id
  FROM inserted
 WHERE sv.id = inserted.song_version_id
   AND sv.active_lyrics_version_id IS NULL;
