-- Scenes feature: content_type column on songs
-- Distinguishes OP/ED/OST songs from famous dialogue scenes.
-- Defaults to 'song' so all existing rows are unaffected.

CREATE TYPE "public"."content_type" AS ENUM('song', 'scene');
ALTER TABLE "songs" ADD COLUMN "content_type" "content_type" NOT NULL DEFAULT 'song';
