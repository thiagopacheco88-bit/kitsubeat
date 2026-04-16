/**
 * Exercise access gate — the ONLY place where free/premium decisions are made.
 *
 * UI components never check EXERCISE_FEATURE_FLAGS directly. They receive
 * either data or { gated: true } from server actions that call this function.
 *
 * When Clerk auth is integrated, replace the TODO with a real subscription lookup.
 */

import { EXERCISE_FEATURE_FLAGS } from "./feature-flags";

export async function checkExerciseAccess(
  userId: string,
  exerciseType: string
): Promise<{ allowed: boolean; reason?: string }> {
  const gate = EXERCISE_FEATURE_FLAGS[exerciseType] ?? "premium";
  if (gate === "free") return { allowed: true };

  // TODO: replace with Clerk userId + real subscription check when auth is added
  // For now, premium types are gated — no subscription lookup yet
  return { allowed: false, reason: "premium_required" };
}
