---
phase: 09-kana-trainer
plan: 01
subsystem: kana
tags: [typescript, vitest, hepburn, hiragana, katakana, types]

# Dependency graph
requires: []
provides:
  - KANA_CHART (104 entries) — single source of truth for hiragana/katakana/romaji tuples
  - HIRAGANA_ROWS / KATAKANA_ROWS — 27 ordered KanaRow[] groupings per script
  - KanaChar / KanaRow / Script / RowKind / KanaMode / MasteryMap type contracts
  - ROW_UNLOCK_MASTERY_PCT (0.8) and ROW_UNLOCK_MIN_STARS (5) tuning constants
  - Structural-invariant test suite locking char count, Hepburn correctness, row coverage
affects: [09-02-selection, 09-03-mastery-store, 09-04-landing-page, 09-05-session-route, 09-06-grid-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hardcoded reference data (no runtime romanization libs like wanakana)"
    - "Pure type-only module (`types.ts`) — no runtime values, importable by both UI and engine"
    - "Co-located vitest specs under `__tests__/` matching `src/stores/__tests__/` precedent"
    - "Cross-plan discriminator types (KanaMode) live in lib (not in any UI component) to keep parallel waves independent"

key-files:
  created:
    - src/lib/kana/types.ts
    - src/lib/kana/chart.ts
    - src/lib/kana/__tests__/chart.test.ts
  modified: []

key-decisions:
  - "KanaMode lives in src/lib/kana/types.ts (not in any UI component) so plans 09-04 and 09-05 stay parallel-safe"
  - "Hardcoded Modified Hepburn — no wanakana dep (RESEARCH 'Don't Hand-Roll')"
  - "Excluded archaic dji-yoon row (matches modern Wikipedia table)"
  - "ROW_UNLOCK thresholds (80% / 5 stars) live in chart.ts so re-tuning is a 2-line edit"
  - "Char count locked at 104 (plan stated 105 but row breakdown sums to 104 — n-row was double-counted)"
  - "HIRAGANA_ROWS and KATAKANA_ROWS expose the same KanaChar[] (each KanaChar carries both scripts) — script dimension picked at the call site, not via a script flag"

patterns-established:
  - "Reference-data + invariant-test pattern: data module + colocated `__tests__/` spec that pins counts and structural shape"
  - "Tuning constants exported from the data module they apply to (single owner, easy re-tune)"

requirements-completed: [KANA-08]

# Metrics
duration: 3min
completed: 2026-04-18
---

# Phase 09 Plan 01: Kana Reference Data Module Summary

**Authoritative kana reference data (104 chars × 2 scripts × 27 rows) with locked Hepburn romaji, row groupings, and a vitest spec pinning structural invariants — zero runtime deps.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T00:40:19Z
- **Completed:** 2026-04-18T00:43:35Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- Type-only contracts (`types.ts`): `KanaChar`, `KanaRow`, `Script`, `RowKind`, `KanaMode`, `MasteryMap` — owned by plan 09-01, imported by every downstream kana plan
- Authoritative `KANA_CHART` (`chart.ts`): 104 entries covering full hiragana + katakana with Modified Hepburn romaji
  - 46 base gojūon (a-row..n-row)
  - 20 dakuten (ga, za, da, ba)
  - 5 handakuten (pa)
  - 33 yōon (kya, sha, cha, nya, hya, mya, rya, gya, ja, bya, pya × 3 each)
- `HIRAGANA_ROWS` / `KATAKANA_ROWS`: 27 ordered `KanaRow[]` exports each, sorted by `rowOrder`
- Tuning constants: `ROW_UNLOCK_MASTERY_PCT = 0.8`, `ROW_UNLOCK_MIN_STARS = 5`
- 12-test vitest spec locks: char count, field non-emptiness, Hepburn spot-checks (shi/chi/tsu/fu/ji/zu/o/n + 4 yoon), row coverage, ascending sort, rowId consistency, yoon 2-char invariant, tuning constant locks

## Final Character Count Per Row Kind

| Kind       | Rows | Chars | Total |
|------------|------|-------|-------|
| base       | 11   | 5+5+5+5+5+5+5+3+5+2+1 | 46 |
| dakuten    | 4    | 5×4   | 20    |
| handakuten | 1    | 5     | 5     |
| yōon       | 11   | 3×11  | 33    |
| **Total**  | **27** | —   | **104** |

## Task Commits

Each task was committed atomically:

1. **Task 1: Define kana types module** — `de8d2f6` (feat)
2. **Task 2: Build the KANA_CHART data with row groupings** — `018899e` (feat)
3. **Task 3: Lock structural invariants with vitest** — `c63d88c` (test)

**Plan metadata:** `53c31fc` (docs: complete plan)

## Files Created/Modified

- `src/lib/kana/types.ts` — Type-only contracts (Script, RowKind, KanaMode, KanaChar, KanaRow, MasteryMap)
- `src/lib/kana/chart.ts` — KANA_CHART (104 entries), HIRAGANA_ROWS, KATAKANA_ROWS, ROW_UNLOCK_MASTERY_PCT, ROW_UNLOCK_MIN_STARS
- `src/lib/kana/__tests__/chart.test.ts` — 12 invariant tests
- `.planning/phases/09-kana-trainer/deferred-items.md` — Pre-existing tsc errors logged (out of scope)

## Decisions Made

1. **`KanaMode` exported from `types.ts`, not from any UI component** — wave-3 plans 09-04 (landing page) and 09-05 (session route) both need this discriminator; defining it in lib keeps them from depending on each other's components.
2. **Hardcoded chart, no wanakana** — runtime romanization library would be unnecessary weight and risks subtle Hepburn deviations; the chart is small enough (104 entries) to ship as static data.
3. **Excluded archaic ぢゃ-yoon row** — matches Wikipedia's modern table; if reintroduced later, both `chart.ts` and `chart.test.ts` (`EXPECTED_KANA_COUNT`, `CANONICAL_ROW_IDS`) would need to update in lockstep — by design.
4. **Tuning constants live in `chart.ts`** — `ROW_UNLOCK_MASTERY_PCT` (0.8) and `ROW_UNLOCK_MIN_STARS` (5) are owned by the data module so re-tuning is a 2-line edit.
5. **Single `KanaChar` carries both scripts** — `HIRAGANA_ROWS` and `KATAKANA_ROWS` reference the same `KanaChar[]`; downstream picks `c.hiragana` or `c.katakana` based on context. This avoids duplicating data and keeps the unlock-order invariant trivially shared across scripts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's char count of 105 was off-by-one; actual count is 104**
- **Found during:** Task 2 (build KANA_CHART)
- **Issue:** Plan's verify step said `KANA_CHART.length === 105` but the row breakdown listed in the same plan sums to 104 (`5+5+5+5+5+5+5+3+5+2+1=46` base + 20 dakuten + 5 handakuten + 33 yoon = 104). The plan author appears to have double-counted the n-row when adding "+ 1 for ん special".
- **Fix:** Implemented chart with the correct 104 entries (matching every row-by-row spec the plan listed) and locked the test to `EXPECTED_KANA_COUNT = 104`. A short comment in the test cites the discrepancy so future readers know why it's 104, not 105.
- **Files modified:** src/lib/kana/chart.ts, src/lib/kana/__tests__/chart.test.ts
- **Verification:** All 12 tests pass; `grep -c "{ hiragana:" src/lib/kana/chart.ts` returns 104; `grep -c "rowKind: \"yoon\"" src/lib/kana/chart.ts` returns 33 (matches plan's expected 33 yoon entries).
- **Committed in:** 018899e (Task 2 chart) + c63d88c (Task 3 test)

---

**Total deviations:** 1 auto-fixed (1 bug — plan arithmetic).
**Impact on plan:** No scope creep. The fix preserves every row spec the plan listed verbatim; only the redundant `+1` was removed. Downstream plans should reference 104 (the true row sum), not 105.

## Issues Encountered

- Pre-existing `tsc --noEmit` errors in unrelated files (`src/app/admin/timing/[songId]/page.tsx`, `src/app/api/admin/songs/route.ts`, `src/lib/fsrs/scheduler.ts`, `.next/types/.../route.ts`) surfaced during the typecheck step. None reference `src/lib/kana/*` and all existed before plan 09-01. Logged to `.planning/phases/09-kana-trainer/deferred-items.md` per the executor scope-boundary rule.

## User Setup Required

None — pure code module, no external services.

## KanaMode Cross-Plan Note

`KanaMode` is exported from `src/lib/kana/types.ts` (not from any UI component). This is the locked-in answer to a hidden cross-plan dependency: plans 09-04 (landing page with mode toggle) and 09-05 (session route consuming the chosen mode) both live in wave 3 and must run in parallel. By giving plan 09-01 sole ownership of the `KanaMode` type, neither wave-3 plan needs to import from the other.

## Next Phase Readiness

- Plan 09-02 (selection) can import `KANA_CHART`, `HIRAGANA_ROWS`, `KATAKANA_ROWS`, `Script`, `KanaMode`, `KanaChar`, `KanaRow` directly.
- Plan 09-03 (mastery store) can import `MasteryMap`, `ROW_UNLOCK_MASTERY_PCT`, `ROW_UNLOCK_MIN_STARS`.
- Plans 09-04 / 09-05 can both import `KanaMode` without coupling to each other.
- Plan 09-06 (grid UI) has stable `label` strings on every row.

## Self-Check: PASSED

- src/lib/kana/types.ts — FOUND
- src/lib/kana/chart.ts — FOUND
- src/lib/kana/__tests__/chart.test.ts — FOUND
- Commit de8d2f6 — FOUND
- Commit 018899e — FOUND
- Commit c63d88c — FOUND

---
*Phase: 09-kana-trainer*
*Completed: 2026-04-18*
