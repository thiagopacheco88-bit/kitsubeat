/**
 * Shared error classes for the exercise gate system.
 *
 * Extracted from src/app/actions/exercises.ts so they can be imported by both
 * the "use server" action file (which cannot export non-async values) and by
 * test files + client-side error-handling code.
 *
 * Decision: move to lib/exercises so the "use server" constraint never blocks
 * sharing error types across layers.
 */

import { QUOTA_LIMITS } from "./feature-flags";
import type { QuotaFamily } from "./feature-flags";

/**
 * QuotaExhaustedError — thrown by recordVocabAnswer when a non-premium user
 * exceeds the per-family song quota (listening: 10, advanced_drill: 3).
 *
 * The thrower deletes the overshoot row before throwing (refund semantics).
 * RESEARCH Pitfall 6 trade-off: one answer of slippage is possible under
 * cross-device race — documented in the upsell copy ("You just used your
 * last free song").
 */
export class QuotaExhaustedError extends Error {
  readonly family: QuotaFamily;
  readonly quotaLimit: number;
  constructor(family: QuotaFamily) {
    super(`Quota exhausted for family ${family}`);
    this.name = "QuotaExhaustedError";
    this.family = family;
    this.quotaLimit = QUOTA_LIMITS[family];
  }
}
