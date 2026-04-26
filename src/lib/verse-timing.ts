import type { Verse } from "@/lib/types/lesson";

export interface SyncedLine {
  startMs: number;
  text: string;
}

export interface VerseTiming {
  startMs: number;
  endMs: number;
}

const NORMALIZE_STRIP_RE = /[\s　、。！？・「」『』（）()《》〈〉【】〔〕［］\[\]↑↓→←\-,.!?"']/g;

export function normalizeForMatch(s: string): string {
  return s.replace(NORMALIZE_STRIP_RE, "").toLowerCase();
}

const MIN_CONTAIN_LEN = 3;

/**
 * Map verse_number -> {startMs, endMs} by aligning each verse's token text
 * to the synced LRCLIB lines.
 *
 * A verse "matches" an LRC line (or run of lines) when:
 *   - the accumulated normalized text is a prefix of the verse text or vice
 *     versa (multi-line verses, or single-line exact match), OR
 *   - the LRC line contains the verse text as a substring (handles LRC lines
 *     with extra leading/trailing words the lesson tokenizer dropped — e.g.
 *     "ChAngE なびかない 流されないよ" vs verse "なびかない流されないよ").
 */
export function buildVerseTiming(
  verses: Verse[],
  syncedLrc: SyncedLine[]
): Map<number, VerseTiming> {
  const result = new Map<number, VerseTiming>();
  if (!syncedLrc.length || !verses.length) return result;

  let lrcIdx = 0;

  for (const verse of verses) {
    const verseText = normalizeForMatch(verse.tokens.map((t) => t.surface).join(""));
    if (!verseText) continue;

    let verseStartMs = -1;
    let verseEndMs = -1;
    let accumulated = "";

    const searchStart = Math.max(0, lrcIdx - 1);
    for (let i = searchStart; i < syncedLrc.length; i++) {
      const lineText = normalizeForMatch(syncedLrc[i].text);
      if (!lineText) continue;

      const testAccumulated = accumulated + lineText;

      const isPrefixMatch =
        verseText.startsWith(testAccumulated) ||
        testAccumulated.startsWith(verseText.slice(0, testAccumulated.length));

      const isContainedMatch =
        accumulated.length === 0 &&
        verseText.length >= MIN_CONTAIN_LEN &&
        lineText.includes(verseText);

      if (isPrefixMatch || isContainedMatch) {
        if (verseStartMs === -1) {
          verseStartMs = syncedLrc[i].startMs;
        }
        accumulated = isContainedMatch ? verseText : testAccumulated;
        lrcIdx = i + 1;

        if (accumulated.length >= verseText.length * 0.7) {
          verseEndMs =
            i + 1 < syncedLrc.length
              ? syncedLrc[i + 1].startMs
              : syncedLrc[i].startMs + 5000;
          break;
        }
      }
    }

    if (verseStartMs >= 0) {
      if (verseEndMs < 0) verseEndMs = verseStartMs + 10000;
      result.set(verse.verse_number, {
        startMs: verseStartMs,
        endMs: verseEndMs,
      });
    }
  }

  return result;
}
