-- drizzle/0014_vocab_image_url.sql
-- Phase 11.4: image URL enrichment on vocabulary_items

ALTER TABLE "vocabulary_items"
  ADD COLUMN IF NOT EXISTS "image_url" text;
