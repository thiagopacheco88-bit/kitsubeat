-- drizzle/0008_gamification.sql
-- Phase 12: Learning Path & Gamification — data-layer foundation.
--
-- Adds:
--   1. 13 gamification columns on users table (XP, level, streak, path state, audio prefs)
--   2. user_cosmetics table — per-user equipped cosmetics (avatar borders, color themes, badges)
--   3. reward_slot_definitions table — v3.0 cosmetic catalog; v4.0 Phase 21 can INSERT new
--      cultural content slots without code changes.
--
-- All ALTER TABLE uses IF NOT EXISTS guards — safe to re-apply.
-- Applied manually per Phase 10 convention (drizzle-kit generate does not emit IF NOT EXISTS).

-- Phase 12: Gamification — XP and level columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp_total" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 1;
--> statement-breakpoint

-- Phase 12: Gamification — daily XP soft-cap tracking
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp_today" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp_today_date" date;
--> statement-breakpoint

-- Phase 12: Gamification — streak tracking columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_current" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_best" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_streak_date" date;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_tz" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grace_used_this_week" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_week_start" date;
--> statement-breakpoint

-- Phase 12: Learning Path — current path position
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_path_node_slug" text;
--> statement-breakpoint

-- Phase 12: Audio + haptics preferences (default ON per CONTEXT)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sound_enabled" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "haptics_enabled" boolean NOT NULL DEFAULT true;
--> statement-breakpoint

-- Phase 12: user_cosmetics — tracks unlocked + equipped cosmetic items per user
CREATE TABLE IF NOT EXISTS "user_cosmetics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slot_id" text NOT NULL,
  "unlocked_at" timestamp with time zone DEFAULT now(),
  "equipped" boolean DEFAULT false,
  CONSTRAINT "user_cosmetics_user_slot_unique" UNIQUE ("user_id", "slot_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_cosmetics_user_id_idx"
  ON "user_cosmetics" ("user_id");
--> statement-breakpoint

-- Phase 12: reward_slot_definitions — cosmetic catalog + v4.0 Phase 21 cultural content slots.
-- Data-driven: v4.0 inserts new rows without code changes.
CREATE TABLE IF NOT EXISTS "reward_slot_definitions" (
  "id" text PRIMARY KEY NOT NULL,
  "slot_type" text NOT NULL,
  "level_threshold" integer NOT NULL,
  "content" jsonb NOT NULL,
  "active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
