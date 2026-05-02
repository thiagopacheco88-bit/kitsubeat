---
phase: 14-ux-polish
verified: 2026-05-02T00:00:00Z
status: human_needed
score: 8/9 SPEC-REQs verified (REQ 8 a11y gap — disposition required)
overrides_applied: 0
human_verification:
  - test: "A11y disposition decision (Gate 10 — D-PRE-11)"
    expected: "User picks A1 (darken --color-accent to #dc2626 or #b91c1c, re-run axe, achieve 0 serious/critical), A2 (enlarge Button primary CTA text to text-lg + font-bold across all consumers to qualify as WCAG large-bold), or A3 (user-approved Phase 18 deferral with timestamp + rationale recorded in 14-A11Y-VIOLATIONS.md User decisions log)"
    why_human: "Per planner WARNING 2 + plan A11y Severity Policy: planner does NOT pre-decide deferral on difficulty-of-fix grounds. ~2,200 serious axe-core color-contrast violations across 20 of 22 routes — every Button primary CTA fails 4.5:1 contrast (#ef4444 on white = 3.76:1). Brand-identity tradeoff (A1 darkens identity), CTA visual change tradeoff (A2 enlarges every CTA across 11 surfaces), or accept-and-defer (A3 delays SPEC AC #13 + AC #17 to Phase 18)."
  - test: "Visual walkthrough at 390×844 (iPhone 14) for all 11 in-scope surfaces in DARK theme"
    expected: "Each surface (/, /songs, /anime-list, /songs/again-yui, /kana, /kana/session, /kana/session/summary, /path, /vocabulary, /review, /profile) renders without broken layout, horizontal scroll, or overlapping content"
    why_human: "Visual subjective per VALIDATION.md; mobile-parity Playwright spec catches scroll-width regressions but not visual-quality issues (overlapping text, broken card hierarchies, missing JLPT badges, etc.)"
  - test: "Visual walkthrough at 390×844 for all 11 in-scope surfaces in LIGHT theme"
    expected: "Light theme renders correctly across all surfaces; color values feel right (subjective per VALIDATION.md); text is legible; card hierarchy preserved"
    why_human: "Light theme has no Claude Design output (per 14-DESIGN-DISPOSITION.md, all 10 non-home surfaces are D-22 token-only swaps); only human can confirm 'feels right'"
  - test: "Visual walkthrough at 1280×900 (desktop) for all 11 in-scope surfaces in BOTH themes"
    expected: "Each surface renders correctly at desktop viewport in both colorways"
    why_human: "Same as above — desktop visual quality not Playwright-asserted"
  - test: "Manual keyboard-only walkthrough of primary journey"
    expected: "Home → catalog → song → exercise session → review queue completes without mouse; visible focus rings on every interactive element; no focus traps; no tab-order surprises"
    why_human: "axe-core does not test full keyboard journeys — only static a11y attrs; per SPEC AC #18 manual checklist required"
  - test: "DevTools 'Emulate prefers-reduced-motion: reduce' check on star-shine + level-pop + confetti"
    expected: "star-shine resolves to instant fill at 100% scale; level-pop renders headline at scale(1) immediately; confetti fully suppressed (no canvas overlay)"
    why_human: "Reduced-motion E2E spec covers CSS @media override (Gate 9, 11 passed) but JS-driven canvas-confetti suppression at 3 fire sites (LevelUpTakeover.tsx:39, RowUnlockModal.tsx:53, StarDisplay.tsx) requires DevTools toggle + visual confirm"
  - test: "Lighthouse a11y baseline run captured to 14-LIGHTHOUSE-A11Y.md (SPEC AC #17)"
    expected: "Each in-scope surface scores ≥95 in Lighthouse a11y category; baseline file checked in; deferred until Gate 10 disposition (since Lighthouse will reflect the same color-contrast violations)"
    why_human: "Manual Lighthouse run; depends on a11y disposition (running Lighthouse before fixing accent will surface the same ~2,200 violations Lighthouse weights heavily — wasted run)"
---

# Phase 14: UX Polish Verification Report

**Phase Goal:** Every learner-facing surface in KitsuBeat (11 surfaces) renders against a single tokenized design system in two colorways (dark + light), uses shared Button/Card/Badge/Modal primitives instead of inline implementations, ships designed empty/loading/error states for every async surface, honors a 12-entry microinteraction catalog with `prefers-reduced-motion` fallbacks, and passes a CI-enforced token-compliance lint gate plus axe/Lighthouse accessibility ≥95.

**Verified:** 2026-05-02
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                          | Status         | Evidence                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | All 11 learner-facing surfaces render against a single tokenized design system                 | ✓ VERIFIED     | grep across `src/app/{songs/components,kana,path,profile,review,vocabulary,anime-list}` returns 0 palette utility matches in in-scope files. /songs/[slug]/components chrome (17 files) deferred per D-PRE-08 + CONTEXT D-22.       |
| 2   | Two colorways (dark default + light) work via `data-theme` attribute                           | ✓ VERIFIED     | `globals.css` lines 117-139 define `:root[data-theme="light"]` override block (color + shadow tokens). `layout.tsx` line 43 sets `<html data-theme={initialTheme}>`. Inline no-flash script (line 55) reads kb_theme cookie pre-paint. |
| 3   | Shared Button/Card/Badge/Modal primitives replace inline implementations                       | ✓ VERIFIED     | 6 primitives shipped in `src/components/ui/`: Button, Card, Badge, Modal, EmptyState, Skeleton + ThemeToggle. SongCard imports CardLink + Badge; RowUnlockModal + UpsellModal import Modal + Button; AdvancedDrillsUpsellModal migrated. |
| 4   | Designed empty/loading/error states ship for every async surface                                | ✓ VERIFIED     | `src/app/%5F%5Fdev/states/page.tsx` (URL-encoded folder name decodes to `__dev` via Next.js routing) renders 24 cards (7 async surfaces × 3 states + 3 song-page tab loadings). dev-states.spec.ts: 2 assertions pass (Gate 9). |
| 5   | 12-entry microinteraction catalog with prefers-reduced-motion fallbacks                        | ✓ VERIFIED     | `docs/motion-catalog.md` documents exactly 12 entries × 5 fields each. `motion-catalog-completeness.ts` exits 0 (Gate 3). globals.css line 186 has the global `@media (prefers-reduced-motion: reduce)` override.                  |
| 6   | CI-enforced token-compliance lint gate active                                                  | ✓ VERIFIED     | `eslint.config.mjs` registers `kitsubeat-tokens/no-raw-tokens` as error. `.github/workflows/qa-suite.yml` lines 73-80 run `npm run lint` + `npx tsx scripts/audit/token-compliance.ts` + motion-catalog audit on every PR.       |
| 7   | axe accessibility — zero serious/critical violations on every in-scope route in both themes    | ✗ FAILED       | RUN_A11Y=1 nightly run (2026-05-02): 20 of 22 test cases failed with ~2,200 serious color-contrast violations. Brand accent `#ef4444` on white = 3.76:1 (fails WCAG AA 4.5:1). Documented in 14-A11Y-VIOLATIONS.md.       |
| 8   | Lighthouse accessibility ≥95 on every in-scope surface                                         | ? UNCERTAIN    | Manual baseline not yet captured (per FINAL-GATE: deferred pending Gate 10 disposition). Will reflect same color-contrast violations until accent darkened OR CTAs enlarged OR Phase 18 deferral chosen.                              |
| 9   | Bundle size budget (Phase 13 D-23 carry-forward, 50 kB gzipped on /songs/[slug])               | ✓ VERIFIED     | `npm run size`: /songs/[slug] = 10.33 kB gzipped; baseline 10.04 kB; Δ +0.29 kB. 39.67 kB margin remaining. (FINAL-GATE Gate 6.)                                                                                                       |

**Score:** 7/9 truths VERIFIED, 1/9 FAILED (a11y), 1/9 UNCERTAIN (Lighthouse — gated on a11y disposition).

### Required Artifacts

| Artifact                                            | Expected                                              | Status     | Details                                                                                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/globals.css`                               | Full token system + light override + reduced-motion   | ✓ VERIFIED | 194 lines; @theme block (lines 10-108); `:root[data-theme="light"]` override (117-139); reduced-motion media query (186-193). All SPEC §A.2 tokens present.                                              |
| `src/components/ui/Button.tsx`                      | CVA-based primitive with primary/secondary/ghost × sm/md/lg | ✓ VERIFIED | Imported by RowUnlockModal, UpsellModal, FeedbackPanel, etc.                                                                                                                                       |
| `src/components/ui/Card.tsx`                        | flat/elevated/hero variants + CardLink                | ✓ VERIFIED | Imported by SongCard, PathNode, StarterPick.                                                                                                                                                            |
| `src/components/ui/Badge.tsx`                       | jlpt/grammar/mono/accent variants                     | ✓ VERIFIED | Imported by SongCard (jlpt level + mono difficulty).                                                                                                                                                    |
| `src/components/ui/Modal.tsx`                       | Radix Dialog wrapper                                  | ✓ VERIFIED | Imported by RowUnlockModal, AdvancedDrillsUpsellModal, review/UpsellModal, components/UpsellModal, LevelUpTakeover.                                                                                     |
| `src/components/ui/EmptyState.tsx` + `Skeleton.tsx` | Reusable shells for empty/loading                     | ✓ VERIFIED | Both exist; consumed by `/__dev/states` catalog.                                                                                                                                                         |
| `src/components/ui/ThemeToggle.tsx`                 | Header sun/moon cycling system → light → dark         | ✓ VERIFIED | Theme-toggle.spec.ts: 11 passed, 1 skipped (Gate 9).                                                                                                                                                     |
| `eslint.config.mjs`                                 | ESLint 9 flat config + kitsubeat-tokens plugin        | ✓ VERIFIED | Plugin registered as error rule; allowlist excludes ui/ + admin/ + __dev/ + tests/ + scripts/ + drizzle/ per D-18.                                                                                       |
| `eslint-plugins/kitsubeat-tokens/index.js`          | RAW_HEX + ARBITRARY_PX + PALETTE_UTILITIES + BARE_WHITE_BLACK regexes | ✓ VERIFIED | 124 lines; 4 detection regexes; visits JSXAttribute (className) + CallExpression (clsx/cn/twMerge/cva).                                                                                |
| `scripts/audit/token-compliance.ts`                 | Belt-and-suspenders grep audit                        | ✓ VERIFIED | Exists; FINAL-GATE Gate 2 reports 233 violations (231 D-PRE-08 deferred + 2 user WIP); all 11 in-scope surfaces report 0.                                                                                |
| `scripts/audit/motion-catalog-completeness.ts`      | 12 entries × 5 fields validation                      | ✓ VERIFIED | Exits 0 against current motion-catalog.md (Gate 3).                                                                                                                                                      |
| `docs/motion-catalog.md`                            | 12 named interactions × 5 fields                      | ✓ VERIFIED | 94 lines; entries: verse-highlight pulse, star-earn shine, correct-answer feedback, wrong-answer feedback, level-up takeover, confetti milestone, page-transition fade, hover lift on cards, modal enter, modal exit, toast slide-in, skeleton shimmer. |
| `.github/workflows/qa-suite.yml`                    | Lint + audit + a11y CI integration                    | ✓ VERIFIED | pr-checks job: lint + token-compliance + motion-catalog (lines 73-80). nightly-full job: a11y suite gated by RUN_A11Y (line 126-130).                                                                  |
| `tests/e2e/a11y.spec.ts`                            | 22 axe-core test cases (11 routes × 2 themes)         | ✓ VERIFIED | 80+ lines; AxeBuilder per route; cookie-seeded theme; impact filter `serious|critical`. Full matrix wired.                                                                                                |
| `tests/e2e/mobile-parity.spec.ts`                   | 11 in-scope routes @ 390×844                          | ✓ VERIFIED | FINAL-GATE Gate 8: 13 passed, 1 skipped.                                                                                                                                                                 |
| `tests/e2e/theme-toggle.spec.ts`                    | Theme persistence + cookie + prefers-color-scheme     | ✓ VERIFIED | Part of Gate 9 (11 passed).                                                                                                                                                                              |
| `tests/e2e/reduced-motion.spec.ts`                  | Animation collapse under prefers-reduced-motion       | ✓ VERIFIED | Part of Gate 9 (1 skipped — modal enter/exit RM, Plan 14-04 known skip).                                                                                                                                |
| `tests/e2e/dev-states.spec.ts`                      | /__dev/states route + 24 cards                        | ✓ VERIFIED | Part of Gate 9.                                                                                                                                                                                          |
| `drizzle/0016_user_theme_preference.sql`            | users.theme_preference column with check constraint   | ✓ VERIFIED | File exists; column applied per Plan 14-00 SUMMARY.                                                                                                                                                      |
| `src/app/%5F%5Fdev/states/page.tsx`                 | 24 state cards; production-gated via notFound()       | ✓ VERIFIED | 80+ lines; notFound() gate at line 29; explicit `if (total !== 24) throw` runtime assertion at line 49-51. **Note:** folder on disk is literally `%5F%5Fdev` (URL-encoded `__dev`) — Next.js routing decodes it to `/__dev/states`; dev-states.spec.ts asserts the route works. |
| `.planning/phases/14-ux-polish/14-DESIGN-DISPOSITION.md` | Per-surface design treatment + D-19 zip triage    | ✓ VERIFIED | 14 D-22 references; 11-row surface table; 1 FULL home + 10 D-22 token-only swaps. Closes SPEC AC #5 in lieu of design_handoff_phase14/.                                                                |
| `.planning/phases/14-ux-polish/14-FINAL-GATE.md`    | 11-gate readiness report                              | ✓ VERIFIED | Status NEEDS-USER-DECISION; 9 GREEN, 2 AMBER (lint + token-compliance — both 100% covered by D-PRE-08 deferred), 1 RED (a11y).                                                                          |

### Key Link Verification

| From                                          | To                                | Via                                 | Status     | Details                                                                                                          |
| --------------------------------------------- | --------------------------------- | ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css @theme`                  | Tailwind v4 utility generation    | @theme block creates utilities      | ✓ WIRED    | All bg-card / text-text / bg-accent etc. utilities resolve via `var(--color-*)`.                                  |
| `:root[data-theme="light"]` override          | Runtime utility resolution         | var(--color-*) re-resolves          | ✓ WIRED    | Verified in theme-toggle.spec.ts (cookie set → reload → data-theme attr → CSS vars flip).                          |
| `setThemePreference` server action            | users.theme_preference DB column   | drizzle insert + onConflictDoUpdate | ✓ WIRED    | userPrefs.ts:170-220 — DB write + cookie write.                                                                  |
| `setThemePreference` server action            | kb_theme cookie                    | next/headers cookies()               | ✓ WIRED    | userPrefs.ts:212 — `c.set("kb_theme", value, ...)`.                                                              |
| `layout.tsx`                                  | kb_theme cookie (read side)        | (await cookies()).get('kb_theme')    | ✓ WIRED    | layout.tsx:38 — server-side cookie read drives initialTheme.                                                     |
| `ThemeToggle.tsx onClick`                     | setThemePreference                 | form action + optimistic UI         | ✓ WIRED    | Theme-toggle.spec.ts assertions (Gate 9) all pass.                                                                |
| `RowUnlockModal.tsx`                          | `src/components/ui/Modal.tsx`     | Modal/ModalContent/ModalTitle import | ✓ WIRED    | Line 4-9 import; line 62 `<Modal>` consumer. Inline shell removed.                                                 |
| `review/UpsellModal.tsx`                      | `src/components/ui/Modal.tsx`     | Modal/ModalContent/ModalTitle import | ✓ WIRED    | Line 4-9 import; line 28 `<Modal>` consumer.                                                                       |
| `LevelUpTakeover.tsx`                         | `src/components/ui/Modal.tsx`     | Modal import + canvas-confetti preserved | ✓ WIRED | Per 14-07 SUMMARY: Modal substrate adopted; disableForReducedMotion: true preserved.                              |
| `SongCard.tsx`                                | `src/components/ui/Card.tsx`     | CardLink import                     | ✓ WIRED    | Line 3 import; line 107 `<CardLink variant="flat">` consumer.                                                       |
| `SongCard.tsx`                                | `src/components/ui/Badge.tsx`    | Badge import                        | ✓ WIRED    | Line 4 import; lines 161-167 `<Badge variant="jlpt"|"mono">` consumers.                                            |
| `qa-suite.yml pr-checks`                      | `scripts/audit/token-compliance.ts` | npx tsx step                        | ✓ WIRED    | Line 76-77 — `Token compliance grep audit (Phase 14 — D-17)`.                                                       |
| `qa-suite.yml nightly`                        | `tests/e2e/a11y.spec.ts`           | RUN_A11Y=1 + npm run test:e2e:a11y  | ✓ WIRED    | Line 126-130 — `if: github.event_name == 'schedule'` + `RUN_A11Y: "1"`.                                            |

### Data-Flow Trace (Level 4)

| Artifact                  | Data Variable             | Source                                                | Produces Real Data | Status     |
| ------------------------- | ------------------------- | ----------------------------------------------------- | ------------------ | ---------- |
| `layout.tsx initialTheme` | `initialTheme`            | `(await cookies()).get('kb_theme')?.value` + system fallback | Yes — cookie read or matchMedia | ✓ FLOWING |
| `SongCard` render         | `song.jlpt_level` etc.    | DB via `getAllSongs(userId)` (Phase 11)               | Yes — joined query result | ✓ FLOWING |
| `/path/page.tsx`          | `state, songs, slotRows`  | `getUserGamificationState`, `getAllSongs`, `db.select(...rewardSlotDefinitions)` | Yes — DB queries | ✓ FLOWING |
| `__dev/states`            | `surfaces`                | Hand-coded array with runtime assertion `total === 24` | Static — N/A (dev catalog) | ✓ FLOWING (intentionally static) |

### Behavioral Spot-Checks

| Behavior                                             | Command                                                       | Result                                                                | Status |
| ---------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| ESLint registers kitsubeat-tokens                    | `grep kitsubeat-tokens eslint.config.mjs`                     | 2 references (plugins + rules entries)                                 | ✓ PASS |
| Plugin exports correct rule shape                    | Read `eslint-plugins/kitsubeat-tokens/index.js`               | `meta`, `rules: { 'no-raw-tokens': ... }`, default export             | ✓ PASS |
| globals.css has light theme override                 | `grep ':root\[data-theme="light"\]' src/app/globals.css`      | Match at line 117                                                      | ✓ PASS |
| Reduced-motion override is present and global        | `grep '@media (prefers-reduced-motion: reduce)' globals.css`  | Match at line 186; nukes animation/transition durations to 0          | ✓ PASS |
| Motion catalog has 12 entries                        | Count `^## ` headings in `docs/motion-catalog.md`             | 12 entries                                                             | ✓ PASS |
| No `dark:` Tailwind variants in source code          | `grep -E "\\bdark:(bg|text|border)" src/`                     | 4 matches — all in JSDoc COMMENTS referring to past elimination        | ✓ PASS |
| No inline `fixed inset-0...backdrop` outside ui/Modal.tsx | `grep -E "fixed inset-0.*backdrop" src/app/`              | 0 matches                                                              | ✓ PASS |
| 11 in-scope surfaces clean of palette utilities      | `grep -E "(bg|text)-(gray|red|...)−[0-9]"` on `/page.tsx`, `/songs/page.tsx`, `/anime-list/page.tsx`, `/kana/page.tsx`, `/path/page.tsx`, `/profile/page.tsx`, `/review/page.tsx`, `/vocabulary/page.tsx`, `songs/components/`, `kana/components/`, `path/components/` | 0 matches in in-scope dirs (D-PRE-08 lesson chrome carries 17 files of remaining violations — out of scope per CONTEXT D-22) | ✓ PASS |
| qa-suite.yml runs lint + audits on PR                | Read `.github/workflows/qa-suite.yml` lines 73-80             | `npm run lint`, `npx tsx scripts/audit/token-compliance.ts`, `npx tsx scripts/audit/motion-catalog-completeness.ts` all wired | ✓ PASS |
| qa-suite.yml runs a11y nightly                       | Read lines 126-130                                            | `if: github.event_name == 'schedule'` + `RUN_A11Y: "1"` + `npm run test:e2e:a11y` | ✓ PASS |
| Drizzle migration 0016 exists                        | `ls drizzle/0016*.sql`                                        | `drizzle/0016_user_theme_preference.sql`                              | ✓ PASS |
| __dev/states folder is on disk (URL-encoded name)    | `ls 'src/app/%5F%5Fdev/states/'`                              | `__tests__`, `page.tsx`                                                | ✓ PASS (with caveat below) |

**Caveat on `%5F%5Fdev`:** The directory on disk is literally named `%5F%5Fdev` (URL-encoded form of `__dev`). Git tracks it that way (`git ls-files src/app/*dev*` returns the URL-encoded path). Next.js auto-decodes the segment so `/__dev/states` resolves correctly at runtime — confirmed by dev-states.spec.ts (Gate 9, 2 assertions pass: route returns 200 + 24 cards). Behavioral verification holds; the folder name is fragile across OS/git-config combinations and may want a follow-up rename. Logging as INFO-level note, not a blocker — the route works.

### Requirements Coverage

| Requirement | Source Plans                            | Description                                                  | Status     | Evidence                                                                                                                                                              |
| ----------- | ---------------------------------------- | ------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-REQ-1  | 14-00, 14-01, 14-03, 14-05–14-09        | Design token system (light + dark)                           | ✓ SATISFIED | globals.css full token system + light override block; layout.tsx data-theme; theme persistence (cookie + DB).                                                          |
| SPEC-REQ-2  | 14-00, 14-04, 14-05–14-09                | Token-compliance lint gate                                   | ✓ SATISFIED | eslint.config.mjs + kitsubeat-tokens plugin + qa-suite.yml pr-checks job runs lint + token-compliance + motion-catalog audits.                                          |
| SPEC-REQ-3  | 14-00, 14-02, 14-05–14-09                | Component primitives extracted                               | ✓ SATISFIED | 6 primitives in src/components/ui/; Modal/Card/Badge consumed across migrated surfaces; 39 unit tests (Gate 7).                                                          |
| SPEC-REQ-4  | 14-05–14-09                              | Surface redesign across 11 in-scope surfaces                  | ✓ SATISFIED (with D-22 disposition) | 14-DESIGN-DISPOSITION.md: 1 FULL home + 10 D-22 token-only swaps. CONTEXT D-22 explicitly accepts token-only as floor for design-pending surfaces. |
| SPEC-REQ-5  | 14-00, 14-05–14-09                       | Mobile parity floor at 390×844                                | ✓ SATISFIED | mobile-parity.spec.ts: 13 passed, 1 skipped (whole-page tap-target — D-PRE-08, lesson chrome).                                                                          |
| SPEC-REQ-6  | 14-01, 14-04                             | Microinteraction catalog (12 entries)                         | ✓ SATISFIED | docs/motion-catalog.md: 12 entries × 5 fields; motion-catalog-completeness.ts exits 0; reduced-motion @media block in globals.css.                                      |
| SPEC-REQ-7  | 14-00, 14-02, 14-04                      | Empty/loading/error states for every async surface            | ✓ SATISFIED | EmptyState + Skeleton primitives shipped; /__dev/states catalog renders 24 cards (7 async × 3 + 3 song-page tab loadings); dev-states.spec.ts passes.                  |
| SPEC-REQ-8  | 14-00, 14-09                             | Accessibility floor (WCAG 2.1 AA, axe zero serious/critical, Lighthouse ≥95) | ✗ BLOCKED | RUN_A11Y=1 nightly: 20 of 22 routes failed; ~2,200 serious color-contrast violations; brand accent #ef4444 fails AA against white. Disposition required (A1/A2/A3). |
| SPEC-REQ-9  | 14-00, 14-03                             | Theme switching (dark + light)                                | ✓ SATISFIED | users.theme_preference column + kb_theme cookie + inline no-flash script; ThemeToggle in header + Profile radio. theme-toggle.spec.ts + theme-persistence.test.ts both green. |

**Coverage:** 8/9 SPEC-REQs SATISFIED, 1/9 BLOCKED (REQ 8 a11y). Every SPEC-REQ ID is accounted for in at least one plan's `requirements:` frontmatter. No orphaned requirements. (REQUIREMENTS.md was not consulted because the prompt confirms no upstream REQ-IDs map to phase 14 — SPEC-REQ-1..9 are locked in 14-SPEC.md only.)

### Anti-Patterns Found

The 14-REVIEW.md self-review reports 0 critical / 2 warning / 4 info issues (advisory). I cross-checked the in-scope surfaces directly:

| File                                                              | Line  | Pattern                                       | Severity | Impact                                                                                                                                                              |
| ----------------------------------------------------------------- | ----- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/songs/[slug]/components/GrammarSection.tsx`              | 74    | `border-gray-800 bg-gray-900/50`              | ⚠️ Warning | Out-of-scope per D-PRE-08 (lesson chrome) — explicitly deferred to a yet-to-be-numbered plan. Acceptable per CONTEXT D-22 ("merge gates on full token coverage for in-scope surfaces").   |
| 16 other files under `src/app/songs/[slug]/components/*`          | n/a   | 231 palette utility violations total          | ⚠️ Warning | Same as above — lesson chrome surface; all D-PRE-08 territory.                                                                                                       |
| `src/app/sign-in/[[...sign-in]]/page.tsx` + `sign-up/[[...sign-up]]/page.tsx` | n/a | 2 palette violations | ⚠️ Warning | User WIP per parent agent handoff ("explicitly: do not touch"). Out of phase 14 scope.                                                                              |
| `src/app/%5F%5Fdev/states/page.tsx` (folder name URL-encoded)     | n/a   | Folder named `%5F%5Fdev` instead of `__dev`   | ℹ️ Info  | Behaviorally functional (Next.js decodes; tests pass) but visually fragile across OS/git-config. Worth a follow-up rename. NOT a phase-goal blocker.                |
| Pre-existing test failures (D-PRE-01 + D-PRE-02 = 6 failures)     | n/a   | regression-stale-lesson-data + spot-check-tv-onsets | ℹ️ Info | Pre-date Phase 14; deferred per `deferred-items.md`. Phase 14 introduced 0 new test failures.                                                                       |

**No blocker anti-patterns found in any of the 11 in-scope phase-14 surfaces.** The lesson-chrome violations are formally tracked in `deferred-items.md` D-PRE-08 + D-PRE-12 with a recommended follow-up plan ("lesson chrome cleanup" — ~16 files, 231 violations, 1 day estimated effort).

### Human Verification Required

See frontmatter `human_verification:` for the structured list. Summary:

1. **A11y disposition decision** — User must pick A1 (darken `--color-accent` to e.g. `#dc2626`/`#b91c1c`), A2 (enlarge Button primary CTA to text-lg + font-bold), or A3 (Phase 18 deferral with explicit user approval recorded in 14-A11Y-VIOLATIONS.md). Per planner WARNING 2: planner does NOT pre-decide deferral on difficulty grounds.
2. **Visual walkthrough at 390×844 in dark theme** — All 11 in-scope surfaces.
3. **Visual walkthrough at 390×844 in light theme** — All 11 (no Claude Design output for 10 of them; D-22 token-only swaps).
4. **Visual walkthrough at 1280×900 in both themes** — Desktop visual quality.
5. **Manual keyboard-only walkthrough** — Primary journey (home → catalog → song → exercise → review).
6. **DevTools reduced-motion check** — star-shine + level-pop + confetti suppressed in browser.
7. **Lighthouse a11y baseline** — Capture to `14-LIGHTHOUSE-A11Y.md` (deferred until a11y disposition lands; running pre-disposition will surface same color-contrast violations).

### Gaps Summary

**The phase has ONE phase-goal gap and seven manual-verification items.**

The phase-goal gap is the a11y floor (SPEC-REQ-8, AC #13, AC #17). It is NOT auto-fixable in the conventional sense — fixing it requires a product/design decision among three documented options:
- **A1** — Token tuning: darken `--color-accent` from `#ef4444` to a value clearing 4.5:1 against white. Brand identity shifts. ~2-4 hours of token re-tune + cross-surface verification.
- **A2** — Component restructure: enlarge Button primary CTA text to qualify as WCAG large-bold (≥18.66px + 700w). Visual change to every CTA across 11 surfaces.
- **A3** — User-approved Phase 18 deferral: explicit authorisation recorded in `14-A11Y-VIOLATIONS.md` User decisions log with timestamp + rationale. Phase 14 ships on token-coverage grounds (CONTEXT D-22 explicit blocker) with WCAG remediation as a Phase 18 entry point.

Per planner WARNING 2 + the plan's A11y Severity Policy, the planner explicitly does NOT pre-decide A3. This is THE NEEDS-USER-DECISION moment for phase 14 merge.

Everything else is GREEN: token coverage on all 11 in-scope surfaces (D-PRE-08 lesson chrome formally deferred per CONTEXT D-22), 6 primitives shipped + consumed, both colorways wired with theme persistence (cookie + DB + inline no-flash script), 24 empty/loading/error states demoable, 12-entry motion catalog with reduced-motion fallbacks (CSS @media + canvas-confetti `disableForReducedMotion: true` at 3 fire sites), CI lint gate active on every PR (eslint + token-compliance + motion-catalog audits), bundle 10.33 kB gzipped (50 kB budget; +0.29 kB delta), 580 tests with 0 new failures.

**Recommendation:** Surface the 3 disposition options (A1/A2/A3) to the user. Once decided:
- A1 or A2 → loop back to plan-phase mode with the chosen fix; re-run RUN_A11Y=1 to verify zero serious/critical; update verification.
- A3 → record explicit authorisation in 14-A11Y-VIOLATIONS.md; create Phase 18 entry; merge phase 14 on token-coverage grounds.

After the disposition lands, the manual visual walkthroughs (items 2-6 above) and Lighthouse baseline (item 7) close the remaining manual gates from FINAL-GATE.md.

---

_Verified: 2026-05-02_
_Verifier: Claude (gsd-verifier)_
