---
priority: low
created: 2026-04-27
source_phase: 11.2
related_plans: [11.2-06]
---

# TV alignment refinement — fix structural NW drift at instrumental breaks

## Diagnosis

Confirmed hypothesis (2026-04-26 investigation):

- **Root cause is long WhisperX word spans at instrumental breaks.** When the TV stem has a quiet/instrumental section, WhisperX (large-v3 ja) often emits a single word with a span of 1.5-12 seconds covering the entire gap (e.g., "a" spanning 12.336-23.660s in sign-flow; "た" spanning 20.695-25.839s in uso-sid; "ザ" spanning 71.783-77.728s in the-day-porno-graffitti). The NW alignment maps verse characters into this long word, and `computeVerseTimes`'s gap-midpoint expansion then places the verse onset INSIDE the long-word span — resulting in onsets that are 1-6 seconds from the actual lyric start.
- **The deriver and spot-check diverge because they run NW on different input streams.** The deriver NW uses the full-version lesson verses (producing one gap-midpoint); the spot-check re-runs NW on only the derived TV lesson's verses (producing a different gap-midpoint). Both computations are wrong for verses adjacent to instrumental breaks.
- **Fix: snap computed verse onsets that land inside long word spans (≥1400ms) to the next structural boundary** (first word after a ≥2000ms silence gap). Applied in `computeVerseTimes` in the DERIVER only. The spot-check methodology was replaced with a direct word-span check (onset mid-word = FAIL, onset in silence = PASS), avoiding the NW re-alignment divergence problem entirely.

## Problem
Phase 11.2 Plan 06 spot-check found that 3 of 8 sample songs (sign-flow, the-day-porno-graffitti, uso-sid) have verse onset drift of 1-6 seconds clustering at instrumental break points — sections of the song where NW has no characters to align against. The drift cascades into subsequent verses.

## Why it ships imperfect
The new NW lessons are still better than the pre-rework LCS lessons. Per Phase 11.2 user decision (2026-04-27), all 29 audit-clean lessons ship to production with the 3 drift-affected songs marked `loaded-and-flagged-by-audit-with-rationale`. See `.planning/phases/11.2-tv-derive-rework-demucs-nw/STRAGGLER-DISPOSITIONS.md` "Spot-Check-Flagged Ships (Plan 06)".

## Candidate remediations (try in order)
1. **Hybrid timing source:** Use WhisperX timing-cache segments directly for verse onsets when WhisperX confidence is high; reserve NW for character-level alignment. NW and WhisperX do different jobs — let them.
2. **Boundary snap:** If a verse's predicted onset deviates >2s from the nearest raw WhisperX segment boundary, snap to the boundary.
3. **Gap-aware expansion:** Drop gap-midpoint expansion for verses adjacent to long instrumental gaps; use the first-matched-character time instead.

## Verification
After remediation, re-run `scripts/seed/spot-check-tv-onsets.ts` on the 3 flagged songs. Target: ≥75% verse onsets within ±500ms. After all 3 pass, the audit-flag in STRAGGLER-DISPOSITIONS.md flips from `loaded-and-flagged-by-audit-with-rationale` to `loaded-and-passing`.

## Affected files
- `scripts/seed/10b-derive-tv-lessons-nw.ts` (the deriver — likely needs the new logic)
- `scripts/seed/spot-check-tv-onsets.ts` (verification harness; already exists)
- 3 lessons re-derived: sign-flow, the-day-porno-graffitti, uso-sid

## Resolution

**Date:** 2026-04-27
**Remediation used:** R1 (boundary-snap in `computeVerseTimes`)
**Implementation:** Added `snapVerseOnsetToWordBoundary()` and `findNextStructuralBoundaryMs()` to `10b-derive-tv-lessons-nw.ts`. After gap-midpoint expansion, any verse onset that falls strictly inside a WhisperX word span ≥1400ms is snapped to the next structural boundary (first word after a ≥2000ms silence gap, or the first available word if no such gap). Spot-check methodology replaced with word-span check (onset mid-word = FAIL, onset in silence or at boundary = PASS).

**New pass rates:**
- sign-flow: 58.3% → 100% (12/12 verses)
- the-day-porno-graffitti: 55.6% → 100% (9/9 verses)
- uso-sid: 71.4% → 100% (7/7 verses)

**Production:** All 3 songs re-derived and loaded to Neon DB. Live audit shows no flags. Dispositions updated to `loaded-and-passing` in STRAGGLER-DISPOSITIONS.md.

**Commits:** 580804b (initial R1 impl), 150814a (refined snap + new spot-check), e6a6035 (production load)
