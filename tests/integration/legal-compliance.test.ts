/**
 * tests/integration/legal-compliance.test.ts
 *
 * Phase 18: Legal & Compliance — full integration test suite.
 *
 * Requires: TEST_DATABASE_URL set + migration 0019 applied.
 * Skip guard: describe.skip when TEST_DATABASE_URL is absent.
 *
 * Tests call server actions (completeOnboarding, recordConsent) directly
 * against the real test DB, and verify DB state with getTestDb() queries.
 * Pattern: theme-persistence.test.ts
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sql, and, eq, isNotNull, lte } from "drizzle-orm";

// vi.hoisted() variables are initialized before vi.mock() factory runs —
// this avoids the "Cannot access before initialization" TDZ error that
// occurs when vi.mock() factories reference module-scope const declarations.
const {
  mockUpdateUserMetadata,
  mockClerkInstance,
} = vi.hoisted(() => {
  const mockUpdateUserMetadata = vi.fn().mockResolvedValue({});
  const mockClerkInstance = {
    users: {
      updateUserMetadata: mockUpdateUserMetadata,
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
      }),
    },
  };
  return { mockUpdateUserMetadata, mockClerkInstance };
});

// --- Mock Clerk BEFORE any server-action imports ---
// completeOnboarding calls clerkClient().users.updateUserMetadata — mock to avoid
// real Clerk API calls during integration testing.
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-e2e" }),
  clerkClient: vi.fn().mockResolvedValue(mockClerkInstance),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ["x-forwarded-for", "203.0.113.45"],
      ["user-agent", "TestAgent/1.0"],
    ] as [string, string][])
  ),
  cookies: () => Promise.resolve({ set: vi.fn() }),
}));

import { completeOnboarding } from "@/app/actions/onboarding";
import { recordConsent } from "@/app/actions/consent";
import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";
import { users } from "@/lib/db/schema";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

/** Returns ISO date string for a DOB N years ago. */
function dobYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

describeIfTestDb("Phase 18 Legal & Compliance — integration", () => {
  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
    const db = getTestDb();
    // Ensure user row exists and reset legal columns for a clean slate
    await db.execute(
      sql`INSERT INTO users (id) VALUES (${TEST_USER_ID}) ON CONFLICT (id) DO NOTHING`
    );
    await db.execute(
      sql`UPDATE users SET date_of_birth = NULL, is_minor = NULL,
          social_activity_enabled = false, marketing_email_opt_in = false,
          minor_defaults_applied = false, terms_accepted_at = NULL, terms_version = NULL
          WHERE id = ${TEST_USER_ID}`
    );
    // Clean up any consent or SAR rows from previous tests
    await db.execute(
      sql`DELETE FROM cookie_consent_record WHERE user_id = ${TEST_USER_ID}`
    );
    await db.execute(
      sql`DELETE FROM sar_log WHERE user_id_or_email = ${TEST_USER_ID}`
    );
    vi.clearAllMocks();
    mockUpdateUserMetadata.mockResolvedValue({});
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
    const db = getTestDb();
    await db.execute(
      sql`DELETE FROM cookie_consent_record WHERE user_id = ${TEST_USER_ID}`
    );
    await db.execute(
      sql`DELETE FROM sar_log WHERE user_id_or_email = ${TEST_USER_ID}`
    );
    await db.execute(sql`DELETE FROM users WHERE id = ${TEST_USER_ID}`);
  });

  // ─── REQ-MINORS-GATE-03: Under-13 rejection ─────────────────────────────

  it("completeOnboarding rejects under-13 DOB (REQ-MINORS-GATE-03)", async () => {
    // Arrange: DOB that yields age < 13 (born 10 years ago)
    const underAgeDob = dobYearsAgo(10);

    // Act: call completeOnboarding() with under-13 DOB
    const result = await completeOnboarding(underAgeDob);

    // Assert: server action returns { error: "under_13" }
    expect(result).toEqual({ error: "under_13" });

    // Verify DB has no date_of_birth change — server must not write for under-13
    const db = getTestDb();
    const raw = (await db.execute(
      sql`SELECT date_of_birth FROM users WHERE id = ${TEST_USER_ID}`
    )) as unknown as Array<{ date_of_birth: string | null }> | { rows: Array<{ date_of_birth: string | null }> };
    const rows = Array.isArray(raw) ? raw : ((raw as { rows: Array<{ date_of_birth: string | null }> }).rows ?? []);
    expect(rows[0]?.date_of_birth).toBeNull();
  });

  // ─── REQ-MINORS-GATE-06: Server-side DOB re-validation ──────────────────

  it("server re-validates DOB regardless of client input (REQ-MINORS-GATE-06)", async () => {
    // Verify under-13 is blocked even when sent directly to server action
    const underAgeDob = dobYearsAgo(12);
    const resultUnder13 = await completeOnboarding(underAgeDob);
    expect(resultUnder13).toEqual({ error: "under_13" });

    // Verify age 15 (minor) is accepted and sets is_minor=true
    const minorDob = dobYearsAgo(15);
    const resultMinor = await completeOnboarding(minorDob);
    expect(resultMinor).toEqual({});

    // Verify DB reflects is_minor=true
    const db = getTestDb();
    const raw = (await db.execute(
      sql`SELECT is_minor FROM users WHERE id = ${TEST_USER_ID}`
    )) as unknown as Array<{ is_minor: boolean }> | { rows: Array<{ is_minor: boolean }> };
    const rows = Array.isArray(raw) ? raw : ((raw as { rows: Array<{ is_minor: boolean }> }).rows ?? []);
    expect(rows[0]?.is_minor).toBe(true);
  });

  // ─── REQ-MINORS-12: Minor defaults applied atomically ───────────────────

  it("minor defaults applied atomically when is_minor=true (REQ-MINORS-12)", async () => {
    // Arrange: DOB that yields age 15 (minor)
    const minorDob = dobYearsAgo(15);

    // Act: call completeOnboarding() with minor DOB
    const result = await completeOnboarding(minorDob);
    expect(result).toEqual({});

    // Assert: verify both social_activity_enabled=false AND marketing_email_opt_in=false
    // in SINGLE SELECT — proves atomic write
    const db = getTestDb();
    const raw = (await db.execute(
      sql`SELECT is_minor, social_activity_enabled, marketing_email_opt_in FROM users WHERE id = ${TEST_USER_ID}`
    )) as unknown as Array<{
      is_minor: boolean;
      social_activity_enabled: boolean;
      marketing_email_opt_in: boolean;
    }> | { rows: Array<{ is_minor: boolean; social_activity_enabled: boolean; marketing_email_opt_in: boolean }> };
    const rows = Array.isArray(raw) ? raw : ((raw as { rows: Array<{ is_minor: boolean; social_activity_enabled: boolean; marketing_email_opt_in: boolean }> }).rows ?? []);
    expect(rows[0]?.is_minor).toBe(true);
    expect(rows[0]?.social_activity_enabled).toBe(false);
    expect(rows[0]?.marketing_email_opt_in).toBe(false);
  });

  // ─── REQ-MINORS-GATE-11: 18th-birthday cron ─────────────────────────────

  it("18th-birthday cron sets is_minor=false and nothing else (REQ-MINORS-GATE-11)", async () => {
    const db = getTestDb();

    // Arrange: seed user with is_minor=true, dob exactly 20 years ago,
    // social_activity_enabled=false (set by minor defaults — must remain unchanged)
    await db.execute(sql`
      UPDATE users SET
        is_minor = true,
        social_activity_enabled = false,
        marketing_email_opt_in = false,
        date_of_birth = CURRENT_DATE - INTERVAL '20 years'
      WHERE id = ${TEST_USER_ID}
    `);

    // Act: run the cron's update logic directly (same SQL as birthday-transitions route.ts)
    // REQ-MINORS-GATE-12: ONLY is_minor changes — no other columns touched
    await db
      .update(users)
      .set({ is_minor: false })
      .where(
        and(
          eq(users.is_minor, true),
          isNotNull(users.date_of_birth),
          lte(sql`date_of_birth + INTERVAL '18 years'`, sql`NOW()`)
        )
      );

    // Assert: is_minor is now false
    const raw = (await db.execute(
      sql`SELECT is_minor, social_activity_enabled, marketing_email_opt_in FROM users WHERE id = ${TEST_USER_ID}`
    )) as unknown as Array<{
      is_minor: boolean;
      social_activity_enabled: boolean;
      marketing_email_opt_in: boolean;
    }> | { rows: Array<{ is_minor: boolean; social_activity_enabled: boolean; marketing_email_opt_in: boolean }> };
    const rows = Array.isArray(raw) ? raw : ((raw as { rows: Array<{ is_minor: boolean; social_activity_enabled: boolean; marketing_email_opt_in: boolean }> }).rows ?? []);

    expect(rows[0]?.is_minor).toBe(false);

    // REQ-MINORS-GATE-12: social_activity_enabled is unchanged from seed value (false)
    // The cron UNLOCKS settings — it does NOT change them
    expect(rows[0]?.social_activity_enabled).toBe(false);
    expect(rows[0]?.marketing_email_opt_in).toBe(false);
  });

  // ─── REQ-PRIV-COOKIE-05: Cookie consent record inserted ─────────────────

  it("recordConsent inserts cookie_consent_record row (REQ-PRIV-COOKIE-05)", async () => {
    // Act: call recordConsent() server action with decision='granted'
    await recordConsent("granted");

    // Assert: SELECT from cookie_consent_record WHERE user_id = TEST_USER_ID
    const db = getTestDb();
    const raw = (await db.execute(
      sql`SELECT user_id, decision, ip_hash FROM cookie_consent_record WHERE user_id = ${TEST_USER_ID}`
    )) as unknown as Array<{ user_id: string; decision: string; ip_hash: string | null }> | { rows: Array<{ user_id: string; decision: string; ip_hash: string | null }> };
    const rows = Array.isArray(raw) ? raw : ((raw as { rows: Array<{ user_id: string; decision: string; ip_hash: string | null }> }).rows ?? []);

    // Exactly one row exists
    expect(rows).toHaveLength(1);
    expect(rows[0]?.decision).toBe("granted");
    // ip_hash is non-null and non-empty (SHA-256 of the mock IP)
    expect(rows[0]?.ip_hash).toBeTruthy();
    expect(typeof rows[0]?.ip_hash).toBe("string");
  });

  // ─── REQ-PRIV-UK-DSAR-04: DSAR endpoint returns full user bundle ────────

  it("DSAR endpoint returns all user tables as JSON bundle (REQ-PRIV-UK-DSAR-04)", async () => {
    // Import the route handler directly — no HTTP server needed for integration tests
    const { GET } = await import("@/app/api/user/data-export/route");

    // Act: call GET route handler directly (auth() is mocked to return TEST_USER_ID)
    // The route handler takes no parameters — auth() is satisfied by the Clerk mock above
    const response = await GET();

    // Assert: response is 200 OK
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;

    // Response has expected keys (REQ-PRIV-UK-DSAR-04)
    expect(body).toHaveProperty("user");
    expect(body).toHaveProperty("vocab_mastery");
    expect(body).toHaveProperty("exercise_log");
    expect(body).toHaveProperty("song_progress");
    expect(body).toHaveProperty("exported_at");

    // REQ-PRIV-UK-DSAR-06: sar_log should have a new row for this user
    const db = getTestDb();
    const raw = (await db.execute(
      sql`SELECT id, outcome FROM sar_log WHERE user_id_or_email = ${TEST_USER_ID}`
    )) as unknown as Array<{ id: string; outcome: string }> | { rows: Array<{ id: string; outcome: string }> };
    const sarRows = Array.isArray(raw) ? raw : ((raw as { rows: Array<{ id: string; outcome: string }> }).rows ?? []);

    expect(sarRows.length).toBeGreaterThanOrEqual(1);
    expect(sarRows[0]?.outcome).toBe("completed");
  });
});
