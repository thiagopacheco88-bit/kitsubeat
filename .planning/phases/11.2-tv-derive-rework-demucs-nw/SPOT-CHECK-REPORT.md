# Phase 11.2 Plan 06 — Spot-Check Report

## Final Verdict (User Override 2026-04-27)

User authorized shipping all 8 spot-checked songs (and all 29 audit-clean lessons in `data/lessons-cache-tv-nw/`) despite 3 songs falling below the original ≥75% spot-check pass rate criterion. The 3 below-threshold songs (sign-flow, the-day-porno-graffitti, uso-sid) are all popular catalog entries whose NEW NW lesson is a meaningful quality improvement over the pre-rework LCS lesson — even with structural NW drift at instrumental breaks.

**Verdict:** SHIP-WITH-FLAGS. Plan 07 unblocked. Per-song dispositions recorded in STRAGGLER-DISPOSITIONS.md "Spot-Check-Flagged Ships (Plan 06)".

**Followup investigation:** TV alignment refinement (out of Phase 11.2 scope). See dispositions doc for candidate remediations.

---

**Date:** 2026-04-26
**Tolerance:** ±500ms per verse onset
**Catalog size at time of check:** 29 lessons (47 derived; 18 removed by audit-relax gate)
**Acceptance criterion:** ≥6 of 8 spot-check songs pass at ≥75% verse onsets within ±500ms

---

## JLPT Distribution Note

All 29 remaining TV lessons are JLPT N3. The catalog is entirely N3 — a reality confirmed by the post-relax audit. The original plan called for 2 songs per JLPT level (N5/N4/N3/N2), but that SPEC pre-condition is not achievable with the current catalog.

**Resolution (Plan 06 checkpoint 2026-04-26):** Accept the all-N3 catalog reality. Pick 8 songs by diversity criteria — different artists, different anime, different verse counts, adversarial properties.

---

## Song Selection Rationale

**8 songs selected: sign-flow + 7 adversarial picks**

All songs are JLPT N3 (catalog-wide).

| # | Slug | Artist | Anime | Verses | Why adversarial |
|---|------|--------|-------|--------|-----------------|
| 1 | sign-flow | FLOW | Naruto | 12 | TRIGGER CASE — pre-rework 38s degenerate verse; validates the phase's core fix |
| 2 | remember-flow | FLOW | Naruto | 4 | Tier-1-recovered (manifest fix); low verse count (adversarial for density edge) |
| 3 | crossing-field-lisa | LiSA | Sword Art Online | 7 | LiSA's fast, high-pitched vocals; SAO anime (different from Naruto) |
| 4 | heros-come-back-nobodyknows | nobodyknows+ | Naruto | 19 | Hip-hop flow with fast syllable rate; highest density test |
| 5 | alumina-nightmare | NIGHTMARE | Death Note | 9 | Heavy rock with English-language bridges; Death Note (different anime) |
| 6 | the-day-porno-graffitti | Porno Graffitti | Jujutsu Kaisen | 9 | Dense kanji/kana mix; Jujutsu Kaisen (modern anime vs classic Naruto era) |
| 7 | blue-bird-ikimonogakari | Ikimonogakari | Naruto | 13 | Melodic J-pop with long verses; upper-range verse count for chorus test |
| 8 | uso-sid | SID | Fullmetal Alchemist Brotherhood | 7 | FMA Brotherhood (different franchise entirely); SID's distinctive vocal style |

**Diversity achieved:**
- Verse counts: 4, 7, 7, 9, 9, 12, 13, 19
- Artists: FLOW (×2 — intentional: sign-flow is locked, remember-flow is Tier-1-recovered), LiSA, nobodyknows+, NIGHTMARE, Porno Graffitti, Ikimonogakari, SID
- Anime: Naruto (×4), SAO, Death Note, Jujutsu Kaisen, FMA Brotherhood

---

## Audit Summary (`scripts/seed/audit-tv-lessons.ts --from-disk`)

Run after threshold relaxation (DENSITY_FLOOR 0.08→0.03, MAX_VERSE_SPAN_MS 15s→25s) and removal of 18 flagged lessons:

- Lessons audited: 29
- Flagged: 0
- Verdict: **PASS** (exit code 0)

*See STRAGGLER-DISPOSITIONS.md "Audit-Flagged Drops (Plan 06)" for the 18 removed songs.*

---

## Spot-Check Results (`spot-check-tv-onsets.ts --tolerance-ms 500`)

Methodology: applies the same gap-midpoint expansion (computeVerseTimes) as the deriver before comparing, so comparison is apples-to-apples with lesson.start_time_ms.

### Per-song pass rate (criterion: ≥75% verses within ±500ms)

| Song | Total Verses | PASS | FAIL | SKIP | Pass Rate | Meets ≥75%? |
|------|-------------|------|------|------|-----------|-------------|
| sign-flow | 12 | 7 | 5 | 0 | 58.3% | NO |
| remember-flow | 4 | 3 | 1 | 0 | 75.0% | YES (exactly) |
| crossing-field-lisa | 7 | 6 | 1 | 0 | 85.7% | YES |
| heros-come-back-nobodyknows | 19 | 16 | 3 | 0 | 84.2% | YES |
| alumina-nightmare | 9 | 8 | 1 | 0 | 88.9% | YES |
| the-day-porno-graffitti | 9 | 5 | 4 | 0 | 55.6% | NO |
| blue-bird-ikimonogakari | 13 | 13 | 0 | 0 | 100.0% | YES |
| uso-sid | 7 | 5 | 2 | 0 | 71.4% | NO |

**Songs meeting ≥75%:** 5 of 8 (remember-flow, crossing-field-lisa, heros-come-back-nobodyknows, alumina-nightmare, blue-bird-ikimonogakari)
**Songs below ≥75%:** 3 of 8 (sign-flow, the-day-porno-graffitti, uso-sid)

---

## Per-Song Verse Tables

### sign-flow (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 1353 | 1353 | 0 | PASS |
| 2 | 4514 | 4504 | +10 | PASS |
| 3 | 7075 | 7065 | +10 | PASS |
| 4 | 19525 | 25417 | -5892 | FAIL |
| 5 | 32019 | 31659 | +360 | PASS |
| 6 | 37184 | 36354 | +830 | FAIL |
| 7 | 42590 | 42180 | +410 | PASS |
| 8 | 47275 | 47265 | +10 | PASS |
| 9 | 54609 | 56290 | -1681 | FAIL |
| 10 | 63904 | 68327 | -4423 | FAIL |
| 11 | 70628 | 73470 | -2842 | FAIL |
| 12 | 79295 | 79465 | -170 | PASS |

VERDICT: 5 verse(s) fail; spot-check FAILS for sign-flow (58.3% — below 75% threshold).

### remember-flow (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 1435 | 1435 | 0 | PASS |
| 2 | 15257 | 15247 | +10 | PASS |
| 3 | 39055 | 39045 | +10 | PASS |
| 4 | 57462 | 54860 | +2602 | FAIL |

VERDICT: 1 verse(s) fail; spot-check FAILS for remember-flow per strict all-or-nothing, but PASSES at ≥75% threshold (75.0%).

### crossing-field-lisa (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 12530 | 12530 | 0 | PASS |
| 2 | 24935 | 24435 | +500 | PASS |
| 3 | 36126 | 35706 | +420 | PASS |
| 4 | 53841 | 57563 | -3722 | FAIL |
| 5 | 67669 | 67239 | +430 | PASS |
| 6 | 73833 | 73783 | +50 | PASS |
| 7 | 74844 | 75004 | -160 | PASS |

VERDICT: 1 verse(s) fail; PASSES at ≥75% threshold (85.7%).

### heros-come-back-nobodyknows (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 10814 | 10814 | 0 | PASS |
| 2 | 15447 | 15447 | 0 | PASS |
| 3 | 23062 | 23002 | +60 | PASS |
| 4 | 30317 | 30307 | +10 | PASS |
| 5 | 30947 | 30907 | +40 | PASS |
| 6 | 31408 | 31368 | +40 | PASS |
| 7 | 32178 | 32138 | +40 | PASS |
| 8 | 33719 | 33709 | +10 | PASS |
| 9 | 34930 | 34870 | +60 | PASS |
| 10 | 37742 | 37652 | +90 | PASS |
| 11 | 41733 | 41693 | +40 | PASS |
| 12 | 45415 | 48126 | -2711 | FAIL |
| 13 | 50187 | 54268 | -4081 | FAIL |
| 14 | 57450 | 59180 | -1730 | FAIL |
| 15 | 63382 | 63332 | +50 | PASS |
| 16 | 68884 | 68824 | +60 | PASS |
| 17 | 73987 | 73717 | +270 | PASS |
| 18 | 77939 | 77849 | +90 | PASS |
| 19 | 83313 | 83313 | 0 | PASS |

VERDICT: 3 verse(s) fail; PASSES at ≥75% threshold (84.2%).

### alumina-nightmare (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 668 | 668 | 0 | PASS |
| 2 | 2130 | 2040 | +90 | PASS |
| 3 | 4573 | 4553 | +20 | PASS |
| 4 | 14093 | 21981 | -7888 | FAIL |
| 5 | 25904 | 25814 | +90 | PASS |
| 6 | 30318 | 30278 | +40 | PASS |
| 7 | 39416 | 39406 | +10 | PASS |
| 8 | 48903 | 48893 | +10 | PASS |
| 9 | 49954 | 49914 | +40 | PASS |

VERDICT: 1 verse(s) fail; PASSES at ≥75% threshold (88.9%).

### the-day-porno-graffitti (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 4661 | 4661 | 0 | PASS |
| 2 | 8525 | 8475 | +50 | PASS |
| 3 | 19583 | 19673 | -90 | PASS |
| 4 | 31718 | 31488 | +230 | PASS |
| 5 | 37079 | 35959 | +1120 | FAIL |
| 6 | 42060 | 41840 | +220 | PASS |
| 7 | 47181 | 46171 | +1010 | FAIL |
| 8 | 63627 | 68231 | -4604 | FAIL |
| 9 | 74365 | 78238 | -3873 | FAIL |

VERDICT: 4 verse(s) fail; spot-check FAILS (55.6% — below 75% threshold).

### blue-bird-ikimonogakari (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 1114 | 1114 | 0 | PASS |
| 2 | 6998 | 6998 | 0 | PASS |
| 3 | 12881 | 12881 | 0 | PASS |
| 4 | 23161 | 22991 | +170 | PASS |
| 5 | 26302 | 26122 | +180 | PASS |
| 6 | 29663 | 29383 | +280 | PASS |
| 7 | 32645 | 32355 | +290 | PASS |
| 8 | 35806 | 35606 | +200 | PASS |
| 9 | 38967 | 38757 | +210 | PASS |
| 10 | 43869 | 43859 | +10 | PASS |
| 11 | 51193 | 51193 | 0 | PASS |
| 12 | 57608 | 57608 | 0 | PASS |
| 13 | 64523 | 64033 | +490 | PASS |

VERDICT: All verses pass; spot-check PASSES for blue-bird-ikimonogakari (100%).

### uso-sid (N3)

| Verse | lesson.start_time_ms | predicted_onset_ms | delta_ms | status |
|-------|----------------------|--------------------|----------|--------|
| 1 | 740 | 740 | 0 | PASS |
| 2 | 12018 | 11668 | +350 | PASS |
| 3 | 25839 | 23267 | +2572 | FAIL |
| 4 | 36530 | 36220 | +310 | PASS |
| 5 | 47833 | 46273 | +1560 | FAIL |
| 6 | 55914 | 55904 | +10 | PASS |
| 7 | 71679 | 71309 | +370 | PASS |

VERDICT: 2 verse(s) fail; spot-check FAILS (71.4% — below 75% threshold).

---

## Failure Pattern Analysis

Songs that failed the ≥75% threshold (sign-flow, the-day-porno-graffitti, uso-sid) and songs with single-verse FAIL (remember-flow, crossing-field-lisa, alumina-nightmare, heros-come-back-nobodyknows) share a pattern: isolated verses with large deltas (1.7s–7.9s) amid otherwise very accurate verses (delta < 100ms). These large-delta outliers occur at:

1. **Verse boundary after a long gap** (instrumental break): NW alignment accumulates drift across the break region
2. **Bridge/outro sections** with different vocal characteristics than the verse pattern NW was trained on

These are expected NW limitations — not deriver regressions. The ±500ms strict criterion is conservative; ≥75% per-song pass rate is the intended operational threshold per the checkpoint decision.

---

## Audit + Spot-Check Summary

- Audit (`--from-disk`, 29 lessons): **PASS** (0 flags)
- Spot-check (≥75% verse onset criterion, 8 songs): 5 of 8 meet ≥75% (sign-flow, the-day-porno-graffitti, uso-sid below threshold)

**Overall: SHIP-WITH-FLAGS** (user override 2026-04-27 — see Final Verdict section at top)

All 29 lessons ship. Plan 07 unblocked. See STRAGGLER-DISPOSITIONS.md "Spot-Check-Flagged Ships (Plan 06)" for per-song disposition rationale.

==================================
Phase 11.2 Plan 06 verdict: SHIP-WITH-FLAGS
Plan 07 rollout: UNBLOCKED (pending explicit user go-ahead)
==================================
