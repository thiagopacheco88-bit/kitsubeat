/**
 * tests/support/quarantine.ts — Vitest-side quarantine helper.
 *
 * Plan 08.1-08 Task 2.
 *
 * Mirrors the Playwright `[kb-quarantine]` convention for the unit + integration
 * layers. Vitest does not have a built-in title-based grepInvert, so we use a
 * `describe.skipIf` predicate driven by the KB_RUN_QUARANTINE env var.
 *
 * Usage:
 *
 *   import { describeIfNotQuarantined, describeQuarantined } from "../support/quarantine";
 *
 *   // Default — runs unless quarantine flag flipped on:
 *   describeIfNotQuarantined("[kb-quarantine] flaky boundary parser", () => {
 *     it("...", () => { ... });
 *   });
 *
 *   // To debug quarantined tests interactively:
 *   //   KB_RUN_QUARANTINE=1 npm run test:unit
 *
 * Convention rules (enforced by review, not code — see README-testing.md):
 *   - Every quarantined describe block must carry a TODO comment with date + reason.
 *   - Maximum 3 simultaneously quarantined tests across the entire suite.
 *   - Quarantine is a temporary holding pen, NOT a parking lot for forever-broken tests.
 */

import { describe } from "vitest";

const RUN_QUARANTINE = process.env.KB_RUN_QUARANTINE === "1";

/**
 * Wrap a describe block that should be SKIPPED by default unless KB_RUN_QUARANTINE=1.
 * Use this for tests you want kept in the codebase but excluded from the trustworthy suite.
 */
export const describeIfNotQuarantined = RUN_QUARANTINE ? describe.skip : describe;

/**
 * Wrap a describe block that runs ONLY when KB_RUN_QUARANTINE=1. Inverse of the above.
 * Useful for one-off quarantine-only investigation describes that shouldn't run in CI.
 */
export const describeQuarantined = RUN_QUARANTINE ? describe : describe.skip;
