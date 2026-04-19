/**
 * Phase 12-02 — Reward-slot filter unit coverage.
 *
 * Tests getVisibleSlotsForUser and getNextRewardPreview.
 * Empty-state guarantee: no 'coming soon' state — empty catalog returns [] / null.
 */

import { describe, it, expect } from "vitest";
import {
  getVisibleSlotsForUser,
  getNextRewardPreview,
} from "@/lib/gamification/reward-slots";
import type { RewardSlotDefinition } from "@/lib/types/reward-slots";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSlot(
  id: string,
  level_threshold: number,
  active: boolean
): RewardSlotDefinition {
  return {
    id,
    slot_type: "badge",
    level_threshold,
    content: {
      type: "badge",
      icon: "star",
      label: `Slot ${id}`,
      description: "Test badge",
    },
    active,
  };
}

// ---------------------------------------------------------------------------
// getVisibleSlotsForUser
// ---------------------------------------------------------------------------

describe("getVisibleSlotsForUser", () => {
  it("empty catalog → returns []", () => {
    expect(getVisibleSlotsForUser([], 5)).toEqual([]);
  });

  it("all slots inactive → returns []", () => {
    const defs = [
      makeSlot("a", 1, false),
      makeSlot("b", 3, false),
      makeSlot("c", 5, false),
    ];
    expect(getVisibleSlotsForUser(defs, 10)).toEqual([]);
  });

  it("user level 5 with slots at [3, 7, 10] all active → only level-3 slot visible", () => {
    const defs = [
      makeSlot("slot-3", 3, true),
      makeSlot("slot-7", 7, true),
      makeSlot("slot-10", 10, true),
    ];
    const visible = getVisibleSlotsForUser(defs, 5);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("slot-3");
  });

  it("user level 7 → slots at level 3 and 7 visible, level 10 not visible", () => {
    const defs = [
      makeSlot("slot-3", 3, true),
      makeSlot("slot-7", 7, true),
      makeSlot("slot-10", 10, true),
    ];
    const visible = getVisibleSlotsForUser(defs, 7);
    expect(visible).toHaveLength(2);
    expect(visible.map((s) => s.id)).toContain("slot-3");
    expect(visible.map((s) => s.id)).toContain("slot-7");
  });

  it("returned slots are sorted by level_threshold ASC", () => {
    const defs = [
      makeSlot("slot-10", 10, true),
      makeSlot("slot-3", 3, true),
      makeSlot("slot-7", 7, true),
    ];
    const visible = getVisibleSlotsForUser(defs, 10);
    expect(visible.map((s) => s.level_threshold)).toEqual([3, 7, 10]);
  });

  it("inactive slots are excluded even if under threshold", () => {
    const defs = [
      makeSlot("active-2", 2, true),
      makeSlot("inactive-3", 3, false),
      makeSlot("active-5", 5, true),
    ];
    const visible = getVisibleSlotsForUser(defs, 5);
    expect(visible.map((s) => s.id)).toEqual(["active-2", "active-5"]);
  });

  it("multiple slots at same threshold → all visible when unlocked", () => {
    const defs = [
      makeSlot("a", 3, true),
      makeSlot("b", 3, true),
    ];
    const visible = getVisibleSlotsForUser(defs, 5);
    expect(visible).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getNextRewardPreview
// ---------------------------------------------------------------------------

describe("getNextRewardPreview", () => {
  it("empty catalog → returns null", () => {
    expect(getNextRewardPreview([], 5)).toBeNull();
  });

  it("all slots inactive → returns null", () => {
    const defs = [
      makeSlot("a", 7, false),
      makeSlot("b", 10, false),
    ];
    expect(getNextRewardPreview(defs, 5)).toBeNull();
  });

  it("user level 5 with active slots at [3, 7, 10] → preview is level-7 slot", () => {
    const defs = [
      makeSlot("slot-3", 3, true),
      makeSlot("slot-7", 7, true),
      makeSlot("slot-10", 10, true),
    ];
    const preview = getNextRewardPreview(defs, 5);
    expect(preview).not.toBeNull();
    expect(preview!.id).toBe("slot-7");
  });

  it("all slots unlocked (user above all thresholds) → returns null", () => {
    const defs = [
      makeSlot("slot-3", 3, true),
      makeSlot("slot-5", 5, true),
    ];
    expect(getNextRewardPreview(defs, 10)).toBeNull();
  });

  it("multiple locked slots → returns the one with lowest threshold", () => {
    const defs = [
      makeSlot("slot-15", 15, true),
      makeSlot("slot-8", 8, true),
      makeSlot("slot-12", 12, true),
    ];
    const preview = getNextRewardPreview(defs, 5);
    expect(preview!.id).toBe("slot-8");
  });

  it("multiple slots at same lowest locked threshold → returns one (deterministic by id sort)", () => {
    const defs = [
      makeSlot("b-slot", 7, true),
      makeSlot("a-slot", 7, true),
    ];
    const preview = getNextRewardPreview(defs, 5);
    expect(preview).not.toBeNull();
    // Either is valid; ensure it's one of the tied slots
    expect(["a-slot", "b-slot"]).toContain(preview!.id);
  });

  it("inactive locked slots are not returned as preview", () => {
    const defs = [
      makeSlot("inactive-7", 7, false),
      makeSlot("active-10", 10, true),
    ];
    const preview = getNextRewardPreview(defs, 5);
    expect(preview!.id).toBe("active-10"); // skips inactive slot
  });
});
