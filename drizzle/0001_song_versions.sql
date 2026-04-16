-- Migration: Extract version-specific data from songs into song_versions table
-- Each song can have a "tv" (anime OP/ED cut) and/or "full" version

-- 1. Create the version_type enum
CREATE TYPE "public"."version_type" AS ENUM('tv', 'full');--> statement-breakpoint

-- 2. Create the song_versions table
CREATE TABLE "song_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
  "version_type" "version_type" NOT NULL,
  "youtube_id" text,
  "lesson" jsonb,
  "lyrics_source" text,
  "synced_lrc" jsonb,
  "timing_youtube_id" text,
  "timing_data" jsonb,
  "timing_verified" "timing_verified_status" DEFAULT 'auto' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 3. Migrate existing data: create a "full" version row for every song that has content
INSERT INTO "song_versions" ("song_id", "version_type", "youtube_id", "lesson", "lyrics_source", "synced_lrc", "timing_youtube_id", "timing_data", "timing_verified", "created_at", "updated_at")
SELECT
  "id",
  'full',
  "youtube_id",
  "lesson",
  "lyrics_source",
  "synced_lrc",
  "timing_youtube_id",
  "timing_data",
  "timing_verified",
  "created_at",
  "updated_at"
FROM "songs"
WHERE "youtube_id" IS NOT NULL OR "lesson" IS NOT NULL;--> statement-breakpoint

-- 4. Create a "tv" version row for songs that have a youtube_id_short (video only, no lesson yet)
INSERT INTO "song_versions" ("song_id", "version_type", "youtube_id", "created_at", "updated_at")
SELECT
  "id",
  'tv',
  "youtube_id_short",
  "created_at",
  "updated_at"
FROM "songs"
WHERE "youtube_id_short" IS NOT NULL;--> statement-breakpoint

-- 5. Drop version-specific columns from songs table
ALTER TABLE "songs" DROP COLUMN IF EXISTS "youtube_id";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "youtube_id_short";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "lesson";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "lyrics_source";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "synced_lrc";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "timing_youtube_id";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "timing_data";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "timing_verified";--> statement-breakpoint

-- 6. Add unique constraint: one version type per song
ALTER TABLE "song_versions" ADD CONSTRAINT "song_versions_song_id_version_type_unique" UNIQUE ("song_id", "version_type");
