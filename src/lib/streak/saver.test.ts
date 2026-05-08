// Phase 14.4 — streak-saver unit tests (filled from Wave 0 stub by plan 02)
import { describe, it, expect } from "vitest";
import { applyStreakSaver, type StreakSaverInput } from "./saver";

const BASE_NEW_STATE = { streakCurrent: 8, lastStreakDate: "2026-05-08" };
const BASE_RESET_STATE = { streakCurrent: 1, lastStreakDate: "2026-05-08" };

describe("applyStreakSaver", () => {
  it("grants token (0→1) when milestoneHit=7 and token=0", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 6,
      streakSaverToken: 0,
      milestoneHit: 7,
      graceApplied: false,
      todayInTz: "2026-05-08",
    };
    const result = applyStreakSaver(input, BASE_NEW_STATE);
    expect(result.nextToken).toBe(1);
    expect(result.granted).toBe(true);
    expect(result.consumed).toBe(false);
  });

  it("does NOT double-grant when milestoneHit=7 and token=1", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 14,
      streakSaverToken: 1,
      milestoneHit: 7,
      graceApplied: false,
      todayInTz: "2026-05-08",
    };
    const result = applyStreakSaver(input, { streakCurrent: 15, lastStreakDate: "2026-05-08" });
    expect(result.nextToken).toBe(1);
    expect(result.granted).toBe(false);
  });

  it("consumes token on reset when !graceApplied && prevStreak>1 && newStreak=1 && token=1", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 9,
      streakSaverToken: 1,
      milestoneHit: null,
      graceApplied: false,
      todayInTz: "2026-05-08",
    };
    const result = applyStreakSaver(input, BASE_RESET_STATE);
    expect(result.consumed).toBe(true);
    expect(result.nextToken).toBe(0);
    expect(result.nextStreakCurrent).toBe(10); // previousStreakCurrent + 1
    expect(result.nextPending).toBe(true);
    expect(result.nextLastStreakDate).toBe("2026-05-08");
  });

  it("does NOT consume token on grace-applied session (graceApplied=true)", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 5,
      streakSaverToken: 1,
      milestoneHit: null,
      graceApplied: true,
      todayInTz: "2026-05-08",
    };
    // Grace kept the streak, so streakCurrent stayed at 5 (grace advanced to 6 or similar)
    const result = applyStreakSaver(input, { streakCurrent: 6, lastStreakDate: "2026-05-08" });
    expect(result.consumed).toBe(false);
    expect(result.nextToken).toBe(1); // not consumed
  });

  it("restores streakCurrent to previousStreakCurrent + 1 on consume", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 14,
      streakSaverToken: 1,
      milestoneHit: null,
      graceApplied: false,
      todayInTz: "2026-05-08",
    };
    const result = applyStreakSaver(input, BASE_RESET_STATE);
    expect(result.nextStreakCurrent).toBe(15);
  });

  it("sets nextPending=true on consume", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 9,
      streakSaverToken: 1,
      milestoneHit: null,
      graceApplied: false,
      todayInTz: "2026-05-08",
    };
    const result = applyStreakSaver(input, BASE_RESET_STATE);
    expect(result.nextPending).toBe(true);
  });

  it("edge: token=0 and reset — no consume, streak resets normally", () => {
    const input: StreakSaverInput = {
      previousStreakCurrent: 5,
      streakSaverToken: 0,
      milestoneHit: null,
      graceApplied: false,
      todayInTz: "2026-05-08",
    };
    const result = applyStreakSaver(input, BASE_RESET_STATE);
    expect(result.consumed).toBe(false);
    expect(result.nextToken).toBe(0);
    expect(result.nextStreakCurrent).toBe(1); // reset stands
    expect(result.nextPending).toBe(false);
  });
});
