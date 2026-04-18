---
phase: 09-kana-trainer
plan: 02
subsystem: testing
tags: [kana, tdd, vitest, pure-functions, weighted-sampling, mastery, srs]

# Dependency graph
requires:
  - phase: 09-01
    provides: "KanaChar/KanaRow/Script types, KANA_CHART (104 entries), HIRAGANA_ROWS/KATAKANA_ROWS, ROW_UNLOCK_MASTERY_PCT + ROW_UNLOCK_MIN_STARS tuning constants"
provides:
  - "applyStarDelta, isRowMastered, computeUnlockedRows (src/lib/kana/mastery.ts)"
  - "weightFor, pickWeighted, buildKanaSession, buildDistractors, EligibleChar (src/lib/kana/selection.ts)"
  - "49 unit tests locking every gameplay rule before any UI consumes them"
affects: [09-03 (kanaProgress store), 09-04 (landing page), 09-05 (session route), 09-06 (grid + mastery UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: RED -> GREEN commit pairs per module (4 commits total for plan)"
    - "Pure-function gameplay rules (zero React/DOM/Zustand/DB imports) — rules locked by unit tests first, UI plugs in later"
    - "Injectable rng default = Math.random — production runs as-is, tests pass deterministic rng to lock specific draws"

key-files:
  created:
    - "src/lib/kana/mastery.ts (applyStarDelta + isRowMastered + computeUnlockedRows)"
    - "src/lib/kana/selection.ts (weightFor + pickWeighted + buildKanaSession + buildDistractors + EligibleChar)"
    - "src/lib/kana/__tests__/mastery.test.ts (24 tests)"
    - "src/lib/kana/__tests__/selection.test.ts (25 tests)"
  modified: []

key-decisions:
  - "computeUnlockedRows uses `break` at first non-mastered row (strict sequential); mastering a later row without its predecessor does NOT skip ahead"
  - "isRowMastered uses `Math.ceil(chars.length * 0.8)` so ya-row (3 chars) needs all 3 at >= 5 stars (ceil(2.4) = 3), not 2 (floor would collapse threshold)"
  - "Empty row is vacuously mastered (returns true) — defensive so chart-filtering callers don't need extra guards"
  - "buildKanaSession returns [] on empty pool rather than throwing — caller responsibility to ensure at least one row unlocked"
  - "buildDistractors keeps `script` param on signature (unused today) — reserved for future cross-script confusable variants so call sites stay source-compatible"
  - "pickWeighted FP-safety: final `return pool[pool.length - 1]` catches the rare case where prefix-sum subtraction leaves r > 0 due to float drift"
  - "weight table is `10 - stars` in mid-range with clamps: 0 -> 10, 10 -> 1. weightFor(5)/weightFor(10) = 5/1, locking the KANA-05 ratio anchor"
  - "Statistical fairness test uses 10000 draws with absolute tolerance 250 (expected 1000 +/- 250) — loose enough to never flake, tight enough to catch a broken weighting"

patterns-established:
  - "TDD commit pattern per module: test(XX-YY): add failing <module> test -> feat(XX-YY): implement <module> — 2 commits per pure module"
  - "Script-indexed mastery lookup (script === 'hiragana' ? c.hiragana : c.katakana) — every rule file that touches stars uses this exact ternary"

requirements-completed: [KANA-03, KANA-05, KANA-06, KANA-07]

# Metrics
duration: 4min
completed: 2026-04-18
---

# Phase 09 Plan 02: Mastery + Selection Rules Summary

**Pure-function gameplay engine for the kana trainer — star deltas, row-unlock predicate, KANA-05 weight table, 20-question session builder, and distractor picker — all locked by 49 unit tests before any UI consumes them.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-18T00:47:32Z
- **Completed:** 2026-04-18T00:51:29Z
- **Tasks:** 2 TDD cycles (RED + GREEN per module)
- **Files created:** 4
- **Test count:** 49 new (24 mastery + 25 selection) — full kana suite now 61 green (12 existing chart + 49 new)

## Accomplishments

- `applyStarDelta(current, correct)` — +1/-2 with [0, 10] clamp (KANA-03)
- `isRowMastered(row, mastery, script)` — `>= 80%` of row chars at `>= 5` stars, script-aware key lookup (KANA-06 predicate)
- `computeUnlockedRows(rows, mastery, script)` — strictly sequential unlock walk; first row always unlocked, `break` at first un-mastered row (KANA-06 top-level)
- `weightFor(stars)` — `0 -> 10, 5 -> 5, 10 -> 1` (KANA-05 ratio anchor, clamped on both ends)
- `pickWeighted(pool, rng?)` — O(n) prefix-sum weighted sample; injectable `rng` for deterministic tests
- `buildKanaSession({script, mastery, unlockedRows, chart, questionCount?, rng?})` — 20 `EligibleChar` draws by default, script-gated, mixed-mode union (KANA-07)
- `buildDistractors({correctRomaji, script, unlockedRows, chart, count?, rng?})` — Fisher-Yates shuffle of unique non-correct romaji from the unlocked pool

## Test Counts Per Module

| File                          | Suites | Tests |
| ----------------------------- | ------ | ----- |
| `__tests__/chart.test.ts`     | 1      | 12    |
| `__tests__/mastery.test.ts`   | 3      | 24    |
| `__tests__/selection.test.ts` | 4      | 25    |
| **Total (kana subsystem)**    | **8**  | **61** |

### mastery.test.ts breakdown (24 tests)

- **applyStarDelta — KANA-03 clamping** (8 tests): 0+correct, 0+wrong-clamped, 1+wrong-clamped, 5+correct, 5+wrong, 9+correct=10, 10+correct-clamped, 10+wrong
- **isRowMastered — KANA-06 threshold** (8 tests): empty-row guard, all-0-stars, 80%-exact, 60%-below, ya-row-3of3, ya-row-2of3, katakana-script-key-lookup, 4-stars-dont-count
- **computeUnlockedRows — sequential unlock** (8 tests): empty-rows, single-row, 27-rows-no-mastery, after-a-row-ka-unlocks, strict-sequential-a+ka, break-invariant (non-contiguous mastery), idempotent, katakana-script

### selection.test.ts breakdown (25 tests)

- **weightFor — KANA-05 table** (7 tests): anchor points 0/1/5/9/10, out-of-range -1/11, 5:10::1 ratio
- **pickWeighted — sampling** (4 tests): single-element, low-rng-first, high-rng-second, long-run fairness (10k draws, |countB - 1000| < 250)
- **buildKanaSession — KANA-07** (8 tests): default-20, custom-count, hiragana-only, katakana-script-key, mixed-both-scripts, empty-pool-no-throw, weight-matches-weightFor, duplicates-allowed
- **buildDistractors — uniqueness** (6 tests): default-3, no-correct, homophone-dedupe (ji from za+da), pool-smaller-than-count, unlockedRows-filter, custom-count

## Weight Table (Locked)

| Stars | Weight  | Notes                                                   |
| ----- | ------- | ------------------------------------------------------- |
| 0     | 10      | Heaviest — learning-mode bias                           |
| 1     | 9       |                                                         |
| 2     | 8       |                                                         |
| 3     | 7       |                                                         |
| 4     | 6       |                                                         |
| 5     | 5       | Mid-range anchor                                        |
| 6     | 4       |                                                         |
| 7     | 3       |                                                         |
| 8     | 2       |                                                         |
| 9     | 1       |                                                         |
| 10    | 1       | Mastered floor — `weightFor(5) / weightFor(10) === 5`   |
| `< 0` | 10      | Treated as 0 (clamp)                                    |
| `> 10`| 1       | Treated as 10 (clamp)                                   |

Ratio anchor locked by test: `expect(weightFor(5) / weightFor(10)).toBe(5)`. A future tweak that drops the floor to 0 or widens the ratio would fail this assertion loudly.

## Math.ceil Threshold — ya-row Walkthrough

Row mastery threshold formula: `Math.ceil(row.chars.length * ROW_UNLOCK_MASTERY_PCT)` where `ROW_UNLOCK_MASTERY_PCT = 0.8`.

**ya-row has 3 chars** (や, ゆ, よ):

- `3 * 0.8 = 2.4`
- `Math.ceil(2.4) = 3`
- Therefore ya-row needs **all 3** chars at `>= 5` stars to count as mastered.
- `Math.floor(2.4) = 2` would be wrong — only 2/3 = 67% counts, below the 80% bar.

Test asserts both directions:
- `ya-row, 3 chars at 5 stars -> true` (mastered)
- `ya-row, 2 chars at 5 stars -> false` (NOT mastered)

Same formula applies elsewhere: a-row (5 chars) needs `ceil(4) = 4` (80% exact); wa-row (2 chars) needs `ceil(1.6) = 2` (both); n-row (1 char) needs `ceil(0.8) = 1` (the one). All within KANA-06 intent — "row is mostly done before next unlocks."

## Task Commits (TDD)

| Step        | Commit    | Message                                                    |
| ----------- | --------- | ---------------------------------------------------------- |
| mastery RED | `79d54a7` | test(09-02): add failing mastery rules test                |
| mastery GREEN | `d2d21eb` | feat(09-02): implement mastery + row-unlock helpers      |
| selection RED | `fa5587f` | test(09-02): add failing selection algorithm test        |
| selection GREEN | `985537f` | feat(09-02): implement weighted selection + session + distractors |

_No REFACTOR commits — implementations were clean from first GREEN pass and adding a no-op refactor commit would pollute history._

**Plan metadata commit:** `43728de` — docs(09-02): complete mastery + selection rules plan

## Files Created

- `src/lib/kana/mastery.ts` (83 lines) — `applyStarDelta`, `isRowMastered`, `computeUnlockedRows`
- `src/lib/kana/selection.ts` (168 lines) — `weightFor`, `pickWeighted`, `buildKanaSession`, `buildDistractors`, `EligibleChar`
- `src/lib/kana/__tests__/mastery.test.ts` (207 lines) — 24 tests
- `src/lib/kana/__tests__/selection.test.ts` (270 lines) — 25 tests

## Decisions Made

- **Break-at-first rule documented in JSDoc.** `computeUnlockedRows` uses `break` not `continue` so mastering later rows without their predecessor doesn't skip ahead — tested explicitly by the "non-contiguous mastery does NOT skip" case.
- **Empty-row vacuous truth.** `isRowMastered` returns `true` for zero-char rows; keeps chart-subset callers guard-free.
- **`void script;` in buildDistractors.** Signature reserves `script` for future cross-script confusable variants; dropping it now would force a signature break when the feature lands.
- **Statistical test tolerance = 250 absolute on 1000 expected.** Loose enough to survive 5 consecutive runs (verified), tight enough to catch a broken weight ratio (a weight swap 9/1 <-> 1/9 would push `countB` to ~9000).

## Deviations from Plan

None — plan executed exactly as written. No Rules 1-4 triggered. RED commits were red, GREEN commits went green on first run.

## Issues Encountered

- **Pre-existing tsc errors persist** (admin pages, /api/admin/songs, fsrs/scheduler, and .next-generated route-context typing). None touch `src/lib/kana/*`; all inherited from before plan 09-01 and already documented in `deferred-items.md`. Confirmed via `npx tsc --noEmit 2>&1 | grep "src/lib/kana/(mastery|selection)"` -> zero output.

## User Setup Required

None — pure-function modules with no external services or env config.

## Next Phase Readiness

- Plan 09-03 (kanaProgress Zustand store) was partially pre-committed (`0570044` + `31446fc` already in history) before this plan ran. Those commits live independently of plan 02 work — `mastery.ts` + `selection.ts` land cleanly alongside them.
- Plan 09-04 (landing page / mode selector) and 09-05 (session route) can now consume `buildKanaSession` + `buildDistractors` — all signatures and return shapes are type-stable and test-locked.
- Plan 09-06 (grid + row-lock UI) can consume `computeUnlockedRows` + `isRowMastered` directly.

## Self-Check: PASSED

Verified all 4 created files exist:
- FOUND: src/lib/kana/mastery.ts
- FOUND: src/lib/kana/selection.ts
- FOUND: src/lib/kana/__tests__/mastery.test.ts
- FOUND: src/lib/kana/__tests__/selection.test.ts

Verified all 4 task commits exist in git log:
- FOUND: 79d54a7 (test mastery)
- FOUND: d2d21eb (feat mastery)
- FOUND: fa5587f (test selection)
- FOUND: 985537f (feat selection)

Verified all 61 tests pass in a single `npx vitest run src/lib/kana` invocation (3 files, 61 tests).

---
*Phase: 09-kana-trainer*
*Completed: 2026-04-18*
