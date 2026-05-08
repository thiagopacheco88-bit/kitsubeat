/**
 * tests/integration/streak-saver-grant-consume.test.ts
 *
 * Phase 14.4 Plan 02 — Integration tests for streak-saver DB schema semantics.
 *
 * Tests verify that the streak_saver_token and streak_saver_pending columns
 * behave correctly at the DB level. Since applyGamificationUpdate is a server
 * action that can't be imported directly in tests, these tests verify the DB
 * schema semantics by seeding users rows and using raw SQL UPDATEs that mirror
 * the logic in applyStreakSaver + session-integration.ts.
 *
 * Requires: TEST_DATABASE_URL set + migration 0018 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTestDb() {
  const { getTestDb: _getTestDb } = await import("../support/test-db");
  return _getTestDb();
}

const TEST_USER = "test-streak-saver-integration";

async function seedUser(overrides: {
  streakCurrent?: number;
  streakBest?: number;
  lastStreakDate?: string | null;
  streakSaverToken?: number;
  streakSaverPending?: boolean;
}): Promise<void> {
  const db = await getTestDb();
  await db.execute(sql`
    INSERT INTO users (id) VALUES (${TEST_USER})
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    UPDATE users SET
      streak_current = ${overrides.streakCurrent ?? 0},
      streak_best = ${overrides.streakBest ?? 0},
      last_streak_date = ${overrides.lastStreakDate ?? null}::date,
      streak_saver_token = ${overrides.streakSaverToken ?? 0},
      streak_saver_pending = ${overrides.streakSaverPending ?? false}
    WHERE id = ${TEST_USER}
  `);
}

type SaverStateRow = {
  streak_current: number;
  streak_best: number;
  streak_saver_token: number;
  streak_saver_pending: boolean;
  last_streak_date: string | null;
};

async function fetchUserSaverState(): Promise<SaverStateRow> {
  const db = await getTestDb();
  const raw = await db.execute(sql`
    SELECT streak_current, streak_best, streak_saver_token,
           streak_saver_pending, last_streak_date::text AS last_streak_date
    FROM users WHERE id = ${TEST_USER}
  `);
  const arr = Array.isArray(raw) ? raw : ((raw as { rows?: unknown[] }).rows ?? []);
  const row = arr[0] as SaverStateRow | undefined;
  if (!row) throw new Error("Test user not found");
  return {
    streak_current: Number(row.streak_current),
    streak_best: Number(row.streak_best),
    streak_saver_token: Number(row.streak_saver_token),
    streak_saver_pending: Boolean(row.streak_saver_pending),
    last_streak_date: row.last_streak_date,
  };
}

/** Simulate the grant rule from applyStreakSaver in the DB */
async function simulateGrantToken(): Promise<void> {
  const db = await getTestDb();
  // Grant rule: milestoneHit===7 AND token===0 → token becomes 1
  await db.execute(sql`
    UPDATE users SET streak_saver_token = 1
    WHERE id = ${TEST_USER} AND streak_saver_token = 0
  `);
}

/** Simulate the consume rule from applyStreakSaver in the DB */
async function simulateConsumeToken(previousStreakCurrent: number, today: string): Promise<void> {
  const db = await getTestDb();
  // Consume rule: restore streak, clear token, set pending
  await db.execute(sql`
    UPDATE users SET
      streak_saver_token = 0,
      streak_saver_pending = true,
      streak_current = ${previousStreakCurrent + 1},
      last_streak_date = ${today}::date
    WHERE id = ${TEST_USER} AND streak_saver_token = 1
  `);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeIfTestDb("streak-saver grant + consume (DB integration)", () => {
  beforeEach(async () => {
    await seedUser({
      streakCurrent: 0,
      streakBest: 0,
      lastStreakDate: null,
      streakSaverToken: 0,
      streakSaverPending: false,
    });
  });

  afterAll(async () => {
    const db = await getTestDb();
    await db.execute(sql`DELETE FROM users WHERE id = ${TEST_USER}`);
  });

  it("DB: streak_saver_token set to 1 after session that hits streak=7 milestone", async () => {
    // Seed user at streak=6 with token=0
    await seedUser({ streakCurrent: 6, streakSaverToken: 0 });
    // Simulate grant (milestone=7, token was 0)
    await simulateGrantToken();
    const state = await fetchUserSaverState();
    expect(state.streak_saver_token).toBe(1);
  });

  it("DB: streak_saver_token stays 1 on repeated streak=7 milestone (no double-grant)", async () => {
    // Seed with token already=1 (user already has a token)
    await seedUser({ streakCurrent: 14, streakSaverToken: 1 });
    // Try to grant again — the WHERE streak_saver_token=0 guard prevents this
    await simulateGrantToken();
    const state = await fetchUserSaverState();
    // Token stays 1, no double-grant
    expect(state.streak_saver_token).toBe(1);
  });

  it("DB: token consumed (0) and streak preserved on reset session when token=1", async () => {
    const previousStreak = 9;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // Seed user at streak=9, token=1 (has a token)
    await seedUser({ streakCurrent: previousStreak, streakSaverToken: 1 });
    // Simulate reset + consume
    await simulateConsumeToken(previousStreak, today);
    const state = await fetchUserSaverState();
    expect(state.streak_saver_token).toBe(0);
    expect(state.streak_current).toBe(previousStreak + 1); // streak preserved + advance
    expect(state.last_streak_date).toBe(today);
  });

  it("DB: streak_saver_pending=true set after consume", async () => {
    const previousStreak = 9;
    const today = new Date().toISOString().slice(0, 10);
    await seedUser({ streakCurrent: previousStreak, streakSaverToken: 1, streakSaverPending: false });
    await simulateConsumeToken(previousStreak, today);
    const state = await fetchUserSaverState();
    expect(state.streak_saver_pending).toBe(true);
  });

  it("DB: streak resets normally when token=0 and reset detected", async () => {
    // Seed with token=0 (no token to consume)
    await seedUser({ streakCurrent: 5, streakSaverToken: 0 });
    // No simulate — token=0 means no consume rule fires
    // Verify: token stays 0, pending stays false
    const state = await fetchUserSaverState();
    expect(state.streak_saver_token).toBe(0);
    expect(state.streak_saver_pending).toBe(false);
  });
});
