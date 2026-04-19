/**
 * Phase 12-02 — Streak state machine unit coverage.
 *
 * Tests use America/Sao_Paulo timezone pinned via Date injection for determinism.
 * All dates are anchored to UTC; the Intl.DateTimeFormat adjusts to local.
 *
 * America/Sao_Paulo: UTC-3 (standard), UTC-2 (summer DST).
 */

import { describe, it, expect } from "vitest";
import { advanceStreak, localDateFromTz, isoWeekStart } from "@/lib/gamification/streak";

// ---------------------------------------------------------------------------
// Helpers for constructing test inputs
// ---------------------------------------------------------------------------

const TZ = "America/Sao_Paulo";

/** Create a Date at a specific UTC time. */
function utcDate(year: number, month: number, day: number, hour = 12): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
}

/** Fresh state (no prior activity). */
const freshState = {
  streakCurrent: 0,
  streakBest: 0,
  lastStreakDate: null as string | null,
  streakTz: null as string | null,
  graceUsedThisWeek: false,
  streakWeekStart: null as string | null,
};

// ---------------------------------------------------------------------------
// localDateFromTz helper
// ---------------------------------------------------------------------------

describe("localDateFromTz", () => {
  it("converts UTC noon to Sao Paulo local date", () => {
    // UTC 2024-01-15 12:00 → Sao Paulo (UTC-3) = 2024-01-15 09:00 → same date
    const d = utcDate(2024, 1, 15, 12);
    expect(localDateFromTz(TZ, d)).toBe("2024-01-15");
  });

  it("UTC midnight rolls back a day in UTC-3", () => {
    // UTC 2024-01-15 00:00 → Sao Paulo UTC-3 = 2024-01-14 21:00 → previous date
    const d = utcDate(2024, 1, 15, 0);
    expect(localDateFromTz(TZ, d)).toBe("2024-01-14");
  });
});

// ---------------------------------------------------------------------------
// isoWeekStart helper
// ---------------------------------------------------------------------------

describe("isoWeekStart", () => {
  it("Monday is its own week start", () => {
    // 2024-01-15 is a Monday
    expect(isoWeekStart("2024-01-15")).toBe("2024-01-15");
  });

  it("Wednesday returns the preceding Monday", () => {
    // 2024-01-17 is a Wednesday → Monday 2024-01-15
    expect(isoWeekStart("2024-01-17")).toBe("2024-01-15");
  });

  it("Sunday returns the preceding Monday", () => {
    // 2024-01-21 is a Sunday → Monday 2024-01-15
    expect(isoWeekStart("2024-01-21")).toBe("2024-01-15");
  });
});

// ---------------------------------------------------------------------------
// advanceStreak state machine
// ---------------------------------------------------------------------------

describe("advanceStreak — first session", () => {
  it("first-ever session → streakCurrent=1, lastStreakDate set, milestoneHit=null", () => {
    const now = utcDate(2024, 1, 15, 15); // 2024-01-15 15:00 UTC → 12:00 SP local
    const result = advanceStreak(freshState, { tz: TZ, now });
    expect(result.newState.streakCurrent).toBe(1);
    expect(result.newState.lastStreakDate).toBe("2024-01-15");
    expect(result.newState.streakBest).toBe(1);
    expect(result.graceApplied).toBe(false);
    expect(result.milestoneHit).toBeNull();
  });
});

describe("advanceStreak — same day", () => {
  it("same-day second session → no change to streakCurrent or lastStreakDate", () => {
    const now = utcDate(2024, 1, 15, 18); // still 2024-01-15 in SP
    const state = {
      ...freshState,
      streakCurrent: 3,
      streakBest: 5,
      lastStreakDate: "2024-01-15",
      streakTz: TZ,
      streakWeekStart: "2024-01-15", // Monday
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.newState.streakCurrent).toBe(3);
    expect(result.newState.lastStreakDate).toBe("2024-01-15");
    expect(result.newState.streakBest).toBe(5); // unchanged
    expect(result.milestoneHit).toBeNull();
  });
});

describe("advanceStreak — next day (direct increment)", () => {
  it("next-day session → streakCurrent increments by 1", () => {
    const now = utcDate(2024, 1, 16, 15); // 2024-01-16 in SP
    const state = {
      ...freshState,
      streakCurrent: 2,
      streakBest: 5,
      lastStreakDate: "2024-01-15",
      streakTz: TZ,
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.newState.streakCurrent).toBe(3);
    expect(result.newState.lastStreakDate).toBe("2024-01-16");
    expect(result.graceApplied).toBe(false);
  });

  it("streakBest updates when current exceeds it", () => {
    const now = utcDate(2024, 1, 16, 15);
    const state = {
      ...freshState,
      streakCurrent: 5,
      streakBest: 5,
      lastStreakDate: "2024-01-15",
      streakTz: TZ,
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.newState.streakCurrent).toBe(6);
    expect(result.newState.streakBest).toBe(6); // updated
  });
});

describe("advanceStreak — milestone detection", () => {
  it("hitting streak 7 returns milestoneHit=7", () => {
    const now = utcDate(2024, 1, 16, 15);
    const state = {
      ...freshState,
      streakCurrent: 6,
      streakBest: 6,
      lastStreakDate: "2024-01-15",
      streakTz: TZ,
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.newState.streakCurrent).toBe(7);
    expect(result.milestoneHit).toBe(7);
  });

  it("already at 7, same-day second session → milestoneHit=null", () => {
    const now = utcDate(2024, 1, 15, 18);
    const state = {
      ...freshState,
      streakCurrent: 7,
      streakBest: 7,
      lastStreakDate: "2024-01-15",
      streakTz: TZ,
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.milestoneHit).toBeNull();
  });

  it("hitting streak 30 returns milestoneHit=30", () => {
    const now = utcDate(2024, 2, 16, 15);
    const state = {
      ...freshState,
      streakCurrent: 29,
      streakBest: 29,
      lastStreakDate: "2024-02-15",
      streakTz: TZ,
      streakWeekStart: "2024-02-12",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.milestoneHit).toBe(30);
  });
});

describe("advanceStreak — grace day", () => {
  it("2-day gap, grace available → grace applied, streak unchanged", () => {
    // lastStreakDate = 2024-01-13, now = 2024-01-15 (2-day gap)
    const now = utcDate(2024, 1, 15, 15);
    const state = {
      ...freshState,
      streakCurrent: 4,
      streakBest: 4,
      lastStreakDate: "2024-01-13",
      streakTz: TZ,
      graceUsedThisWeek: false,
      streakWeekStart: "2024-01-15", // same week (Monday)
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.graceApplied).toBe(true);
    expect(result.newState.streakCurrent).toBe(4); // unchanged
    expect(result.newState.graceUsedThisWeek).toBe(true);
    expect(result.newState.lastStreakDate).toBe("2024-01-15");
  });

  it("2-day gap, grace already used → silent reset to 1", () => {
    const now = utcDate(2024, 1, 15, 15);
    const state = {
      ...freshState,
      streakCurrent: 10,
      streakBest: 10,
      lastStreakDate: "2024-01-13",
      streakTz: TZ,
      graceUsedThisWeek: true, // grace exhausted
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.graceApplied).toBe(false);
    expect(result.newState.streakCurrent).toBe(1);
    expect(result.newState.streakBest).toBe(10); // best never decreases
  });
});

describe("advanceStreak — long gap (reset)", () => {
  it("3-day gap → silent reset regardless of grace state", () => {
    // lastStreakDate = 2024-01-12, now = 2024-01-15 (3-day gap)
    const now = utcDate(2024, 1, 15, 15);
    const state = {
      ...freshState,
      streakCurrent: 8,
      streakBest: 10,
      lastStreakDate: "2024-01-12",
      streakTz: TZ,
      graceUsedThisWeek: false, // grace available but gap is too big
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.graceApplied).toBe(false);
    expect(result.newState.streakCurrent).toBe(1);
    expect(result.newState.streakBest).toBe(10); // streakBest never decreases
  });
});

describe("advanceStreak — streakBest monotonic invariant", () => {
  it("streakBest never decreases on reset (was 10, resets to 1)", () => {
    const now = utcDate(2024, 1, 20, 15);
    const state = {
      ...freshState,
      streakCurrent: 10,
      streakBest: 10,
      lastStreakDate: "2024-01-10", // 10-day gap → reset
      streakTz: TZ,
      graceUsedThisWeek: true,
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.newState.streakCurrent).toBe(1);
    expect(result.newState.streakBest).toBe(10); // preserved
  });
});

describe("advanceStreak — new ISO week resets graceUsedThisWeek", () => {
  it("new Monday session resets graceUsedThisWeek to false", () => {
    // Previous week: graceUsedThisWeek=true
    // Session is on 2024-01-22 (Monday), new week
    const now = utcDate(2024, 1, 22, 15);
    const state = {
      ...freshState,
      streakCurrent: 5,
      streakBest: 5,
      lastStreakDate: "2024-01-21", // Sunday, same calendar week as Monday 1/15
      streakTz: TZ,
      graceUsedThisWeek: true,
      streakWeekStart: "2024-01-15", // old week start
    };
    const result = advanceStreak(state, { tz: TZ, now });
    // 2024-01-22 is next day from 2024-01-21 → normal increment
    expect(result.newState.streakCurrent).toBe(6);
    expect(result.newState.graceUsedThisWeek).toBe(false); // reset for new week
    expect(result.newState.streakWeekStart).toBe("2024-01-22"); // new Monday
  });
});

describe("advanceStreak — timezone consistency", () => {
  it("streakTz is updated to the current input tz", () => {
    const now = utcDate(2024, 1, 16, 15);
    const state = {
      ...freshState,
      streakCurrent: 1,
      streakBest: 1,
      lastStreakDate: "2024-01-15",
      streakTz: "America/New_York",
      streakWeekStart: "2024-01-15",
    };
    const result = advanceStreak(state, { tz: TZ, now });
    expect(result.newState.streakTz).toBe(TZ);
  });
});
