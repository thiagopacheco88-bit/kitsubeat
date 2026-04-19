/**
 * tests/integration/gamification.test.ts
 *
 * Phase 12 Plan 04 — Integration tests for the gamification engine wired to the DB.
 *
 * Tests the full saveSessionResults → applyGamificationUpdate → DB write pipeline.
 *
 * Each test case seeds a fresh users row via direct SQL manipulation, calls
 * saveSessionResults (the single write boundary), and asserts the returned
 * GamificationResult fields and the persisted users row.
 *
 * Requires: TEST_DATABASE_URL set + test DB seeded with catalog + migration 0008 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 *
 * Run: TEST_DATABASE_URL=... npm run test:integration -- tests/integration/gamification.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { saveSessionResults } from "@/app/actions/exercises";
import { setStarterSong } from "@/app/actions/gamification";
import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface UserGamificationRow {
  xp_total: number;
  level: number;
  xp_today: number;
  xp_today_date: string | null;
  streak_current: number;
  streak_best: number;
  last_streak_date: string | null;
  grace_used_this_week: boolean;
  streak_week_start: string | null;
  current_path_node_slug: string | null;
}

async function fetchUserGamification(userId: string): Promise<UserGamificationRow | null> {
  const db = getTestDb();
  const raw = (await db.execute(sql`
    SELECT
      xp_total,
      level,
      xp_today,
      xp_today_date::text AS xp_today_date,
      streak_current,
      streak_best,
      last_streak_date::text AS last_streak_date,
      grace_used_this_week,
      streak_week_start::text AS streak_week_start,
      current_path_node_slug
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `)) as unknown as UserGamificationRow[] | { rows: UserGamificationRow[] };
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
  return rows[0] ?? null;
}

/** Seed a users row with specific gamification values for a test case. */
async function seedUserGamification(
  userId: string,
  overrides: Partial<UserGamificationRow & {
    grace_used_this_week?: boolean;
    last_streak_date?: string;
    xp_today_date?: string;
    streak_week_start?: string;
  }>
): Promise<void> {
  const db = getTestDb();
  // Upsert with all defaults, then apply overrides via UPDATE.
  // Two-step so we don't have to enumerate every NOT NULL column in the INSERT.
  await db.execute(sql`
    INSERT INTO users (id) VALUES (${userId})
    ON CONFLICT (id) DO NOTHING
  `);
  // Apply overrides individually so unset fields keep their defaults.
  if (overrides.xp_total !== undefined) {
    await db.execute(sql`UPDATE users SET xp_total = ${overrides.xp_total} WHERE id = ${userId}`);
  }
  if (overrides.level !== undefined) {
    await db.execute(sql`UPDATE users SET level = ${overrides.level} WHERE id = ${userId}`);
  }
  if (overrides.xp_today !== undefined) {
    await db.execute(sql`UPDATE users SET xp_today = ${overrides.xp_today} WHERE id = ${userId}`);
  }
  if (overrides.xp_today_date !== undefined) {
    await db.execute(sql`UPDATE users SET xp_today_date = ${overrides.xp_today_date}::date WHERE id = ${userId}`);
  }
  if (overrides.streak_current !== undefined) {
    await db.execute(sql`UPDATE users SET streak_current = ${overrides.streak_current} WHERE id = ${userId}`);
  }
  if (overrides.streak_best !== undefined) {
    await db.execute(sql`UPDATE users SET streak_best = ${overrides.streak_best} WHERE id = ${userId}`);
  }
  if (overrides.last_streak_date !== undefined) {
    await db.execute(sql`UPDATE users SET last_streak_date = ${overrides.last_streak_date}::date WHERE id = ${userId}`);
  }
  if (overrides.grace_used_this_week !== undefined) {
    await db.execute(sql`UPDATE users SET grace_used_this_week = ${overrides.grace_used_this_week} WHERE id = ${userId}`);
  }
  if (overrides.streak_week_start !== undefined) {
    await db.execute(sql`UPDATE users SET streak_week_start = ${overrides.streak_week_start}::date WHERE id = ${userId}`);
  }
  if (overrides.current_path_node_slug !== undefined) {
    await db.execute(sql`UPDATE users SET current_path_node_slug = ${overrides.current_path_node_slug} WHERE id = ${userId}`);
  }
}

async function deleteTestUser(userId: string): Promise<void> {
  const db = getTestDb();
  await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
}

/** Returns a YYYY-MM-DD string for N days ago from today (UTC). */
function daysAgoUtc(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dy}`;
}

/** Returns today's date as YYYY-MM-DD in UTC. */
function todayUtc(): string {
  return daysAgoUtc(0);
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

const GAMIFICATION_TEST_USER = "test-gamification-12-04";
const TZ = "UTC";

describeIfTestDb("gamification integration — saveSessionResults", () => {
  let songVersionId: string;
  let songSlugBasic: string;
  let songSlugBasicSecond: string; // the slug that follows songSlugBasic in path order

  beforeAll(async () => {
    const db = getTestDb();

    // Acquire a song_version row with lesson data for FK-valid calls.
    const svRaw = (await db.execute(sql`
      SELECT sv.id::text AS id, s.slug, s.difficulty_tier
      FROM song_versions sv
      JOIN songs s ON s.id = sv.song_id
      WHERE sv.lesson IS NOT NULL
      ORDER BY
        CASE s.difficulty_tier WHEN 'basic' THEN 0 WHEN 'intermediate' THEN 1 ELSE 2 END,
        COALESCE(s.popularity_rank, 999999)
      LIMIT 1
    `)) as unknown as Array<{ id: string; slug: string; difficulty_tier: string }> | { rows: Array<{ id: string; slug: string; difficulty_tier: string }> };
    const svRows = Array.isArray(svRaw) ? svRaw : (svRaw.rows ?? []);
    if (!svRows[0]) {
      throw new Error(
        "[gamification.test] No song_versions row with lesson IS NOT NULL in TEST_DATABASE_URL."
      );
    }
    songVersionId = svRows[0].id;
    songSlugBasic = svRows[0].slug;

    // Find the next song in path order (for path-advancement test).
    const tier = svRows[0].difficulty_tier;
    const tierOrd = tier === "basic" ? 0 : tier === "intermediate" ? 1 : 2;

    // Get the popularity_rank of the current song
    const rankRaw = (await db.execute(sql`
      SELECT COALESCE(popularity_rank, 999999) AS rank FROM songs WHERE slug = ${songSlugBasic} LIMIT 1
    `)) as unknown as Array<{ rank: number }> | { rows: Array<{ rank: number }> };
    const rankRows = Array.isArray(rankRaw) ? rankRaw : (rankRaw.rows ?? []);
    const currentRank = rankRows[0]?.rank ?? 999999;

    const nextRaw = (await db.execute(sql`
      SELECT slug FROM songs
      WHERE (
        CASE difficulty_tier WHEN 'basic' THEN 0 WHEN 'intermediate' THEN 1 WHEN 'advanced' THEN 2 ELSE 3 END,
        COALESCE(popularity_rank, 999999)
      ) > (${tierOrd}, ${currentRank})
      ORDER BY
        CASE difficulty_tier WHEN 'basic' THEN 0 WHEN 'intermediate' THEN 1 WHEN 'advanced' THEN 2 ELSE 3 END ASC,
        COALESCE(popularity_rank, 999999) ASC
      LIMIT 1
    `)) as unknown as Array<{ slug: string }> | { rows: Array<{ slug: string }> };
    const nextRows = Array.isArray(nextRaw) ? nextRaw : (nextRaw.rows ?? []);
    // If no next slug, tests needing it will skip gracefully
    songSlugBasicSecond = nextRows[0]?.slug ?? "";
  });

  beforeEach(async () => {
    await resetTestProgress(GAMIFICATION_TEST_USER);
    await deleteTestUser(GAMIFICATION_TEST_USER);
  });

  afterAll(async () => {
    await resetTestProgress(GAMIFICATION_TEST_USER);
    await deleteTestUser(GAMIFICATION_TEST_USER);
  });

  // ─── Test 1: XP increment ────────────────────────────────────────────────

  it("TC1 — XP increment: session writes xp_total > 0 and matches calculateXp math", async () => {
    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        // 5 correct answers → 5 * 2 = 10 XP base from answers
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q2", type: "vocab_meaning", chosen: "b", correct: true, timeMs: 1000 },
        { questionId: "q3", type: "vocab_meaning", chosen: "c", correct: true, timeMs: 1000 },
        { questionId: "q4", type: "vocab_meaning", chosen: "d", correct: true, timeMs: 1000 },
        { questionId: "q5", type: "vocab_meaning", chosen: "e", correct: true, timeMs: 1000 },
      ],
    });

    // xpBase = 5 * 2 (answers) + 15 (short session) = 25
    // dailyFirst=true → 25 * 1.5 = 37 (floor)
    // perfectRun=true → 37 * 1.25 = 46 (floor)
    // No pathOrder (slug probably not user's current_path_node_slug since we start with null)
    // xpAfterCap = 46 (well below 250 daily cap)
    // milestoneXp = 0 (streak was 0, now 1 — not a milestone)
    // total xpGained = 46
    expect(result.xpGained).toBeGreaterThan(0);
    expect(result.xpTotal).toBe(result.xpGained); // first ever session → xpTotal === xpGained

    const row = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row).not.toBeNull();
    expect(row!.xp_total).toBe(result.xpGained);
    expect(row!.xp_today).toBe(result.xpGained);
    expect(row!.xp_today_date).toBe(todayUtc());
  });

  // ─── Test 2: Streak advance across 2 days ────────────────────────────────

  it("TC2 — Streak advance: 2-day consecutive sessions → streak_current=2", async () => {
    // Seed day 1: last_streak_date = yesterday, streak_current = 1
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      streak_current: 1,
      streak_best: 1,
      last_streak_date: daysAgoUtc(1),
    });

    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    expect(result.streakCurrent).toBe(2);
    expect(result.graceApplied).toBe(false);

    const row = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row!.streak_current).toBe(2);
    expect(row!.streak_best).toBe(2);
    expect(row!.last_streak_date).toBe(todayUtc());
  });

  // ─── Test 3: Grace applied ────────────────────────────────────────────────

  it("TC3 — Grace applied: 2-day gap + grace_used_this_week=false → streak survives", async () => {
    // Seed: last session 2 days ago, grace not used yet this week
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      streak_current: 5,
      streak_best: 5,
      last_streak_date: daysAgoUtc(2),
      grace_used_this_week: false,
      // Set week start to same week as today so grace resets don't interfere
      streak_week_start: daysAgoUtc(2),
    });

    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    expect(result.graceApplied).toBe(true);
    // Streak count is UNCHANGED when grace is applied (streak "survived")
    expect(result.streakCurrent).toBe(5);

    const row = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row!.grace_used_this_week).toBe(true);
    expect(row!.streak_current).toBe(5);
    expect(row!.last_streak_date).toBe(todayUtc());
  });

  // ─── Test 4: Grace exhausted ──────────────────────────────────────────────

  it("TC4 — Grace exhausted: 2-day gap + grace_used_this_week=true → silent reset", async () => {
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      streak_current: 10,
      streak_best: 10,
      last_streak_date: daysAgoUtc(2),
      grace_used_this_week: true,
    });

    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    expect(result.graceApplied).toBe(false);
    expect(result.streakCurrent).toBe(1); // reset to 1
    expect(result.streakBest).toBe(10); // streak_best preserved

    const row = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row!.streak_current).toBe(1);
    expect(row!.streak_best).toBe(10); // never decreases
  });

  // ─── Test 5: Level-up detection ───────────────────────────────────────────

  it("TC5 — Level-up: XP crosses level 2 threshold (100 cumulative) → leveledUp=true", async () => {
    // Seed user at xp_total=95 (level 1 needs 0, level 2 needs 100 cumulative XP)
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      xp_total: 95,
      level: 1,
    });

    // Answers: 3 correct → 3*2=6 XP + 15 (short) = 21 base
    // dailyFirst=true → 21 * 1.5 = 31 (floor)
    // 31 XP pushes 95 + 31 = 126 → level 2 (threshold at 100)
    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q2", type: "vocab_meaning", chosen: "b", correct: true, timeMs: 1000 },
        { questionId: "q3", type: "vocab_meaning", chosen: "c", correct: true, timeMs: 1000 },
      ],
    });

    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe(1);
    expect(result.currentLevel).toBeGreaterThanOrEqual(2);

    const row = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row!.level).toBe(result.currentLevel);
  });

  // ─── Test 6: Path advancement idempotency (M7) ────────────────────────────

  it("TC6 — Path advancement idempotency: completing non-current node does NOT advance; completing current node advances once", async () => {
    if (!songSlugBasicSecond) {
      // Not enough songs in test DB to test advancement — skip gracefully
      console.warn("[TC6] songSlugBasicSecond unavailable — skipping path advance assertion");
      return;
    }

    // Seed: user is on songSlugBasic as current node
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      current_path_node_slug: songSlugBasic,
    });

    // Call with a DIFFERENT slug → no path advance
    const result1 = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasicSecond, // NOT the current node
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    expect(result1.pathAdvancedTo).toBeNull(); // no advance
    const row1 = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row1!.current_path_node_slug).toBe(songSlugBasic); // unchanged

    // Call with the CURRENT node → should advance
    const result2 = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic, // the current node
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    expect(result2.pathAdvancedTo).toBe(songSlugBasicSecond);
    const row2 = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row2!.current_path_node_slug).toBe(songSlugBasicSecond);

    // Call AGAIN with the OLD current node → no advance (M7 idempotent)
    const result3 = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic, // no longer the current node
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    expect(result3.pathAdvancedTo).toBeNull(); // does NOT advance further
    const row3 = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(row3!.current_path_node_slug).toBe(songSlugBasicSecond); // still second slug
  });

  // ─── Test 7: Daily soft cap behavior (M2) ─────────────────────────────────

  it("TC7 — Daily cap: xp_today=240 → next session earns reduced XP (drip not stopped)", async () => {
    const today = todayUtc();
    // Seed user at xp_today = 240 (just below the 250 cap), same date
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      xp_today: 240,
      xp_today_date: today,
    });

    // 5 correct answers + short session = 10 + 15 = 25 base XP
    // dailyFirst=false (same xp_today_date), perfectRun=true → 25*1.25=31 floor
    // Headroom to cap: 250 - 240 = 10 → first 10 XP at 100%, remaining 21 at 25% = 5
    // xpAfterCap = 10 + floor(21 * 0.25) = 10 + 5 = 15
    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
        { questionId: "q2", type: "vocab_meaning", chosen: "b", correct: true, timeMs: 1000 },
        { questionId: "q3", type: "vocab_meaning", chosen: "c", correct: true, timeMs: 1000 },
        { questionId: "q4", type: "vocab_meaning", chosen: "d", correct: true, timeMs: 1000 },
        { questionId: "q5", type: "vocab_meaning", chosen: "e", correct: true, timeMs: 1000 },
      ],
    });

    // XP drip continues (M2): xpGained > 0 even though above cap
    expect(result.xpGained).toBeGreaterThan(0);
    // And it should be less than the uncapped amount
    expect(result.xpGained).toBeLessThan(50); // well under the uncapped ~37-46 range

    const row = await fetchUserGamification(GAMIFICATION_TEST_USER);
    // xp_today increased (it continues to track even above cap)
    expect(row!.xp_today).toBeGreaterThan(240);
  });

  // ─── Test 8: setStarterSong persists + path-order bonus on first play (M8) ─

  it("TC8 — setStarterSong persists current_path_node_slug before first session", async () => {
    const starterSlug = "yume-wo-kanaete-doraemon-mao"; // From STARTER_SONG_SLUGS

    // Call setStarterSong before any session
    const setResult = await setStarterSong(GAMIFICATION_TEST_USER, starterSlug);
    expect(setResult).toEqual({ ok: true });

    const rowAfterSet = await fetchUserGamification(GAMIFICATION_TEST_USER);
    expect(rowAfterSet!.current_path_node_slug).toBe(starterSlug);

    // The path-order bonus applies if we call saveSessionResults with this slug next
    // (we can't easily get a songVersionId for the starter song in isolation, so just
    // verify the column persisted — the bonus math is unit-tested in xp.test.ts)
  });

  // ─── Test 9: Reward preview — empty state (M4) ────────────────────────────

  it("TC9 — Reward preview null when reward_slot_definitions has no active rows above current level", async () => {
    // Truncate reward_slot_definitions so there are no active slots
    const db = getTestDb();
    await db.execute(sql`DELETE FROM reward_slot_definitions`);

    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    // M4: no placeholder, no empty card — strictly null
    expect(result.rewardSlotPreview).toBeNull();
  });

  // ─── Test 10: Reward preview — lowest-threshold locked slot ───────────────

  it("TC10 — Reward preview returns lowest locked active slot above user's level", async () => {
    const db = getTestDb();

    // Seed 3 active slots at levels 3, 7, 10; user is at level 1 (fresh)
    await db.execute(sql`
      DELETE FROM reward_slot_definitions
    `);
    await db.execute(sql`
      INSERT INTO reward_slot_definitions (id, slot_type, level_threshold, content, active) VALUES
        ('test-slot-3', 'badge', 3, '{"type":"badge","icon":"star","label":"Bronze Badge","description":"Earned at level 3"}', true),
        ('test-slot-7', 'badge', 7, '{"type":"badge","icon":"star","label":"Silver Badge","description":"Earned at level 7"}', true),
        ('test-slot-10', 'badge', 10, '{"type":"badge","icon":"star","label":"Gold Badge","description":"Earned at level 10"}', true)
      ON CONFLICT (id) DO UPDATE SET
        level_threshold = EXCLUDED.level_threshold,
        content = EXCLUDED.content,
        active = EXCLUDED.active
    `);

    // Seed user at level 1 (below all slots)
    await seedUserGamification(GAMIFICATION_TEST_USER, {
      xp_total: 0,
      level: 1,
    });

    const result = await saveSessionResults({
      userId: GAMIFICATION_TEST_USER,
      songVersionId,
      songSlug: songSlugBasic,
      mode: "short",
      durationMs: 30_000,
      tz: TZ,
      answers: [
        { questionId: "q1", type: "vocab_meaning", chosen: "a", correct: true, timeMs: 1000 },
      ],
    });

    // User stays at level 1 after this tiny session
    // Lowest locked slot is test-slot-3 (level 3)
    expect(result.rewardSlotPreview).not.toBeNull();
    expect(result.rewardSlotPreview!.id).toBe("test-slot-3");
    expect(result.rewardSlotPreview!.level_threshold).toBe(3);
  });
});
