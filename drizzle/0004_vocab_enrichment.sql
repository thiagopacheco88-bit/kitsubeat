-- drizzle/0004_vocab_enrichment.sql
-- Phase 08.3: enrichment fields on vocabulary_items

ALTER TABLE "vocabulary_items"
  ADD COLUMN IF NOT EXISTS "mnemonic" jsonb;
--> statement-breakpoint
ALTER TABLE "vocabulary_items"
  ADD COLUMN IF NOT EXISTS "kanji_breakdown" jsonb;
