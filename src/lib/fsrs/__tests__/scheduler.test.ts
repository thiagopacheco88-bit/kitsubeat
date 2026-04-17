import { describe, it, expect } from "vitest";
import { scheduleReview, type ScheduledUpdate, type MasteryRow } from "../scheduler";

describe("scheduleReview", () => {
  it("new-card init: scheduleReview(null, 3 /* Good */) yields state=1, reps=1, non-null stability/difficulty, due > now", () => {
    const now = new Date();
    const result = scheduleReview(null, 3, "normal", now);

    expect(result.state).toBe(1); // Learning
    expect(result.reps).toBe(1);
    expect(result.stability).not.toBeNull();
    expect(result.stability).toBeGreaterThan(0);
    expect(result.difficulty).not.toBeNull();
    expect(result.difficulty).toBeGreaterThan(0);
    expect(result.due.getTime()).toBeGreaterThan(now.getTime());
  });

  it("lapse: from state=2 (Review), rating=1 (Again) bumps lapses >=1 and returns state in {1, 3}", () => {
    const now = new Date();
    const prev: MasteryRow = {
      state: 2,          // Review
      stability: 10,
      difficulty: 5,
      elapsed_days: 10,
      scheduled_days: 10,
      reps: 5,
      lapses: 0,
      due: now,
      last_review: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    };

    const result = scheduleReview(prev, 1, "normal", now);

    expect(result.lapses).toBeGreaterThanOrEqual(1); // lapses incremented
    expect([1, 3]).toContain(result.state);           // learning or relearning
  });

  it("easy promotion: from state=1 (Learning), rating=4 (Easy) → state is 1 or 2, reps incremented", () => {
    const now = new Date();
    const prev: MasteryRow = {
      state: 1,          // Learning
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      due: now,
      last_review: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    };

    const result = scheduleReview(prev, 4, "normal", now);

    expect([1, 2]).toContain(result.state); // learning or review (promoted)
    expect(result.reps).toBeGreaterThan(prev.reps);
  });

  it("intensity respected: both 'intensive' and 'light' succeed and return ScheduledUpdate", () => {
    const now = new Date();

    const intensive = scheduleReview(null, 3, "intensive", now);
    const light = scheduleReview(null, 3, "light", now);

    // Both must return valid ScheduledUpdate
    expect(intensive.due).toBeInstanceOf(Date);
    expect(light.due).toBeInstanceOf(Date);
    expect(intensive.state).toBeDefined();
    expect(light.state).toBeDefined();

    // Intensive should schedule no further out than light for the same starting card
    expect(intensive.due.getTime()).toBeLessThanOrEqual(light.due.getTime());
  });

  it("pure (no DB): ScheduledUpdate has all expected scalar columns", () => {
    const result = scheduleReview(null, 3);

    const requiredKeys: Array<keyof ScheduledUpdate> = [
      "stability",
      "difficulty",
      "elapsed_days",
      "scheduled_days",
      "reps",
      "lapses",
      "state",
      "due",
      "last_review",
    ];

    for (const key of requiredKeys) {
      expect(result).toHaveProperty(key);
    }
  });

  it("MasteryRow with intensity_preset carries through without breaking scheduler", () => {
    const now = new Date();
    const prev: MasteryRow = {
      state: 1,
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      due: now,
      last_review: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      intensity_preset: "normal", // should be ignored by scheduler
    };

    // intensity_preset on MasteryRow is ignored; we pass the explicit argument
    const result = scheduleReview(prev, 3, "normal", now);
    expect(result.state).toBeDefined();
  });
});
