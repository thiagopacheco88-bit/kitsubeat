/**
 * Phase 12-02 — Streak state machine.
 *
 * Pure function: advanceStreak(state, input) → new state + graceApplied + milestoneHit.
 * Zero DB imports. Date arithmetic via Intl.DateTimeFormat — no date-fns-tz dep.
 *
 * Grace day policy (per CONTEXT.md):
 *   One grace day per ISO week. Auto-applied silently on a 2-day gap.
 *   Larger gaps and grace-exhausted gaps result in silent reset.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreakState {
  streakCurrent: number;
  streakBest: number;
  lastStreakDate: string | null; // 'YYYY-MM-DD' in user's TZ
  streakTz: string | null;
  graceUsedThisWeek: boolean;
  streakWeekStart: string | null; // 'YYYY-MM-DD' Monday of current ISO week
}

export interface StreakInput {
  tz: string; // IANA timezone name
  now: Date; // injected for determinism in tests
}

export interface StreakResult {
  newState: StreakState;
  graceApplied: boolean;
  milestoneHit: 7 | 30 | 100 | null;
}

const MILESTONES: Array<7 | 30 | 100> = [7, 30, 100];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Returns the user's local date as 'YYYY-MM-DD' using the IANA timezone.
 * Uses Intl.DateTimeFormat with 'en-CA' locale to get ISO-formatted date parts.
 */
export function localDateFromTz(tz: string, d: Date): string {
  // 'en-CA' produces 'YYYY-MM-DD' natively in modern environments.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Returns the Monday date of the ISO week containing dateStr ('YYYY-MM-DD').
 * Monday = 1 in ISO week; Sunday = 0 in JS getDay().
 */
export function isoWeekStart(dateStr: string): string {
  // Parse date as local midnight UTC by appending Z-offset explicitly.
  const [year, month, day] = dateStr.split("-").map(Number);
  // Use UTC date to avoid DST ambiguity in day-of-week math.
  const d = new Date(Date.UTC(year, month - 1, day));
  const jsDay = d.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  // ISO day: Monday=1, Tuesday=2, ..., Sunday=7
  const isoDay = jsDay === 0 ? 7 : jsDay;
  // Days to subtract to reach Monday
  const daysBack = isoDay - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysBack);
  const m = monday.getUTCMonth() + 1;
  const dy = monday.getUTCDate();
  const y = monday.getUTCFullYear();
  return `${y}-${String(m).padStart(2, "0")}-${String(dy).padStart(2, "0")}`;
}

/**
 * Computes the difference in calendar days between two 'YYYY-MM-DD' strings.
 * Returns dateB - dateA in days. Can be negative.
 */
function daysBetween(dateA: string, dateB: string): number {
  const [ya, ma, da] = dateA.split("-").map(Number);
  const [yb, mb, db] = dateB.split("-").map(Number);
  const a = Date.UTC(ya, ma - 1, da);
  const b = Date.UTC(yb, mb - 1, db);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Advance the streak state given the current session timestamp and timezone.
 *
 * Rules applied in order:
 * 1. ISO week rollover → reset graceUsedThisWeek
 * 2. First session ever → streak=1
 * 3. Same day → no change
 * 4. Next day → increment
 * 5. 2-day gap + grace available → grace applied
 * 6. Otherwise → silent reset to 1
 */
export function advanceStreak(state: StreakState, input: StreakInput): StreakResult {
  const { tz, now } = input;
  const today = localDateFromTz(tz, now);
  const todayWeekStart = isoWeekStart(today);

  // Working copy of state
  let {
    streakCurrent,
    streakBest,
    lastStreakDate,
    graceUsedThisWeek,
    streakWeekStart,
  } = state;

  let graceApplied = false;
  let streakAdvanced = false; // tracks whether the streak counter actually moved

  // Rule 1: ISO week rollover
  if (streakWeekStart !== todayWeekStart) {
    graceUsedThisWeek = false;
    streakWeekStart = todayWeekStart;
  }

  // Rule 2: First session ever
  if (lastStreakDate === null) {
    streakCurrent = 1;
    lastStreakDate = today;
    streakAdvanced = true;
  } else {
    const gap = daysBetween(lastStreakDate, today);

    if (gap === 0) {
      // Rule 3: Same day — no change, no milestone
    } else if (gap === 1) {
      // Rule 4: Next day — increment
      streakCurrent += 1;
      lastStreakDate = today;
      streakAdvanced = true;
    } else if (gap === 2 && !graceUsedThisWeek) {
      // Rule 5: Grace day applied — streak count unchanged but "survived"
      graceApplied = true;
      graceUsedThisWeek = true;
      lastStreakDate = today;
      // streakCurrent intentionally unchanged; not an advance
    } else {
      // Rule 6: Silent reset (gap >= 3, or gap=2 with grace exhausted)
      streakCurrent = 1;
      lastStreakDate = today;
      streakAdvanced = true;
    }
  }

  // Always: streakBest is monotonically non-decreasing
  streakBest = Math.max(streakBest, streakCurrent);

  // Milestone check: only fires when streak actually advanced to an exact milestone value
  let milestoneHit: 7 | 30 | 100 | null = null;
  if (streakAdvanced) {
    for (const m of MILESTONES) {
      if (streakCurrent === m) {
        milestoneHit = m;
        break;
      }
    }
  }

  const newState: StreakState = {
    streakCurrent,
    streakBest,
    lastStreakDate,
    streakTz: tz,
    graceUsedThisWeek,
    streakWeekStart,
  };

  return { newState, graceApplied, milestoneHit };
}
