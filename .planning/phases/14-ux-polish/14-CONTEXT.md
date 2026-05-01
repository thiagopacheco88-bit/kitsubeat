# Phase 14: UX Polish — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate every learner-facing surface in KitsuBeat (11 surfaces) onto a single tokenized design system in two colorways (dark + light), backed by shared primitives (Button/Card/Badge/Modal), a 12-entry motion catalog with `prefers-reduced-motion` fallbacks, designed empty/loading/error states for the 7 async surfaces, mobile parity at ≥390px viewport, an a11y floor (Lighthouse a11y ≥95, axe zero serious/critical), theme switching with persistence — all enforced by a CI token-compliance lint gate.

This phase delivers **visual polish on a frozen IA**. No new features ship. No route, nav, tab, or copy structure changes. The information architecture is held constant so visual changes can be verified independently.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked.** See [`14-SPEC.md`](./14-SPEC.md) for full requirements, boundaries, and 21 acceptance criteria.

Downstream agents (researcher / planner / executor) **MUST read [`14-SPEC.md`](./14-SPEC.md) before planning or implementing.** Requirements, the full token spec (Appendix A), the brand inputs, and the Claude Design briefing are not duplicated here.

**In scope (from SPEC.md):**

11 learner-facing surfaces — `/`, `/songs`, `/anime-list`, `/songs/[slug]`, `/kana`, `/kana/session`, `/kana/session/summary`, `/path`, `/vocabulary`, `/review` (+ children), `/profile`. Cross-cutting: design tokens (CSS vars, dark + light, exposed to Tailwind v4 `@theme`); component primitives (Button, Card, Badge, Modal in `src/components/ui/`); 12-entry motion catalog with reduced-motion fallbacks; 24 designed empty/loading/error states; token-compliance ESLint rule + grep audit + CI gate; mobile parity Playwright spec; a11y Playwright spec (axe-core); theme persistence (DB for authed, localStorage for guests); updated `globals.css` and `layout.tsx`; `docs/motion-catalog.md`.

**Out of scope (from SPEC.md):**

`/admin/timing` (operator surface), `/dashboard` (likely deprecated stub); `error.tsx` / `global-error.tsx` get token migration only (no redesign); IA / route structure / nav labels / tab names / copy all FROZEN; new features; Phase 13 Lighthouse score remediation (deferred to Phase 19 entry gate); full WCAG 2.1 AA audit (Phase 18); push notifications, native shells, PWA polish; new animation libraries beyond CSS + `canvas-confetti` (this is a discuss-phase decision — see D-12); custom icon set redrawing.

</spec_lock>

<decisions>
## Implementation Decisions

Discussion mode: user accepted recommended defaults across all 4 selected gray areas. Each decision is grounded in SPEC constraints (bundle budget from Phase 13, three-layer test discipline, the Tailwind v4 `@theme` mechanism), not invented from scratch.

### Token Implementation (Requirement 1)

- **D-01 — Token mechanism: Tailwind v4 `@theme` block + `[data-theme="light"]` override.** Add color/typography/spacing/radii/shadow/motion tokens to the existing `@theme` block in `src/app/globals.css` for the dark default. Add a `:root[data-theme="light"]` block that re-defines the colorway-dependent tokens (color + shadow recipes) — typography, spacing, radii, motion are theme-independent and stay in `@theme`. Reject class-based theming (Tailwind v3 idiom, doesn't compose with v4 `@theme`); reject separate stylesheets (loses Tailwind utility class generation).

- **D-02 — Theme attribute: `data-theme` on `<html>`.** SPEC-locked. The attribute is set by an inline blocking script in `layout.tsx` BEFORE the body renders (zero-flash, see D-08). All token consumers read via Tailwind utilities or `var(--token-name)` — never via class-conditional logic.

- **D-03 — Light theme color values: derived from SPEC Appendix A.2 contrast targets, not free-designed.** SPEC names the floor (warm off-white bg, near-black text ≥4.5:1, slate borders, same `#ef4444` accent verified for AA on light bg). Concrete values for Phase 14: `--color-bg: #FAFAF9`, `--color-bg-2: #F4F4F2`, `--color-card: #FFFFFF`, `--color-card-2: #FAFAF9`, `--color-border: rgba(0,0,0,0.08)`, `--color-border-strong: rgba(0,0,0,0.14)`, `--color-text: #18181B`, `--color-text-muted: rgba(24,24,27,0.62)`, `--color-text-dim: rgba(24,24,27,0.45)`. Every value gets a contrast check before merge (per req 8 acceptance: axe runs on all in-scope routes in both themes). Grammar + JLPT colors stay identical across themes (badge backgrounds use 12% alpha tint of the base color — works on both bg).

- **D-04 — Light shadow recipes: 30% higher opacity than dark variants.** Per SPEC §A.6 explicit guidance. Concretely: `--shadow-card-ring` swaps to `inset 0 0 0 1px rgba(0,0,0,0.08)`; `--shadow-button-red` rises from 0.45 → 0.55 alpha on the red glow; `--shadow-hero-glow` red opacity stays (red on light still reads). Specific values are computed in the wave-1 plan; this decision locks the policy.

### Component Primitives (Requirement 3)

- **D-05 — Primitives API: class-variance-authority + tailwind-merge + clsx.** Hand-rolled variant switches accumulate bugs and don't type-narrow `props.variant`. CVA gives type-safe variant declaration with compile-time exhaustiveness checking. Bundle cost: ~3KB total gzipped — well within the 50KB page budget. Replaces ad-hoc `className={\`base ${variant === 'primary' ? 'red' : 'gray'}\`}` patterns. Reject Stitches / vanilla-extract (CSS-in-JS at runtime, defeats Tailwind v4); reject hand-rolled (loses type safety and is what we're migrating away from).

- **D-06 — Modal primitive substrate: Radix Dialog.** Modal a11y is hard to get right (focus trap, ESC, scroll lock, aria-modal, restore focus on close, portal). Radix Dialog ships all of it correctly, tree-shakes to ~5KB gzipped, and is unstyled (we apply token-driven styles). Wrap it as `src/components/ui/Modal.tsx` exposing our own variant API (no Radix surface area leaks into consumers). Reject custom focus-trap (every project re-invents it badly); reject Headless UI (heavier, less tree-shakeable).

- **D-07 — Button / Card / Badge: zero JS deps beyond CVA.** No Radix wrappers for these — they're presentational, and Radix's `@radix-ui/react-slot` for polymorphic `asChild` is nice-to-have but adds complexity. Variants:
  - **Button:** `primary | secondary | ghost`; `sm | md | lg`. `asChild` polymorphism deferred to Phase 18 if needed.
  - **Card:** `flat | elevated | hero`. Hero variant gets the red-glow shadow recipe.
  - **Badge:** `jlpt | grammar | mono | accent`. JLPT/grammar variants accept a level/category prop and map to the existing `--color-jlpt-*` / `--color-grammar-*` tokens (12% alpha bg, 25% alpha ring per SPEC §A.2).

### Theme Persistence + Toggle UX (Requirement 9)

- **D-08 — Persistence: DB column for authed users + cookie + localStorage fallback.** Add `users.theme_preference: text("theme_preference")` enum-like column with three values: `'system' | 'light' | 'dark'` (default `'system'`). Column also written to a `kb_theme` cookie on save (1-year expiry, SameSite=Lax, not HttpOnly — readable from client for instant toggle without server round-trip). Guest users only get the cookie. localStorage is NOT used — cookie is SSR-readable, localStorage is not, and we need SSR-readable to set `data-theme` server-side. See D-09 for the no-flash mechanism.

- **D-09 — Zero-flash mechanism: cookie read at SSR + small inline script as belt-and-suspenders.** `layout.tsx` reads the `kb_theme` cookie via `next/headers cookies()` and sets `<html data-theme={resolved}>` server-side. For the `'system'` case (where SSR can't know the user's `prefers-color-scheme`), an inline `<script>` runs as the first thing in `<head>` and reads `window.matchMedia('(prefers-color-scheme: dark)')` to set `data-theme` BEFORE first paint. Inline script is ~200 bytes minified. Reject: client-only theme provider with `useEffect` (causes flash); reject `next-themes` (~2KB + adds a context provider re-render churn we don't need; it solves a problem we're solving in 200 bytes).

- **D-10 — Toggle UX: BOTH `/profile` and header.** SPEC says `/profile` is the floor and leaves header as TBD. Header gives one-click access from anywhere — better UX for a setting users do flip. Profile gets a 3-option radio group (System / Light / Dark) under "Appearance". Header gets a compact sun/moon icon button that cycles through the 3 states with optimistic update (writes cookie immediately, fires server action async; if server fails, surfaces a small toast and reverts). The two surfaces stay in sync via cookie as the source of truth.

- **D-11 — Schema migration: hand-written SQL, idempotent.** Per Phase 11.4 D-01 (schema drift in `songs.popularity_rank` makes `db:generate` unsafe), all migrations are hand-written. New file: `drizzle/0015_user_theme_preference.sql` with `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system';`. Add a CHECK constraint to lock the enum: `CHECK (theme_preference IN ('system','light','dark'))`. Apply via `tsx scripts/apply-migrations.ts` (Phase 11.4 Path A pattern). Drizzle schema TS prop: `themePreference: text("theme_preference").notNull().default("system")` — matches Phase 12 camelCase-prop / snake_case-column convention.

### Motion Catalog (Requirement 6)

- **D-12 — Motion library: NONE. Pure CSS keyframes + transitions.** Bundle budget is 50KB on `/songs/[slug]` and Phase 13 baseline is ~40KB gzipped. Framer Motion (~30KB) blows the budget. The `motion` package (~5KB) eats most of the remaining headroom for a feature CSS handles natively. The 12-entry SPEC catalog (verse-highlight pulse, star-earn shine, correct/wrong feedback, level-up takeover, confetti, page-transition fade, hover lift, modal enter/exit, toast slide-in, skeleton shimmer) is fully expressible in `@keyframes` + token-driven `transition` properties. `canvas-confetti` stays — it's already dynamic-imported (Phase 10 pattern, ~3KB out of First Load JS).

- **D-13 — Reduced-motion enforcement: single `@media` block + CI grep gate.** `globals.css` ends with `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0ms !important; animation-iteration-count: 1 !important; transition-duration: 0ms !important; scroll-behavior: auto !important; } }`. This nukes every cataloged animation. Confetti is suppressed via `if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)` guard at every fire site. Add a grep audit to `scripts/audit/token-compliance.ts`: any `animation:` / `transition:` declaration in component code (not in `globals.css`) is a violation — keeps motion centralized in tokens.

- **D-14 — Catalog format: `docs/motion-catalog.md` is the source of truth.** SPEC AC #11 requires this file with 5 fields per entry (trigger / duration / easing / target / reduced-motion fallback). Implementations reference catalog entries by name in component code comments (e.g., `/* motion-catalog: hover-lift-card */`) so the link from impl → spec → docs is greppable.

### State-Demo Strategy (Requirement 7)

- **D-15 — Demo route: `/__dev/states` catalog page, gated `notFound()` in production.** Single Next route at `src/app/__dev/states/page.tsx`. First line of the page component checks `process.env.NEXT_PUBLIC_APP_ENV === 'production'` and calls `notFound()` if so — no prod-bundle leak. The page renders every async surface × {empty, loading, error} as a flat grid, each in an iframe-like container with the surface's own component rendered against mock props. Reject Storybook (Tailwind v4 + Storybook 8 wiring is days of yak-shaving for a one-shot phase, plus a separate dev runner we don't have); reject `?state=empty|loading|error` URL param (scatters demo logic across every prod component, requires every component to handle a "fake" mode).

- **D-16 — State component composition: shared shells in `src/components/ui/`, surface-specific composition.** Build `src/components/ui/EmptyState.tsx` (icon + heading + body + optional CTA props) and `src/components/ui/Skeleton.tsx` (variants for: card, list-item, hero, badge-row). Per-surface variants compose those shells — e.g., `<VocabularyEmptyState />` uses `<EmptyState>` with vocab-specific copy + an icon + a "Browse songs" CTA. Error states reuse `EmptyState` with an "error" variant prop that shows a retry button. 24 states total = 7 surfaces × 3 states + 3 (because `/songs/[slug]` has Lesson + Practice + Drills tabs that each need their own loading state).

### Lint + CI Enforcement (Requirement 2)

- **D-17 — Two enforcement layers: custom ESLint rule + `scripts/audit/token-compliance.ts` grep.** Both wired into `pr-checks.yml` (extending the workflow Phase 13 already touched). The ESLint rule blocks raw hex / arbitrary px / Tailwind palette utilities at lint time (fast, IDE-integrated, in-editor squiggles). The grep audit runs as a separate CI step and catches edge cases the ESLint rule misses (e.g., hex inside template literals, hex inside `tailwind.config.ts` extension blocks if any). Reject `eslint-plugin-tailwindcss` (slow, overly broad, configures per-project anyway — we'd write the same rules from scratch); reject grep-only (no IDE feedback).

- **D-18 — Allowlist: `src/components/ui/`, `src/app/admin/`, `src/app/__dev/`, `src/app/error.tsx`, `src/app/global-error.tsx`, `globals.css`.** Token grammar lives in `globals.css` (must use raw values to define tokens). `src/components/ui/` may use raw values inside CVA variant maps as a backstop, but PR review enforces "tokens-only" intent — the lint rule allows the file pattern but the human reviewer enforces the spirit. Admin tooling and dev catalog are operator-facing and pre-declared out-of-scope per SPEC. `error.tsx` / `global-error.tsx` are framework fallbacks — token migration only, allowed to fall back to bare-CSS if a token system fails to load.

### Claude Design Cadence + Untracked Zips (Requirement 4)

- **D-19 — First action of phase 14: triage `Kitsubeat Design.zip` and `Kitsubeat Design (1).zip`.** Both files are sitting untracked in repo root as of context-gathering. Action: extract both to `tmp/design-triage/` (gitignored), inspect contents, decide:
  1. If the zips contain Claude Design output for the missing 10 surfaces → import to `design_handoff_phase14/` with subfolders per surface (per SPEC AC #5 storage convention). Commit via a separate `chore(phase-14): import claude design handoffs` commit — these are content, not code.
  2. If the zips are stale / wrong / duplicate of `design_handoff_kitsubeat_home/` → delete or move to a personal scratch dir, do NOT import.
  3. If the zips are in-progress / partial → import the complete surfaces only, log the missing ones, request fresh Claude Design output for the gaps.
  Triage happens in **plan-phase**, not in execution — the plan must answer "do we have N surfaces of design or M" before sequencing.

- **D-20 — Wave 1: tokens + primitives ship FIRST, design-independent.** Token spec is fully locked in SPEC §Appendix A for dark; light theme tokens computed per D-03. Primitives (Button/Card/Badge/Modal) consume tokens only and render correctly without any surface design — they're verifiable via the `__dev/states` route and component unit tests. Wave 1 has zero dependency on Claude Design output for surfaces 2–11. This unblocks waves 2+ even if some surface designs are incomplete.

- **D-21 — Wave 2+: per-surface migrations interleave with Claude Design.** Each in-scope surface gets its own migration plan (`14-NN-PLAN.md` per surface). Sequencing prioritizes (a) surfaces where home design already covers the visual language (home itself ships first — SPEC AC #5 already has its design), (b) surfaces with the most ad-hoc primitive reimplementations (song page, profile, modals from kana flow) so primitives get exercised hardest early, (c) surfaces with the most async-state coverage to land empty/loading/error work alongside. Suggested order: `/songs/[slug]` → `/` → `/songs` → `/review` → `/vocabulary` → `/profile` → `/kana` (×3) → `/path` → `/anime-list`. Planner can re-order based on Claude Design availability.

- **D-22 — Surface-design-blocked migrations: token-only swap is allowed if Claude Design output for that surface is missing at execution time.** Replace raw hex / Tailwind palette utilities with token references. Keep layout untouched. This satisfies the lint gate (req 2) and bundle budget (Phase 13 D-09) without needing a design. Mark these surfaces in `14-VERIFICATION.md` as "token-migrated, design-pending" — they can ship to prod and get a Phase 14.1 follow-up if Claude Design output lands later. The phase merge is NOT blocked on full design coverage; it IS blocked on full token coverage.

### Carried Forward From Earlier Phases / SPEC

- **D-23 — Bundle budget intact (Phase 13 D-09).** `size-limit` gate at 50KB gzipped on `/songs/[slug]` MUST stay green on the phase merge commit. SPEC AC #21 reaffirms this. Every dep added in Phase 14 is judged against this budget: CVA + tailwind-merge + clsx ≈ 3KB ✓; Radix Dialog ≈ 5KB ✓; total new dep budget ≈ 8KB on a route currently ~40KB → leaves ~2KB headroom. Tight. Any further dep needs justification.

- **D-24 — Three-layer test discipline (Phase 13 D-18).** Every code change verified in the appropriate layer before reported done. Token migrations: visual diff via `__dev/states` route + unit tests for the affected component. Primitives: Vitest + Testing Library unit tests covering every variant. Theme switch: integration test (cookie write → SSR `data-theme` round-trip). Mobile parity + a11y: Playwright E2E (`mobile-parity.spec.ts`, `a11y.spec.ts` per SPEC). `npm run build` passing alone is INSUFFICIENT.

- **D-25 — Test-only state gating (Phase 13 D-20).** `NEXT_PUBLIC_APP_ENV === 'test'` for any test-only hooks. Phase 14 doesn't add test-only state; reaffirming the rule for the `__dev/states` route gate (D-15 uses `!== 'production'` which is the inverse — the dev route is visible in `development` and `test` envs, hidden in `production`).

- **D-26 — Hand-written migrations (Phase 11.4 D-01).** Schema drift in `songs.popularity_rank` makes `db:generate` unsafe. New `users.theme_preference` column ships via `drizzle/0015_user_theme_preference.sql` per the established pattern (D-11).

- **D-27 — Phase 12 HUD is baseline, NOT a regression target.** XP bar, streak pill, level-up takeover all stay. Their visual treatment moves onto tokens. `star-shine` and `level-pop` keyframes already in `globals.css` (lines 43–60) get retained but added to the motion catalog (D-14) with their existing durations/easings; reduced-motion fallback added per D-13.

- **D-28 — Phase 12 cosmetic system unchanged.** `user_cosmetics` schema, slot types (`avatar_border`, `color_theme`, `badge`), and the existing reward-slot logic stay. The `color_theme` cosmetic slot is for in-game cosmetics (avatar accent), NOT the same axis as light/dark theme switching (D-08). Naming-collision risk acknowledged — surface naming in profile UI must distinguish them ("Appearance" for light/dark, "Avatar theme" for cosmetic).

- **D-29 — Sequencing: Phase 14 ships before Phase 19 entry gate.** Phase 19 measures Lighthouse perf ≥85 against the polished UI. Polish must land first; Phase 14 must NOT regress the bundle (`size-limit` stays green per D-23) but is NOT on the hook for LCP/TTI numbers themselves (Phase 19 entry gate). Phase 14 IS on the hook for Lighthouse a11y ≥95 (per req 8).

### Claude's Discretion

- **Self-host Noto Sans JP:** Skip for now — keep Google Fonts CDN. Phase 19 entry gate measures LCP; if LCP regresses we self-host then. Saves ~150KB repo bloat for a measurement we haven't yet run. Planner: do NOT add Noto woff2 files in this phase.
- **Modal portal target:** Default to `<body>`. Planner picks if a different portal makes sense for nested modals (unlikely in this app).
- **Skeleton shimmer animation:** CSS `linear-gradient` with `background-position` keyframe (the standard pattern). Planner picks the exact gradient stops.
- **Header theme toggle icon set:** Use existing inline SVG / Lucide imports (SPEC out-of-scope says no custom icon set). Planner picks sun/moon icons.
- **Tablet (768–1279px) scaling:** Per SPEC, tablet is "graceful scale" of the desktop design — no separate design pass. Planner can use Tailwind `md:` breakpoints to adapt.
- **`__dev/states` page styling:** Functional, not designed. Planner picks a flat list-of-cards layout that's readable, no need to be polished — it's an internal review surface.

### Folded Todos

(None — `gsd-sdk query todo.match-phase 14` returned 0 matches.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 14 artifacts
- [`.planning/phases/14-ux-polish/14-SPEC.md`](./14-SPEC.md) — **Locked requirements (9), boundaries, 21 acceptance criteria, full token spec in Appendix A, Claude Design briefing.** Read first. This is THE source of truth for WHAT.
- [`design_handoff_kitsubeat_home/`](../../../design_handoff_kitsubeat_home/) — Mobile (390×844, dark) home design. Already-imported reference design.
- [`design_handoff_kitsubeat_web/design_handoff_kitsubeat_desktop/`](../../../design_handoff_kitsubeat_web/) — Desktop (1280px, dark) home design. Already-imported reference design.
- `Kitsubeat Design.zip`, `Kitsubeat Design (1).zip` (repo root, untracked) — **Triage in plan-phase per D-19.** May contain the missing 10-surface designs.

### Token surface
- [`src/app/globals.css`](../../../src/app/globals.css) — Currently has only grammar + JLPT colors in `@theme` (lines 7–21) plus `star-shine` (43–50) and `level-pop` (52–60) keyframes. Phase 14 expands `@theme` per SPEC §A and adds `[data-theme="light"]` override.
- [`src/app/layout.tsx`](../../../src/app/layout.tsx) — Currently sets `bg-gray-950` hard-coded. Phase 14 wires the `data-theme` attribute (D-09) and removes the hard-coded class.

### Primitives surface
- `src/components/ui/` — **Does not exist yet.** Created in wave 1 with `Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, `EmptyState.tsx`, `Skeleton.tsx`.
- Existing inline-implemented modals to migrate: [`src/app/components/AdvancedDrillsUpsellModal.tsx`](../../../src/app/components/AdvancedDrillsUpsellModal.tsx), [`src/app/components/UpsellModal.tsx`](../../../src/app/components/UpsellModal.tsx), [`src/app/components/LevelUpTakeover.tsx`](../../../src/app/components/LevelUpTakeover.tsx), [`src/app/kana/components/RowUnlockModal.tsx`](../../../src/app/kana/components/RowUnlockModal.tsx).
- Existing badge reimplementations to consolidate: search for JLPT badges in `SongCard`, `WordOfDay`, `PathNode`, kana row indicators.

### Theme persistence surface
- [`src/lib/db/schema.ts`](../../../src/lib/db/schema.ts) §`users` (line ~291) — Add `themePreference: text("theme_preference").notNull().default("system")` per D-11. Naming follows Phase 12 convention (camelCase TS prop, snake_case DB column).
- `drizzle/0015_user_theme_preference.sql` — **Does not exist yet.** Hand-written migration per D-26 / Phase 11.4 D-01 pattern. Reference: [`drizzle/0014_vocab_image_url.sql`](../../../drizzle/0014_vocab_image_url.sql).
- [`scripts/apply-migrations.ts`](../../../scripts/apply-migrations.ts) — Migration runner (Phase 11.4 Path A).

### Lint / CI surface
- `.eslintrc` / `eslint.config.*` (verify in plan-phase which form Next 15 uses) — Custom rule lands here per D-17.
- `scripts/audit/token-compliance.ts` — **Does not exist yet.** New script per req 2. Reference patterns: [`scripts/audit/conjugation-form-coverage.ts`](../../../scripts/audit/conjugation-form-coverage.ts), [`scripts/audit/verse-token-distribution.ts`](../../../scripts/audit/verse-token-distribution.ts).
- [`.github/workflows/qa-suite.yml`](../../../.github/workflows/qa-suite.yml) — Extend `pr-checks` job per Phase 13 D-13 pattern. Add `npm run lint` (already there?) + `npx tsx scripts/audit/token-compliance.ts` steps.
- `package.json` — New devDeps: `class-variance-authority`, `tailwind-merge`, `clsx`, `@radix-ui/react-dialog`, `@axe-core/playwright`. Maybe ESLint plugin scaffolding (no `eslint-plugin-tailwindcss`).

### Motion surface
- [`src/app/globals.css`](../../../src/app/globals.css) — Existing `@keyframes star-shine` (43), `@keyframes level-pop` (53). Catalog them in `docs/motion-catalog.md` per D-14. Add the `prefers-reduced-motion` global override per D-13 at file end.
- `docs/motion-catalog.md` — **Does not exist yet.** Created per req 6 / D-14.
- `canvas-confetti` usages — `LevelUpTakeover.tsx` line ~39, `RowUnlockModal.tsx` line ~14, `StarDisplay.tsx` line ~36 (per Phase 13 RESEARCH.md). Add `prefers-reduced-motion` guard at each fire site per D-13.

### State-demo surface
- `src/app/__dev/states/page.tsx` — **Does not exist yet.** Created per D-15. Gate first line: `if (process.env.NEXT_PUBLIC_APP_ENV === 'production') notFound();`.

### Test surface
- [`tests/e2e/`](../../../tests/e2e/) — Phase 08.1 Playwright setup. Phase 14 adds `mobile-parity.spec.ts` and `a11y.spec.ts` per SPEC AC #11/#13.
- [`tests/integration/`](../../../tests/integration/) — Vitest integration setup. Phase 14 adds theme persistence integration test.
- [`playwright.config.ts`](../../../playwright.config.ts) — Verify viewport + project setup; mobile-parity spec needs `viewport: { width: 390, height: 844 }`.

### Project / milestone context
- [`.planning/PROJECT.md`](../../PROJECT.md) — KitsuBeat product context; tone (warm, anime-coded, not childish) and audience (beginner-to-intermediate JP learners, JLPT N5–N3 primary) inform design judgment calls in Claude Design output (SPEC §A.10).
- [`.planning/REQUIREMENTS.md`](../../REQUIREMENTS.md) — Catalog of v2.0 requirements; none directly mapped to Phase 14 (Phase 14 is cross-cutting polish, not a feature row).
- [`.planning/ROADMAP.md`](../../ROADMAP.md) §Phase 14, §Phase 15, §Phase 19 — Phase boundaries; Phase 19 entry gate consumes the polished surfaces.
- [`.planning/phases/13-performance-infrastructure/13-CONTEXT.md`](../13-performance-infrastructure/13-CONTEXT.md) — D-09 (size-limit budget), D-18 (three-layer test discipline), D-20 (test-only state gating), D-22 (Phase 13 ships before Phase 14), D-23 (CI hard-fail). All carry forward.
- [`.planning/phases/13-performance-infrastructure/13-SPEC.md`](../13-performance-infrastructure/13-SPEC.md) — Phase 13's deferral of Lighthouse measurement to Phase 19 (the basis for D-29).
- [`.planning/phases/12-learning-path-and-gamification/12-CONTEXT.md`](../12-learning-path-and-gamification/12-CONTEXT.md) — XP/streak/level system; cosmetic schema (D-28 collision note).
- [`.planning/phases/11.4-visual-vocabulary-foundation/11.4-CONTEXT.md`](../11.4-visual-vocabulary-foundation/11.4-CONTEXT.md) — D-01 schema drift on `songs.popularity_rank` makes `db:generate` unsafe; reaffirmed in D-26 here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`@theme` block in `globals.css`** — Tailwind v4 idiom already in use. Grammar + JLPT color tokens already defined; expand the same block for the rest of the system.
- **Existing `star-shine` and `level-pop` keyframes** — Phase 12 motion that survives the migration. Catalog them; don't rewrite.
- **`canvas-confetti` dynamic-import pattern** (3 call sites) — Phase 10 / 12 standard for keeping heavy deps out of First Load JS. Re-use the pattern; don't change the lib.
- **`size-limit` is already wired** (Phase 13 D-09) — `npm run size` works today; CI gate exists. Phase 14 just keeps it green.
- **`drizzle/` migration pattern** (`0014_vocab_image_url.sql` is the most recent example) — `ADD COLUMN IF NOT EXISTS`, applied via `tsx scripts/apply-migrations.ts`. Reuse for D-11.
- **Phase 12 user-prefs convention** — `users` table has `soundEnabled`, `hapticsEnabled`, `currentPathNodeSlug` (camelCase TS / snake_case DB). `themePreference` follows the same convention.
- **`PlayerProvider key={activeType}` remount pattern** — Phase 13 D-19 carries forward. Theme switch on the song page must NOT remount the player (the user is mid-listen).

### Established Patterns

- **`force-dynamic` on most routes** — Phase 13 only converted `/songs/[slug]`. Other routes still SSR every request. Theme switch via `data-theme` works under both static and dynamic rendering.
- **Server actions for user-pref writes** — Phase 12 wired `setSoundEnabled`, `setHapticsEnabled` server actions. `setThemePreference` follows the same shape.
- **Three-layer test discipline** (Phase 13 D-18) — Unit / integration / E2E. Phase 14 needs all three layers exercised.
- **Test-only state gated on `NEXT_PUBLIC_APP_ENV === 'test'`** (Phase 13 D-20) — Pattern preserved.
- **Phase 11.4 hand-written migrations** — `db:generate` blocked by upstream schema drift; hand-write SQL.
- **Conventional Commits** — Phase commits follow `feat(14): …`, `chore(14): …`, `test(14): …` prefixes.
- **Inline modals everywhere** — Every existing modal reimplements the shell. This is THE pattern Phase 14 dismantles.

### Integration Points

- **`globals.css`** — Token expansion (D-01), light theme block (D-01), `prefers-reduced-motion` global override (D-13).
- **`layout.tsx`** — `data-theme` SSR + inline script (D-09); remove hard-coded `bg-gray-950`; add header with theme toggle (D-10).
- **`src/lib/db/schema.ts`** — `themePreference` column (D-11); regenerate types via `drizzle-kit` types-only command if available, or accept TS-side updates manually.
- **`src/components/ui/` (new)** — `Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, `EmptyState.tsx`, `Skeleton.tsx`. Per-variant unit tests.
- **`pr-checks.yml` extension** — Add lint + token-audit steps. Reuse existing checkout + npm cache.
- **`src/app/__dev/states/page.tsx` (new)** — Catalog route per D-15.
- **24+ existing modal/badge/button call sites** — Each migrated to the new primitives. Sequenced per D-21.

### Bundle Budget (Phase 13 baseline, 2026-04-24)

| Route | Route-specific | First Load JS | Gzipped (est.) |
|---|---:|---:|---:|
| `/` | 174 B | 111 KB | ~38 KB |
| `/songs` | 128 B | 130 KB | ~46 KB |
| `/songs/[slug]` | 9.59 KB | 116 KB | ~40 KB |
| Shared chunks | — | 102 KB | ~36 KB |

Phase 14 dep budget on `/songs/[slug]`: ~50 KB gate − ~40 KB current = **~10 KB headroom**. CVA + tailwind-merge + clsx ≈ 3 KB; Radix Dialog ≈ 5 KB tree-shaken. Total ≈ 8 KB. Leaves ~2 KB margin. Tight — no third primitives lib without explicit budget revisit.

</code_context>

<specifics>
## Specific Ideas

- **Theme cookie name:** `kb_theme`. Three values: `system`, `light`, `dark`. SameSite=Lax, 1-year expiry, NOT HttpOnly (client must read for instant toggle).

- **Inline no-flash script (D-09 illustrative):**
  ```html
  <script dangerouslySetInnerHTML={{ __html: `
    (function() {
      try {
        var p = document.cookie.match(/kb_theme=(system|light|dark)/);
        var v = p ? p[1] : 'system';
        if (v === 'system') v = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', v);
      } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
    })();
  `}} />
  ```
  Lives as the FIRST child of `<head>`. ~250 bytes after minification.

- **`__dev/states` route gate (D-15 illustrative):**
  ```ts
  import { notFound } from 'next/navigation';
  export default function DevStatesPage() {
    if (process.env.NEXT_PUBLIC_APP_ENV === 'production') notFound();
    return ( /* catalog grid of every async surface × {empty, loading, error} */ );
  }
  ```

- **CVA primitive shape (D-05 illustrative for Button):**
  ```ts
  import { cva, type VariantProps } from 'class-variance-authority';
  import { twMerge } from 'tailwind-merge';
  import clsx from 'clsx';
  const button = cva(['inline-flex items-center justify-center font-semibold transition'], {
    variants: {
      variant: { primary: 'bg-accent text-white shadow-button-red', secondary: '…', ghost: '…' },
      size: { sm: 'h-9 px-3 rounded-sm text-sm', md: 'h-11 px-4 rounded-md', lg: 'h-12 px-6 rounded-lg text-lg' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  });
  ```

- **Radix Dialog wrapping (D-06):** Re-export only what Modal consumers need — `<Modal>`, `<Modal.Trigger>`, `<Modal.Content>`, `<Modal.Title>`, `<Modal.Description>`, `<Modal.Close>`. Hide `Portal`, `Overlay`, `Root` behind the wrapper. Single styled overlay (`bg-black/60 backdrop-blur-sm`) and content shell consumed by every modal in the app.

- **Dark/light contrast targets per SPEC:**
  - Body text on body bg: ≥4.5:1 (AA)
  - Large text (≥18px or ≥14px bold) on body bg: ≥3:1 (AA)
  - Visible focus indicator on every interactive element (req 8)
  - Lighthouse a11y ≥95 per surface (req 8)

- **The `Kitsubeat Design.zip` and `Kitsubeat Design (1).zip` files are user-provided.** Do not delete them or commit them as-is until Phase 14 plan-phase explicitly triages them per D-19. They are likely the missing 10-surface Claude Design output.

</specifics>

<deferred>
## Deferred Ideas

- **Polymorphic `<Button asChild>` via `@radix-ui/react-slot`** — Nice-to-have for `<Link>`-as-button patterns. Not needed for Phase 14; revisit if surface migration finds a real need. Phase 18 candidate.
- **Self-hosted Noto Sans JP** — ~150KB woff2 in repo for an LCP win we haven't measured. Defer until Phase 19 entry gate measures and (if) finds CDN-fonts to be the bottleneck.
- **Per-route bundle budgets for `/`, `/songs`, `/path`, `/vocabulary`, `/review`, `/kana`** — Phase 13 D-12 deferred; Phase 19 entry gate adds budgets for `/` and `/songs` when the gate runs.
- **Custom icon set redrawing** — SPEC out-of-scope. Existing inline SVGs + Lucide imports stay.
- **Animation library** (Framer Motion / motion) — Bundle budget incompatible (D-12). If a future phase ships features needing JS-driven motion (multi-step exit animations, FLIP transitions), revisit with a budget.
- **Headless UI / Ariakit alternatives to Radix Dialog** — Heavier bundle, less tree-shakeable. Stick with Radix Dialog for v1.
- **Storybook for component primitives + states** — Tailwind v4 + Storybook 8 wiring is days. The `__dev/states` route covers the same review surface for the cost of one route file. Storybook becomes worth it when primitives outgrow what a flat catalog can show (sliders, complex compositions). Phase 18+ candidate.
- **`color_theme` cosmetic vs light/dark theme naming clarification** — D-28 acknowledges. Profile UI uses "Appearance" for light/dark and "Avatar theme" for cosmetic. If users get confused, revisit copy in a future polish pass.
- **Tablet (768–1279px) per-surface design** — SPEC says "graceful scale" only. If post-launch UAT shows tablet breakage, design-pass for tablet is its own phase.
- **`error.tsx` / `global-error.tsx` redesign** — SPEC explicitly excludes (token migration only). Last-resort fallbacks; designed treatment is Phase 18+ if ever.
- **Information architecture redesign** — SPEC FROZEN. Routes / nav / tab labels / page section ordering all preserved verbatim. Any IA proposal is a new phase.
- **Copy rewrites** — SPEC FROZEN. Existing strings stay; lengthening / shortening to fit a layout is allowed, intent rewrite is not.
- **PWA manifest polish + native app shells + push notifications** — Separate phases.
- **Full WCAG 2.1 AA audit** — Phase 18. Phase 14 locks the FLOOR (≥95 Lighthouse a11y, no critical axe violations on in-scope surfaces).

### Reviewed Todos (not folded)

(None — `gsd-sdk query todo.match-phase 14` returned 0 matches.)

</deferred>

---

*Phase: 14-ux-polish*
*Context gathered: 2026-05-01*
*Next step: `/gsd-plan-phase 14` (after `/clear`) — D-19 zip triage is the first plan-phase action.*
