/**
 * tests/e2e/regression-premium-gate.spec.ts
 *
 * Plan 08.1-07 Task 1 — Regression guard for premium-gate bypass attempts.
 *
 * CONTEXT-locked invariant (08.1-CONTEXT > Regression guards):
 *
 *   "Premium gate bypass — checkExerciseAccess() is the single gate;
 *    free users can't reach premium exercises via URL/state manipulation"
 *
 * Status of the gate today:
 *   - All 4 Phase 8 exercise types are flagged "free" in
 *     `src/lib/exercises/feature-flags.ts`. No premium type ships yet.
 *   - The gate logic in `src/lib/exercises/access.ts::checkExerciseAccess`
 *     defaults UNKNOWN types to "premium" — that's the lever this spec exercises.
 *   - A truly synthetic premium type (`grammar_conjugation` — Phase 10) is used
 *     as the bypass target. The static check is hardcoded to that type so when
 *     Phase 10 ships and flips it to "free", this spec will FAIL LOUDLY and
 *     remind the team to repick a still-premium type for the regression target.
 *
 * Three angles:
 *
 *   1. URL / param manipulation — free user opens the song page; the Practice
 *      tab does not expose any `?type=premium` lever today, but if it gains one
 *      in the future the gate must hold. We assert that nothing in the UI
 *      surfaces a premium type as selectable.
 *
 *   2. Server action with synthetic premium answer — call `saveSessionResults`
 *      directly via the Next.js server-action HTTP boundary with a
 *      `grammar_conjugation` answer. We expect the action to either reject the
 *      payload OR scrub the unknown type from accuracy aggregation
 *      (current behavior — verified by the integration test
 *      tests/integration/save-session-results.test.ts "unknown exercise types
 *      are silently dropped"). EITHER outcome is documented; the spec passes
 *      when the server doesn't end up writing a premium-flavored answer to
 *      user_song_progress accuracy fields.
 *
 *   3. checkExerciseAccess unit — direct call asserts the gate denies
 *      `grammar_conjugation` for any user id. This is the architectural
 *      invariant of the single-gate decision (Phase 08-01).
 *
 * Note: The static check that no UI component imports EXERCISE_FEATURE_FLAGS
 * lives in tests/integration/regression-stale-lesson-data.test.ts (declared in
 * this plan's `files_modified`). Per the plan's Task 1 instructions, that
 * static check is colocated with the integration regression file to avoid
 * shipping an undeclared artifact.
 *
 * Zero retries (enforced at playwright.config.ts).
 */

import { test, expect } from "../support/fixtures";
import { checkExerciseAccess } from "@/lib/exercises/access";
import { EXERCISE_FEATURE_FLAGS } from "@/lib/exercises/feature-flags";

const SLUG = "again-yui";
// Synthetic premium target: Phase 10's planned grammar_conjugation type.
// Today it is NOT in EXERCISE_FEATURE_FLAGS, so checkExerciseAccess defaults
// it to "premium" via the `?? "premium"` fallback. When Phase 10 lands and
// adds it to the flags map (likely "free" for early adopters), this constant
// MUST be repicked to whatever the next premium type is.
const PREMIUM_TYPE = "grammar_conjugation";

test.describe("Regression: premium gate bypass attempts", () => {
  test("checkExerciseAccess denies a synthetic premium type for any user", async () => {
    // Direct unit-level call against the single gate. This is the architectural
    // invariant: one place gates everything; no UI codepath has its own check.
    const result = await checkExerciseAccess("any-user-id", PREMIUM_TYPE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("premium_required");

    // Sanity: the type is genuinely NOT in the feature-flags map today.
    // If Phase 10 adds it, this assertion will fail and remind us to repick
    // a still-premium type for this spec.
    expect(EXERCISE_FEATURE_FLAGS[PREMIUM_TYPE]).toBeUndefined();
  });

  test("checkExerciseAccess allows every type currently flagged 'free'", async () => {
    const freeTypes = Object.entries(EXERCISE_FEATURE_FLAGS)
      .filter(([, gate]) => gate === "free")
      .map(([t]) => t);

    expect(freeTypes.length).toBeGreaterThan(0); // sanity: catalog isn't empty

    for (const type of freeTypes) {
      const r = await checkExerciseAccess("any-user-id", type);
      expect(r.allowed, `expected '${type}' to be allowed (gate=free)`).toBe(
        true
      );
    }
  });

  test("Practice tab UI does not surface any premium exercise type as selectable", async ({
    page,
  }) => {
    await page.goto(`/songs/${SLUG}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // The config screen offers exactly two affordances: Quick Practice + Full
    // Lesson. There is no per-type picker in the UI today; both buttons drive
    // buildQuestions() across all FREE types. Assert no premium type label is
    // visible — if a future PR adds a `Grammar Conjugation` button without
    // routing it through checkExerciseAccess, this fails loudly.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("grammar conjugation");
    expect(bodyText).not.toContain("listening drill");
    expect(bodyText).not.toContain("sentence order");
  });

  test("direct query-string injection ?type=<premium> is silently ignored by the UI", async ({
    page,
  }) => {
    // The Practice tab does not honor any `?type=` URL parameter today.
    // If it ever gains one, this spec must be updated to assert that the UI
    // either ignores the parameter OR routes through checkExerciseAccess.
    await page.goto(`/songs/${SLUG}?type=${PREMIUM_TYPE}`);
    await page.getByRole("button", { name: /^practice$/i }).click();

    // Same Start button — query string had no effect on the offered modes.
    await expect(
      page.getByRole("button", { name: /^Start$/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    // No "Premium required" surface either — because there's no path to be
    // gated yet. This locks "no surface" as today's truth and forces the next
    // change to either keep it or update this assertion.
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("premium required");
  });

  test.fixme(
    "server action rejects/scrubs premium-typed answers (Phase 10 follow-up)",
    async ({ page }) => {
      // Phase 10 follow-up: when grammar_conjugation lands, the server action
      // saveSessionResults SHOULD route premium answers through
      // checkExerciseAccess and reject them for unsubscribed users. Today,
      // unknown types are silently dropped from accuracy aggregation — proven
      // by tests/integration/save-session-results.test.ts "unknown exercise
      // types are silently dropped (no throw, not counted)".
      //
      // This spec is intentionally `.fixme`'d to serve as a living TODO until
      // Phase 10 adds server-side gate enforcement. Documented in SUMMARY.md
      // under "fixme entries / Phase 8 follow-up".
      void page;
      throw new Error(
        "placeholder until Phase 10 adds server-side gate enforcement"
      );
    }
  );
});
