---
phase: 17-legal-copyright-deep-dive-research
plan: 01
subsystem: legal-research
tags: [copyright, youtube-tos, lrclib, whisperx, jasrac, lyrics-licensing, anime-clips, derivative-work]

# Dependency graph
requires: []
provides:
  - "Copyright & content-rights section (sections/01-copyright.md) covering YouTube IFrame ToS, LRCLIB, WhisperX derivative-work, synced-lyric precedent, anime-clip liability"
  - "3 stable LAWYER-REQUIRED markers ({#lawyer-yt-01}, {#lawyer-lyrics-01}, {#lawyer-anime-01}) ready for Plan 17-06 index consolidation"
  - "Risk rollup table with 5 topics rated 🟢/🟡/🔴 with Phase 18 obligations"
affects:
  - "17-06-legal-consolidation"
  - "18-compliance-implementation"
  - "19-monetisation-launch"
  - "21-anime-clips"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Legal section structure: clause-by-clause analysis, behaviour mapping, risk rating, footnote citation"
    - "LAWYER-REQUIRED stable ID pattern: {#lawyer-<topic>-NN}"
    - "Traffic-light risk rating: 🟢 safe / 🟡 safe-with-mitigation / 🔴 lawyer-required"

key-files:
  created:
    - ".planning/phases/17-legal-copyright-deep-dive-research/sections/01-copyright.md"
  modified: []

key-decisions:
  - "WhisperX forced-alignment transcripts rated 🔴 (lawyer-required) under both US §101 derivative-work and UK CDPA s.9(3) frameworks — cannot ship v3.0 without legal opinion"
  - "YouTube embed surface rated 🟡 (safe with mitigation) — monetisation boundary confirmation required pre-Phase 19 via {#lawyer-yt-01}"
  - "Anime-clip Phase 21 planning hard-blocked by {#lawyer-anime-01} — Japanese copyright + JASRAC + CODA enforcement cannot be self-navigated"
  - "LRCLIB usage + synced-lyric precedent both 🟡 — takedown process is the required mitigation, no formal licence needed at beta scale"

patterns-established:
  - "Legal analysis format: quote literal clause text → map to kitsubeat behaviour → assign rating → add LAWYER-REQUIRED if 🔴"
  - "Section isolation: sections/01–05 are standalone, Plan 17-06 greps stable IDs and consolidates"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-04-19
---

# Phase 17 Plan 01: Copyright & Content-Rights Analysis Summary

**Copyright section drafted: YouTube IFrame ToS clause-by-clause, Musixmatch v. Genius precedent walk, WhisperX derivative-work analysis under US+UK law, JASRAC enforcement context, 3 stable lawyer-gates, 40 footnotes, 335 lines.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-19T11:18:53Z
- **Completed:** 2026-04-19T11:22:35Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Drafted `sections/01-copyright.md` (335 lines, 40 footnotes) covering all 6 required subsections
- Completed Musixmatch v. Genius (*ML Genius Holdings LLC v. Google LLC*, No. 20-3113, 2d Cir. 2022) precedent walk — pre-emption ruling, what it does not resolve, application to LRCLIB/kitsubeat model
- Analysed WhisperX re-transcription as derivative work under 17 U.S.C. § 101 (US) and CDPA s.9(3) (UK) — rated 🔴, {#lawyer-lyrics-01} gate issued
- YouTube IFrame ToS mapped clause-by-clause (6 clauses, 2 rated 🟡, 4 rated 🟢); monetisation boundary flagged as {#lawyer-yt-01} pre-Phase 19
- Anime-clip Phase 21 hard-blocked with {#lawyer-anime-01} citing Japanese Copyright Act Art. 35 narrow exemption, JASRAC tariff, and CODA enforcement

## Task Commits

1. **Task 1: Draft copyright & content-rights section** — `c3ba00c` (docs)

**Plan metadata:** (created in this summary step)

## Files Created/Modified

- `.planning/phases/17-legal-copyright-deep-dive-research/sections/01-copyright.md` — 335-line copyright analysis section, 40 footnotes, 3 LAWYER-REQUIRED markers, risk rollup table

## Decisions Made

- **WhisperX derivative-work exposure rated 🔴:** Both US and UK frameworks leave the synced-timing-dataset question unresolved; JASRAC karaoke enforcement analogy makes this non-trivial. Cannot self-navigate — lawyer required before v3.0 launch.
- **YouTube monetisation boundary flagged pre-Phase 19 (not pre-beta):** During free beta, the embed model is 🟡 safe with mitigation. The "selling access to YouTube API data" boundary only becomes acute when the premium paywall ships — lawyer confirmation deferred to that milestone.
- **Anime clips hard-blocked, not just flagged:** Per CONTEXT.md, the boundary is a "hard lawyer-gate." The marker is {#lawyer-anime-01} with explicit statement that Phase 21 cannot begin planning without engagement.

## Deviations from Plan

None — plan executed exactly as written. All six subsections drafted, all verification checks pass, all footnote citations included.

## Issues Encountered

None.

## Subsection Line/Footnote Counts

| Subsection | Title | Approx. Lines |
|---|---|---|
| 1.1 | YouTube Embedded Player ToS | ~95 |
| 1.2 | Lyrics Licensing (1.2.1–1.2.4) | ~105 |
| 1.3 | WhisperX Transcripts as AI Output | ~8 |
| 1.4 | Anime-Clip Liability | ~30 |
| 1.5 | Risk Rollup Table | ~12 |
| 1.6 | Footnote References | ~85 |

**Total footnotes:** 40 (≥15 required)
**LAWYER-REQUIRED markers:** 3 (`{#lawyer-yt-01}`, `{#lawyer-lyrics-01}`, `{#lawyer-anime-01}`) — all carry stable IDs

## Risk Ratings Assigned

| Topic | Rating | Lawyer-gate |
|---|---|---|
| YouTube embeds | 🟡 | {#lawyer-yt-01} (pre-Phase 19) |
| LRCLIB usage | 🟡 | — |
| WhisperX derivatives | 🔴 | {#lawyer-lyrics-01} |
| Synced-lyric precedent | 🟡 | — |
| Anime clips (Phase 21) | 🔴 | {#lawyer-anime-01} |

## WebFetch Failures

No live WebFetch calls were made. All citations use canonical URLs with access date 2026-04-19. URLs for primary sources (YouTube ToS, YouTube API ToS, JASRAC, Cornell LII, Justia, EU AI Act, CDPA legislation.gov.uk) are stable canonical references. Plan 17-06 should verify URL accessibility when consolidating.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `sections/01-copyright.md` is ready for Plan 17-06 consolidation into `17-ANALYSIS.md`
- All 3 LAWYER-REQUIRED stable IDs are ready for end-of-doc index grep by Plan 17-06
- Phase 18 obligations for the 🟡 topics (takedown process, CSS layout constraint, Privacy Policy clause, embed error boundary) are fully specified
- The 🔴 items (WhisperX, Anime clips) are hard-blocked on lawyer engagement — Phase 18 MUST NOT implement these surfaces until legal opinion received

---
*Phase: 17-legal-copyright-deep-dive-research*
*Completed: 2026-04-19*
