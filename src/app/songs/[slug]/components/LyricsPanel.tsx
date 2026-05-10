"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { Verse } from "@/lib/types/lesson";
import { usePlayer } from "./PlayerContext";
import VerseBlock from "./VerseBlock";

const LS_KEY = "kitsubeat_lyrics_autoscroll";

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
  offsetMs = 0,
  dominatedVerseNumbers = [],
}: {
  verses: Verse[];
  syncedLrc?: SyncedLine[] | null;
  /**
   * Milliseconds added to every verse start/end after timing is computed. Set
   * per song_version in the DB (`song_versions.lyrics_offset_ms`) to correct
   * drift between LRCLIB's reference audio and the YouTube cut we embed.
   * Positive = delay the highlight; negative = pull it earlier.
   */
  offsetMs?: number;
  /**
   * Phase 11.6 SPEC-REQ-14: list of verse numbers the user has dominated on
   * this song version. Each VerseBlock checks membership and renders a gold
   * star next to the verse number when present.
   */
  dominatedVerseNumbers?: number[];
}) {
  const { currentTimeMs } = usePlayer();
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [autoScroll, setAutoScroll] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(LS_KEY);
    return stored === null ? true : stored === "true";
  });

  const verseTiming = useMemo(() => {
    // Primary path: align verses to LRCLIB synced lyrics by text matching.
    const matched = buildVerseTiming(verses, syncedLrc ?? []);
    // Union strategy: matcher's LRC-derived timings are primary. For verses
    // the matcher silently skipped (e.g. English-prefix lines like "ChAngE
    // なびかない" where lesson tokens drop the English word, or chorus repeats
    // the linear matcher walked past), fall back to the lesson's own
    // start/end_time_ms — populated by restore-verse-order.ts /
    // backfill-verse-timing-from-lrc.ts using per-verse local search
    // against synced_lrc. Both sources are LRC-frame so the offset shift
    // below applies uniformly. When matcher returns nothing at all (no
    // synced_lrc / Failure #14 romaji-LRC), this collapses to the lesson
    // values alone.
    const base = new Map<number, { startMs: number; endMs: number }>(matched);
    for (const v of verses) {
      if (base.has(v.verse_number)) continue;
      if ((v.start_time_ms ?? 0) > 0 || (v.end_time_ms ?? 0) > 0) {
        base.set(v.verse_number, { startMs: v.start_time_ms, endMs: v.end_time_ms });
      }
    }

    const shifted = new Map<number, { startMs: number; endMs: number }>();
    if (offsetMs) {
      for (const [k, t] of base) {
        shifted.set(k, {
          startMs: Math.max(0, t.startMs + offsetMs),
          endMs: Math.max(0, t.endMs + offsetMs),
        });
      }
    } else {
      for (const [k, t] of base) shifted.set(k, { ...t });
    }

    // Karaoke lead-in: light up the next verse slightly before its vocal
    // starts. Lead is half the gap to the previous verse, capped at
    // LEAD_MS_MAX, so back-to-back verses don't overlap and long
    // instrumental gaps don't trigger the highlight too early.
    const LEAD_MS_MAX = 500;
    const ordered = verses
      .map((v) => ({ vno: v.verse_number, t: shifted.get(v.verse_number) }))
      .filter((x): x is { vno: number; t: { startMs: number; endMs: number } } => !!x.t)
      .sort((a, b) => a.t.startMs - b.t.startMs);
    for (let i = 0; i < ordered.length; i++) {
      const prevEnd = i > 0 ? ordered[i - 1].t.endMs : ordered[i].t.startMs;
      const gap = ordered[i].t.startMs - prevEnd;
      const lead = Math.min(LEAD_MS_MAX, Math.max(0, Math.floor(gap / 2)));
      shifted.set(ordered[i].vno, {
        startMs: Math.max(0, ordered[i].t.startMs - lead),
        endMs: ordered[i].t.endMs,
      });
    }
    return shifted;
  }, [verses, syncedLrc, offsetMs]);

  // Determine active verse
  const activeVerse = useMemo(() => {
    if (currentTimeMs <= 0 || verseTiming.size === 0) return null;

    // 5-second grace period: keep a verse highlighted briefly after it ends
    // (normal inter-verse gaps are <1s), but clear it during long instrumentals.
    const GRACE_MS = 5000;
    for (let i = verses.length - 1; i >= 0; i--) {
      const timing = verseTiming.get(verses[i].verse_number);
      if (timing && currentTimeMs >= timing.startMs && currentTimeMs < timing.endMs + GRACE_MS) {
        return verses[i].verse_number;
      }
    }
    return null;
  }, [currentTimeMs, verses, verseTiming]);

  // Auto-scroll to active verse
  useEffect(() => {
    if (!autoScroll || activeVerse === null) return;
    const el = verseRefs.current.get(activeVerse);
    if (el) {
      const panel = el.closest<HTMLElement>("[data-testid='song-lyrics-panel']");
      if (!panel) return;

      const panelRect = panel.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const centeredOffset =
        elRect.top -
        panelRect.top -
        Math.max(0, (panel.clientHeight - el.clientHeight) / 2);

      panel.scrollTo({
        top: panel.scrollTop + centeredOffset,
        behavior: "smooth",
      });
    }
  }, [activeVerse, autoScroll]);

  function toggleAutoScroll() {
    const next = !autoScroll;
    setAutoScroll(next);
    localStorage.setItem(LS_KEY, String(next));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          onClick={toggleAutoScroll}
          title="Auto-scroll · Still a work in progress — timing may be off on some songs"
          aria-label={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            autoScroll
              ? "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              : "border-transparent bg-transparent text-[var(--color-text-faint,#888)] opacity-50 hover:opacity-70"
          }`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 1v10M3 8l3 3 3-3M3 4l3-3 3 3" />
          </svg>
          Auto-scroll
        </button>
      </div>
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
            startMs={verseTiming.get(verse.verse_number)?.startMs}
            isDominated={dominatedVerseNumbers.includes(verse.verse_number)}
          />
        </div>
      ))}
    </div>
  );
}
