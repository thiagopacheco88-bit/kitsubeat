-- drizzle/0020_rls_policies.sql
-- Phase 16: Security Review — Row Level Security for all public tables.
--
-- IMPORTANT: KitsuBeat connects to Neon Postgres via Drizzle ORM using the
-- DATABASE_URL (neondb_owner connection). Table owners bypass RLS — so RLS
-- does NOT affect application traffic via Drizzle. It is defense-in-depth
-- for direct SQL access from non-owner connections only.
--
-- Architecture note: This project uses Neon Postgres directly (not via
-- Supabase PostgREST). The 'authenticated' and 'anon' roles and the
-- auth.jwt() function do NOT exist in this database. Policies are written
-- using standard PostgreSQL roles (PUBLIC / neondb_owner).
--
-- Security posture:
--   - User-data tables: RLS enabled + no policies for non-owner roles
--     => non-owner direct SQL access is DENIED (locked down)
--   - Catalog tables: RLS enabled + SELECT TO PUBLIC USING (true)
--     => any role can SELECT catalog data (public by design; no PII)
--
-- Applied via: npx tsx scripts/apply-migrations.ts
-- DO NOT use drizzle-kit migrate — see Phase 11.6 pitfall re: corrupted journal.

BEGIN;

-- =========================================================================
-- Section 0: Infrastructure table — RLS enabled (internal tooling only)
-- =========================================================================

-- schema_migrations: migration tracking table; owner-only access enforced by RLS
ALTER TABLE "schema_migrations" ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Section 1: User-data tables — RLS enabled; non-owner access DENIED
-- (No explicit policies = implicit deny for all non-owner direct SQL access)
-- =========================================================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_song_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_vocab_mastery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_exercise_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_exercise_song_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_verse_domination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_grammar_rule_mastery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_grammar_exercise_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_cosmetics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_sent_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cookie_consent_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sar_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "song_plays" ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Section 2: Catalog tables — public SELECT allowed; writes denied
-- =========================================================================

ALTER TABLE "songs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "songs_select_public" ON "songs";
CREATE POLICY "songs_select_public" ON "songs" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "song_versions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "song_versions_select_public" ON "song_versions";
CREATE POLICY "song_versions_select_public" ON "song_versions" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "vocabulary_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vocabulary_items_select_public" ON "vocabulary_items";
CREATE POLICY "vocabulary_items_select_public" ON "vocabulary_items" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "grammar_rules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grammar_rules_select_public" ON "grammar_rules";
CREATE POLICY "grammar_rules_select_public" ON "grammar_rules" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "grammar_exercises" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grammar_exercises_select_public" ON "grammar_exercises";
CREATE POLICY "grammar_exercises_select_public" ON "grammar_exercises" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "song_version_grammar_rules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "song_version_grammar_rules_select_public" ON "song_version_grammar_rules";
CREATE POLICY "song_version_grammar_rules_select_public" ON "song_version_grammar_rules" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "anime_metadata" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anime_metadata_select_public" ON "anime_metadata";
CREATE POLICY "anime_metadata_select_public" ON "anime_metadata" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "reward_slot_definitions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reward_slot_definitions_select_public" ON "reward_slot_definitions";
CREATE POLICY "reward_slot_definitions_select_public" ON "reward_slot_definitions" FOR SELECT TO PUBLIC USING (true);

-- =========================================================================
-- Section 3: Admin-only tables — public read; no user writes
-- =========================================================================

ALTER TABLE "lyrics_versions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lyrics_versions_select_public" ON "lyrics_versions";
CREATE POLICY "lyrics_versions_select_public" ON "lyrics_versions" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "lyrics_drafts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lyrics_drafts_select_public" ON "lyrics_drafts";
CREATE POLICY "lyrics_drafts_select_public" ON "lyrics_drafts" FOR SELECT TO PUBLIC USING (true);

ALTER TABLE "song_video_history" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "song_video_history_select_public" ON "song_video_history";
CREATE POLICY "song_video_history_select_public" ON "song_video_history" FOR SELECT TO PUBLIC USING (true);

COMMIT;
