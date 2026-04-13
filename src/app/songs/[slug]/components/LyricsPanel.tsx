"use client";

import { useRef, useEffect, useMemo } from "react";
import type { Verse } from "@/lib/types/lesson";
import { usePlayer } from "./PlayerContext";
import VerseBlock from "./VerseBlock";

interface SyncedLine {
  startMs: number;
  text: string;
}

/**
 * Build a mapping of verse_number -> {startMs, endMs} by matching
 * verse token text against synced_lrc lines.
 */
function buildVerseTiming(
  verses: Verse[],
  syncedLrc: SyncedLine[]
): Map<number, { startMs: number; endMs: number }> {
  const result = new Map<number, { startMs: number; endMs: number }>();
  if (!syncedLrc.length || !verses.length) return result;

  // Normalize text for matching: remove spaces, punctuation, to lowercase
  const normalize = (s: string) =>
    s.replace(/[\s\u3000、。！？・「」『』（）\-,.!?()"']/g, "").toLowerCase();

  let lrcIdx = 0;

  for (const verse of verses) {
    // Concatenate all token surfaces for this verse
    const verseText = normalize(verse.tokens.map((t) => t.surface).join(""));
    if (!verseText) continue;

    // Find the first synced line that matches the start of this verse
    let verseStartMs = -1;
    let verseEndMs = -1;
    let accumulated = "";

    const searchStart = Math.max(0, lrcIdx - 1);
    for (let i = searchStart; i < syncedLrc.length; i++) {
      const lineText = normalize(syncedLrc[i].text);
      if (!lineText) continue;

      // Check if this line's text is part of the verse
      const testAccumulated = accumulated + lineText;
      if (verseText.startsWith(testAccumulated) || testAccumulated.startsWith(verseText.slice(0, testAccumulated.length))) {
        if (verseStartMs === -1) {
          verseStartMs = syncedLrc[i].startMs;
        }
        accumulated = testAccumulated;
        lrcIdx = i + 1;

        // If we've covered the verse text, set end time
        if (accumulated.length >= verseText.length * 0.7) {
          // End time: start of next line, or last line + 5 seconds
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

export default function LyricsPanel({
  verses,
  syncedLrc,
}: {
  verses: Verse[];
  syncedLrc?: SyncedLine[] | null;
}) {
  const { currentTimeMs } = usePlayer();
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const verseTiming = useMemo(
    () => buildVerseTiming(verses, syncedLrc ?? []),
    [verses, syncedLrc]
  );

  // Determine active verse
  const activeVerse = useMemo(() => {
    if (currentTimeMs <= 0 || verseTiming.size === 0) return null;

    for (let i = verses.length - 1; i >= 0; i--) {
      const timing = verseTiming.get(verses[i].verse_number);
      if (timing && currentTimeMs >= timing.startMs) {
        return verses[i].verse_number;
      }
    }
    return null;
  }, [currentTimeMs, verses, verseTiming]);

  // Auto-scroll to active verse
  useEffect(() => {
    if (activeVerse === null) return;
    const el = verseRefs.current.get(activeVerse);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeVerse]);

  return (
    <div className="flex flex-col gap-3">
      {verses.map((verse) => (
        <div
          key={verse.verse_number}
          ref={(el) => {
            if (el) verseRefs.current.set(verse.verse_number, el);
          }}
        >
          <VerseBlock
            verse={verse}
            isActive={activeVerse === verse.verse_number}
          />
        </div>
      ))}
    </div>
  );
}
