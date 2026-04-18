/**
 * tests/support/test-db.ts — Drizzle helpers wired to TEST_DATABASE_URL.
 *
 * Phase 08.1 decision (per CONTEXT > "Test database strategy"):
 *   Dedicated test DB via TEST_DATABASE_URL. The test DB is the same Neon/Postgres
 *   server pointed at a different database name. Tests NEVER write to the dev DB.
 *
 * Setup (operator):
 *   1. Create a separate database on the same Neon project: `createdb kitsubeat_test`
 *   2. Set TEST_DATABASE_URL in .env.test pointing at it
 *   3. Run `npm run seed:dev` against TEST_DATABASE_URL to populate the catalog
 *   4. Run `npx tsx tests/support/seed-test-db.ts` to reset progress and verify slugs
 *
 * What this module exposes:
 *   - getTestDb()              — returns a drizzle instance bound to TEST_DATABASE_URL
 *   - resetTestProgress(uid)   — wipes per-user progress / mastery / exercise log rows
 *   - seedTestUser()           — returns the canonical TEST_USER_ID (idempotent)
 *   - TEST_USER_ID             — constant string used everywhere
 *   - SEEDED_SLUGS             — three known slugs the suite assumes exist
 *
 * Why a constant userId?
 *   The app currently uses a TODO userId throughout (no Clerk yet). Once auth lands,
 *   swap seedTestUser() to mint a real session — the rest of the suite stays unchanged.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

/** Canonical test user id. Matches the placeholder used in the app today. */
export const TEST_USER_ID = "test-user-e2e";

/**
 * Three known slugs the E2E + integration suites assume exist in TEST_DATABASE_URL.
 *
 * Selection criteria (per plan 08.1-01 task 2):
 *   - Two with full timing + lesson data (used for player + exercise flows).
 *   - One with a geo-restricted youtube_id (used for the geo-failure regression test
 *     in plan 08.1-07).
 *
 * To change: pick new slugs from the dev DB, update this array, and re-run
 * `npx tsx tests/support/seed-test-db.ts` — it will fail loudly if any slug is missing
 * or lacks lesson JSONB.
 */
export const SEEDED_SLUGS = [
  "again-yui", // global, full lesson + timing — primary happy-path song
  "red-swan-yoshiki-feat-hyde", // global, full lesson + timing — second happy-path song
  "mayonaka-no-orchestra-aqua-timez", // geo-restricted (americas tier) — regression target
] as const;

export type SeededSlug = (typeof SEEDED_SLUGS)[number];

let _db: NeonHttpDatabase | null = null;

/**
 * Returns a drizzle instance wired to TEST_DATABASE_URL.
 *
 * Throws if TEST_DATABASE_URL is unset — fail loud rather than silently writing to
 * DATABASE_URL (the dev DB).
 */
export function getTestDb(): NeonHttpDatabase {
  if (_db) return _db;

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Copy .env.test.example to .env.test and point it at a separate database from DATABASE_URL."
    );
  }

  const client = neon(url);
  _db = drizzle(client);
  return _db;
}

/**
 * Wipes all per-user progress rows for `userId` so each test starts from zero.
 * Called by the `testUser` Playwright fixture after every test (cleanup phase) and
 * by the seed-test-db script before each suite run.
 *
 * Tables cleared:
 *   - user_song_progress
 *   - user_vocab_mastery
 *   - user_exercise_log
 *   - user_exercise_song_counters  (Phase 10 premium quota gate)
 *
 * Idempotent. Safe to call when the user has no rows.
 */
export async function resetTestProgress(userId: string): Promise<void> {
  const db = getTestDb();
  // Use raw SQL via drizzle's sql tag — keeps this helper independent of schema imports
  // so the file works even if the schema module changes shape.
  await db.execute(sql`DELETE FROM user_song_progress WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM user_vocab_mastery WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM user_exercise_log WHERE user_id = ${userId}`);
  // Phase 10: clear per-user-per-family song-counter rows so the quota gate
  // tests start from zero for each run. Guarded with IF EXISTS because the
  // table may not yet exist in TEST_DATABASE_URL if migrations haven't run.
  await db.execute(
    sql`DELETE FROM user_exercise_song_counters WHERE user_id = ${userId}`
  );
}

/**
 * Returns the canonical test user id. Idempotent no-op today (no users table to seed
 * — the app uses a TODO userId). Once Clerk lands, this will create / fetch a real
 * test user and return its id.
 */
export async function seedTestUser(): Promise<string> {
  // No-op today: the app does not yet have a `users` table. Reserved for when auth lands.
  return TEST_USER_ID;
}
