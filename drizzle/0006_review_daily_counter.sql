-- drizzle/0006_review_daily_counter.sql
-- Phase 11: Cross-Song Vocabulary — daily new-card introduction counter.
-- Tracks how many new cards have been introduced today and resets at midnight.
-- Distinct namespace from users.new_card_cap (per-session) per RESEARCH.md Pitfall 7.
--
-- review_new_today: integer NOT NULL DEFAULT 0 — existing rows are valid (zero-filled).
-- review_new_today_date: DATE nullable — NULL means "counter not used yet today";
--   upsert logic in Plan 05 treats NULL as reset trigger.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "review_new_today" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "review_new_today_date" DATE;
