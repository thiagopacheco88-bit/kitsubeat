-- drizzle/0012_grammar_system.sql
-- Phase 13: Grammar System — normalized grammar rules + on-demand exercise bank.
--
-- Splits grammar out of lesson.grammar_points JSONB into first-class tables so
-- we can (a) attach an exercise bank per rule, (b) track per-rule FSRS mastery
-- across songs, (c) promote learners beginner → intermediate → advanced
-- independent of which song surfaced the rule.
--
-- Applied manually per project convention (IF NOT EXISTS guards — safe to re-apply).
--
-- Adds:
--   1. grammar_rules           — canonical rules keyed by (name, jlpt_reference)
--   2. grammar_exercises       — exercise bank, capped at 100 per (rule, level)
--                                by application logic in grammar-ai.ts
--   3. song_version_grammar_rules — join table replacing the JSONB-only link
--   4. user_grammar_rule_mastery  — FSRS state per (user, rule); current_level
--                                   promotes beginner → intermediate → advanced
--   5. user_grammar_exercise_log  — immutable per-answer log, parallel to
--                                   user_exercise_log (vocab)
--   6. user_song_progress.grammar_best_accuracy — drives Star 3 for songs with
--                                                 grammar (replaces ex6)

CREATE TABLE IF NOT EXISTS "grammar_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "jlpt_reference" text NOT NULL,
  "explanation" jsonb NOT NULL,
  "canonical_conjugation_template" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "grammar_rules_name_jlpt_unique" UNIQUE ("name", "jlpt_reference")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "grammar_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "grammar_rule_id" uuid NOT NULL REFERENCES "grammar_rules"("id") ON DELETE CASCADE,
  "level" text NOT NULL,                  -- 'beginner' | 'intermediate' | 'advanced'
  "exercise_type" text NOT NULL,          -- 'mcq_fill_blank' | 'write_romaji'
  "prompt_jp_furigana" text NOT NULL,     -- HTML with <ruby> or a known token format
  "prompt_romaji" text,                   -- nullable; populated for beginner aid
  "prompt_translation" jsonb NOT NULL,    -- Localizable { "en": "...", "pt-BR": "..." }
  "blank_token_index" integer NOT NULL,   -- which token is blanked in the prompt
  "correct_answer" text NOT NULL,         -- beginner/intermediate: the correct option;
                                          -- advanced: expected romaji input
  "distractors" jsonb,                    -- array<string>, null for advanced (free text)
  "hint" text,                            -- optional translated hint
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "grammar_exercises_rule_level_idx"
  ON "grammar_exercises" ("grammar_rule_id", "level");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "song_version_grammar_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "song_version_id" uuid NOT NULL REFERENCES "song_versions"("id") ON DELETE CASCADE,
  "grammar_rule_id" uuid NOT NULL REFERENCES "grammar_rules"("id") ON DELETE CASCADE,
  "display_order" integer DEFAULT 0 NOT NULL,
  "conjugation_path" text,                -- per-song context, e.g. "taberu → tabeta"
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "song_version_grammar_rules_version_rule_unique"
    UNIQUE ("song_version_id", "grammar_rule_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "song_version_grammar_rules_version_idx"
  ON "song_version_grammar_rules" ("song_version_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_grammar_rule_mastery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "grammar_rule_id" uuid NOT NULL REFERENCES "grammar_rules"("id") ON DELETE CASCADE,
  "current_level" text DEFAULT 'beginner' NOT NULL,  -- 'beginner' | 'intermediate' | 'advanced'

  -- FSRS scalar columns, parallel to user_vocab_mastery (Pattern 3)
  "stability" real,
  "difficulty" real,
  "elapsed_days" integer DEFAULT 0 NOT NULL,
  "scheduled_days" integer DEFAULT 0 NOT NULL,
  "reps" integer DEFAULT 0 NOT NULL,
  "lapses" integer DEFAULT 0 NOT NULL,
  "state" smallint DEFAULT 0 NOT NULL,   -- 0=New, 1=Learning, 2=Review, 3=Relearning
  "due" timestamp with time zone DEFAULT now() NOT NULL,
  "last_review" timestamp with time zone,

  -- Last three grades at current level, used for the promotion predicate
  -- (promote if stability >= 21 days AND reps >= 8 AND no Again/Hard in last 3).
  "recent_grades" jsonb DEFAULT '[]'::jsonb NOT NULL,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_grammar_rule_mastery_user_rule_unique"
    UNIQUE ("user_id", "grammar_rule_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_grammar_rule_mastery_due_idx"
  ON "user_grammar_rule_mastery" ("due");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_grammar_rule_mastery_user_due_idx"
  ON "user_grammar_rule_mastery" ("user_id", "due");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_grammar_exercise_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "grammar_rule_id" uuid NOT NULL REFERENCES "grammar_rules"("id"),
  "grammar_exercise_id" uuid NOT NULL REFERENCES "grammar_exercises"("id"),
  "song_version_id" uuid REFERENCES "song_versions"("id"),  -- nullable: future global practice
  "level_at_attempt" text NOT NULL,
  "correct" boolean NOT NULL,
  "rating" smallint NOT NULL,  -- FSRS Rating 1..4, derived from correctness + response time
  "response_time_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_grammar_exercise_log_user_rule_idx"
  ON "user_grammar_exercise_log" ("user_id", "grammar_rule_id");
--> statement-breakpoint

ALTER TABLE "user_song_progress"
  ADD COLUMN IF NOT EXISTS "grammar_best_accuracy" real;
