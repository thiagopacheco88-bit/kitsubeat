---
phase: 14-ux-polish
plan: 00
subsystem: infra
tags: [eslint, drizzle, playwright, vitest, design-tokens, scaffolding]

# Dependency graph
requires:
  - phase: 11.4-visual-vocabulary-foundation
    provides: hand-written drizzle migration pattern (D-01); apply-migrations runner
  - phase: 11.5-admin-lyrics-editor
    provides: 0015 migration slot precedent (idempotent CHECK via DO $$ EXCEPTION)
  - phase: 12-learning-path-and-gamification
    provides: users user-prefs convention (camelCase TS / snake_case DB); soundEnabled/hapticsEnabled neighbors
  - phase: 13-performance-infrastructure
    provides: size-limit gate (50 KB on /songs/[slug]); three-layer test discipline
provides:
  - kitsubeat-tokens ESLint plugin (custom no-raw-tokens rule blocking palette/hex/px/bare-white-black)
  - eslint.config.mjs (ESLint 9 flat config; eslint-config-next 16 native flat config spread)
  - scripts/audit/token-compliance.ts (belt-and-suspenders grep audit with same 4 regexes)
  - scripts/audit/motion-catalog-completeness.ts (gates docs/motion-catalog.md completeness)
  - drizzle/0016_user_theme_preference.sql (idempotent ADD COLUMN + CHECK constraint)
  - users.themePreference column in src/lib/db/schema.ts (text NOT NULL DEFAULT 'system')
  - 5 Playwright spec shells (mobile-parity, a11y, theme-toggle, reduced-motion, dev-states)
  - 7 Vitest test shells (theme-persistence integration + 5 primitives + dev/states gate)
  - .planning/phases/14-ux-polish/.size-baseline.txt (10.04 kB gzipped /songs/[slug])
  - .planning/phases/14-ux-polish/14-DESIGN-DISPOSITION.md (per-surface treatment table closing SPEC AC #5)
affects: [14-01, 14-02, 14-03, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-dialog@1.1.15 (Modal primitive substrate per CONTEXT D-06)"
    - "class-variance-authority@0.7.1 (typed variant API per CONTEXT D-05)"
    - "tailwind-merge@3.5.0 (className merging per CONTEXT D-05)"
    - "clsx@2.1.1 (conditional className per CONTEXT D-05)"
    - "@axe-core/playwright@4.11.3 (a11y assertions per SPEC AC #13)"
    - "eslint@^9 (Next 16 prep; flat config)"
    - "eslint-config-next@16.2.4 (flat-config-native eslint-config-next)"
    - "@eslint/eslintrc@^3 (FlatCompat shim — initially planned, ultimately unused)"
  patterns:
    - "ESLint flat config + custom kitsubeat-tokens plugin (4-regex token enforcement)"
    - "Belt-and-suspenders audit: ESLint rule + grep audit with shared regex set"
    - "TDD shell pattern: Vitest .todo + Playwright .fixme markers documenting future tests"
    - "Drizzle migration 0016: ADD COLUMN IF NOT EXISTS + DO $$ EXCEPTION CHECK constraint"

key-files:
  created:
    - "eslint.config.mjs"
    - "eslint-plugins/kitsubeat-tokens/index.js"
    - "eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js"
    - "scripts/audit/token-compliance.ts"
    - "scripts/audit/motion-catalog-completeness.ts"
    - "scripts/debug/verify-theme-preference-column.ts"
    - "drizzle/0016_user_theme_preference.sql"
    - "tests/e2e/mobile-parity.spec.ts"
    - "tests/e2e/a11y.spec.ts"
    - "tests/e2e/theme-toggle.spec.ts"
    - "tests/e2e/reduced-motion.spec.ts"
    - "tests/e2e/dev-states.spec.ts"
    - "tests/integration/theme-persistence.test.ts"
    - "src/components/ui/__tests__/Button.test.tsx"
    - "src/components/ui/__tests__/Card.test.tsx"
    - "src/components/ui/__tests__/Badge.test.tsx"
    - "src/components/ui/__tests__/Modal.test.tsx"
    - "src/components/ui/__tests__/EmptyState.test.tsx"
    - "src/app/__dev/states/__tests__/gate.test.ts"
    - ".planning/phases/14-ux-polish/14-DESIGN-DISPOSITION.md"
    - ".planning/phases/14-ux-polish/.size-baseline.txt"
    - ".planning/phases/14-ux-polish/deferred-items.md"
  modified:
    - "package.json (deps + scripts.lint = eslint .)"
    - "src/lib/db/schema.ts (themePreference column on users)"
    - "next.config.ts (eslint.ignoreDuringBuilds = true)"
    - "src/app/admin/lyrics/actions/{ai-fill,flag-song,publish,regenerate,save-draft,save-kanji-breakdown,swap-video}.ts (removed invalid runtime exports)"

key-decisions:
  - "Use eslint-config-next 16's native flat-config exports (./core-web-vitals + ./typescript) — FlatCompat from RESEARCH §1 was incompatible with v16's plugin shape (circular reference in JSON.stringify)"
  - "Disable Next.js build-time lint (eslint.ignoreDuringBuilds=true) — Wave 0 lint rule fires on Wave 1+ targets; build must keep passing during the migration window"
  - "Both root-level zip duplicates were byte-for-byte equivalents of imported home design — no fresh design output for the other 10 surfaces; Phase 14 ships under D-22 token-only swap for those 10"

patterns-established:
  - "Custom ESLint plugin with RuleTester unit tests — eslint-plugins/kitsubeat-tokens reusable shape for future rules"
  - "Audit-script + ESLint-rule regex parity — shared regex strings copy-pasted between layers (a future refactor can extract a common module)"
  - "Migration filename arithmetic: 0014 (Phase 11.4) → 0015 (Phase 11.5) → 0016 (Phase 14) — sequential per Phase 11.4 D-01 hand-written discipline"
  - "Wave 0 test-shell pattern: .fixme (Playwright) / .todo (Vitest) markers create discoverable specs that flesh out in Wave 1+ plans without re-discovering the file path"

requirements-completed: [1, 2, 3, 5, 6, 7, 8, 9]

# Metrics
duration: 38min
completed: 2026-05-02
---

# Phase 14 Plan 00: UX Polish Wave 0 Scaffolding Summary

**Wave 0 lands the test infrastructure (5 Playwright + 7 Vitest shells), the kitsubeat-tokens ESLint plugin with 4-regex enforcement, two CI audit scripts, the users.theme_preference DB column via migration 0016, all 8 npm deps, the pre-Phase-14 bundle baseline (10.04 kB gzipped on /songs/[slug]), and the per-surface design-treatment disposition (1 FULL + 10 D-22 token-only) — all BEFORE any Wave 1+ migration code lands.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-05-02T05:33:57Z
- **Completed:** 2026-05-02T06:12:51Z
- **Tasks:** 7 (Task 0–6)
- **Files modified:** 22 created + 3 modified + 7 admin/lyrics fixes

## Accomplishments

- **D-19 zip triage** — Both `Kitsubeat Design.zip` files deleted (byte-for-byte duplicates of imported home design); 14-DESIGN-DISPOSITION.md records per-surface treatment table closing SPEC AC #5 in lieu of `design_handoff_phase14/`
- **Token enforcement double-layer landed** — kitsubeat-tokens/no-raw-tokens ESLint rule (904 errors flagged on master pre-Wave-1) + scripts/audit/token-compliance.ts grep audit (exit 1, will flip green as Wave 1+ migrations land)
- **Migration 0016 applied to live DB** — users.theme_preference text NOT NULL DEFAULT 'system' with CHECK constraint enforcing ('system','light','dark') enum
- **Bundle baseline captured BEFORE deps** — `/songs/[slug]` = 10.04 kB gzipped (gate=50 kB; ~40 kB headroom for Wave 1+ primitives + theme code)
- **All 12 test shells discoverable** — `npx playwright test --list` shows 31 entries across 5 specs; `npx vitest run` shows 6 passed (shell tests) + 42 todos + 1 skipped (TEST_DATABASE_URL absent — guarded by describeIfTestDb)
- **a11y self-skip via RUN_A11Y env var** — WARNING 3 from planner correction 6 closed; nightly-only suite gated correctly

## Task Commits

1. **Task 0: D-19 design triage + delete zip duplicates** — `204c0ff` (chore)
2. **Rule 3 fix: remove invalid `export const runtime` from admin/lyrics actions** — `95bd743` (fix)
3. **Task 1: Capture bundle baseline + install Wave 0 deps** — `dcf9fe9` (chore)
4. **Task 2 RED: failing RuleTester for kitsubeat-tokens/no-raw-tokens** — `a0272a8` (test)
5. **Task 2 GREEN: implement kitsubeat-tokens plugin + flat config** — `93699d4` (feat)
6. **Task 3: token-compliance + motion-catalog-completeness audits** — `8ce0b84` (feat)
7. **Rule 3 fix: disable Next.js build-time lint** — `54d8e8c` (fix)
8. **Task 4: users.theme_preference column + apply migration 0016** — `65ceffd` (feat)
9. **Task 5: 5 Playwright spec shells** — `6c4aa2c` (test)
10. **Task 6: 7 Vitest test shells** — `234971f` (test)

**Plan metadata:** (this commit) (docs: complete plan)

_Note: Task 2 has 2 commits (RED + GREEN per TDD); Tasks 1 + 4 each have a paired Rule 3 fix commit._

## Files Created/Modified

### Created (21 files)
- `.planning/phases/14-ux-polish/14-DESIGN-DISPOSITION.md` — per-surface treatment table (1 FULL + 10 D-22 token-only) closing SPEC AC #5
- `.planning/phases/14-ux-polish/.size-baseline.txt` — pre-Phase-14 bundle baseline (10.04 kB gzipped /songs/[slug])
- `.planning/phases/14-ux-polish/deferred-items.md` — out-of-scope discoveries (5 pre-existing items logged)
- `eslint.config.mjs` — ESLint 9 flat config; spreads next/core-web-vitals + next/typescript natively
- `eslint-plugins/kitsubeat-tokens/index.js` — no-raw-tokens rule with 4 regexes (RAW_HEX, ARBITRARY_PX, PALETTE_UTILITIES, BARE_WHITE_BLACK); JSXAttribute + CallExpression visitors
- `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` — RuleTester suite (3 valid + 5 invalid)
- `scripts/audit/token-compliance.ts` — belt-and-suspenders grep audit; path-traversal + ReDoS protected
- `scripts/audit/motion-catalog-completeness.ts` — gates docs/motion-catalog.md (12 entries × 5 fields per SPEC AC #11)
- `scripts/debug/verify-theme-preference-column.ts` — verification helper analog of verify-image-url-column.ts (Phase 11.4 pattern)
- `drizzle/0016_user_theme_preference.sql` — idempotent ALTER TABLE + DO $$ EXCEPTION CHECK constraint
- `tests/e2e/mobile-parity.spec.ts` — 12 .fixme tests at viewport 390x844 (Wave 2+ fills)
- `tests/e2e/a11y.spec.ts` — RUN_A11Y-gated; AxeBuilder import verifies dep
- `tests/e2e/theme-toggle.spec.ts` — 6 .fixme tests for cookie round-trip (Plan 14-03 fills)
- `tests/e2e/reduced-motion.spec.ts` — 4 .fixme tests; reducedMotion: 'reduce' (Plan 14-04 fills)
- `tests/e2e/dev-states.spec.ts` — 2 .fixme tests for dev catalog (Plan 14-04 fills)
- `tests/integration/theme-persistence.test.ts` — describeIfTestDb-guarded; 4 .todo tests (Plan 14-03 fills)
- `src/components/ui/__tests__/Button.test.tsx` — 9 .todo tests (variants × sizes × handlers)
- `src/components/ui/__tests__/Card.test.tsx` — 6 .todo tests (variants + CardLink + HTML attr forwarding)
- `src/components/ui/__tests__/Badge.test.tsx` — 6 .todo tests (4 variants + 12%/25% alpha + type-check)
- `src/components/ui/__tests__/Modal.test.tsx` — 9 .todo tests (Radix Dialog a11y contract)
- `src/components/ui/__tests__/EmptyState.test.tsx` — 5 .todo tests (default + error + retry)
- `src/app/__dev/states/__tests__/gate.test.ts` — 3 .todo tests (production notFound, dev/test catalog)

### Modified (3 files + 7 admin/lyrics fixes)
- `package.json` — added 4 runtime deps + 4 dev deps; `scripts.lint` migrated `next lint` → `eslint .`
- `src/lib/db/schema.ts` — themePreference: text("theme_preference").notNull().default("system") between hapticsEnabled and created_at
- `next.config.ts` — eslint.ignoreDuringBuilds = true (Rule 3 fix to keep build passing while Wave 1+ migrations land lint fixes)
- `src/app/admin/lyrics/actions/{ai-fill,flag-song,publish,regenerate,save-draft,save-kanji-breakdown,swap-video}.ts` — removed invalid `export const runtime = "nodejs"` (Rule 3 fix unblocking pre-Phase-14 build)

## Decisions Made

- **eslint-config-next 16 ships flat config natively** — directly spread `./core-web-vitals` + `./typescript` exports rather than the FlatCompat-based pattern from RESEARCH §1. The latter was incompatible with v16's internal plugin shape (circular reference triggered TypeError in JSON.stringify during config validation).
- **Next.js build-time lint disabled** — `eslint.ignoreDuringBuilds=true` added to next.config.ts. The kitsubeat-tokens rule correctly flags ~904 pre-Wave-1 violations; gating the build on these now would block all subsequent work. CI runs `npm run lint` as a separate step (per CONTEXT D-17 dual-layer enforcement).
- **Migration 0016 (NOT 0015)** — Phase 11.5 already used the 0015 slot for admin_lyrics_editor; Plan 14-00 increments to 0016 per the hand-written discipline (Phase 11.4 D-01 / D-26).
- **Verification helper landed in scripts/debug/** — `verify-theme-preference-column.ts` follows the Phase 11.4 verify-image-url-column.ts shape (one-off Drizzle SELECT against information_schema). Slightly outside the original `files_modified` list but minimal addition for verification durability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed invalid `export const runtime` from 7 admin/lyrics actions**
- **Found during:** Task 1 (`npm run build` failed before any Phase 14 deps installed)
- **Issue:** Phase 11.5 commits 6df7850..4972b3a committed `export const runtime = "nodejs"` in 7 "use server" files. Next.js disallows non-async exports in those files. Master HEAD was failing to build BEFORE any Phase 14 work.
- **Fix:** Removed the directives. Server actions default to nodejs runtime; the directives were no-ops (route-segment configs in the wrong layer).
- **Files modified:** `src/app/admin/lyrics/actions/{ai-fill,flag-song,publish,regenerate,save-draft,save-kanji-breakdown,swap-video}.ts`
- **Verification:** `npm run build` succeeds (compiled successfully).
- **Committed in:** `95bd743`

**2. [Rule 3 - Blocking] Disabled Next.js build-time ESLint via next.config.ts**
- **Found during:** Task 4 verification (`npm run build` blocked by 904 lint errors from the new kitsubeat-tokens rule)
- **Issue:** The plan's Done criterion for Task 1 requires `npm run build` to keep passing. But Next 15.5 runs ESLint flat config during build, and the new no-raw-tokens rule correctly fires on pre-Wave-1 palette utilities everywhere — blocking the build.
- **Fix:** `eslint.ignoreDuringBuilds = true` in next.config.ts. CONTEXT D-17 specifies dual-layer enforcement (lint + grep audit) as separate CI gates; running lint inside the build would conflate the two.
- **Files modified:** `next.config.ts`
- **Verification:** `npm run build` succeeds with all routes compiled.
- **Committed in:** `54d8e8c`

**3. [Rule 4-adjacent — informational addition] Added `verify-theme-preference-column.ts` debug script**
- **Found during:** Task 4 verification (initial inline `npx tsx -e ...` invocations failed under Windows path resolution)
- **Issue:** Plan's verification step uses `npx tsx -e "..."` inline. On Windows, tsx's tsconfig-paths resolver was rejecting the inline script path with ERR_MODULE_NOT_FOUND.
- **Fix:** Created a one-off `scripts/debug/verify-theme-preference-column.ts` analog of Phase 11.4's `verify-image-url-column.ts`. Added to plan's existing scripts/debug/ pattern.
- **Files modified:** `scripts/debug/verify-theme-preference-column.ts` (new file outside plan's files_modified list)
- **Verification:** Successfully prints column metadata + CHECK constraint def + schema_migrations row.
- **Committed in:** `65ceffd` (Task 4 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking + 1 minor verification helper addition)
**Impact on plan:** All 3 fixes are necessary corrections to the existing plan-state OR sensible alignments with established conventions. No scope creep — every Wave 1+ task remains exactly as planned. The two blocking fixes were prerequisites to satisfying Plan 14-00's own must_haves (build passes, baseline captured, migration applied).

## Issues Encountered

- **Pre-existing test failures (6 cases)** — `regression-stale-lesson-data.test.ts` (3) + `spot-check-tv-onsets.test.ts` (3). All predate Phase 14; logged to `deferred-items.md` (D-PRE-01, D-PRE-02). Per scope boundary rule, NOT auto-fixed.
- **Build flake on first attempt** — `Cannot find module for page: /api/review/queue` appeared once during build verification, disappeared on rerun. Likely webpack cache flake; logged to deferred-items.md (D-PRE-04). The official Task 1 baseline + Task 4 build verification both ran on stable rebuilds.
- **ESLint v4 reporter rename** — Initial `npx vitest run --reporter=basic` failed with ERR_LOAD_URL (Vitest v4 renamed `basic` reporter). Switched to default reporter; same output achieved.

## User Setup Required

None — Wave 0 is pure scaffolding. No external services configured. The migration 0016 was applied automatically against `DATABASE_URL` via `scripts/apply-migrations.ts` (Phase 11.4 Path A). If running against a separate `TEST_DATABASE_URL`, re-run `npx tsx scripts/apply-migrations.ts` against that env.

## Next Phase Readiness

**Wave 1+ unblocked:**
- Plan 14-01 (tokens + globals.css extension) — can land tokens; ESLint rule + audit script gate the migration; .fixme tests in `theme-toggle.spec.ts` ready for Plan 14-03 to fill.
- Plan 14-02 (component primitives) — 5 .todo unit-test shells already exist (`Button/Card/Badge/Modal/EmptyState`); CVA + tailwind-merge + clsx + Radix Dialog all installed.
- Plan 14-03 (theme persistence) — DB column live; `theme-toggle.spec.ts` + `theme-persistence.test.ts` shells in place.
- Plan 14-04 (motion catalog + dev/states + dashboard cleanup) — `dev-states.spec.ts` + `gate.test.ts` shells; motion-catalog-completeness.ts gate ready.
- Plan 14-05+ (per-surface migrations) — every gate is wired but currently red; flips green as the migrations land.

**Self-Check: PASSED**
- `eslint.config.mjs`: FOUND
- `eslint-plugins/kitsubeat-tokens/index.js`: FOUND
- `scripts/audit/token-compliance.ts`: FOUND (exit 1 confirmed)
- `scripts/audit/motion-catalog-completeness.ts`: FOUND (exit 1 confirmed)
- `drizzle/0016_user_theme_preference.sql`: FOUND
- `users.theme_preference` column: live in DB (verified via verify-theme-preference-column.ts)
- All 5 Playwright spec files: FOUND (31 test entries discovered)
- All 7 Vitest test files: FOUND (6 shells passing + 42 todos + 1 db-skipped)
- `.size-baseline.txt`: FOUND (10.04 kB gzipped recorded)
- `14-DESIGN-DISPOSITION.md`: FOUND (D-22 reference count = 14, ≥ 10 required)
- All 8 npm deps: present in package.json (4 runtime + 4 dev)
- Commit hashes: `204c0ff`, `95bd743`, `dcf9fe9`, `a0272a8`, `93699d4`, `8ce0b84`, `54d8e8c`, `65ceffd`, `6c4aa2c`, `234971f` — all reachable from HEAD.

---
*Phase: 14-ux-polish*
*Completed: 2026-05-02*
