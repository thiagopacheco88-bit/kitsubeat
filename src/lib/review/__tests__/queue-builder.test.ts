import { describe, it, expect } from "vitest";
import {
  buildReviewQueue,
  hashVocabId,
  type DueCardInput,
  type NewCardInput,
  type ReviewQueueItem,
} from "../queue-builder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDue(id: string, dueOffset = 0): DueCardInput {
  return {
    vocab_item_id: id,
    state: 2,
    due: new Date(Date.now() - dueOffset * 60_000),
  };
}

function makeNew(id: string): NewCardInput {
  return { vocab_item_id: id };
}

// Synthetic ids for property tests
const SYNTHETIC_IDS = Array.from({ length: 100 }, (_, i) =>
  `vocab-item-${i.toString().padStart(4, "0")}`
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildReviewQueue", () => {
  it("empty inputs return empty queue", () => {
    const result = buildReviewQueue([], [], 10);
    expect(result).toEqual([]);
  });

  it("fill_lyric is NEVER emitted — property test over 100 synthetic vocab ids", () => {
    const due = SYNTHETIC_IDS.map((id) => makeDue(id));
    const result = buildReviewQueue(due, [], 0);
    expect(result.length).toBe(100);
    for (const item of result) {
      expect(item.exerciseType).not.toBe("fill_lyric");
    }
  });

  it("newCardBudget=0 → only due cards in output, no new cards", () => {
    const due = [makeDue("due-a"), makeDue("due-b")];
    const newCards = [makeNew("new-x"), makeNew("new-y"), makeNew("new-z")];
    const result = buildReviewQueue(due, newCards, 0);
    expect(result.length).toBe(2);
    expect(result.every((i) => !i.isNew)).toBe(true);
    expect(result.map((i) => i.vocab_item_id)).toEqual(["due-a", "due-b"]);
  });

  it("newCardBudget=5 with 10 new cards → exactly 5 new cards in output", () => {
    const newCards = Array.from({ length: 10 }, (_, i) => makeNew(`new-${i}`));
    const result = buildReviewQueue([], newCards, 5);
    const newItems = result.filter((i) => i.isNew);
    expect(newItems.length).toBe(5);
  });

  it("due-first order: due cards appear before new cards", () => {
    const due = [makeDue("due-1"), makeDue("due-2"), makeDue("due-3")];
    const newCards = [makeNew("new-a"), makeNew("new-b")];
    const result = buildReviewQueue(due, newCards, 10);

    const dueItems = result.filter((i) => !i.isNew);
    const newItems = result.filter((i) => i.isNew);

    // Due-first ordering: every due item index < every new item index
    const lastDueIndex = result.findLastIndex((i) => !i.isNew);
    const firstNewIndex = result.findIndex((i) => i.isNew);

    expect(lastDueIndex).toBeLessThan(firstNewIndex);
    expect(dueItems.length).toBe(3);
    expect(newItems.length).toBe(2);
  });

  it("deterministic type rotation: same vocab_item_id yields same exerciseType across two calls", () => {
    const id = "stable-id-12345";
    const result1 = buildReviewQueue([makeDue(id)], [], 0);
    const result2 = buildReviewQueue([makeDue(id)], [], 0);
    expect(result1[0].exerciseType).toBe(result2[0].exerciseType);
  });

  it("all output exercise types are within the allowed set", () => {
    const allowed = new Set(["vocab_meaning", "meaning_vocab", "reading_match"]);
    const due = SYNTHETIC_IDS.slice(0, 50).map((id) => makeDue(id));
    const newCards = SYNTHETIC_IDS.slice(50).map((id) => makeNew(id));
    const result = buildReviewQueue(due, newCards, 50);
    for (const item of result) {
      expect(allowed.has(item.exerciseType)).toBe(true);
    }
  });

  it("isNew flag is correctly set: due cards have isNew=false, new cards have isNew=true", () => {
    const due = [makeDue("d-1"), makeDue("d-2")];
    const newCards = [makeNew("n-1"), makeNew("n-2")];
    const result = buildReviewQueue(due, newCards, 10);
    const dueItems = result.filter((i) => !i.isNew);
    const newItems = result.filter((i) => i.isNew);
    expect(dueItems.map((i) => i.vocab_item_id)).toEqual(["d-1", "d-2"]);
    expect(newItems.map((i) => i.vocab_item_id)).toEqual(["n-1", "n-2"]);
  });

  it("newCardBudget larger than available new cards → all new cards included", () => {
    const newCards = [makeNew("n-1"), makeNew("n-2")];
    const result = buildReviewQueue([], newCards, 100);
    expect(result.length).toBe(2);
    expect(result.every((i) => i.isNew)).toBe(true);
  });

  it("negative newCardBudget treated same as 0 (no new cards)", () => {
    const newCards = [makeNew("n-1"), makeNew("n-2")];
    const result = buildReviewQueue([], newCards, -5);
    expect(result.length).toBe(0);
  });
});

describe("hashVocabId", () => {
  it("returns a non-negative integer", () => {
    expect(hashVocabId("test-id")).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hashVocabId("test-id"))).toBe(true);
  });

  it("is deterministic across calls", () => {
    const id = "some-vocab-uuid-abc123";
    expect(hashVocabId(id)).toBe(hashVocabId(id));
  });

  it("empty string returns 0", () => {
    expect(hashVocabId("")).toBe(0);
  });
});
