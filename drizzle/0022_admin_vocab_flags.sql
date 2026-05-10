-- drizzle/0022_admin_vocab_flags.sql
-- Admin exercise review: flag vocabulary items that have issues

ALTER TABLE "vocabulary_items"
  ADD COLUMN IF NOT EXISTS "admin_flagged" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "admin_flag_note" text;
