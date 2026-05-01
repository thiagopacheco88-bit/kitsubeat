/**
 * Phase 11.5 SPEC #12: detect timing overlap / non-monotonic verses.
 * Returns warnings, NEVER blocks publish (admin judgment trumps validation).
 */

import type { Verse } from "@/lib/types/lesson";

export type OverlapWarning = {
  verseNumber: number;
  kind: "overlap" | "non_monotonic" | "degenerate";
  detail: string;
};

export function detectOverlap(
  verses: Pick<Verse, "verse_number" | "start_time_ms" | "end_time_ms">[]
): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];
  if (verses.length === 0) return warnings;

  // Sort by verse_number to walk in declared order
  const sorted = [...verses].sort((a, b) => a.verse_number - b.verse_number);

  for (let i = 0; i < sorted.length; i++) {
    const v = sorted[i];
    if (v.start_time_ms > v.end_time_ms) {
      warnings.push({
        verseNumber: v.verse_number,
        kind: "degenerate",
        detail: `start_time_ms (${v.start_time_ms}) > end_time_ms (${v.end_time_ms})`,
      });
    }

    if (i === 0) continue;
    const prev = sorted[i - 1];

    if (v.start_time_ms < prev.start_time_ms) {
      warnings.push({
        verseNumber: v.verse_number,
        kind: "non_monotonic",
        detail: `start_time_ms (${v.start_time_ms}) < previous verse start_time_ms (${prev.start_time_ms})`,
      });
    } else if (v.start_time_ms < prev.end_time_ms) {
      warnings.push({
        verseNumber: v.verse_number,
        kind: "overlap",
        detail: `start_time_ms (${v.start_time_ms}) < previous verse end_time_ms (${prev.end_time_ms})`,
      });
    }
  }

  return warnings;
}
