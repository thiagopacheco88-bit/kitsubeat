/**
 * Phase 14.4 D-12 — Streak-saver grant + consume helpers.
 *
 * Pure functions — DB writes happen in applyGamificationUpdate (session-integration.ts).
 * Called from applyGamificationUpdate Step 5.5 AFTER advanceStreak returns.
 *
 * Grant rule: milestoneHit===7 AND token===0 → token becomes 1.
 * Consume rule: reset that grace did not cover AND token===1 → restore streak, token=0, pending=true.
 * The two rules are mutually exclusive by construction (streak can't hit 7 AND reset in same call).
 */

export interface StreakSaverInput {
  previousStreakCurrent: number;
  streakSaverToken: number; // 0 or 1
  milestoneHit: 7 | 30 | 100 | null;
  graceApplied: boolean;
  todayInTz: string; // YYYY-MM-DD in user's local timezone
}

export interface StreakSaverResult {
  nextToken: number;
  nextPending: boolean;
  nextStreakCurrent: number;
  nextLastStreakDate: string | null;
  consumed: boolean;
  granted: boolean;
}

export function applyStreakSaver(
  input: StreakSaverInput,
  newState: { streakCurrent: number; lastStreakDate: string | null }
): StreakSaverResult {
  let nextToken = input.streakSaverToken;
  let nextPending = false;
  let nextStreakCurrent = newState.streakCurrent;
  let nextLastStreakDate = newState.lastStreakDate;
  let consumed = false;
  let granted = false;

  // Grant rule (D-12): first 7-day milestone, no token held
  if (input.milestoneHit === 7 && nextToken === 0) {
    nextToken = 1;
    granted = true;
  }

  // Consume rule (D-12): reset that grace did not cover
  const wasReset =
    !input.graceApplied &&
    input.previousStreakCurrent > 1 &&
    newState.streakCurrent === 1;

  if (wasReset && nextToken === 1) {
    nextStreakCurrent = input.previousStreakCurrent + 1; // preserve + advance for today's session
    nextLastStreakDate = input.todayInTz;
    nextToken = 0;
    nextPending = true;
    consumed = true;
    granted = false; // consume wins if both would fire (impossible by construction per D-12)
  }

  return { nextToken, nextPending, nextStreakCurrent, nextLastStreakDate, consumed, granted };
}
