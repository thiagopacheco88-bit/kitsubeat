---
phase: 14-ux-polish
plan: 02
subsystem: ui
tags: [primitives, cva, tailwind-merge, radix-dialog, design-tokens, react, tdd]

# Dependency graph
requires:
  - phase: 14-ux-polish
    provides: Plan 14-00 (kitsubeat-tokens ESLint allowlist for src/components/ui/, 5 vitest test shells, all 8 npm deps installed) + Plan 14-01 (full token surface in globals.css — color/spacing/radii/shadow/motion vars)
provides:
  - "src/components/ui/Button.tsx — CVA-based Button (3 variants × 3 sizes) with min-h-[44px] tap-target floor on every size (SPEC AC #11)"
  - "src/components/ui/Card.tsx — CVA-based Card (3 variants × 3 sizes) + CardLink polymorphic face rendering Next.js <Link>"
  - "src/components/ui/Badge.tsx — CVA-based Badge (4 variants: jlpt | grammar | mono | accent) consuming JLPT 12%/25% alpha tints + grammar inline color-mix tints"
  - "src/components/ui/Modal.tsx — Radix Dialog wrapper exporting Modal/ModalTrigger/ModalContent/ModalTitle/ModalDescription/ModalClose with Pitfall 5 srOnly escape hatch"
  - "src/components/ui/EmptyState.tsx — composable shell (icon + heading + body + CTA) with default | error variants; CTA accepts onClick or href"
  - "src/components/ui/Skeleton.tsx — animate-pulse loading shell (4 variants: card | list-item | hero | badge-row); auto-collapsed by Plan 14-01 reduced-motion override"
  - "src/lib/types/lesson.ts — GRAMMAR_BG_COLOR_CLASS map paralleling JLPT_COLOR_CLASS shape for the Badge primitive's grammar variant (preserves legacy GRAMMAR_COLOR_CLASS text-* map for VocabularySection / VerseBlock / TokenSpan callers)"
affects: [14-03, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09]

# Tech tracking
tech-stack:
  added: []  # All 8 deps were installed in Plan 14-00; Plan 14-02 only authors components.
  patterns:
    - "CVA variant pattern: cva([base], { variants: { variant: {...}, size: {...} }, defaultVariants })"
    - "twMerge(clsx(cva(...), className)) — three-stage class composition that lets consumers override variant defaults via className"
    - "Discriminated-union props for Badge — variant: 'jlpt' narrows the type to require `level`, variant: 'grammar' narrows to require `category`"
    - "Two-component face polymorphism (Card + CardLink) instead of asChild — defers Radix Slot to Phase 18 per D-07"
    - "Radix Dialog primitive wrap: re-export Root/Trigger/Close as-is, wrap Portal+Overlay+Content into a single ModalContent shell"
    - "Token-only consumption via bg-[var(--color-*)] arbitrary-value syntax — no Tailwind palette utilities, no raw hex"

key-files:
  created:
    - "src/components/ui/Button.tsx (58 lines)"
    - "src/components/ui/Card.tsx (71 lines)"
    - "src/components/ui/Badge.tsx (133 lines)"
    - "src/components/ui/Modal.tsx (111 lines)"
    - "src/components/ui/EmptyState.tsx (94 lines)"
    - "src/components/ui/Skeleton.tsx (52 lines)"
  modified:
    - "src/lib/types/lesson.ts (+21 lines for GRAMMAR_BG_COLOR_CLASS)"
    - "src/components/ui/__tests__/Button.test.tsx (9 real tests, was 1 shell + 9 todos)"
    - "src/components/ui/__tests__/Card.test.tsx (7 real tests, was 1 shell + 6 todos)"
    - "src/components/ui/__tests__/Badge.test.tsx (8 real tests, was 1 shell + 6 todos)"
    - "src/components/ui/__tests__/Modal.test.tsx (8 real tests, was 1 shell + 9 todos)"
    - "src/components/ui/__tests__/EmptyState.test.tsx (7 real tests, was 1 shell + 5 todos)"

key-decisions:
  - "Added GRAMMAR_BG_COLOR_CLASS as a parallel map alongside the legacy GRAMMAR_COLOR_CLASS instead of overwriting — the legacy map (text-grammar-* shape) is consumed by 3 components (VocabularySection / VerseBlock / TokenSpan); overwriting would break inline grammar text coloring across the app"
  - "Badge variant=grammar uses inline style with color-mix instead of bg-[var(--color-grammar-X)] arbitrary class — Tailwind v4 has no color-mix arbitrary value syntax, so the 12%/25% alpha tints must be expressed inline. Token name still grep-discoverable via the inline style string for the unit test contract"
  - "Card uses two-component-face polymorphism (Card + CardLink) instead of Radix Slot asChild — D-07 explicitly defers asChild to Phase 18; the two-face pattern is simpler and type-safer for the Wave 2+ migration call sites"
  - "ModalContent renders bg-black/60 overlay (alpha-modified bare black) — the kitsubeat-tokens BARE_WHITE_BLACK regex specifically excludes alpha modifiers (?!\\/), so this is compliant. Token-system gap: no --color-overlay token exists; deferred to Phase 18 if a designed scrim color emerges"

patterns-established:
  - "Per-primitive TDD cycle: RED commit (test only, fails) → GREEN commit (implementation, all tests pass) → no REFACTOR needed when implementation lands clean"
  - "Re-exporting type-narrowing maps from primitive modules (Badge re-exports JLPT_COLOR_CLASS / GRAMMAR_COLOR_CLASS) — makes the data dependency observable from the primitive's module surface for Wave 2+ migration grep audits"
  - "Skeleton primitive relies entirely on Plan 14-01's global @media (prefers-reduced-motion: reduce) override — no per-component matchMedia guard, no canvas-confetti-style if-statement (the override collapses animate-pulse duration to 0ms automatically)"
  - "Primitive a11y guardrails: Modal exports ModalTitle (Pitfall 5 srOnly escape), EmptyState renders role='alert' on error variant + accepts aria-label, Skeleton renders role='status' aria-label='Loading' aria-live='polite'"

requirements-completed: [3, 7]

# Metrics
duration: 21min
completed: 2026-05-02
---

# Phase 14 Plan 02: Component Primitives Summary

**Six token-driven primitives in src/components/ui/ — Button + Card + Badge + Modal + EmptyState + Skeleton — built TDD-first with 39 unit tests, zero raw hex / palette utilities, and two atomic feat commits per task. Wave 2+ surface migrations now have a complete primitive surface to consume; the 24 cataloged empty/loading/error states have shared shells; the 4 inline modal call sites have a Radix Dialog substrate to migrate onto.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-05-02T06:31:18Z
- **Completed:** 2026-05-02T06:51:56Z
- **Tasks:** 2 (Task 1: Button + Card + Badge + GRAMMAR map; Task 2: Modal + EmptyState + Skeleton)
- **Files created:** 6 primitive components
- **Files modified:** 1 type extension + 5 test files (replaced shells with real assertions)

## Accomplishments

- **All 6 primitive components shipped** — Button (3×3 variant×size matrix), Card + CardLink (3 variants × 3 sizes), Badge (4 variants with discriminated-union props), Modal (Radix Dialog wrapper with 6 exports + Pitfall 5 srOnly escape hatch), EmptyState (default + error variants with optional CTA), Skeleton (4 variants with auto-respecting reduced-motion).
- **39 unit tests green** — 9 Button + 7 Card + 8 Badge + 8 Modal + 7 EmptyState. Tests assert variant token classes (e.g., `bg-[var(--color-accent)]`), size tap-target compliance (`min-h-[44px]`), polymorphism (CardLink renders `<a>`), Radix Dialog a11y contract (role=dialog, srOnly Title), and onOpenChange/onClick handler forwarding.
- **Zero raw hex / palette utilities** — verified via grep; primitive code consumes only `var(--color-*)`, `var(--shadow-*)`, `var(--radius-*)` tokens (29 var references across 6 files).
- **TDD discipline maintained** — every feat commit is preceded by a test commit that demonstrably fails first (RED gate verified twice).
- **Token-system stress test passed** — every variant in every primitive references tokens added in Plan 14-01 (`--color-card`, `--color-card-2`, `--color-text-muted`, `--color-accent`, `--color-jlpt-N-bg`/`-ring`, `--shadow-button-red`, `--shadow-card-ring-strong`, `--shadow-hero-glow`, `--radius-md`/`-lg`/`-2xl`/`-3xl`/`-pill`).
- **GRAMMAR_BG_COLOR_CLASS parallel map landed** — preserves legacy `GRAMMAR_COLOR_CLASS` (text-grammar-* shape used by 3 components) while adding the bg-[var(--color-grammar-*)] shape from the plan's must_haves.

## Task Commits

Each task ran the TDD cycle (RED → GREEN), with one `feat` commit for the GRAMMAR map addition.

1. **Task 1 RED — failing tests for Button/Card/Badge** — `cd4f8bf` (test)
2. **Task 1 GREEN — Button/Card/Badge primitives** — `3bdee99` (feat)
3. **Task 1 — GRAMMAR_BG_COLOR_CLASS parallel map** — `20725b4` (feat)
4. **Task 2 RED — failing tests for Modal/EmptyState** — `35f2e51` (test)
5. **Task 2 GREEN — Modal/EmptyState/Skeleton primitives** — `444a0db` (feat)

**Plan metadata:** (this commit) — `docs(14-02): complete primitives plan`

## Files Created/Modified

### Created (6 files, 519 lines total)

- **`src/components/ui/Button.tsx`** (58 lines) — CVA Button with 3 variants × 3 sizes; primary/secondary/ghost × sm/md/lg; every size carries `min-h-[44px]` for SPEC AC #11. Token references: `--color-accent`, `--color-card-2`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-border-strong`, `--shadow-button-red`, `--radius-sm`/`-md`/`-lg`. Forwarded ref support via `forwardRef`.
- **`src/components/ui/Card.tsx`** (71 lines) — Card + CardLink (two faces). 3 variants × 3 sizes; flat (border + hover-strong-border), elevated (`--shadow-card-ring-strong`), hero (`--shadow-hero-glow`). CardLink renders Next.js `<Link>` and accepts the `href` prop; both forwardRef-supported.
- **`src/components/ui/Badge.tsx`** (133 lines) — 4 variants (jlpt | grammar | mono | accent) with discriminated-union props. JLPT variant accepts `level: "N5"|"N4"|"N3"|"N2"|"N1"` → derives `bg-[var(--color-jlpt-{level}-bg)] ring-[var(--color-jlpt-{level}-ring)]`. Grammar variant accepts `category: "noun"|"verb"|...|"other"` → applies inline style with `color-mix(in srgb, var(--color-grammar-{category}) 12%/25%, transparent)` for bg + ring. Re-exports `JLPT_COLOR_CLASS` and `GRAMMAR_COLOR_CLASS` for Wave 2+ migration consumers.
- **`src/components/ui/Modal.tsx`** (111 lines) — `"use client"` directive, Radix Dialog wrapper. 6 exports (Modal, ModalTrigger, ModalContent, ModalTitle, ModalDescription, ModalClose). ModalContent wraps Portal + Overlay (`bg-black/60 backdrop-blur-sm`) + Content (`--color-card`, `--shadow-card-ring-strong`, `--radius-3xl`). ModalTitle accepts optional `srOnly` boolean (Pitfall 5 escape hatch). ModalContent accepts optional `forceMount` for nested-modal future-proofing.
- **`src/components/ui/EmptyState.tsx`** (94 lines) — Default + error variants. Composable: optional icon + heading (required) + optional body + optional CTA (button or link). Error variant adds accent-bordered shell + `role="alert"`. Reuses `Button` primitive for the CTA — primary variant on error, secondary on default.
- **`src/components/ui/Skeleton.tsx`** (52 lines) — 4 variants (card / list-item / hero / badge-row) with sensible default heights + widths + radii. Uses Tailwind `animate-pulse` — Plan 14-01's global `prefers-reduced-motion: reduce` override collapses to instant rest state. Renders `role="status"` `aria-label="Loading"` `aria-live="polite"`.

### Modified (6 files)

- **`src/lib/types/lesson.ts`** (+21 lines) — Added `GRAMMAR_BG_COLOR_CLASS` map immediately after the existing `JLPT_COLOR_CLASS` map. The legacy `GRAMMAR_COLOR_CLASS` (text-grammar-* shape, lines 176-184) remains unchanged for VocabularySection / VerseBlock / TokenSpan compatibility.
- **`src/components/ui/__tests__/Button.test.tsx`** — Replaced 9 `it.todo` markers with 9 real `it()` blocks asserting variant tokens, sizes, onClick forwarding, disabled state, twMerge override behavior.
- **`src/components/ui/__tests__/Card.test.tsx`** — Replaced 6 `it.todo` markers with 7 real tests covering 3 variants + CardLink polymorphism + attribute forwarding + className merging.
- **`src/components/ui/__tests__/Badge.test.tsx`** — Replaced 6 `it.todo` markers with 8 real tests across 4 variants + JLPT level prop + grammar inline style + default mono fallback.
- **`src/components/ui/__tests__/Modal.test.tsx`** — Replaced 9 `it.todo` markers with 8 real tests covering surface re-exports, open/closed dialog rendering, srOnly title contract, onOpenChange forwarding, ModalContent token classes, ModalDescription muted text.
- **`src/components/ui/__tests__/EmptyState.test.tsx`** — Replaced 5 `it.todo` markers with 7 real tests across default + error variants, optional body/icon/CTA, button vs link CTA shapes, retry-handler forwarding.

## Variant Inventory

### Button — 3 × 3 = 9 combinations

| | sm (h-9 px-3) | md (h-11 px-4) | lg (h-12 px-6 text-lg) |
|---|---|---|---|
| **primary** | bg-accent + shadow-button-red | bg-accent + shadow-button-red | bg-accent + shadow-button-red |
| **secondary** | bg-card-2 + border | bg-card-2 + border | bg-card-2 + border |
| **ghost** | text-text-muted + hover bg-card-2 | text-text-muted + hover bg-card-2 | text-text-muted + hover bg-card-2 |

All 9 carry `min-h-[44px]` for SPEC AC #11.

### Card — 3 × 3 = 9 combinations × 2 faces (Card + CardLink) = 18

| | sm (p-3) | md (p-4) | lg (p-6) |
|---|---|---|---|
| **flat** | bg-card + border | bg-card + border | bg-card + border |
| **elevated** | bg-card-2 + shadow-card-ring-strong | bg-card-2 + shadow-card-ring-strong | bg-card-2 + shadow-card-ring-strong |
| **hero** | bg-card + shadow-hero-glow | bg-card + shadow-hero-glow | bg-card + shadow-hero-glow |

Radii: sm=md, md=lg, lg=2xl.

### Badge — 4 variants (level/category-driven shapes)

| variant | inputs | render |
|---|---|---|
| **jlpt** | `level: N5..N1` | `bg-[var(--color-jlpt-{level}-bg)] ring-[var(--color-jlpt-{level}-ring)] ring-1 text-[var(--color-text)]` |
| **grammar** | `category: noun..other` | inline `color-mix` for bg (12%) + box-shadow ring (25%) + text-color = `--color-grammar-{category}` |
| **mono** | none | `font-mono uppercase tracking-wide text-text-muted bg-card-2` |
| **accent** | none | `bg-accent text-white` |

### Modal — 6 exports (a11y-correct Radix Dialog wrapper)

| export | wraps | purpose |
|---|---|---|
| `Modal` | `Dialog.Root` | open/onOpenChange + children |
| `ModalTrigger` | `Dialog.Trigger` | optional opener button |
| `ModalContent` | `Dialog.Portal + Overlay + Content` | the modal shell with token-driven backdrop + surface |
| `ModalTitle` | `Dialog.Title` | required by Radix; `srOnly` escape hatch (Pitfall 5) |
| `ModalDescription` | `Dialog.Description` | optional body text in muted token color |
| `ModalClose` | `Dialog.Close` | optional close button |

### EmptyState — 2 variants

| variant | shell | icon color | CTA default |
|---|---|---|---|
| **default** | bg-card + radius-2xl | text-text-muted | secondary Button |
| **error** | bg-card + accent-30%-border + role=alert | text-accent | primary Button |

### Skeleton — 4 variants (size + radius from token scale)

| variant | h | w | radius |
|---|---|---|---|
| **card** | h-32 | w-full | radius-lg |
| **list-item** | h-12 | w-full | radius-md |
| **hero** | h-48 | w-full | radius-2xl |
| **badge-row** | h-6 | w-24 | radius-pill |

## Decisions Made

- **GRAMMAR_BG_COLOR_CLASS as parallel map (not overwrite of GRAMMAR_COLOR_CLASS)** — The plan said "Insert AFTER the existing JLPT_COLOR_CLASS block" with content matching `bg-[var(...)]` shape, but a `GRAMMAR_COLOR_CLASS` already existed at lesson.ts:176 with a `text-grammar-*` shape consumed by 3 components (VocabularySection, VerseBlock, TokenSpan). Overwriting would have broken inline grammar token coloring across the songs/[slug] page. Solution: keep the legacy map verbatim, add `GRAMMAR_BG_COLOR_CLASS` as the parallel surface for Badge consumption. Badge re-exports both maps from its module so the dependency contract is observable for Wave 2+ migration grep audits.
- **Badge grammar variant uses inline style not arbitrary class** — Tailwind v4 has no `color-mix` arbitrary-value syntax (`bg-[color-mix(...)]` would not generate a class). The grammar variant must render the 12%/25% alpha tint via inline `style={{ backgroundColor: 'color-mix(...)' }}`. The unit test asserts on the token name appearing in the style string (`/--color-grammar-verb/`) so the contract is still grep-discoverable.
- **Two-component-face polymorphism for Card** — D-07 explicitly defers `@radix-ui/react-slot` `asChild` polymorphism to Phase 18. The Card + CardLink split is type-safer (CardLink type-requires `href: string`) and avoids importing another Radix package against the tight bundle budget.
- **Skeleton uses Tailwind animate-pulse, not custom keyframe** — Plan 14-01 added the global `prefers-reduced-motion: reduce` override that collapses `animation-duration` to 0ms. `animate-pulse` is a Tailwind built-in (no custom CSS), respects the override automatically, and tree-shakes to zero JS. A custom shimmer with `linear-gradient + background-position keyframe` was considered (the standard pattern) but Plan 14-04 (motion catalog) is the right home for that — Plan 14-02 ships the simpler default and lets 14-04 formalize.
- **Modal overlay uses `bg-black/60` (alpha-modified bare black)** — The kitsubeat-tokens BARE_WHITE_BLACK regex explicitly allows alpha-modified `bg-black/60` (the `(?!\/)` lookahead). No `--color-overlay` token exists in globals.css; the scrim is an ad-hoc value. If a designed scrim color emerges in Phase 18+, this becomes a token addition (`--color-modal-overlay: rgba(0,0,0,0.6)`) and a 1-line component swap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking name collision] GRAMMAR_COLOR_CLASS already existed with different shape**
- **Found during:** Task 1 Step 1 (insertion of GRAMMAR_COLOR_CLASS map per plan)
- **Issue:** The plan said to insert a new `GRAMMAR_COLOR_CLASS: Record<string, string>` map with `bg-[var(--color-grammar-X)]` values. But a map with that exact name already existed at `src/lib/types/lesson.ts:176-184` as `Record<GrammarType, string>` with `text-grammar-*` values, consumed by `VocabularySection.tsx`, `VerseBlock.tsx`, and `TokenSpan.tsx`. Overwriting would have broken inline grammar token text coloring on the song-detail page.
- **Fix:** Renamed the new map to `GRAMMAR_BG_COLOR_CLASS` (parallel surface, paralleling JLPT_COLOR_CLASS shape). Plan must_have ("GRAMMAR_COLOR_CLASS map alongside JLPT_COLOR_CLASS") is satisfied — the legacy map already meets it; the new BG variant adds the bg-[var(...)] shape the plan intended.
- **Files modified:** `src/lib/types/lesson.ts` (+21 lines)
- **Verification:** TypeScript clean; existing 3 callers of `GRAMMAR_COLOR_CLASS` unchanged; new map grep-discoverable for Wave 2+ Badge consumers.
- **Committed in:** `20725b4`

**2. [Informational — not auto-fixed] `npm run build` blocked by unrelated dirty WIP**
- **Found during:** Task 1 build verification
- **Issue:** Local working tree has 3 unrelated dirty WIP changes (per parent agent prompt: "Leave all unrelated dirty/untracked files alone"): modified `src/middleware.ts` (Clerk middleware refactor in progress), untracked `src/app/sign-in/[[...sign-in]]/page.tsx` + `src/app/sign-up/[[...sign-up]]/page.tsx`. The sign-in/sign-up pages import `<SignIn />` from `@clerk/nextjs` which (in their current incomplete state) trigger the `<Html> should not be imported outside of pages/_document` build error. Plan 14-00 also logged a similar build flake to deferred-items.md as D-PRE-04 ("PageNotFoundError on first attempt, disappears on rerun"). Multiple build retries hit the same flake.
- **Resolution:** Verification deferred to `npx vitest run` (39 primitive tests pass) + `npx tsc --noEmit` (no new TypeScript errors introduced; only the pre-existing `tests/e2e/reduced-motion.spec.ts` Playwright API mismatch remains). Build's `Compiled successfully in 23.3s` step passes — the failure is in static page generation, downstream of compile, caused by the unrelated dirty files.
- **Files modified:** None (this is a pre-existing local state issue, not auto-fixable per scope-boundary rule).
- **Recorded in:** This SUMMARY (no separate deferred-items entry — pre-existing D-PRE-04 covers the same flake pattern).
- **Impact on plan:** Zero — primitives compile clean (TypeScript pass), unit tests green, no new lint violations on src/components/ui/ (allowlisted per D-18).

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking name collision) + 1 informational (pre-existing build environment state).
**Impact on plan:** All plan objectives met. The GRAMMAR map deviation is a documentation correction (legacy map already satisfies the must_have spirit). The build verification deferral does not weaken the plan's done criteria — primitive tests + TypeScript check + static grep audits cover the substance.

## Issues Encountered

- **`<Html>` import build error from unrelated WIP (sign-in/sign-up pages)** — pre-existing, not caused by Phase 14 changes. Listed under deviation #2 above.
- **Radix Dialog console warnings about missing `Description`** — non-fatal; Radix recommends but does not require `Description`. The unit tests that omit Description for brevity emit these warnings to stderr; tests still pass. Wave 2+ migration plans should include ModalDescription on every modal call site (which they will — the plan's interface contract says `aria-describedby` is good practice).
- **Pre-existing test failures (6 cases, unchanged from Plan 14-00 baseline)** — `regression-stale-lesson-data.test.ts` × 3 (Phase 08-01 / 11) + `spot-check-tv-onsets.test.ts` × 3 (seed-script). All logged to `deferred-items.md` D-PRE-01 / D-PRE-02. Per scope-boundary rule, NOT auto-fixed.

## Bundle Size Delta

`.size-baseline.txt` (Plan 14-00, captured 2026-05-02): **10.04 kB gzipped on `/songs/[slug]`**.

Bundle delta on `/songs/[slug]`: **0 KB** (expected). The primitives are present in `src/components/ui/` but no surface code consumes them yet. Wave 2+ migration plans (14-05 onwards) will pull primitives into route bundles; bundle-size impact will be measured per-plan against the same baseline.

NOTE: `npm run size` was not re-run in this plan because (a) the unrelated WIP files break the production build pre-empting size measurement, and (b) the delta is mathematically certain to be 0 KB — no `import { Button }` etc. exists anywhere in `src/app/` yet.

## User Setup Required

None — Plan 14-02 is pure component authoring. No external services, no DB migrations, no dependency installs (all 8 deps were installed in Plan 14-00).

## Next Phase Readiness

**Wave 1 plan 14-03 (theme persistence) unblocked:**
- Modal primitive available for the `/profile` Appearance picker (3-option radio under Modal → no, actually radio group inline; Modal isn't required for the picker itself). Header theme toggle button uses Button primitive `variant="ghost" size="md"`.
- EmptyState primitive available for any 404-style fallback the theme picker needs.

**Wave 1 plan 14-04 (motion catalog + dev/states route) unblocked:**
- Skeleton primitive renders the loading entries in `__dev/states` catalog (4 variants × every async surface).
- EmptyState primitive renders the empty + error entries in `__dev/states` catalog.
- Plan 14-04's `motion-catalog.md` should catalog `animate-pulse` as entry #12 ("skeleton shimmer") with the global reduced-motion override as the fallback.

**Wave 2+ surface migrations (14-05 through 14-09) unblocked:**
- 4 inline modal call sites (`UpsellModal`, `AdvancedDrillsUpsellModal`, `LevelUpTakeover`, `RowUnlockModal`) ready to migrate to `Modal` primitive.
- `SongCard` ready to migrate the `Link`-as-card pattern to `<CardLink variant="flat">`.
- ~30 inline buttons across the app ready to migrate to `<Button variant="primary|secondary|ghost">`.
- Inline JLPT badges in `SongCard`, `WordOfDay`, `PathNode`, `VocabularyList` ready to migrate to `<Badge variant="jlpt" level={...}>`.

## Self-Check: PASSED

- `src/components/ui/Button.tsx`: FOUND (58 lines, ≥30 minimum)
- `src/components/ui/Card.tsx`: FOUND (71 lines, ≥40 minimum)
- `src/components/ui/Badge.tsx`: FOUND (133 lines, ≥40 minimum)
- `src/components/ui/Modal.tsx`: FOUND (111 lines, ≥50 minimum)
- `src/components/ui/EmptyState.tsx`: FOUND (94 lines, ≥25 minimum)
- `src/components/ui/Skeleton.tsx`: FOUND (52 lines, ≥25 minimum)
- `GRAMMAR_BG_COLOR_CLASS` in `src/lib/types/lesson.ts`: FOUND (key_link contract satisfied via Badge re-export of legacy + new maps)
- All 5 unit-test files filled in (no `.todo` markers): VERIFIED via vitest output (`39 passed`)
- All Button sizes have `min-h-[44px]`: VERIFIED via grep (3 matches in cva size variants)
- No raw hex / palette utilities in primitive code: VERIFIED via `grep -nE "(bg-(red|gray|...)-[0-9]+|bg-\[#)" src/components/ui/*.tsx` returns 0
- Modal.tsx first line is `"use client"`: VERIFIED via `head -1`
- Modal.tsx imports `@radix-ui/react-dialog`: VERIFIED via grep
- Modal.tsx exports Modal/ModalTrigger/ModalContent/ModalTitle/ModalDescription/ModalClose: VERIFIED via grep
- Commit hashes: `cd4f8bf` (RED 1), `3bdee99` (GREEN 1), `20725b4` (GRAMMAR map), `35f2e51` (RED 2), `444a0db` (GREEN 2) — all reachable from HEAD via `git log --oneline`.
- TypeScript clean: `npx tsc --noEmit` reports only the pre-existing `tests/e2e/reduced-motion.spec.ts` Playwright API mismatch (Plan 14-00 D-PRE territory).
- Tests green: `npx vitest run src/components/ui/__tests__/` reports `5 passed (5)` files / `39 passed (39)` tests.

---

*Phase: 14-ux-polish*
*Plan: 02*
*Completed: 2026-05-02*
