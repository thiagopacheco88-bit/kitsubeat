-- Migration: Data Foundation — Phase 7
-- Creates vocabulary_items, user_vocab_mastery, user_exercise_log, subscriptions tables
-- and the vocab_global materialized view for aggregated vocabulary data.

-- 1. Create vocabulary_items table
-- Identity is defined by (dictionary_form, reading) — ensures progress is not orphaned
-- when content corrections change surface forms.
CREATE TABLE IF NOT EXISTS "vocabulary_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dictionary_form" text NOT NULL,
  "reading" text NOT NULL,
  "romaji" text NOT NULL,
  "part_of_speech" text NOT NULL,
  "jlpt_level" "jlpt_level",
  "is_katakana_loanword" boolean DEFAULT false NOT NULL,
  "meaning" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vocabulary_items_form_reading_unique" UNIQUE ("dictionary_form", "reading")
);--> statement-breakpoint

-- 2. Create user_vocab_mastery table (FSRS scalar columns — Pattern 3)
-- Uses individual numeric columns (not JSONB) for indexed due-date queries.
-- State: 0=New, 1=Learning, 2=Review, 3=Relearning
CREATE TABLE IF NOT EXISTS "user_vocab_mastery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "vocab_item_id" uuid NOT NULL REFERENCES "vocabulary_items"("id"),
  "stability" real,
  "difficulty" real,
  "elapsed_days" integer DEFAULT 0 NOT NULL,
  "scheduled_days" integer DEFAULT 0 NOT NULL,
  "reps" integer DEFAULT 0 NOT NULL,
  "lapses" integer DEFAULT 0 NOT NULL,
  "state" smallint DEFAULT 0 NOT NULL,
  "due" timestamp with time zone DEFAULT now() NOT NULL,
  "last_review" timestamp with time zone,
  "intensity_preset" text DEFAULT 'normal' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_vocab_mastery_user_vocab_unique" UNIQUE ("user_id", "vocab_item_id")
);--> statement-breakpoint

-- Indexes for due-date queries (required for FSRS scheduling)
CREATE INDEX IF NOT EXISTS "user_vocab_mastery_due_idx" ON "user_vocab_mastery" ("due");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_vocab_mastery_user_due_idx" ON "user_vocab_mastery" ("user_id", "due");--> statement-breakpoint

-- 3. Create user_exercise_log table
-- Immutable record of every exercise attempt. song_version_id is nullable
-- because kana exercises have no associated song.
-- Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
CREATE TABLE IF NOT EXISTS "user_exercise_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "vocab_item_id" uuid NOT NULL REFERENCES "vocabulary_items"("id"),
  "song_version_id" uuid REFERENCES "song_versions"("id"),
  "exercise_type" text NOT NULL,
  "rating" smallint NOT NULL,
  "response_time_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 4. Create subscriptions table (provider-agnostic)
-- Designed for portability across payment providers (Stripe, Lemon Squeezy, etc.)
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "plan" text NOT NULL,
  "status" text NOT NULL,
  "provider" text,
  "provider_subscription_id" text,
  "provider_customer_id" text,
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 5. Create vocab_global materialized view
-- Aggregates vocabulary items across all song versions via LATERAL jsonb_array_elements.
-- Requires vocab_item_id to be patched into lesson JSONB by the backfill script (Plan 02).
-- The unique index enables CONCURRENTLY refresh via refreshVocabGlobal() in queries.ts.
CREATE MATERIALIZED VIEW IF NOT EXISTS "vocab_global" AS
  SELECT
    vi.id AS vocab_item_id,
    sv.song_id,
    sv.version_type::text,
    vi.dictionary_form,
    vi.reading,
    vi.jlpt_level::text
  FROM song_versions sv
  CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
  JOIN vocabulary_items vi ON vi.id = (elem->>'vocab_item_id')::uuid
  WHERE sv.lesson IS NOT NULL
    AND elem->>'vocab_item_id' IS NOT NULL;--> statement-breakpoint

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS "vocab_global_item_song_version_unique"
  ON "vocab_global" (vocab_item_id, song_id, version_type);
