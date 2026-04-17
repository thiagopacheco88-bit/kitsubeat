-- drizzle/0005_user_prefs.sql
-- Phase 08.4: user preferences for learn phase + session pacing.
-- Home for skip_learning + new_card_cap. Provider-agnostic (Clerk user_id as text PK).

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "skip_learning" boolean DEFAULT false NOT NULL,
  "new_card_cap" integer DEFAULT 10 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Backfill safety for re-runs: ensure both columns exist with correct defaults.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "skip_learning" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "new_card_cap" integer DEFAULT 10 NOT NULL;
