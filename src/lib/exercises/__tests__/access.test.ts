/**
 * Phase 08.1-02 — checkExerciseAccess unit coverage.
 * Phase 10-01 — extended to cover the song_quota gate path.
 *
 * Encodes the single-gate policy (FREE-01 + FREE-06):
 *   - UI never reads EXERCISE_FEATURE_FLAGS directly
 *   - Server actions call checkExerciseAccess()
 *   - Unknown / empty types default to premium (locked)
 *
 * Free/premium lists are derived from EXERCISE_FEATURE_FLAGS at runtime so
 * this test stays correct as flags evolve in Phase 10+.
 *
 * The song_quota suite mocks `counters.ts` + `userPrefs.isPremium` so the
 * gate's behavior can be asserted without a real database. Quota-exhaustion
 * and already-counted-song semantics are the behaviors the counter-integration
 * test (counters.test.ts) cannot cover (it only covers the DB round trip).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EXERCISE_FEATURE_FLAGS } from "../feature-flags";

// ---------------------------------------------------------------------------
// Mocks — reset between tests so each case starts from a clean state.
// ---------------------------------------------------------------------------

vi.mock("@/app/actions/userPrefs", () => ({
  isPremium: vi.fn(),
}));

vi.mock("../counters", () => ({
  getSongCountForFamily: vi.fn(),
  userHasTouchedSong: vi.fn(),
}));

// Lazy import so the vi.mock calls apply before module resolution.
import { checkExerciseAccess } from "../access";
import { isPremium } from "@/app/actions/userPrefs";
import { getSongCountForFamily, userHasTouchedSong } from "../counters";

const mockIsPremium = vi.mocked(isPremium);
const mockGetSongCount = vi.mocked(getSongCountForFamily);
const mockUserHasTouched = vi.mocked(userHasTouchedSong);

const TEST_USER_IDS = ["test-user-e2e", "anon-123", "user_2abcXYZ"] as const;

// Derive lists from the source of truth so this test tracks flag evolution.
const FREE_TYPES = Object.entries(EXERCISE_FEATURE_FLAGS)
  .filter(([, gate]) => gate === "free")
  .map(([type]) => type);

const PREMIUM_TYPES = Object.entries(EXERCISE_FEATURE_FLAGS)
  .filter(([, gate]) => gate === "premium")
  .map(([type]) => type);

const SONG_QUOTA_TYPES = Object.entries(EXERCISE_FEATURE_FLAGS)
  .filter(([, gate]) => gate === "song_quota")
  .map(([type]) => type);

const SONG_VERSION_ID = "00000000-0000-0000-0000-0000000abcde";

beforeEach(() => {
  mockIsPremium.mockReset();
  mockGetSongCount.mockReset();
  mockUserHasTouched.mockReset();

  // Safe defaults — tests override as needed.
  mockIsPremium.mockResolvedValue(false);
  mockGetSongCount.mockResolvedValue(0);
  mockUserHasTouched.mockResolvedValue(false);
});

describe("checkExerciseAccess — free path", () => {
  it("every 'free' exercise type resolves { allowed: true } for any user id", async () => {
    expect(FREE_TYPES.length).toBeGreaterThan(0); // sanity: phase 8 ships free types

    for (const type of FREE_TYPES) {
      for (const uid of TEST_USER_IDS) {
        const result = await checkExerciseAccess(uid, type);
        expect(result).toEqual({ allowed: true });
      }
    }
    // Free path should not consult counters or isPremium at all.
    expect(mockIsPremium).not.toHaveBeenCalled();
    expect(mockGetSongCount).not.toHaveBeenCalled();
    expect(mockUserHasTouched).not.toHaveBeenCalled();
  });
});

describe("checkExerciseAccess — premium path", () => {
  it("every 'premium' exercise type resolves { allowed: false, reason: 'premium_required' } for non-subscribed users", async () => {
    if (PREMIUM_TYPES.length === 0) {
      // No types currently gated as plain 'premium' (Phase 10 migrated them all
      // to song_quota). Contract is vacuously satisfied — preserved here as a
      // forward-compatible gate in case a future type lands as plain 'premium'.
      expect(PREMIUM_TYPES).toEqual([]);
      return;
    }
    for (const type of PREMIUM_TYPES) {
      for (const uid of TEST_USER_IDS) {
        const result = await checkExerciseAccess(uid, type);
        expect(result).toEqual({
          allowed: false,
          reason: "premium_required",
        });
      }
    }
  });

  it("an exercise type NOT present in EXERCISE_FEATURE_FLAGS defaults to premium (locked)", async () => {
    const unknownType = "totally_made_up_type_does_not_exist";
    expect(EXERCISE_FEATURE_FLAGS[unknownType]).toBeUndefined();

    const result = await checkExerciseAccess("test-user-e2e", unknownType);
    expect(result).toEqual({
      allowed: false,
      reason: "premium_required",
    });
  });

  it("passing an empty string as exerciseType resolves to premium (defensive default)", async () => {
    const result = await checkExerciseAccess("test-user-e2e", "");
    expect(result).toEqual({
      allowed: false,
      reason: "premium_required",
    });
  });
});

describe("checkExerciseAccess — song_quota path", () => {
  it("song_quota type WITHOUT songVersionId returns a structured denial (gate misconfig protection)", async () => {
    for (const type of SONG_QUOTA_TYPES) {
      const result = await checkExerciseAccess("test-user-e2e", type);
      expect(result).toEqual({
        allowed: false,
        reason: "songVersionId required for quota gate",
      });
    }
    // No counter reads when the signature precondition isn't met.
    expect(mockGetSongCount).not.toHaveBeenCalled();
    expect(mockUserHasTouched).not.toHaveBeenCalled();
  });

  it("premium user + quota exhausted still returns allowed: true (premium bypasses quota)", async () => {
    mockIsPremium.mockResolvedValue(true);
    // Counter arithmetic should not be consulted at all for premium path.
    for (const type of SONG_QUOTA_TYPES) {
      const result = await checkExerciseAccess("test-user-e2e", type, {
        songVersionId: SONG_VERSION_ID,
      });
      expect(result).toEqual({ allowed: true });
    }
    expect(mockGetSongCount).not.toHaveBeenCalled();
    expect(mockUserHasTouched).not.toHaveBeenCalled();
  });

  it("free user + 0 songs used -> allowed with correct quotaRemaining for listening (10)", async () => {
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockResolvedValue(0);
    mockUserHasTouched.mockResolvedValue(false);

    const result = await checkExerciseAccess("test-user-e2e", "listening_drill", {
      songVersionId: SONG_VERSION_ID,
    });
    expect(result).toEqual({ allowed: true, quotaRemaining: 10 });
  });

  it("free user + 0 songs used -> allowed with correct quotaRemaining for advanced_drill (3)", async () => {
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockResolvedValue(0);
    mockUserHasTouched.mockResolvedValue(false);

    for (const type of ["grammar_conjugation", "sentence_order"]) {
      const result = await checkExerciseAccess("test-user-e2e", type, {
        songVersionId: SONG_VERSION_ID,
      });
      expect(result).toEqual({ allowed: true, quotaRemaining: 3 });
    }
  });

  it("free user + 10 listening songs used + NEW songVersionId -> quota_exhausted", async () => {
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockResolvedValue(10);
    mockUserHasTouched.mockResolvedValue(false); // NEW song — not in the set

    const result = await checkExerciseAccess("test-user-e2e", "listening_drill", {
      songVersionId: SONG_VERSION_ID,
    });
    expect(result).toEqual({
      allowed: false,
      reason: "quota_exhausted",
      quotaRemaining: 0,
    });
  });

  it("free user + 10 listening songs used + ALREADY-TOUCHED songVersionId -> allowed (re-entry, not 11th)", async () => {
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockResolvedValue(10);
    mockUserHasTouched.mockResolvedValue(true); // RETURNING song — in the set

    const result = await checkExerciseAccess("test-user-e2e", "listening_drill", {
      songVersionId: SONG_VERSION_ID,
    });
    // Allowed — already-counted passes with quotaRemaining clamped to 0 (can't
    // be negative; quota is fully consumed but the user can finish this song).
    expect(result).toEqual({ allowed: true, quotaRemaining: 0 });
  });

  it("independent-counter invariant: exhausted listening does NOT block advanced_drill", async () => {
    // Simulate: 10 listening songs used (exhausted), but query for an
    // advanced_drill type. The gate should ask about advanced_drill (count=0)
    // not listening — and return allowed with quotaRemaining=3.
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockImplementation(async (_userId, family) => {
      // Listening is exhausted; advanced_drill fresh.
      return family === "listening" ? 10 : 0;
    });
    mockUserHasTouched.mockResolvedValue(false);

    const result = await checkExerciseAccess("test-user-e2e", "grammar_conjugation", {
      songVersionId: SONG_VERSION_ID,
    });
    expect(result).toEqual({ allowed: true, quotaRemaining: 3 });
  });

  it("independent-counter invariant: exhausted advanced_drill does NOT block listening_drill", async () => {
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockImplementation(async (_userId, family) => {
      return family === "advanced_drill" ? 3 : 0;
    });
    mockUserHasTouched.mockResolvedValue(false);

    const result = await checkExerciseAccess("test-user-e2e", "listening_drill", {
      songVersionId: SONG_VERSION_ID,
    });
    expect(result).toEqual({ allowed: true, quotaRemaining: 10 });
  });

  it("shared advanced_drill counter: Ex 5 and Ex 7 consume from the same pool", async () => {
    // 2 songs already in the advanced_drill family (could be any mix of Ex5/Ex7).
    // Either exercise type requesting a NEW song should see quotaRemaining=1.
    mockIsPremium.mockResolvedValue(false);
    mockGetSongCount.mockResolvedValue(2);
    mockUserHasTouched.mockResolvedValue(false);

    const r5 = await checkExerciseAccess("test-user-e2e", "grammar_conjugation", {
      songVersionId: SONG_VERSION_ID,
    });
    const r7 = await checkExerciseAccess("test-user-e2e", "sentence_order", {
      songVersionId: SONG_VERSION_ID,
    });
    expect(r5).toEqual({ allowed: true, quotaRemaining: 1 });
    expect(r7).toEqual({ allowed: true, quotaRemaining: 1 });
  });
});
