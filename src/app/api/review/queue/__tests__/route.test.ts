/**
 * Integration-style tests for GET /api/review/queue — jlptPools field contract.
 *
 * These tests require TEST_DATABASE_URL to run live (same pattern as
 * tests/integration/setup.ts). When TEST_DATABASE_URL is unset, the entire
 * describe block is skipped — the file remains TypeScript-clean, which is
 * sufficient to lock the response shape against regression.
 */

import { describe, it, expect } from "vitest";
import type { VocabRow, QueueResponse } from "../route";
import type { ReviewQueueItem } from "@/lib/review/queue-builder";

// ---------------------------------------------------------------------------
// Type-only compile check — ensures the shape contract is locked
// ---------------------------------------------------------------------------

/**
 * This function is never called at runtime; it exists solely to make the
 * TypeScript compiler enforce that the QueueResponse type is internally
 * consistent. If the route removes jlptPools, this file will fail to compile.
 */
function assertQueueResponseShape(r: QueueResponse): void {
  const _pools: Record<string, VocabRow[]> = r.jlptPools;
  const _items: ReviewQueueItem[] = r.items;
  const _vocab: Record<string, VocabRow> = r.vocabData;
  // Prevent "unused variable" lint errors
  void _pools; void _items; void _vocab;
}
void assertQueueResponseShape;

// ---------------------------------------------------------------------------
// Live integration tests — skipped when TEST_DATABASE_URL is absent
// ---------------------------------------------------------------------------

const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!HAS_TEST_DB)("GET /api/review/queue — jlptPools integration", () => {
  /**
   * Helper: call the route handler directly (no Next.js dev server).
   * Requires TEST_DATABASE_URL to be set and the DB to have at least one
   * premium user with vocabulary mastered.
   */
  async function callQueueRoute(): Promise<QueueResponse> {
    // Dynamic import so the module-level DB client doesn't boot during unit runs
    const { GET } = await import("../route");
    const response = await GET();
    return response.json() as Promise<QueueResponse>;
  }

  it("response includes a jlptPools field (even if empty)", async () => {
    const data = await callQueueRoute();
    // jlptPools must be present and be an object (not undefined, not array)
    expect(data).toHaveProperty("jlptPools");
    expect(typeof data.jlptPools).toBe("object");
    expect(Array.isArray(data.jlptPools)).toBe(false);
  });

  it("jlptPools keys match only JLPT levels present in vocabData", async () => {
    const data = await callQueueRoute();
    const levelsInVocabData = new Set(
      Object.values(data.vocabData)
        .map((v) => v.jlpt_level)
        .filter((l): l is string => typeof l === "string" && l.length > 0)
    );
    for (const level of Object.keys(data.jlptPools)) {
      expect(levelsInVocabData.has(level)).toBe(true);
    }
  });

  it("no VocabRow in any pool has an id that appears in items (no self-distractor cross-contamination)", async () => {
    const data = await callQueueRoute();
    const queuedIds = new Set(data.items.map((i) => i.vocab_item_id));
    for (const [, pool] of Object.entries(data.jlptPools)) {
      for (const row of pool) {
        expect(queuedIds.has(row.id)).toBe(false);
      }
    }
  });

  it("each jlptPools[level] array has length <= 50", async () => {
    const data = await callQueueRoute();
    for (const [level, pool] of Object.entries(data.jlptPools)) {
      expect(pool.length).toBeLessThanOrEqual(50);
      // Also verify level key matches the pool rows' jlpt_level
      for (const row of pool) {
        expect(row.jlpt_level).toBe(level);
      }
    }
  });

  it("when queue is empty, jlptPools is {} (not undefined)", async () => {
    // This test is meaningful only when the test user has no due/new cards.
    // We assert the structural invariant: if jlptPools is present and the
    // queue is empty, jlptPools must be an empty object (not null or undefined).
    const data = await callQueueRoute();
    if (data.items.length === 0) {
      expect(data.jlptPools).toEqual({});
    } else {
      // Queue is non-empty — jlptPools may or may not be empty depending on
      // whether vocabData rows have non-null jlpt_level. Just check it exists.
      expect(data).toHaveProperty("jlptPools");
    }
  });
});
