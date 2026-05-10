-- drizzle/0021_anime_metadata_enrichment.sql
-- Adds rich AniList metadata fields to anime_metadata for genre/era carousels.

ALTER TABLE "anime_metadata"
  ADD COLUMN IF NOT EXISTS "start_year" integer,
  ADD COLUMN IF NOT EXISTS "genres" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "season" text,
  ADD COLUMN IF NOT EXISTS "season_year" integer,
  ADD COLUMN IF NOT EXISTS "average_score" integer,
  ADD COLUMN IF NOT EXISTS "popularity" integer;
