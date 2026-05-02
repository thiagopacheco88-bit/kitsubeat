/**
 * tests/integration/theme-persistence.test.ts
 *
 * Phase 14 req 9 — theme preference DB write + read round-trip.
 *
 * Requires: TEST_DATABASE_URL set + test DB seeded + migration 0016 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 *
 * Filled in by Plan 14-03 (theme persistence + zero-flash + toggle UX).
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

// Mock next/headers BEFORE importing userPrefs so the cookies() call inside
// setThemePreference doesn't crash in vitest's plain-Node environment.
// Vitest hoists vi.mock() above imports so this works correctly.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: vi.fn() }),
}));

import { setThemePreference, getThemePreference } from "@/app/actions/userPrefs";
import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("theme persistence", () => {
  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
    const db = getTestDb();
    // Ensure user row exists, then reset theme to default 'system' for each test
    await db.execute(sql`INSERT INTO users (id) VALUES (${TEST_USER_ID}) ON CONFLICT (id) DO NOTHING`);
    await db.execute(sql`UPDATE users SET theme_preference = 'system' WHERE id = ${TEST_USER_ID}`);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  it("setThemePreference('dark') writes the DB column", async () => {
    await setThemePreference(TEST_USER_ID, "dark");
    const db = getTestDb();
    const raw = (await db.execute(
      sql`SELECT theme_preference FROM users WHERE id = ${TEST_USER_ID}`
    )) as unknown as
      | Array<{ theme_preference: string }>
      | { rows: Array<{ theme_preference: string }> };
    const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
    expect(rows[0]?.theme_preference).toBe("dark");
  });

  it("getThemePreference returns stored value", async () => {
    await setThemePreference(TEST_USER_ID, "light");
    const result = await getThemePreference(TEST_USER_ID);
    expect(result).toBe("light");
  });

  it("setThemePreference rejects invalid values with descriptive error", async () => {
    await expect(
      setThemePreference(TEST_USER_ID, "purple" as never)
    ).rejects.toThrow(/system.*light.*dark/);
  });

  it("getThemePreference returns 'system' for unknown user (default)", async () => {
    const result = await getThemePreference("nonexistent-user-12345");
    expect(result).toBe("system");
  });
});
