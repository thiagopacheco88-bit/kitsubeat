"use server";

/**
 * Phase 11.5 SPEC #9 + ISSUE-02 — STUB. Real implementation in Plan 05 Task 4.
 *
 * Plan 04 creates this stub so VerseRow.tsx's dynamic import resolves at build time.
 * Plan 05 Task 4 replaces the body with the actual UPDATE + revalidateSongCache flow.
 */

export const runtime = "nodejs";

export interface SaveKanjiBreakdownInput {
  vocabId: string;
  breakdown: unknown;
}

export interface SaveKanjiBreakdownResult {
  ok: true;
  affectedSlugs: string[];
}

export async function saveKanjiBreakdown(
  _input: SaveKanjiBreakdownInput
): Promise<SaveKanjiBreakdownResult> {
  throw new Error(
    "saveKanjiBreakdown not implemented yet — Plan 05 Task 4 will provide the real implementation"
  );
}
