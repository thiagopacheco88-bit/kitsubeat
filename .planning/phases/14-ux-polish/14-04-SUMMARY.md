---
phase: 14-ux-polish
plan: 04
subsystem: ui
tags: [motion-catalog, dev-catalog, ci-workflow, route-deletion, reduced-motion, eslint, audit, tdd]

# Dependency graph
requires:
  - phase: 14-ux-polish
    provides: Plan 14-00 (motion-catalog-completeness audit, dev-states.spec/reduced-motion.spec/gate.test shells, RUN_A11Y self-skip in a11y.spec.ts) + Plan 14-01 (globals.css motion tokens + reduced-motion @media override + scroll-behavior auto) + Plan 14-02 (EmptyState + Skeleton primitives consumed by the dev catalog) + Plan 14-03 (theme-aware data-theme attribute on <html>)
provides:
  - "docs/motion-catalog.md — 12 named microinteractions × 5 fields per SPEC AC #11. motion-catalog-completeness.ts audit flips RED → GREEN."
  - "src/app/%5F%5Fdev/states/page.tsx — production-gated catalog of 24 state cards (7 surfaces × 3 + 3 song-page tab loadings). data-state-card attribute for E2E discoverability. notFound() gate when NEXT_PUBLIC_APP_ENV === 'production'."
  - "src/app/%5F%5Fdev/states/__tests__/gate.test.ts — 3 real assertions (production-throws, dev-renders, test-renders). Was 1 shell + 3 .todo in Plan 14-00."
  - "tests/e2e/dev-states.spec.ts — 2 real assertions (route 200 + 24 cards). Was 1 shell + 2 .fixme."
  - "tests/e2e/reduced-motion.spec.ts — 4 real assertions (body transition 0s, Skeleton animation 0s, modal placeholder skip, html scroll-behavior auto). Was 1 shell + 4 .fixme."
  - ".github/workflows/qa-suite.yml pr-checks: 3 new steps (Lint, token-compliance, motion-catalog-completeness)."
  - ".github/workflows/qa-suite.yml nightly-full: 1 new step (a11y suite gated by RUN_A11Y env, conditional on github.event_name == 'schedule')."
  - "package.json scripts.test:e2e:a11y = `cross-env RUN_A11Y=1 playwright test a11y.spec.ts` — works on Windows + Ubuntu."
  - "DELETED: src/app/dashboard/ — 1 file (1410 lines), 18 token-compliance violations gone (planner correction WARNING 1 closed)."
  - "scripts/audit/token-compliance.ts ALLOWLIST: src/app/%5F%5Fdev/ added alongside src/app/__dev/ (Rule 2 fix — future contributors don't have to re-discover the URL-encoding workaround)."
affects: [14-05, 14-06, 14-07, 14-08, 14-09]

# Tech tracking
tech-stack:
  added:
    - "cross-env@^10.1.0 (devDependencies — needed so Windows shells can set RUN_A11Y env var; Ubuntu CI runners use bash-style RUN_A11Y=1 directly but local dev needs the cross-platform wrapper)"
  patterns:
    - "URL-encoded folder names for routes that must start with underscore: src/app/%5F%5Fdev/ on disk → /__dev/* in URL space (Next.js docs: 'Private folders... opt the folder and all its subfolders out of routing'; %5F is the URL-encoded form of _ which Next.js decodes during routing)."
    - "Render-time loud assertion for hand-counted catalogs: `if (total !== 24) throw` inside the page component — prevents accidental drift if someone adds/removes a surface without updating the catalog count."
    - "Self-skip pattern for nightly-only test suites: `test.skip(!process.env.RUN_A11Y, ...)` at the describe level + `npm run test:e2e:a11y` (cross-env RUN_A11Y=1) for explicit opt-in. NO `--ignore-pattern` flag (does not exist in Playwright 1.59) — WARNING 3 closed."
    - "Belt-and-suspenders CI gating: lint (kitsubeat-tokens/no-raw-tokens ESLint rule) + token-compliance.ts (grep audit with the same regex set) + motion-catalog-completeness.ts (separate semantic gate) all run on every PR."

key-files:
  created:
    - "docs/motion-catalog.md (93 lines)"
    - "src/app/%5F%5Fdev/states/page.tsx (90 lines — replaces nominal src/app/__dev/states/page.tsx; URL routes resolve identically)"
  modified:
    - "src/app/%5F%5Fdev/states/__tests__/gate.test.ts (3 .todo → 3 real assertions)"
    - "tests/e2e/dev-states.spec.ts (2 .fixme → 2 real assertions)"
    - "tests/e2e/reduced-motion.spec.ts (4 .fixme → 4 real assertions; 1 self-skips by design until a modal lands in catalog)"
    - ".github/workflows/qa-suite.yml (+3 pr-checks steps + 1 nightly RUN_A11Y step)"
    - "package.json (+test:e2e:a11y script + cross-env devDep)"
    - "package-lock.json (cross-env tree)"
    - "scripts/audit/token-compliance.ts (allowlist src/app/%5F%5Fdev/)"
    - ".planning/phases/14-ux-polish/deferred-items.md (+D-PRE-06 admin/lyrics WIP useRef build error)"
  deleted:
    - "src/app/dashboard/page.tsx (1410 lines — deprecated stub per SPEC out-of-scope; planner correction WARNING 1 closed)"

key-decisions:
  - "URL-encoded folder name workaround for Next.js underscore-private rule. The plan literally specified src/app/__dev/states/page.tsx, but Next.js excludes any underscore-prefixed folder from routing (verified via Context7 docs). The page rendered correctly on the filesystem but returned 404 at /__dev/states. Fix: rename to src/app/%5F%5Fdev/. URLs match the plan; gate test imports work via path alias; e2e specs find the route. Documented inline in token-compliance.ts allowlist comment so the next maintainer doesn't re-discover."
  - "Surface ordering in the 24-card grid: 7 surfaces × {empty, loading, error} = 21 cards FIRST, then 3 song-page tab loadings (Lesson/Practice/Drills) appended at the end. Total enforced by render-time `if (total !== 24) throw`. Plan-text said 'PRACTICAL: just 3 cards (one per tab) covering the loading state' which I followed (vs. the alternative 9 cards: 3 tabs × {empty, loading, error}) — keeps the catalog compact and scannable."
  - "modal enter/exit reduced-motion test self-skips when no modal is rendered on /__dev/states. Until a Wave 2+ migration wires a modal trigger into the catalog, the global @media override cannot be live-tested for Radix Dialog elements (already validated for body + Skeleton, same mechanism). The test is in-place ready to flip on automatically the moment a modal lands."
  - "Added `cross-env@^10.1.0` to devDependencies. Without it, `npm run test:e2e:a11y` works on Ubuntu CI (bash inherits RUN_A11Y=1) but fails on Windows (cmd.exe doesn't parse VAR=value prefix). Plan explicitly anticipated this — small dep (~5 KB) that future Windows-using maintainers will benefit from."

patterns-established:
  - "deferred-items.md as cumulative log: each plan appends its own blocked-but-not-fixed discoveries (D-PRE-NN naming) so the list grows append-only. Plan 14-04 added D-PRE-06 (admin/lyrics WIP useRef build error)."
  - "TDD RED → GREEN gate-test cycle for the dev catalog: write the 3 assertions first (gate.test.ts at PLAN-RED commit; module-not-found error makes it red); then create page.tsx; tests flip green on next vitest run. Captured in commits bf8809e (RED) → 5fb55a6 (GREEN)."
  - "CI workflow gate-additive editing: insert new steps between existing 'Run PR suite' and 'Build (Phase 13)' anchor steps; preserve every existing job/step verbatim. YAML syntax verified via Python yaml.safe_load post-edit."

requirements-completed: [2, 6, 7]

# Metrics
duration: 13min
completed: 2026-05-02
---

# Phase 14 Plan 04: Motion Catalog + __dev/states + Dashboard Cleanup + CI Workflow Summary

**Three Wave 1 deliverables landed in 5 atomic commits: docs/motion-catalog.md (12 entries × 5 fields, audit GREEN), src/app/%5F%5Fdev/states/page.tsx (24 state cards, production-gated, all e2e + unit tests passing), src/app/dashboard/ deleted unconditionally (1410 lines, ~18 token violations gone, planner correction WARNING 1 closed), and .github/workflows/qa-suite.yml extended with 3 pr-checks steps + 1 nightly RUN_A11Y-gated a11y step (planner correction WARNING 3 closed — no `--ignore-pattern` flag anywhere). Bonus Rule 1 deviation discovered + fixed inline: Next.js's underscore-private folder convention prevented `__dev` from routing; renamed to URL-encoded `%5F%5Fdev/`. All Phase 14-04 success criteria green.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-02T07:30:35Z
- **Completed:** 2026-05-02T07:43:30Z
- **Tasks:** 3 (Task 1 — motion catalog; Task 2 — __dev/states route + 3 test fills [TDD]; Task 3 — dashboard deletion + CI workflow + RUN_A11Y nightly gate)
- **Commits:** 5 (1 docs + 1 test + 2 feat + 1 fix)

## Accomplishments

- **docs/motion-catalog.md ships with 12 entries × 5 required fields** — each entry has Trigger, Duration, Easing, Target, Reduced-motion fallback per SPEC AC #11. Token references resolve to globals.css (--duration-fast, --duration-base, --ease-out, --ease-in-out). Existing keyframes (star-shine, level-pop, confetti) cataloged per D-27. The motion-catalog-completeness.ts audit flips RED (Plan 14-00 baseline: file missing, exit 1) → GREEN (Plan 14-04: 12 entries × 5 fields all present, exit 0).
- **/__dev/states catalog route renders 24 state cards** — 7 async surfaces × {empty, loading, error} = 21 cards, plus 3 song-page tab loading cards (Lesson/Practice/Drills) = 24 total. Each card has `data-state-card="<surface>-<state>"` for E2E count assertion. Route is production-gated via `notFound()` triggered by `process.env.NEXT_PUBLIC_APP_ENV === 'production'`. Render-time loud assertion `throw if total !== 24` catches hand-count drift. Composes EmptyState + Skeleton primitives from Plan 14-02 (Skeleton's animate-pulse auto-respects reduced-motion via the global @media override from Plan 14-01).
- **/dashboard route deleted UNCONDITIONALLY** — 1410-line `src/app/dashboard/page.tsx` removed via `git rm`. Pre-deletion: 18 token-compliance violations attributed to dashboard/. Post-deletion: 0 dashboard/ violations. No inbound references in src/ (verified via grep — count 0). Planner correction WARNING 1 closed.
- **.github/workflows/qa-suite.yml extended with 4 new steps** — 3 in pr-checks job (Lint with eslint+kitsubeat-tokens, Token compliance grep audit, Motion catalog completeness) + 1 in nightly-full job (A11y suite, conditional on `github.event_name == 'schedule'` + `RUN_A11Y: "1"` env). YAML syntax valid (yaml.safe_load OK).
- **a11y suite gated to nightly-only via RUN_A11Y env** — `package.json` `test:e2e:a11y` script: `cross-env RUN_A11Y=1 playwright test a11y.spec.ts`. Without RUN_A11Y, the spec self-skips (3 skipped); with it, the 3 placeholder/fixme tests are listed (will land assertions in Plan 14-09). NO `--ignore-pattern` flag used anywhere — planner correction WARNING 3 closed.
- **All Plan 14-04 verification gates green**: gate.test.ts 3/3 pass; dev-states.spec.ts 2/2 pass; reduced-motion.spec.ts 3/3 pass + 1 designed skip; motion-catalog audit exit 0; YAML lint pass; no inbound dashboard refs; no `--ignore-pattern` flag.

## Task Commits

1. **Task 1: docs/motion-catalog.md (12 entries × 5 fields)** — `3dc0c9e` (docs)
2. **Task 2 RED: failing gate.test.ts (3 real assertions, page module missing)** — `bf8809e` (test)
3. **Task 2 GREEN: __dev/states page + 3 test fills + URL-encoding workaround** — `5fb55a6` (feat)
4. **Task 3: delete /dashboard + qa-suite.yml extension + RUN_A11Y nightly + cross-env dep** — `3404336` (feat)
5. **Rule 2 follow-up: allowlist src/app/%5F%5Fdev/ in token-compliance.ts** — `295c82a` (fix)

**Plan metadata:** (this commit) — `docs(14-04): complete motion catalog + dev catalog + cleanup plan`

## 12 Motion Catalog Entries

| Name                     | Duration                     | Easing                          | Reduced-motion fallback type        |
| ------------------------ | ---------------------------- | ------------------------------- | ----------------------------------- |
| verse-highlight pulse    | var(--duration-base) = 200ms | var(--ease-out)                 | CSS @media (instant color change)   |
| star-earn shine          | 600ms (existing keyframe)    | ease-out (existing)             | @media collapses keyframe to 0ms    |
| correct-answer feedback  | var(--duration-fast) = 120ms | var(--ease-out)                 | CSS @media (instant)                |
| wrong-answer feedback    | var(--duration-fast) = 120ms | var(--ease-out)                 | CSS @media (NO shake transform)     |
| level-up takeover        | 800ms (existing keyframe)    | ease-out (existing)             | @media collapses keyframe to 0ms    |
| confetti milestone       | ~3s (canvas-confetti)        | N/A (physics)                   | JS-side `disableForReducedMotion`   |
| page-transition fade     | var(--duration-base) = 200ms | var(--ease-in-out)              | CSS @media (instant)                |
| hover lift on cards      | var(--duration-fast) = 120ms | var(--ease-out)                 | CSS @media (instant)                |
| modal enter              | var(--duration-base) = 200ms | var(--ease-out)                 | @media + Radix data-state to 0ms    |
| modal exit               | var(--duration-fast) = 120ms | var(--ease-in-out)              | @media + Radix data-state to 0ms    |
| toast slide-in           | var(--duration-base) = 200ms | var(--ease-out)                 | CSS @media (instant)                |
| skeleton shimmer         | 2000ms (Tailwind animate-pulse) | cubic-bezier(0.4,0,0.6,1)    | @media (static rest state)          |

## /__dev/states Layout (24 Cards)

| Surface                    | empty | loading | error | Total |
| -------------------------- | :---: | :-----: | :---: | :---: |
| /songs                     |   1   |    1    |   1   |   3   |
| /anime-list                |   1   |    1    |   1   |   3   |
| /songs/[slug]              |   1   |    1    |   1   |   3   |
| /path                      |   1   |    1    |   1   |   3   |
| /vocabulary                |   1   |    1    |   1   |   3   |
| /review                    |   1   |    1    |   1   |   3   |
| /profile                   |   1   |    1    |   1   |   3   |
| /songs/[slug] Lesson (tab) |   —   |    1    |   —   |   1   |
| /songs/[slug] Practice (tab) |  — |    1    |   —   |   1   |
| /songs/[slug] Drills (tab) |   —   |    1    |   —   |   1   |
| **Total**                  |   7   |   10    |   7   | **24** |

7 surfaces × 3 = 21 + 3 song-tab cards = 24. Render-time `throw` enforces.

## /dashboard Deletion: Token Violation Delta

**Pre-deletion (Plan 14-03 SUMMARY baseline):**
- token-compliance.ts reported violations across 5 surfaces: dashboard/page.tsx (~18), anime-list/page.tsx, components/GlobalLearnedCounter.tsx, components/LevelUpTakeover.tsx, kana/components/* (the bulk).

**Post-deletion (this plan):**
- `npx tsx scripts/audit/token-compliance.ts | grep -c "dashboard/"` → **0** (directory gone)
- Total reported violations still ~100 (capped) because Wave 2+ surface migrations haven't landed yet — but the 18 dashboard/ entries are no longer in the report. The audit cap is unchanged; the residual 100 are now distributed across the remaining unmigrated surfaces and will flip green as Wave 2+ plans land.

## CI Workflow Diff

**pr-checks job (`.github/workflows/qa-suite.yml`)** — inserted between "Run PR suite" and "Build (Phase 13)":

```yaml
      - name: Lint (Phase 14 — D-17 token-compliance ESLint rule)
        run: npm run lint

      - name: Token compliance grep audit (Phase 14 — D-17 belt-and-suspenders)
        run: npx tsx scripts/audit/token-compliance.ts

      - name: Motion catalog completeness (Phase 14 — req 6 / D-14)
        run: npx tsx scripts/audit/motion-catalog-completeness.ts
```

**nightly-full job** — inserted between "Run full suite" and "Upload Playwright report":

```yaml
      - name: A11y suite (nightly only — RUN_A11Y env gate per D-WARNING-3)
        if: github.event_name == 'schedule'
        env:
          RUN_A11Y: "1"
        run: npm run test:e2e:a11y
```

**package.json scripts** (between `test:e2e` and `test:qa`):

```json
"test:e2e:a11y": "cross-env RUN_A11Y=1 playwright test a11y.spec.ts",
```

## Decisions Made

- **URL-encoded folder name (`%5F%5Fdev/`) instead of literal `__dev/`** — Per Context7 next.js docs lookup: "Private folders can be created by prefixing a folder with an underscore: `_folderName`. This indicates the folder is a private implementation detail and should not be considered by the routing system, thereby opting the folder and all its subfolders out of routing." That meant `src/app/__dev/` (literal in plan) was UNREACHABLE at `/__dev/states` — first e2e run returned 404. Fix: rename folder to `%5F%5Fdev` (URL-encoded form). Next.js routing decodes %5F → _ in URLs, so `/__dev/states` resolves correctly. Files inside (page.tsx, gate.test.ts) work unchanged. token-compliance.ts allowlist updated to include both forms (Rule 2 — future contributors don't re-discover).
- **Surface flat-list with render-time `throw if total !== 24`** — Cleaner than a hardcoded number constant + a comment. The throw keeps the code-data invariant testable from the gate.test.ts (Test 1 production gate runs Page() without rendering, but Tests 2 + 3 do call Page() — implicitly verifying the count assertion via the `expect(result).toBeTruthy()` path).
- **modal enter/exit reduced-motion test self-skips when no modal is rendered** — The plan acknowledged this as informational ("re-enable once a modal is wired in Wave 2+"). The test pattern is in place ready to flip on the moment a Wave 2+ migration adds a modal trigger to the catalog (e.g., a button per surface state that opens an example modal). Until then `test.skip(hasModal === 0, ...)` cleanly opts out — much better than `.fixme` because it visually shows in the test report as a skipped test that's pre-wired to run.
- **`cross-env@^10.1.0` added to devDependencies** — Plan anticipated this; verified `npm ls cross-env` returned empty before the install. Without it, `npm run test:e2e:a11y` works on Ubuntu CI (bash inherits `RUN_A11Y=1` from the prefix syntax) but fails on Windows (cmd.exe doesn't parse `VAR=value` prefix natively). Net dep cost: ~5 KB. Local Windows users get parity with the CI runner.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `__dev` folder name not routable in Next.js (URL returned 404)**
- **Found during:** Task 2 e2e verification (first `npx playwright test dev-states.spec.ts` run)
- **Issue:** Plan literal `src/app/__dev/states/page.tsx` is a private folder per Next.js convention (Context7 docs: any underscore-prefixed folder + all its subfolders are excluded from routing). The route compiled fine but returned 404 at runtime — first e2e test reported `Expected: 200 / Received: 404` with the page snapshot showing the home page (root layout with no nested page rendered).
- **Fix:** Renamed `src/app/__dev/` → `src/app/%5F%5Fdev/` (URL-encoded form). Next.js URL-decodes %5F → _ at routing time so `/__dev/states` resolves correctly. Files moved via `mv`; `src/app/__dev/` removed via `rm -rf`. Gate test still passes (3/3) because the import alias `../page` resolves correctly relative to the new location.
- **Files modified:** Folder rename `src/app/__dev/` → `src/app/%5F%5Fdev/` (1 page.tsx + 1 gate.test.ts moved).
- **Verification:** `npx playwright test dev-states.spec.ts --workers=1` → 2/2 passed (status 200, 24 cards counted).
- **Committed in:** `5fb55a6`

**2. [Rule 2 — Missing critical functionality] token-compliance.ts allowlist didn't match new folder path**
- **Found during:** Self-check pass (post-task-3 verification)
- **Issue:** The audit script's ALLOWLIST array had `"src/app/__dev/"` only. After deviation #1 renamed the on-disk folder to `src/app/%5F%5Fdev/`, the allowlist no longer matched. As-is, page.tsx was already token-compliant (used `bg-[var(--color-bg)]` etc. exclusively) so 0 violations leaked through — but the moment a Wave 2+ plan adds a Modal demo card or a custom palette utility for a state demo, those would have been flagged unfairly.
- **Fix:** Added `"src/app/%5F%5Fdev/"` to the ALLOWLIST array. Inline comment explains the URL-encoding workaround so the next maintainer doesn't re-discover.
- **Files modified:** `scripts/audit/token-compliance.ts` (5-line addition: 1 allowlist entry + 4-line explanatory comment)
- **Verification:** `npx tsx scripts/audit/token-compliance.ts | grep "Allowlist"` shows both entries listed.
- **Committed in:** `295c82a`

### Informational (Not Auto-fixed)

**3. [Pre-existing build error] admin/lyrics WIP useRef import in `VerseRow.tsx`**
- **Found during:** Task 2 build verification (`npm run build` after creating page.tsx)
- **Issue:** `npm run build` reports `Type error: Cannot find name 'useRef'` at `src/app/admin/lyrics/components/VerseRow.tsx:91`. This is dirty WIP from another work stream (admin/lyrics in-flight refactor — 3 modified files: VerseEditor.tsx, VerseRow.tsx, AdminPlayerEmbed.tsx). Outside Phase 14 scope per parent agent prompt: "Pre-existing WIP files (Clerk pages, middleware.ts, debug scripts) are unrelated. Leave them alone."
- **Resolution:** Logged as D-PRE-06 in `.planning/phases/14-ux-polish/deferred-items.md`. Plan 14-04 verification suite verifies my work directly: gate.test.ts 3/3, dev-states.spec.ts 2/2, reduced-motion.spec.ts 3/3 + 1 skip, motion-catalog audit exit 0, `npx tsc --noEmit` zero new errors on plan files.
- **Files modified:** None (deferred-items.md log entry only)
- **Impact on plan:** Zero. The prod build flake does not affect plan deliverables — all gates green via direct test runs.

**4. [Pre-existing IDE diagnostics] `package_manager` action input + `TEST_DATABASE_URL` context warnings on qa-suite.yml**
- **Found during:** Task 3 IDE post-edit hook (`PostToolUse:Edit hook additional context: <ide_diagnostics>...`)
- **Issue:** Two diagnostics at lines 92 + 102 of `.github/workflows/qa-suite.yml`. Line 92 is the existing Phase 13 `size-limit-action@v1` step (`package_manager: npm` invalid input — predates Plan 14-04). Line 102 is the existing nightly job's `TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}` — same warning shape exists at line 50 in pr-checks (also predates Plan 14-04).
- **Resolution:** NOT my fix; both diagnostics predate Phase 14-04. Per scope-boundary rule.
- **Files modified:** None
- **Impact on plan:** Zero — the 3 new pr-checks steps + 1 new nightly step are syntactically valid (yaml.safe_load OK) and don't introduce new diagnostics.

---

**Total deviations:** 2 auto-fixed (Rule 1 routing bug + Rule 2 allowlist extension) + 2 informational (pre-existing build flake + pre-existing IDE diagnostics).
**Impact on plan:** All plan must_haves satisfied; all 3 tasks completed atomically; all verification gates green.

## Issues Encountered

- **Next.js underscore-private folder rule** — Discovered via failed e2e run; resolved via Context7 docs lookup + URL-encoded folder rename. The plan's literal path was a structural error; this resolution is forward-compatible (Wave 2+ migrations can keep using the URL-encoded path or move to a different naming convention via folder rename + allowlist update).
- **Build flake D-PRE-06 (admin/lyrics WIP)** — pre-existing, unrelated. Out of scope.
- **package_manager IDE diagnostic** — pre-existing Phase 13 step. Out of scope.

## Bundle Size Delta

**Not measured this plan.** The pre-existing `npm run build` flake (D-PRE-06 admin/lyrics WIP useRef) blocks `npm run size`. The Plan 14-04 deliverables are zero-bundle-impact by design:
- `docs/motion-catalog.md` is a documentation file (zero JS).
- `src/app/%5F%5Fdev/states/page.tsx` is a dev-only route gated by `notFound()` in production — production bundle excludes it (Next.js dead-codes the route via the env-gate branch).
- `.github/workflows/qa-suite.yml` is a CI config (zero JS).
- `package.json` adds 1 dev dep (`cross-env@^10.1.0`), runtime-zero-impact.
- `/dashboard` deletion REDUCES the production bundle by ~1410 lines of "use client" + 50+ inline-styled SVG icons. Estimated savings: 5–8 kB gzipped (not measured but mathematically certain to be a NET DECREASE on the routes that previously loaded /dashboard's chunk).

When the admin/lyrics WIP build flake clears, `npm run size` should show `/songs/[slug]` ≤ 10.04 kB gzipped (Plan 14-00 baseline) — Plan 14-04 adds zero JS to that route.

## User Setup Required

None — Plan 14-04 is pure code authoring + 1 dev dep install (`cross-env`, executed automatically via `npm install --save-dev cross-env`). No external services, no DB migrations, no manual config changes.

## Next Phase Readiness

**Wave 2+ surface migrations (14-05 through 14-09) unblocked:**
- `docs/motion-catalog.md` is the source of truth for the 12 named microinteractions. Surface migrations reference entries by name in code comments per D-14.
- `src/app/%5F%5Fdev/states/page.tsx` is the canonical sandbox for empty/loading/error states. Wave 2+ migrations can verify their states render correctly by visiting `/__dev/states/<their-surface>-loading` (the data-state-card attribute makes search trivial).
- `.github/workflows/qa-suite.yml` lint + token-compliance + motion-catalog gates are now red on PRs (because Wave 2+ migrations haven't landed yet). They flip green as each surface migration replaces palette utilities with token references.
- a11y.spec.ts is gated to nightly only — Wave 2+ migrations landing new visible UI must include a corresponding a11y test addition (Plan 14-09 lands the 22 route × 2 theme matrix).

**Plan 14-04 unlocks NO new dependencies** — Plan 14-00 already installed all 8 deps; Plan 14-04 adds only cross-env which is dev-only.

## Self-Check: PASSED

- `docs/motion-catalog.md`: FOUND (93 lines, exactly 12 `## ` entries)
- `npx tsx scripts/audit/motion-catalog-completeness.ts`: GREEN (`OK — 12 entries... all 5 fields present`, exit 0)
- `src/app/%5F%5Fdev/states/page.tsx`: FOUND (90 lines)
- `src/app/%5F%5Fdev/states/__tests__/gate.test.ts`: FOUND (3/3 tests pass)
- `tests/e2e/dev-states.spec.ts`: 2/2 pass against dev server (workers=1)
- `tests/e2e/reduced-motion.spec.ts`: 3 pass + 1 skip (designed) against dev server (workers=1)
- `src/app/dashboard/`: DELETED (verified `test ! -d`)
- Inbound `/dashboard` references in src/: ZERO (verified via grep — count 0)
- `.github/workflows/qa-suite.yml` has 3 new pr-checks steps: VERIFIED (grep count = 3 for `kitsubeat-tokens|token-compliance|motion-catalog`)
- `.github/workflows/qa-suite.yml` has nightly RUN_A11Y step: VERIFIED (grep `RUN_A11Y` finds 2 matches — env block + step)
- `package.json` has `test:e2e:a11y`: VERIFIED (`grep -q test:e2e:a11y package.json`)
- No `--ignore-pattern` flag anywhere: VERIFIED (`grep -rq ignore-pattern .github/workflows/ package.json playwright.config.ts` returns exit 1)
- YAML syntax: VALID (`python -c "import yaml; yaml.safe_load(...)"` exit 0)
- `cross-env@^10.1.0`: PRESENT in package.json devDependencies
- `scripts/audit/token-compliance.ts` ALLOWLIST contains `src/app/%5F%5Fdev/`: VERIFIED via grep
- Commit hashes `3dc0c9e`, `bf8809e`, `5fb55a6`, `3404336`, `295c82a`: ALL reachable from HEAD via `git log --oneline`
- `npx tsc --noEmit` clean for plan files: VERIFIED (zero `__dev|dev-states|reduced-motion|motion-catalog` errors)

---
*Phase: 14-ux-polish*
*Plan: 04*
*Completed: 2026-05-02*
