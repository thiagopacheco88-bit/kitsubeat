---
priority: low
created: 2026-04-27
source_phase: 11.2
related_plans: [11.2-06]
---

# TV alignment refinement — fix structural NW drift at instrumental breaks

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
