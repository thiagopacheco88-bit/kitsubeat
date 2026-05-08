/**
 * tests/integration/legal-compliance.test.ts
 *
 * Phase 18: Legal & Compliance — integration test stubs for all 6 scenarios.
 *
 * Requires: TEST_DATABASE_URL set + migration 0019 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 *
 * These stubs are filled in by Wave 1 (18-02) through Wave 4 (18-04) plans.
 * All tests are .todo to signal "contract agreed, implementation pending".
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: vi.fn() }),
}));

import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("Phase 18 Legal & Compliance — integration", () => {
  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
    const db = getTestDb();
    await db.execute(
      sql`INSERT INTO users (id) VALUES (${TEST_USER_ID}) ON CONFLICT (id) DO NOTHING`
    );
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  // ─── REQ-MINORS-GATE-03: Under-13 rejection ─────────────────────────────

  it.todo(
    "completeOnboarding rejects under-13 DOB (REQ-MINORS-GATE-03)",
    async () => {
      // Arrange: DOB that yields age < 13 (born 12 years ago today)
      // Act: call completeOnboarding() with under-13 DOB
      // Assert: server action returns { error: "under_13" }
      expect.fail("implement in Wave 1 (18-02)");
    }
  );

  // ─── REQ-MINORS-GATE-06: Server-side DOB re-validation ──────────────────

  it.todo(
    "server re-validates DOB regardless of client input (REQ-MINORS-GATE-06)",
    async () => {
      // Arrange: manipulate DOB to appear 18+ on client but send 12-year-old DOB
      // Act: call completeOnboarding() with tampered DOB
      // Assert: server returns { error: "under_13" } — client cannot bypass gate
      expect.fail("implement in Wave 1 (18-02)");
    }
  );

  // ─── REQ-MINORS-12: Minor defaults applied atomically ───────────────────

  it.todo(
    "minor defaults applied atomically when is_minor=true (REQ-MINORS-12)",
    async () => {
      // Arrange: DOB that yields age 15 (minor)
      // Act: call completeOnboarding() with 15-year-old DOB in single transaction
      // Assert: social_activity_enabled=false AND marketing_email_opt_in=false
      //         for the test user row — verified in one SELECT
      const db = getTestDb();
      const rows = (await db.execute(
        sql`SELECT social_activity_enabled, marketing_email_opt_in FROM users WHERE id = ${TEST_USER_ID}`
      )) as unknown as Array<{ social_activity_enabled: boolean; marketing_email_opt_in: boolean }> | { rows: Array<{ social_activity_enabled: boolean; marketing_email_opt_in: boolean }> };
      const arr = Array.isArray(rows) ? rows : (rows as { rows: Array<{ social_activity_enabled: boolean; marketing_email_opt_in: boolean }> }).rows ?? [];
      expect(arr[0]?.social_activity_enabled).toBe(false);
      expect(arr[0]?.marketing_email_opt_in).toBe(false);
    }
  );

  // ─── REQ-MINORS-GATE-11: 18th-birthday cron ─────────────────────────────

  it.todo(
    "18th-birthday cron sets is_minor=false and nothing else (REQ-MINORS-GATE-11)",
    async () => {
      // Arrange: seed user with is_minor=true + dob exactly 18 years ago
      // Act: call the 18th-birthday cron logic (to be implemented in 18-03)
      // Assert: is_minor=false; all other columns unchanged
      expect.fail("implement in Wave 2 (18-03)");
    }
  );

  // ─── REQ-PRIV-COOKIE-05: Cookie consent record inserted ─────────────────

  it.todo(
    "recordConsent inserts cookie_consent_record row (REQ-PRIV-COOKIE-05)",
    async () => {
      // Arrange: call recordConsent() server action with decision='accepted'
      // Act: SELECT from cookie_consent_record WHERE user_id = TEST_USER_ID
      // Assert: exactly one row exists with correct consent_version and decision
      const db = getTestDb();
      const rows = (await db.execute(
        sql`SELECT id, decision FROM cookie_consent_record WHERE user_id = ${TEST_USER_ID}`
      )) as unknown as Array<{ id: string; decision: string }> | { rows: Array<{ id: string; decision: string }> };
      const arr = Array.isArray(rows) ? rows : (rows as { rows: Array<{ id: string; decision: string }> }).rows ?? [];
      expect(arr).toHaveLength(1);
      expect(arr[0]?.decision).toBe("accepted");
    }
  );

  // ─── REQ-PRIV-UK-DSAR-04: DSAR endpoint returns full user bundle ────────

  it.todo(
    "DSAR endpoint returns all user tables as JSON bundle (REQ-PRIV-UK-DSAR-04)",
    async () => {
      // Arrange: authenticated user with some vocab mastery rows
      // Act: call GET /api/user/data-export (to be implemented in 18-04)
      // Assert: response JSON has keys: user, vocab_mastery, exercise_log, song_progress
      expect.fail("implement in Wave 3 (18-04)");
    }
  );
});
