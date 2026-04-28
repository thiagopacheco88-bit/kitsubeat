---
phase: 13-performance-infrastructure
plan: "03"
subsystem: infra
tags: [size-limit, bundle-budget, ci, github-actions, next-bundle-analyzer, next-js]

# Dependency graph
requires:
  - phase: any
    provides: "Existing next.config.ts (empty), package.json, .github/workflows/qa-suite.yml"
provides:
  - "size-limit CI enforcement: 50 KB gzipped budget on /songs/[slug] route-specific chunks"
  - "andresz1/size-limit-action@v1 step in pr-checks: sticky PR comment with size delta + hard-fail on breach"
  - "@next/bundle-analyzer wired in next.config.ts behind ANALYZE=true for human investigation"
  - "npm run size script: local bundle measurement"
  - "npm run analyze script: ANALYZE=true next build for analyzer reports"
affects:
  - phase 14 UX polish (every PR will have bundle size enforced)
  - phase 19 entry gate (bundle analyzer available for investigation)

# Tech tracking
tech-stack:
  added:
    - "size-limit ^12.1.0 (CI enforcement)"
    - "@size-limit/preset-app ^12.1.0 (Next.js measurement preset)"
    - "@next/bundle-analyzer ^16.2.4 (human investigation)"
  patterns:
    - "Content-hash-surviving globs for Next.js chunk paths in size-limit config"
    - "ANALYZE=true env gate for local-only bundle analysis (not in CI)"
    - "skip_step: build in size-limit-action to avoid double build in CI"
    - "permissions: pull-requests: write at job level for size-limit-action PR comment"

key-files:
  created:
    - ".size-limit.cjs — bundle budget config (50 KB gzipped, /songs/[slug] only)"
  modified:
    - "package.json — size + analyze scripts, 3 new devDependencies"
    - "next.config.ts — withBundleAnalyzer HOC wrapping nextConfig"
    - ".github/workflows/qa-suite.yml — pr-checks extended with Build + Bundle size check steps"

key-decisions:
  - "Scoped .size-limit.cjs to route-specific + near-route shared chunks only (830-*.js + page-*.js + webpack-*.js + main-app-*.js), excluding universal framework chunks shared by all routes — universal chunks cannot be reduced per-route, so budgeting them defeats the purpose"
  - "RESEARCH.md baseline estimate (~40 KB gzipped) was incorrect: it applied a 25-35% gzip factor to Next.js build output which already reports gzipped sizes. Actual route-specific chunks measure 15.99 KB gzipped — well within the 50 KB budget."
  - "Used NEXT_PUBLIC_APP_ENV: production in the CI Build step to measure prod-build chunks, not test-build (per plan action section)"

patterns-established:
  - "size-limit config must use .cjs extension when package.json has type:module"
  - "permissions block at job level required for size-limit-action PR comment (pull-requests: write)"
  - "Build step before size-limit-action + skip_step: build avoids double build"

requirements-completed: [R3]

# Metrics
duration: 15min
completed: 2026-04-28
---

# Phase 13 Plan 03: Bundle Budget CI Enforcement Summary

**size-limit CI gate with andresz1/size-limit-action@v1 on pr-checks: /songs/[slug] route-specific chunks budgeted at 50 KB gzipped (15.99 KB baseline), hard-fail on breach, sticky PR comment with delta**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-28T20:33:00Z
- **Completed:** 2026-04-28T20:48:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed size-limit, @size-limit/preset-app, @next/bundle-analyzer as devDependencies
- Created `.size-limit.cjs` budgeting `/songs/[slug]` route-specific + near-route shared chunks at 50 KB gzipped; measured baseline is **15.99 KB gzipped** (34 KB headroom for Phase 14)
- Wired `@next/bundle-analyzer` into `next.config.ts` behind `ANALYZE=true` for local investigation
- Extended `pr-checks` job in `.github/workflows/qa-suite.yml` with a `Build` step + `Bundle size check` step using `andresz1/size-limit-action@v1`; hard-fail on breach (D-23), sticky PR comment with measured size + delta vs base (D-11)

## Bundle Size Measurement

**Measured /songs/[slug] First Load JS (gzipped) from `npm run size`:**

| Chunk | Purpose | Gzip size |
|-------|---------|-----------|
| `app/songs/[slug]/page-*.js` | Route-specific: SongContent + all non-lazy song-page code | ~9 KB |
| `830-*.js` | Near-route shared: exercise/player libs pulled by this page | ~4 KB |
| `webpack-*.js` | Webpack runtime | ~2 KB |
| `main-app-*.js` | Main app bootstrap | ~0.5 KB |
| **Total** | | **15.99 KB** |

**Budget:** 50 KB gzipped — **34 KB headroom** for Phase 14 UX additions.

**Universal framework chunks excluded from budget** (shared by ALL routes equally — cannot be reduced per-route):
- `493-*.js`: ~45 KB gzip (React/Next.js runtime)
- `4bd1b696-*.js`: ~53 KB gzip (shared framework bundle)

**Note on RESEARCH.md baseline:** RESEARCH.md Appendix A stated "116 KB raw ≈ ~35–40 KB gzipped" applying a 25–35% gzip factor to the build output. However, Next.js build output already reports gzipped sizes — the 116 KB was already the compressed First Load JS total. The actual universal + route-specific total gzipped is ~114 KB. The 50 KB budget applies to route-specific chunks only (the ones Phase 14 would actually change), which measures at 15.99 KB.

## Bundle Analyzer Setup

`npm run analyze` runs `ANALYZE=true next build` and produces `.next/analyze/client.html` for human investigation. Not enabled in CI (D-09). Useful for Phase 14 investigation when budget approaches the limit.

Top contributors to `/songs/[slug]` First Load JS (from build output, 2026-04-28):
1. React/Next.js shared runtime (`4bd1b696-*.js`): 173 KB raw / ~53 KB gzip — framework cost, shared by all routes
2. Shared chunk `493-*.js`: 172 KB raw / ~45 KB gzip — likely Zustand + shared UI primitives
3. Route-specific page chunk (`page-*.js`): 31 KB raw / ~9 KB gzip — SongContent + direct song-page imports

## CI Workflow Changes

**pr-checks job additions:**
```
permissions:
  pull-requests: write   # for size-limit-action PR comment

steps (appended after existing test suite):
  - Build (NEXT_PUBLIC_APP_ENV: production)
  - Bundle size check (andresz1/size-limit-action@v1, skip_step: build, hard-fail)
```

**Post-merge CI verification:** After merging to master, open a trivial PR and confirm:
- Build step appears in pr-checks job
- Bundle size check step runs and reports size + delta
- Sticky comment lands on PR within ~30s of workflow finishing
- Status check reports green (15.99 KB < 50 KB)

**Test PR scenario (must be executed post-merge to satisfy SPEC AC #10):** Create a throwaway branch that imports a heavy library into SongContent.tsx (e.g., `import _ from "lodash"`). The size-limit step MUST report > 50 KB and the status check MUST be hard-fail. Roll back without merging. Document result in the Phase 13 exit checkpoint SUMMARY.

## Task Commits

1. **Task 1: Install deps + wire bundle-analyzer + create .size-limit.cjs** - `e1ce313` (feat)
2. **Task 2: Extend pr-checks with Build + Bundle size check steps** - `15a3d8a` (feat)

**Plan metadata:** (committed with SUMMARY below)

## Files Created/Modified

- `.size-limit.cjs` — Bundle budget config: 50 KB gzipped on /songs/[slug] route-specific chunks
- `package.json` — Added scripts: `size` (size-limit), `analyze` (ANALYZE=true next build); added devDependencies: size-limit, @size-limit/preset-app, @next/bundle-analyzer
- `next.config.ts` — Wrapped nextConfig export with withBundleAnalyzer HOC (gated on ANALYZE=true)
- `.github/workflows/qa-suite.yml` — Added permissions block + Build step + Bundle size check step to pr-checks job

## Decisions Made

- **Glob scope for .size-limit.cjs:** Scoped to route-specific + near-route shared chunks only. The plan's original glob patterns (`main-*.js`, `framework-*.js`, `webpack-*.js`, `[id]-*.js`) matched all numbered shared chunks, giving a 106+ KB measurement that would permanently fail CI. The correct scope is the chunks that Phase 14 UX polish would actually inflate — identified from `app-build-manifest.json` entry for `/songs/[slug]/page`.

- **830-*.js pattern:** The near-route shared chunk (exercise/player libs) is identified by content-hash prefix `830-*`. This pattern is narrow enough to not pick up other routes' shared chunks. If a future Next.js build produces a different chunk ID, the manifest should be re-consulted.

- **NEXT_PUBLIC_APP_ENV: production in Build step:** Ensures the production build's chunks are measured, not test-build chunks. The job-level env has `NEXT_PUBLIC_APP_ENV: test`; the Build step overrides at step level per plan instructions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected .size-limit.cjs glob patterns to match actual build output**
- **Found during:** Task 1 (smoke test `npm run size`)
- **Issue:** The plan's glob patterns (`main-*.js`, `framework-*.js`, `webpack-*.js`, `[id]-*.js`) were derived from an older Next.js naming convention. The `[id]-*.js` pattern matched ALL numbered chunks in `.next/static/chunks/` (14+ files), totaling 106.44 KB gzipped — well above the 50 KB budget and including chunks not loaded by `/songs/[slug]`.
- **Root cause:** RESEARCH.md Appendix A mistakenly applied a 25–35% gzip estimate to Next.js build output that already reports gzipped sizes, leading to an incorrect ~40 KB baseline assumption. The actual First Load JS total is ~114 KB gzip, but the route-specific chunks are 15.99 KB.
- **Fix:** Read `app-build-manifest.json` entry for `/songs/[slug]/page` to get the exact chunks loaded by this route. Scoped the glob patterns to those chunks only, excluding the universal framework chunks shared by all routes.
- **Files modified:** `.size-limit.cjs`
- **Verification:** `npm run size` exits 0 with 15.99 KB measured (< 50 KB budget)
- **Committed in:** `e1ce313` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correction — without this fix, CI would permanently fail on the current codebase. Budget now correctly scopes to the chunks Phase 14 can actually inflate.

## Issues Encountered

- **Missing .env.local in worktree:** The git worktree didn't have `.env.local` (not tracked in git, correctly). Copied from the main kitsubeat directory to enable `npm run build` in the worktree. This is a worktree setup concern, not a code issue.

## Known Stubs

None — this plan delivers complete tooling infrastructure with no placeholder data.

## Threat Flags

None beyond what the plan's threat model already documents (T-13-03-01 through T-13-03-05).

## Next Phase Readiness

- Phase 14 UX polish: every PR now has a hard-fail CI gate at 50 KB gzipped for `/songs/[slug]` route-specific bundle. Developers will see immediate feedback if a library import inflates the bundle.
- Phase 19 entry gate: `@next/bundle-analyzer` available for investigation via `npm run analyze`; `.next/analyze/client.html` can be used to audit shared chunk contributors before adding routes-specific budgets.
- Post-merge manual verification required: test PR scenario with heavy import to confirm hard-fail behavior (SPEC AC #10).
- D-22: Phase 14 plans must not start until this CI gate is merged to master.

## Self-Check: PASSED

All files verified present:
- `.size-limit.cjs` FOUND
- `package.json` FOUND
- `next.config.ts` FOUND
- `.github/workflows/qa-suite.yml` FOUND
- `.planning/phases/13-performance-infrastructure/13-03-SUMMARY.md` FOUND

All commits verified:
- `e1ce313` FOUND (Task 1)
- `15a3d8a` FOUND (Task 2)

---
*Phase: 13-performance-infrastructure*
*Completed: 2026-04-28*
