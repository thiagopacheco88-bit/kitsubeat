-- Phase 18.x: YouTube video availability flag
-- is_available defaults to true for all existing songs.
-- Set to false via the audit script when a video is blocked/removed/private.
-- All public browse/catalog queries filter on is_available = true.
-- Admin content-status page shows is_available = false rows for review.

ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
