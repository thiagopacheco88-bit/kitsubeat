/**
 * Phase 11.5 SPEC #13/#14: renumber verses 1..N contiguously by start_time_ms.
 * Used at publish time (not draft time — draft preserves edit context per SPEC #14).
 */

import type { Verse } from "@/lib/types/lesson";

export function renumberVerses<V extends Pick<Verse, "verse_number" | "start_time_ms">>(
  verses: V[]
): V[] {
  // Sort by start_time_ms (primary), then by original verse_number (stable tiebreak)
  const sorted = [...verses].sort((a, b) => {
    if (a.start_time_ms !== b.start_time_ms) return a.start_time_ms - b.start_time_ms;
    return a.verse_number - b.verse_number;
  });
  return sorted.map((v, idx) => ({ ...v, verse_number: idx + 1 }));
}
