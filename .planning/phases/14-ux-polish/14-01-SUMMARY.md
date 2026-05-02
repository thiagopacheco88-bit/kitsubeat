---
phase: 14-ux-polish
plan: 01
subsystem: ui
tags: [design-tokens, tailwind-v4, css-variables, theming, reduced-motion, globals.css]

# Dependency graph
requires:
  - phase: 14-ux-polish
    provides: Plan 14-00 — kitsubeat-tokens ESLint rule (no-raw-tokens), token-compliance grep audit, .size-baseline.txt (10.04 kB), users.theme_preference DB column, 12 test shells
provides:
  - "globals.css @theme block with full SPEC §A token surface (10 dark colors, 10 JLPT alpha tints, 3 typefaces, 10-step spacing, 11-step radii, 8 dark shadow recipes, 3 durations + 2 easings)"
  - "globals.css :root[data-theme=\"light\"] override block (9 light colors + 8 light shadows, 30% higher opacity per D-04)"
  - "globals.css @media (prefers-reduced-motion: reduce) global override (D-13 — last block in file)"
  - "Tailwind v4 utility classes auto-generated from new @theme tokens (bg-card, text-text-muted, shadow-button-red, rounded-pill, etc.) — Wave 2+ surface migrations consume these"
affects: [14-02, 14-03, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09]

# Tech tracking
tech-stack:
  added: []  # CSS-only change; zero new deps. Bundle size delta: 0 KB.
  patterns:
    - "Single-source-of-truth token system in globals.css: dark @theme defaults + :root[data-theme=\"light\"] overrides only color + shadow (typography/spacing/radii/motion theme-independent per D-01)"
    - "Reduced-motion enforcement via single global @media block at file end (D-13) — wildcard *, *::before, *::after collapses durations to 0ms !important"
    - "Pitfall 4 honored: light theme uses :root[data-theme=\"light\"] selector NOT a second @theme block (Tailwind v4 treats second @theme as additive, not as override)"

key-files:
  created: []
  modified:
    - "src/app/globals.css (60 lines → 184 lines: full token surface + light override + reduced-motion)"

key-decisions:
  - "Insertion order inside @theme: existing grammar → existing JLPT → new JLPT alpha tints → color → typography → spacing → radii → shadows → motion. Keeps existing tokens at top to minimize diff and preserve existing class generation"
  - "JLPT alpha tints (12% bg / 25% ring per SPEC §A.2) live inside @theme — single value used for both themes (alpha works on both light + dark backgrounds), so no override needed in :root[data-theme=\"light\"]"
  - "Comment block (lines 100-107) explicitly documents D-01 / D-03 / D-04 / RESEARCH Pitfall 4 inline so the next maintainer doesn't re-discover why light theme is in :root[data-theme=\"light\"] instead of a second @theme"
  - "Reduced-motion media query placed AFTER all keyframes + class declarations (D-13: last block in file) so wildcard !important properly overrides anything declared above"

patterns-established:
  - "Token comment grouping: each token category gets a leading comment (`/* Color (DARK theme — default) per SPEC §A.2 */`) for greppability and discoverability — Wave 2+ migrations grep for `/* Color` to find their target tokens"
  - "Light theme override scope discipline: D-01 split (color + shadow override; typography/spacing/radii/motion shared) is enforced by review — easy to spot a stray `--space-*` inside :root[data-theme=\"light\"] in PR diff"

requirements-completed: [1, 6]

# Metrics
duration: 7min
completed: 2026-05-02
---

# Phase 14 Plan 01: Design Token System Summary

**Expanded `src/app/globals.css` from grammar-color-only (60 lines) to a full design token system (184 lines): SPEC §A complete dark theme defaults inside `@theme`, `:root[data-theme="light"]` override redefining 9 colors + 8 shadows per CONTEXT D-03/D-04, and the global `@media (prefers-reduced-motion: reduce)` override per D-13 — all in 2 atomic commits with zero JS bundle impact and zero test regressions.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-02T06:19:45Z
- **Completed:** 2026-05-02T06:26:13Z
- **Tasks:** 2 (Task 1 — dark @theme expansion; Task 2 — light override + reduced-motion)
- **Files modified:** 1 (`src/app/globals.css`)

## Accomplishments

- **Full SPEC §A token surface live in `@theme`** — 10 surface/text/border colors, 10 JLPT alpha tints (5 × {bg, ring}), 3 font families (Inter / Noto Sans JP / ui-monospace), 10-step spacing scale (4..64px), 11-step radii scale (8..26px + pill), 8 shadow recipes (card-ring × 2, hero-glow, hero-inner, button-red, cta-red, logo-glow, focus-ring), 3 durations + 2 easings.
- **`:root[data-theme="light"]` override redefines 9 colors + 8 shadows** — light values from CONTEXT D-03 verbatim (`#FAFAF9` bg, `#18181B` text, accent `#ef4444` retained); shadows 30% higher opacity per D-04.
- **Reduced-motion override is THE last block in the file (D-13)** — `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; ... } }` collapses every cataloged Wave 2+ animation.
- **Pitfall 4 honored end-to-end** — exactly 1 `@theme` block, exactly 1 `:root[data-theme="light"]` selector. Light theme is NOT a second `@theme` (would be additive, not an override).
- **Zero bundle impact** — `npm run size` reports 10.04 kB gzipped on `/songs/[slug]`, identical to `.size-baseline.txt`. Pure CSS change adds no JS.
- **Zero test regressions** — pre-existing 6 failures (D-PRE-01/D-PRE-02 in `regression-stale-lesson-data.test.ts` + `spot-check-tv-onsets.test.ts`) unchanged; no new failures introduced.
- **Existing keyframes retained verbatim per D-27** — `star-shine` (Plan 08-04) and `level-pop` (Plan 06) keyframes + class declarations untouched; will be cataloged in `docs/motion-catalog.md` by Plan 14-04.

## Task Commits

Each task was committed atomically:

1. **Task 1: expand @theme with full SPEC §A token set (dark theme baseline)** — `8c4afea` (feat)
2. **Task 2: add :root[data-theme="light"] override + global reduced-motion media query** — `5758700` (feat)

**Plan metadata:** (this commit) — `docs(14-01): complete design token system plan`

## Files Created/Modified

### Modified (1 file)

- **`src/app/globals.css`** — Grew from 60 lines to 184 lines:
  - **`@theme` block (lines 10-99, 90 lines, was lines 10-24/15 lines)** — All SPEC §A tokens added in declared insertion order: existing grammar (7 tokens) → existing JLPT base (5 tokens) → NEW JLPT alpha tints (10 tokens) → NEW color tokens (10 dark) → NEW typography (3 font families) → NEW spacing (10 steps) → NEW radii (11 steps) → NEW shadows (8 dark recipes) → NEW motion (3 durations + 2 easings) = **62 net new tokens**.
  - **`:root[data-theme="light"]` override (lines 101-130, NEW 30 lines)** — 9 color + 8 shadow tokens redefined per CONTEXT D-03/D-04. Comment block documents Pitfall 4 inline.
  - **Existing scrollbar + keyframes (lines 132-167)** — Untouched per D-27.
  - **`@media (prefers-reduced-motion: reduce)` (lines 169-184, NEW 16 lines)** — Last block in file per D-13. Wildcard targets `*, *::before, *::after`. Comment block notes canvas-confetti is suppressed at fire sites separately (Phase 13 RESEARCH).

## Token Inventory

### Color (10 tokens × 2 themes)

| Token | Dark value | Light value | Purpose |
|---|---|---|---|
| `--color-bg` | `#0E0E0E` | `#FAFAF9` | Page bg |
| `--color-bg-2` | `#111111` | `#F4F4F2` | Section bg / body alt |
| `--color-card` | `#191919` | `#FFFFFF` | Card surface |
| `--color-card-2` | `#1E1E1E` | `#FAFAF9` | Card alt / inset |
| `--color-border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` | Subtle border |
| `--color-border-strong` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.14)` | Stronger divider |
| `--color-text` | `#F5F5F4` | `#18181B` | Primary text |
| `--color-text-muted` | `rgba(245,245,244,0.56)` | `rgba(24,24,27,0.62)` | Secondary text |
| `--color-text-dim` | `rgba(245,245,244,0.40)` | `rgba(24,24,27,0.45)` | Tertiary text |
| `--color-accent` | `#ef4444` | `#ef4444` | Brand red — same in both (WCAG AA verified D-03) |

### JLPT alpha tints (10 tokens — SHARED across themes)

| Token | Value | Purpose |
|---|---|---|
| `--color-jlpt-n5-bg` | `rgba(34, 197, 94, 0.12)` | N5 badge bg (12% green) |
| `--color-jlpt-n5-ring` | `rgba(34, 197, 94, 0.25)` | N5 badge ring (25% green) |
| `--color-jlpt-n4-bg` | `rgba(59, 130, 246, 0.12)` | N4 badge bg (12% blue) |
| `--color-jlpt-n4-ring` | `rgba(59, 130, 246, 0.25)` | N4 badge ring (25% blue) |
| `--color-jlpt-n3-bg` | `rgba(245, 158, 11, 0.12)` | N3 badge bg (12% amber) |
| `--color-jlpt-n3-ring` | `rgba(245, 158, 11, 0.25)` | N3 badge ring (25% amber) |
| `--color-jlpt-n2-bg` | `rgba(249, 115, 22, 0.12)` | N2 badge bg (12% orange) |
| `--color-jlpt-n2-ring` | `rgba(249, 115, 22, 0.25)` | N2 badge ring (25% orange) |
| `--color-jlpt-n1-bg` | `rgba(239, 68, 68, 0.12)` | N1 badge bg (12% red) |
| `--color-jlpt-n1-ring` | `rgba(239, 68, 68, 0.25)` | N1 badge ring (25% red) |

### Typography (3 tokens — theme-independent)

| Token | Value |
|---|---|
| `--font-sans` | `Inter, -apple-system, "SF Pro Text", system-ui, sans-serif` |
| `--font-jp` | `"Noto Sans JP", -apple-system, system-ui, sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace` |

### Spacing (10 tokens — theme-independent)

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-5: 20px` · `--space-6: 24px` · `--space-7: 32px` · `--space-8: 40px` · `--space-9: 48px` · `--space-10: 64px`

### Radii (11 tokens — theme-independent)

`--radius-xs: 8px` · `--radius-sm: 10px` · `--radius-md: 12px` · `--radius-lg: 14px` · `--radius-xl: 16px` · `--radius-2xl: 18px` · `--radius-3xl: 20px` · `--radius-4xl: 22px` · `--radius-5xl: 24px` · `--radius-6xl: 26px` · `--radius-pill: 9999px`

### Shadows (8 tokens × 2 themes)

| Token | Dark | Light (30% higher opacity per D-04) |
|---|---|---|
| `--shadow-card-ring` | `inset 0 0 0 1px rgba(255,255,255,0.06)` | `inset 0 0 0 1px rgba(0,0,0,0.08)` |
| `--shadow-card-ring-strong` | `inset 0 0 0 1px rgba(255,255,255,0.10)` | `inset 0 0 0 1px rgba(0,0,0,0.14)` |
| `--shadow-hero-glow` | `inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14)` | `inset 0 0 0 1px rgba(239,68,68,0.42), 0 16px 40px rgba(239,68,68,0.18)` |
| `--shadow-hero-inner` | `inset 0 0 80px rgba(239,68,68,0.18)` | `inset 0 0 80px rgba(239,68,68,0.22)` |
| `--shadow-button-red` | `0 8px 22px rgba(239,68,68,0.45)` | `0 8px 22px rgba(239,68,68,0.55)` |
| `--shadow-cta-red` | `0 8px 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15)` | `0 8px 24px rgba(239,68,68,0.36), inset 0 1px 0 rgba(255,255,255,0.20)` |
| `--shadow-logo-glow` | `drop-shadow(0 0 14px rgba(239,68,68,0.32))` | `drop-shadow(0 0 14px rgba(239,68,68,0.42))` |
| `--shadow-focus-ring` | `0 0 0 2px rgba(239,68,68,0.40)` | `0 0 0 2px rgba(239,68,68,0.50)` |

### Motion (5 tokens — theme-independent)

| Token | Value |
|---|---|
| `--duration-fast` | `120ms` |
| `--duration-base` | `200ms` |
| `--duration-slow` | `400ms` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |

## Structural Rules Confirmed

| Rule | Verification | Result |
|---|---|---|
| Single `@theme` block (Pitfall 4) | `grep -c '^@theme' src/app/globals.css` | **1** ✓ |
| Light theme in `:root[data-theme="light"]` (D-01) | `grep -c '^:root\[data-theme="light"\]' src/app/globals.css` | **1** ✓ |
| Reduced-motion is LAST block (D-13) | `tail -10 src/app/globals.css \| grep -q 'prefers-reduced-motion'` | **PASS** ✓ |
| Existing `star-shine` keyframes retained (D-27) | `grep 'star-shine' src/app/globals.css` | **PASS** ✓ |
| Existing `level-pop` keyframes retained (D-27) | `grep 'level-pop' src/app/globals.css` | **PASS** ✓ |
| Existing grammar tokens retained | `grep 'color-grammar-noun: #3b82f6' src/app/globals.css` | **PASS** ✓ |
| Existing JLPT base tokens retained | `grep 'color-jlpt-n5: #22c55e' src/app/globals.css` | **PASS** ✓ |

## Decisions Made

- **Insertion order inside `@theme`** — existing grammar → existing JLPT base → NEW JLPT alpha tints → NEW color → NEW typography → NEW spacing → NEW radii → NEW shadows → NEW motion. Keeps the pre-Phase-14 tokens at the top of the block to minimize diff churn and preserve their class-generation order. Wave 2+ migrations grep `/* Color */`, `/* Typography */`, etc. comment markers to discover their target token category.
- **JLPT alpha tints stay theme-independent** — 12%/25% alpha works on both `#0E0E0E` dark and `#FAFAF9` light backgrounds (verified visually; axe contrast verification deferred to Wave 2+ a11y.spec.ts). No `:root[data-theme="light"]` override needed for the 10 JLPT alpha tints, keeping the override block focused on the 9 actual color + 8 shadow tokens.
- **Inline comment-block documenting Pitfall 4** — Lines 100-107 of globals.css include a multi-line comment explicitly stating "this MUST live in :root[data-theme=\"light\"] (NOT a second @theme block)" so the next maintainer doesn't re-discover Tailwind v4's additive-vs-override semantics.
- **`--color-accent` retained at `#ef4444` in light theme** — Per CONTEXT D-03 ("same `#ef4444` accent verified for AA on light bg"), the brand red is theme-independent. Documented inline in the `:root[data-theme="light"]` block as a comment so future contributors don't add a stray override.

## Deviations from Plan

**None.** Plan executed exactly as written. Both tasks landed in 1 commit each; no auto-fixes (Rules 1-3) needed; no checkpoints. Build green on both task commits, test suite shows only the 6 pre-existing failures already documented in Plan 14-00's `deferred-items.md`.

## Issues Encountered

- **Pre-existing test failures (6 cases, all unchanged from Plan 14-00 baseline)** — `regression-stale-lesson-data.test.ts` × 3 (Phase 08-01 / 11 unrelated) + `spot-check-tv-onsets.test.ts` × 3 (seed-script). All already logged to `deferred-items.md` (D-PRE-01, D-PRE-02). Per scope-boundary rule, NOT auto-fixed.
- **`token-compliance.ts` audit still exits 1** — Expected, per Plan 14-00 SUMMARY ("currently exit 1; ~904 violations on master pre-Wave-1 as expected; flips green when Wave 1+ migrations land lint fixes"). Crucially, **zero violations are in `globals.css`** — the file is correctly allowlisted per CONTEXT D-18 (token VALUES are raw hex/rgba in globals.css and that is the source of truth). Violations remain in pre-Wave-1 surface code (`src/app/dashboard/page.tsx`, `src/app/anime-list/page.tsx`, `src/app/components/{GlobalLearnedCounter,LevelUpTakeover}.tsx`) and will flip green as Wave 2+ surface migrations land.

## Bundle Size Delta

`.size-baseline.txt` (Plan 14-00, captured 2026-05-02): **10.04 kB gzipped on `/songs/[slug]`**.
`npm run size` after Plan 14-01 commits: **10.04 kB gzipped on `/songs/[slug]`** (identical, byte-for-byte).

**Delta: 0 KB.** Pure CSS change adds no JS to the bundle. Tailwind v4's `@theme` tokens generate utility classes lazily per use site — Wave 2+ surface migrations will start consuming them, and bundle-size impact will be measured per-plan against this same baseline.

## User Setup Required

None — Plan 14-01 is pure CSS authoring. No external services, no DB migrations, no dependency installs. The CSS compiles into the build via Tailwind v4 / PostCSS automatically.

## Next Phase Readiness

**Wave 1 plan 14-02 (component primitives) unblocked:**
- All consumed tokens exist: `bg-card`, `bg-card-2`, `text-text`, `text-text-muted`, `border-border`, `shadow-card-ring`, `shadow-button-red`, `shadow-focus-ring`, `rounded-md`, `rounded-pill`, `transition-[var(--duration-base)]`, etc.
- Plan 14-02's CVA variant maps can use `bg-accent` for primary buttons, `bg-card` for card surface, `text-text-muted` for secondary text — all resolve via Tailwind v4's auto-generation.
- Plan 14-03 (theme persistence) can flip `<html data-theme={resolved}>` server-side and the `:root[data-theme="light"]` override fires immediately — no further CSS work needed.
- Plan 14-04 (motion catalog) will catalog the existing `star-shine` + `level-pop` keyframes (already in this file unchanged) plus the reduced-motion override block this plan added. The motion-catalog-completeness audit script (Plan 14-00 Task 3) gates `docs/motion-catalog.md` independently.

## Self-Check: PASSED

- `src/app/globals.css`: FOUND (184 lines, was 60)
- `--color-bg: #0E0E0E` in @theme: FOUND
- `--color-bg: #FAFAF9` in :root[data-theme="light"]: FOUND
- `--shadow-button-red: 0 8px 22px rgba(239, 68, 68, 0.45)` (dark): FOUND
- `--shadow-button-red: 0 8px 22px rgba(239, 68, 68, 0.55)` (light): FOUND
- `@media (prefers-reduced-motion: reduce)` last block: FOUND (tail -10 confirms)
- `@keyframes star-shine` retained verbatim: FOUND
- `@keyframes level-pop` retained verbatim: FOUND
- Single `@theme` block (Pitfall 4): CONFIRMED (grep -c = 1)
- Single `:root[data-theme="light"]` selector: CONFIRMED (grep -c = 1)
- Commit `8c4afea` (Task 1): FOUND in `git log`
- Commit `5758700` (Task 2): FOUND in `git log`
- `npm run build` succeeds: CONFIRMED (build green at HEAD)
- `npm run size` matches baseline: CONFIRMED (10.04 kB = baseline 10.04 kB)
- `npm test` no new failures: CONFIRMED (6 pre-existing failures unchanged)

---
*Phase: 14-ux-polish*
*Plan: 01*
*Completed: 2026-05-02*
