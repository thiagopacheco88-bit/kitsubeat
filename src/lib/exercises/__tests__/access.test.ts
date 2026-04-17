/**
 * Phase 08.1-02 — checkExerciseAccess unit coverage.
 *
 * Encodes the single-gate policy (FREE-01 + FREE-06):
 *   - UI never reads EXERCISE_FEATURE_FLAGS directly
 *   - Server actions call checkExerciseAccess()
 *   - Unknown / empty types default to premium (locked)
 *
 * Free/premium lists are derived from EXERCISE_FEATURE_FLAGS at runtime so
 * this test stays correct as flags evolve in Phase 10+.
 */

import { describe, it, expect } from "vitest";
import { checkExerciseAccess } from "../access";
import { EXERCISE_FEATURE_FLAGS } from "../feature-flags";

const TEST_USER_IDS = ["test-user-e2e", "anon-123", "user_2abcXYZ"] as const;

const FREE_TYPES = Object.entries(EXERCISE_FEATURE_FLAGS)
  .filter(([, gate]) => gate === "free")
  .map(([type]) => type);

const PREMIUM_TYPES = Object.entries(EXERCISE_FEATURE_FLAGS)
  .filter(([, gate]) => gate === "premium")
  .map(([type]) => type);

describe("checkExerciseAccess", () => {
  it("every 'free' exercise type resolves { allowed: true } for any user id", async () => {
    expect(FREE_TYPES.length).toBeGreaterThan(0); // sanity: phase 8 ships free types

    for (const type of FREE_TYPES) {
      for (const uid of TEST_USER_IDS) {
        const result = await checkExerciseAccess(uid, type);
        expect(result).toEqual({ allowed: true });
      }
    }
  });

  it("every 'premium' exercise type resolves { allowed: false, reason: 'premium_required' } for non-subscribed users", async () => {
    // Premium list may be empty in Phase 8 (all 4 types are free). The test
    // still encodes the contract: if any premium type exists, it must gate.
    if (PREMIUM_TYPES.length === 0) {
      // Document that the contract is vacuously satisfied today.
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
