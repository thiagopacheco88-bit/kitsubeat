-- drizzle/0024_anime_vocab_catalog.sql
-- Phase 18.3: Anime Vocabulary Carousel — join table linking anime slugs to vocabulary_items.
--
-- Applied via: npx tsx scripts/apply-migrations.ts
-- DO NOT use drizzle-kit migrate — see Phase 11.6 pitfall re: corrupted journal.

CREATE TABLE IF NOT EXISTS "anime_vocab_catalog" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "anime_slug"    text NOT NULL,
  "vocab_item_id" uuid NOT NULL REFERENCES "vocabulary_items"("id") ON DELETE CASCADE,
  "category"      text NOT NULL,
  "display_order" integer NOT NULL,
  "context_note"  text,
  "created_at"    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "anime_vocab_catalog_slug_vocab_unique"
  ON "anime_vocab_catalog"("anime_slug", "vocab_item_id");

CREATE INDEX IF NOT EXISTS "anime_vocab_catalog_slug_order_idx"
  ON "anime_vocab_catalog"("anime_slug", "display_order");
