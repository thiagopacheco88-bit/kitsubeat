# Phase 14: UX Polish — Research

**Researched:** 2026-05-01
**Domain:** Design-system migration on Tailwind v4 + Next 15 — tokens, primitives, motion, theming, lint enforcement, mobile/a11y test coverage
**Confidence:** HIGH on stack/patterns/ESLint shape; MEDIUM on Radix bundle math; HIGH on existing call-site inventory; HIGH on test-infra patterns; LOW on `bg-zinc-800` fallback shape because it's user-discretion

---

## Executive Summary

1. **Bundle headroom is much larger than CONTEXT D-23 claimed.** Phase 13 SUMMARY records `/songs/[slug]` First Load JS at **~16 KB gzipped** (route-specific + near-route shared chunks), not ~40 KB. The 50 KB budget has **~34 KB headroom**, not ~2 KB. Even if Radix Dialog gzips to **~10.8 KB** (per bundlephobia, NOT the ~5 KB CONTEXT D-06 claimed) plus CVA/clsx/tailwind-merge ≈ ~3 KB, total new dep cost is ≈ ~14 KB — still ~20 KB under budget. **Locked decision D-06 holds; the budget framing in D-23 should be updated by the planner**, but no decision needs reopening. Source: [`13-SUMMARY.md` Performance baseline section](../13-performance-infrastructure/13-SUMMARY.md), bundlephobia API for `@radix-ui/react-dialog@1.1.15` (size: 31487 raw, gzip: 10830, deps: 14).

2. **Migration backlog is enormous.** Grep audit found **53 files using gray-N00 utilities** (347 total occurrences), **33 files using red-N00** (70 occurrences), **32 files using other-color palette utilities** (64 occurrences), **12 files with arbitrary `[Npx]` classes** (84 occurrences), **18 hits of `bg-gray-950` in `dashboard/page.tsx` alone** (the deprecated stub — already SPEC out-of-scope), and **4 inline modal call sites** (the four named in CONTEXT — no others lurk). Wave 2+ migration sequencing per D-21 must budget for ~50 component files of token rewrites, not the casual handful CONTEXT implies.

3. **No ESLint config exists.** `eslint-config-next@16.2.4` is published but **not installed** in `node_modules`, no `.eslintrc*` or `eslint.config.*` file exists at repo root. `npm run lint` (`next lint`) currently runs against Next.js's bundled defaults. **Phase 14 wave 1 must scaffold `eslint.config.mjs` (flat config, the Next 15+ idiom) AND install `eslint` + `eslint-config-next`**, then add the custom token-compliance rule. This is more work than CONTEXT D-17 implies.

4. **Test-only state gating already wired correctly for `__dev/states`.** Phase 13's `NEXT_PUBLIC_APP_ENV` env is set to `"test"` in `playwright.config.ts:64` and to `"production"` in CI's bundle-build step (`qa-suite.yml:76`). The `notFound()` gate per D-15 (`process.env.NEXT_PUBLIC_APP_ENV === 'production'`) will work correctly: visible in dev (env undefined, falsy) and test (env === 'test'), hidden in CI bundle build and prod deploy.

5. **Theme persistence touches NEW surface area.** Codebase has ZERO existing `cookies()` usage from `next/headers` (verified by grep). Phase 14 introduces this pattern from scratch. The pattern must land in `layout.tsx` AND the new `setThemePreference` server action, plus the integration test must round-trip cookie → SSR `data-theme`. There is no existing reference for the planner to copy verbatim — this is greenfield wiring.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-29)

The 29 implementation decisions in [`14-CONTEXT.md`](./14-CONTEXT.md) `<decisions>` section are LOCKED. The planner MUST NOT recommend alternatives to:

- **D-01** Tailwind v4 `@theme` block + `[data-theme="light"]` override (no Tailwind v3 class-based theming, no separate stylesheets).
- **D-05** CVA + tailwind-merge + clsx for primitives (no Stitches, vanilla-extract, or hand-rolled variants).
- **D-06** Radix Dialog as Modal substrate (no Headless UI, no custom focus-trap).
- **D-08** DB column + cookie persistence (NO localStorage — cookie must be SSR-readable).
- **D-09** SSR cookie read in `layout.tsx` + tiny inline `<script>` for the `'system'` case (no `next-themes`).
- **D-11/D-26** Hand-written migration `drizzle/0015_user_theme_preference.sql` (no `db:generate` per Phase 11.4 D-01 schema-drift block).
- **D-12** NO motion library — pure CSS keyframes + transitions; `canvas-confetti` already dynamic-imported is the only JS-driven motion.
- **D-15** `__dev/states` route gated `notFound()` in production (no Storybook, no `?state=` URL param).
- **D-17** Custom ESLint rule + `scripts/audit/token-compliance.ts` grep — both, both wired into `pr-checks.yml` (no `eslint-plugin-tailwindcss`).
- **D-21/D-22** Token-only swap allowed when Claude Design output is missing for a surface — phase merge is NOT blocked on full design coverage; it IS blocked on full token coverage.
- **D-23** Phase 13 `size-limit` 50 KB gzipped budget on `/songs/[slug]` MUST stay green (carry-forward; the math in CONTEXT for headroom is stale — see Executive Summary #1).
- **D-24** Three-layer test discipline — visual diff via `__dev/states`, unit tests per primitive variant, integration test for theme cookie round-trip, Playwright for mobile parity + a11y.

### Claude's Discretion

The planner can choose:
- Skeleton shimmer gradient stops (CSS `linear-gradient` with `background-position`).
- Header theme-toggle icon set (Lucide imports or inline SVG; D-08 cosmetic naming distinct from `color_theme` cosmetic slot per D-28).
- Modal portal target (default `<body>`; nested modals are unlikely).
- `__dev/states` page styling (functional flat-grid, not designed).
- Tablet (768–1279px) — Tailwind `md:` scaling, no separate design pass.
- Force-mount details for modal-from-Practice-tab and which icon library if needed (no new deps unless under 1KB).

### Deferred Ideas (OUT OF SCOPE)

`asChild` polymorphism, self-hosting Noto Sans JP, per-route bundle budgets beyond `/songs/[slug]`, custom icon set redrawing, animation library swap, Headless UI/Ariakit alternatives, Storybook, `color_theme` vs Appearance copy clarification, tablet-specific designs, `error.tsx` redesign, IA changes, copy rewrites, PWA polish, full WCAG 2.1 AA audit (Phase 18).

---

## Phase Requirements

Per CONTEXT, no requirement IDs from `REQUIREMENTS.md` map to Phase 14 (cross-cutting polish, not a feature row). Coverage is via [`14-SPEC.md`](./14-SPEC.md)'s 9 requirements + 21 acceptance criteria. The planner traces tasks to those requirement numbers (req 1 through req 9) and SPEC AC IDs (AC #1 through AC #21).

| ID | SPEC source | Description | Research support (this doc) |
|----|-------------|-------------|------------------------------|
| req 1 | SPEC §Requirements 1 | Design token system (light + dark) | §1 (Tailwind v4 `@theme`), §6 (theme persistence wiring) |
| req 2 | SPEC §Requirements 2 | Token-compliance lint gate | §1 (ESLint rule shape), §9 (grep patterns), §10 (CI extension) |
| req 3 | SPEC §Requirements 3 | Component primitives extracted | §2 (audit of inline modal/badge/button call sites) |
| req 4 | SPEC §Requirements 4 | Surface redesign across 11 surfaces | (handled by D-21/D-22 sequencing — not a research domain) |
| req 5 | SPEC §Requirements 5 | Mobile parity floor (Playwright) | §4 (mobile-parity spec skeleton) |
| req 6 | SPEC §Requirements 6 | Microinteraction catalog (12 entries) | (CSS-only per D-12; catalog is doc-writing, not research) |
| req 7 | SPEC §Requirements 7 | Empty/loading/error states | §7 (`__dev/states` route conventions) |
| req 8 | SPEC §Requirements 8 | A11y floor (axe + Lighthouse ≥95) | §5 (axe-core integration) |
| req 9 | SPEC §Requirements 9 | Theme switching (dark + light) | §6 (theme persistence integration test) |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Design tokens (CSS vars) | CSS / Build | — | Tailwind v4 `@theme` block is build-time; no runtime cost |
| `data-theme` attribute set | Frontend Server (SSR via `cookies()`) | Browser (inline `<script>` for `'system'` case) | SSR-driven for zero-flash; client script only resolves `'system'` against `prefers-color-scheme` |
| Theme persistence (authed) | API (server action) → Database | — | `users.theme_preference` column writes; cookie also written for SSR readability on next request |
| Theme persistence (guest) | Browser (cookie read at SSR + write on client) | — | Cookie is the ONLY storage for guests per D-08 (no localStorage) |
| Component primitives (Button/Card/Badge) | Browser / Client | — | Pure presentational React components; `"use client"` only when interactive |
| Modal primitive | Browser / Client | — | Radix Dialog + portal; mounted on `<body>` |
| Motion (CSS keyframes) | CSS / Build | — | Zero JS — CSS animations + transitions; `prefers-reduced-motion` global override |
| `canvas-confetti` triggers | Browser / Client | — | Dynamic-imported per existing Phase 10/12 pattern; suppressed under reduced motion |
| Token-compliance ESLint rule | Build / Tooling | CI | Runs at lint time + CI step |
| Token-compliance grep audit | Build / Tooling | CI | `tsx scripts/audit/token-compliance.ts` step in `pr-checks.yml` |
| Mobile-parity test | E2E (Playwright) | — | Per-route 390×844 viewport assertion |
| A11y test (axe) | E2E (Playwright) | — | `@axe-core/playwright` per route, both themes |
| `__dev/states` route | Frontend Server (SSR) | — | First line `notFound()` if `NEXT_PUBLIC_APP_ENV === 'production'` |

---

## Standard Stack

### Core deps to install (verified versions, 2026-05-01)

| Package | Version (npm) | Bundle (gzipped) | Verification source |
|---------|---------------|-------------------|---------------------|
| `@radix-ui/react-dialog` | `1.1.15` | **~10.8 KB** | `npm view @radix-ui/react-dialog version` + bundlephobia API (size: 31487, gzip: 10830, deps: 14) |
| `class-variance-authority` | `0.7.1` | ~2 KB (raw 22 KB) | `npm view ... dist.unpackedSize` returned 22073 bytes; CVA documented gzip ≈ 1.7–2 KB |
| `clsx` | `2.1.1` | ~0.5 KB (raw 8.5 KB) | `npm view ... dist.unpackedSize` returned 8555 bytes; clsx is famously ~250 bytes minified+gzipped — 0.5 KB is safe upper bound |
| `tailwind-merge` | `3.5.0` | ~6 KB | `npm view ... dist.unpackedSize` returned 984210 bytes raw (lots of TS source); minified+gzipped published-bundle is ~6 KB per bundlephobia |
| `eslint` | (latest 9.x) | dev-only | not currently installed |
| `eslint-config-next` | `16.2.4` | dev-only | `npm view eslint-config-next version` returned 16.2.4 |
| `@axe-core/playwright` | `4.11.3` | dev-only | `npm view @axe-core/playwright version` |

**Total dependency bundle cost on `/songs/[slug]`:** Radix Dialog ~10.8 KB + CVA ~2 KB + clsx ~0.5 KB + tailwind-merge ~6 KB = **~19 KB gzipped if all are loaded on the route**. Phase 13 baseline says route is currently ~16 KB → adding 19 KB → 35 KB. Budget is 50 KB → **~15 KB remaining headroom after the full primitives stack lands.** Adequate. The CONTEXT D-23 claim of "~2 KB margin" was based on a stale ~40 KB baseline figure that the actual Phase 13 SUMMARY contradicts.

### Installation command

```bash
npm install @radix-ui/react-dialog class-variance-authority tailwind-merge clsx
npm install --save-dev eslint eslint-config-next @axe-core/playwright
```

### Reused from existing stack

| Existing | Used for | Source |
|----------|----------|--------|
| `canvas-confetti@1.9.4` | Star earn / level-up / kana row unlock confetti | `package.json:56` (already installed) |
| `next/font` (Inter) | UI font | `layout.tsx:8` |
| Google Fonts CDN (Noto Sans JP) | JP font | `layout.tsx:35-37`; D-discretion says do NOT self-host this phase |
| `size-limit@12.1.0` + `@size-limit/preset-app@12.1.0` | Bundle gate | `package.json:75, 88` (Phase 13) |
| `@playwright/test@1.59.1` | E2E | `package.json:74` (Phase 08.1) |
| `vitest@4.1.4` + `@testing-library/react@16.3.2` | Unit + integration | `package.json:77, 91` |
| `andresz1/size-limit-action@v1` | PR comment + status check | `qa-suite.yml:79` (Phase 13) |

### Alternatives considered (and rejected per CONTEXT)

| Instead of | Could use | Why rejected (D-NN) |
|------------|-----------|---------------------|
| Custom ESLint rule | `eslint-plugin-tailwindcss` | D-17 — slow, overly broad, configures per-project anyway |
| Radix Dialog | Headless UI / Ariakit | D-06 — heavier, less tree-shakeable |
| Radix Dialog | Hand-rolled focus-trap | D-06 — every project re-invents it badly |
| `next-themes` | Inline script + cookie | D-09 — ~2 KB + context-provider re-render churn for a 200-byte solution |
| Framer Motion / `motion` | Pure CSS | D-12 — bundle budget incompatible (30 KB vs 50 KB total) |
| Storybook | `__dev/states` route | D-15 — Tailwind v4 + Storybook 8 wiring is days |

---

## Project Constraints (from CLAUDE.md)

From `kitsubeat/CLAUDE.md`:
- **Dual-graph MCP context policy** is operative for all subagent work in this project. Researcher honors it by not running broad recursive grepping when the dual-graph would have answered the question — but for a system-wide design-token migration, the broad audits in this doc ARE the goal (this is a `confidence=high` discovery scope where every file matters).
- **`CONTEXT.md` updated on session-end** — not a Phase 14 requirement; orchestrator-managed.
- **Context store at `.dual-graph/context-store.json`** — append decisions/blockers as they arise during execution.

From `velora-projects/CLAUDE.md`:
- Audience context: Thiago is shipping KitsuBeat as Anthropic interview signal + EB2-NIW evidence by Sep 2026. Phase 14 is a **portfolio surface** — visual quality matters disproportionately to non-technical viewers (recruiters, designers).

From project memory (`MEMORY.md`):
- **Always start dev server at `http://localhost:7000`** after changes (dev port 7000 is sticky per `package.json:7`).
- **Always test optimization/infra changes** — Phase 14 is full of these (lint rules, CI extension, build-time changes). `npm run build` passing is INSUFFICIENT (D-24).
- **Local-only tooling, no paid API credits** — every Phase 14 dependency is OSS.
- **WORKLOG.md tracks deliveries** — append a Phase 14 entry on phase completion.

---

## Architecture Patterns

### System Architecture Diagram (Phase 14 surface)

```
                ┌────────────────────────────────────────────┐
                │  REQUEST   GET /any-route                  │
                └─────────────┬──────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  layout.tsx (RSC)                       │
        │  ┌────────────────────────────────────┐ │
        │  │ const c = await cookies()          │ │
        │  │ const stored = c.get('kb_theme')   │ │
        │  │ const resolved =                   │ │
        │  │   stored?.value === 'light' ? 'lt' │ │
        │  │ : stored?.value === 'dark'  ? 'dk' │ │
        │  │ : 'system'                         │ │
        │  └────────────────────────────────────┘ │
        │           │                             │
        │           ▼                             │
        │  <html data-theme={resolved}>           │
        │   <head>                                │
        │     <script>                            │
        │       /* if 'system', resolve via      */
        │       /* matchMedia BEFORE first paint */
        │     </script>                           │
        │   </head>                               │
        │   <body><Header /><main>{children}</main></body>
        │  </html>                                │
        └─────────────────────────────────────────┘
                              │
                              ▼ (client paint)
        ┌─────────────────────────────────────────┐
        │  CSS read order:                        │
        │   1. globals.css @theme {}              │
        │      → defines all tokens (dark base)   │
        │   2. globals.css [data-theme=light] {}  │
        │      → overrides color/shadow tokens    │
        │   3. Tailwind v4 emits utility classes  │
        │      → bg-card, text-text, etc.         │
        │      → resolve to var(--color-card) etc.│
        │   4. @media (prefers-reduced-motion)    │
        │      → kills all animations             │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Components consume tokens via:         │
        │   - Tailwind utilities (preferred)      │
        │   - var(--token-name) (fallback)        │
        │  Components are built on:               │
        │   <Button>, <Card>, <Badge>, <Modal>    │
        │     (CVA variants, tokens-only)         │
        │   <EmptyState>, <Skeleton>              │
        │     (shells composed by per-surface)    │
        └─────────────────────────────────────────┘
                              │
                              ▼ (theme toggle)
        ┌─────────────────────────────────────────┐
        │  Header toggle button (D-10)            │
        │  ┌────────────────────────────────────┐ │
        │  │ onClick: optimistic update         │ │
        │  │   1. doc.documentElement           │ │
        │  │      .setAttribute('data-theme',v) │ │
        │  │   2. document.cookie = `kb_theme=v;│ │
        │  │      Max-Age=31536000;SameSite=Lax`│ │
        │  │   3. fire setThemePreference()     │ │
        │  │      server action async (DB write)│ │
        │  │   4. on error: toast + revert      │ │
        │  └────────────────────────────────────┘ │
        └─────────────────────────────────────────┘

         ┌──────────────────────────────────────────┐
         │  Lint enforcement (CI hard-fail)         │
         │   ┌────────────────────────────────────┐ │
         │   │ npm run lint (eslint.config.mjs)   │ │
         │   │  → custom rule: token-compliance   │ │
         │   │    - blocks bg-[#hex],             │ │
         │   │      text-[#hex], border-[#hex]    │ │
         │   │    - blocks bg-gray-N00 etc.       │ │
         │   │    - allowlist: ui/, admin/,       │ │
         │   │      __dev/, error*, globals.css   │ │
         │   └────────────────────────────────────┘ │
         │   ┌────────────────────────────────────┐ │
         │   │ npx tsx scripts/audit/             │ │
         │   │   token-compliance.ts              │ │
         │   │  → grep belt-and-suspenders        │ │
         │   │    catches edge cases ESLint misses│ │
         │   └────────────────────────────────────┘ │
         └──────────────────────────────────────────┘
```

### Recommended file layout (Phase 14 additions)

```
src/
├── app/
│   ├── layout.tsx                      # MODIFIED: cookies() + inline script + remove bg-gray-950
│   ├── globals.css                     # MODIFIED: expand @theme + [data-theme=light] + reduced-motion
│   ├── __dev/
│   │   └── states/
│   │       └── page.tsx                # NEW: catalog of empty/loading/error states
│   └── actions/
│       └── userPrefs.ts                # MODIFIED: add setThemePreference server action
├── components/
│   └── ui/
│       ├── Button.tsx                  # NEW
│       ├── Card.tsx                    # NEW
│       ├── Badge.tsx                   # NEW
│       ├── Modal.tsx                   # NEW (wraps Radix Dialog)
│       ├── EmptyState.tsx              # NEW
│       ├── Skeleton.tsx                # NEW
│       ├── ThemeToggle.tsx             # NEW (header sun/moon button)
│       └── __tests__/
│           ├── Button.test.tsx         # NEW (variant coverage)
│           ├── Card.test.tsx           # NEW
│           ├── Badge.test.tsx          # NEW
│           ├── Modal.test.tsx          # NEW
│           └── EmptyState.test.tsx     # NEW
├── lib/
│   └── theme/
│       ├── cookie.ts                   # NEW: kb_theme cookie read/write helpers
│       └── resolve.ts                  # NEW: 'system' → 'dark' | 'light' resolver
docs/
└── motion-catalog.md                   # NEW: 12-entry catalog (D-14)
drizzle/
└── 0015_user_theme_preference.sql      # NEW: hand-written ALTER TABLE
scripts/
└── audit/
    └── token-compliance.ts             # NEW: grep audit
eslint.config.mjs                       # NEW: flat config + custom rule
tests/
├── e2e/
│   ├── mobile-parity.spec.ts           # NEW: 390×844 no-h-scroll + tap targets
│   └── a11y.spec.ts                    # NEW: axe-core, both themes
└── integration/
    └── theme-persistence.test.ts       # NEW: cookie → SSR data-theme round-trip
```

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap, ESC, scroll lock, ARIA | Custom hook + `<div role="dialog">` | `@radix-ui/react-dialog` (D-06) | Every project re-invents this and gets ≥1 thing wrong (focus restore, portal scroll lock, RTL, scrollbar shift) |
| Variant API for Button/Card/Badge | Inline `${variant === 'x' ? 'a' : 'b'}` ternaries | `class-variance-authority` (D-05) | Type-safe variant props with compile-time exhaustiveness; replaces 50+ ad-hoc switch sites |
| Tailwind class deduplication | Manual `clsx` + custom dedupe | `tailwind-merge` (D-05) | Knows that `p-4 p-6` collapses to `p-6`, that `bg-red-500 bg-blue-500` collapses to last one — manual clsx doesn't |
| Theme zero-flash | `useEffect` + `useState` in client provider | SSR cookie read + inline `<script>` (D-09) | Client-only providers ALWAYS flash on first paint because React mounts after CSS parses |
| A11y rule scanning | Manual checklist | `@axe-core/playwright` (req 8) | Catches rule violations no manual checklist will (color contrast, ARIA misuse, label associations) |
| Mobile viewport audit | Manual devtools resizing | Playwright `mobile-parity.spec.ts` (AC #11) | 11 surfaces × theme matrix is automation territory |

---

## Common Pitfalls

### Pitfall 1: ESLint custom rules need a plugin shape, not a bare object
The token-compliance rule must live in a published-or-local plugin module that exports `{ rules: { 'no-raw-tokens': { meta, create } } }`. Bare `rules` blocks in `eslint.config.mjs` referencing `meta`/`create` directly are rejected by ESLint 9. **Fix:** scaffold a local plugin file (e.g., `eslint-plugins/kitsubeat-tokens/index.js`) and import it from `eslint.config.mjs`.

### Pitfall 2: `next/headers cookies()` is async in Next 15
Per Next 15 changelog (`async dynamic APIs`), `cookies()` returns `Promise<ReadonlyRequestCookies>`. The pattern is `const c = await cookies(); c.get('kb_theme')` — NOT `cookies().get(...)` (works in Next 14, fails type-check in Next 15). The `RootLayout` is `async` already (`layout.tsx:24`) so this lands cleanly.

### Pitfall 3: `data-theme` set BEFORE `<body>` to avoid flash
The inline `<script>` in `<head>` must run BEFORE the body parses. React renders `<head>` and `<body>` in order, so a script as the first child of `<head>` is fine. But if React's `<Script strategy="beforeInteractive">` is used, it injects via the framework's loader — which runs AFTER first paint. **Use raw `<script dangerouslySetInnerHTML>`** per the D-09 illustration in CONTEXT, NOT `next/script`.

### Pitfall 4: Tailwind v4 `@theme` does NOT auto-generate `[data-theme=light]` overrides
Tailwind v4's `@theme {}` block creates utility classes that resolve to `var(--token-name)`. To swap colors per theme, you redefine the SAME variables under a `:root[data-theme="light"]` selector OUTSIDE the `@theme` block. Tailwind picks up the overridden variable values automatically. **Common mistake:** putting the light theme inside a second `@theme {}` block — Tailwind treats this as an additive token set, not an override.

### Pitfall 5: Radix Dialog requires `<Title>` for a11y or it warns
Every `Dialog.Content` MUST contain a `<Dialog.Title>` (or use `<VisuallyHidden>`) — Radix prints a console warning otherwise that breaks the zero-warning policy. Wrap-time enforcement: the Modal primitive's `<Modal.Content>` should require `title` as a prop OR document a `srOnly` escape hatch.

### Pitfall 6: `bg-gray-950` lurks in the deprecated `/dashboard` stub
`grep` found 18 hits of `bg-gray-N00` in `src/app/dashboard/page.tsx` alone. SPEC explicitly marks `/dashboard` as out-of-scope (likely deprecated). The lint rule allowlist must NOT include `/dashboard` (we want it to fail-loud if anyone touches that file), but the audit script must exclude it OR we must delete the route in this phase (D-discretion check needed).

### Pitfall 7: `RowUnlockModal.tsx:36` uses `dark:bg-zinc-900` — Tailwind dark variant
`src/app/kana/components/RowUnlockModal.tsx:36` uses `bg-white p-6 ... dark:bg-zinc-900` — this is the **only file** using Tailwind's `dark:` variant. With `data-theme` attribute switching (D-02), Tailwind v4's `dark:` variant works ONLY if configured to read from `[data-theme=dark]` not `prefers-color-scheme`. Need to verify Tailwind v4's `@variant dark (&:where([data-theme=dark], [data-theme=dark] *))` configuration in `globals.css`. Easier path: rewrite this file to use tokens directly, no `dark:` variant.

### Pitfall 8: `@axe-core/playwright` needs to scan post-hydration, not first paint
Run axe AFTER `await page.waitForLoadState('networkidle')` or after a known content selector renders. Scanning at `goto` completion misses violations in client-rendered content (e.g., the lazy-loaded Exercise Tab on `/songs/[slug]`).

### Pitfall 9: `prefers-reduced-motion` global override fights with explicit `transition: none`
The D-13 global `@media (prefers-reduced-motion: reduce)` block uses `!important` to nuke animations. This is correct for `animation-duration` and `transition-duration`. But components that explicitly set `transition: none` (unlikely but possible) become double-protected — fine. **Watch:** any component using JS-driven animations (currently none after D-12) must read `matchMedia('(prefers-reduced-motion: reduce)').matches` themselves; the CSS override doesn't reach them. Confetti is the only such site (3 call sites), and `canvas-confetti`'s `disableForReducedMotion: true` option is already used.

### Pitfall 10: Cookie write from server action invalidates RSC cache
Calling `cookies().set('kb_theme', value)` inside a server action triggers Next's RSC re-render. For instant theme switching this is fine, but the planner should confirm there's no flicker between optimistic client-side `data-theme` set and server's RSC re-render.

---

## Code Examples

### Tailwind v4 `@theme` extension (D-01)

```css
/* src/app/globals.css — proposed structure for Phase 14 */
@import "tailwindcss";

@theme {
  /* Color (DARK theme — default) */
  --color-bg: #0E0E0E;
  --color-bg-2: #111111;
  --color-card: #191919;
  --color-card-2: #1E1E1E;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-strong: rgba(255, 255, 255, 0.10);
  --color-text: #F5F5F4;
  --color-text-muted: rgba(245, 245, 244, 0.56);
  --color-text-dim: rgba(245, 245, 244, 0.40);
  --color-accent: #ef4444;

  /* Grammar + JLPT — same in both themes (kept from current globals.css) */
  --color-grammar-noun: #3b82f6;
  /* ... existing grammar/JLPT colors ... */

  /* Typography */
  --font-sans: Inter, -apple-system, "SF Pro Text", system-ui, sans-serif;
  --font-jp: "Noto Sans JP", -apple-system, system-ui;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace;

  /* Spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;
  --space-9: 48px; --space-10: 64px;

  /* Radii */
  --radius-xs: 8px; --radius-sm: 10px; --radius-md: 12px;
  --radius-lg: 14px; --radius-xl: 16px; --radius-2xl: 18px;
  --radius-3xl: 20px; --radius-4xl: 22px; --radius-5xl: 24px;
  --radius-6xl: 26px; --radius-pill: 9999px;

  /* Shadows (dark) */
  --shadow-card-ring: inset 0 0 0 1px var(--color-border);
  --shadow-card-ring-strong: inset 0 0 0 1px var(--color-border-strong);
  --shadow-hero-glow: inset 0 0 0 1px rgba(239, 68, 68, 0.32),
                       0 16px 40px rgba(239, 68, 68, 0.14);
  --shadow-button-red: 0 8px 22px rgba(239, 68, 68, 0.45);
  --shadow-focus-ring: 0 0 0 2px rgba(239, 68, 68, 0.40);

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* LIGHT theme override — only color + shadow vars per D-03 / D-04 */
:root[data-theme="light"] {
  --color-bg: #FAFAF9;
  --color-bg-2: #F4F4F2;
  --color-card: #FFFFFF;
  --color-card-2: #FAFAF9;
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-strong: rgba(0, 0, 0, 0.14);
  --color-text: #18181B;
  --color-text-muted: rgba(24, 24, 27, 0.62);
  --color-text-dim: rgba(24, 24, 27, 0.45);
  /* --color-accent stays #ef4444 — verified WCAG AA per D-03 */

  /* Light shadows — 30% higher opacity per D-04 */
  --shadow-card-ring: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  --shadow-button-red: 0 8px 22px rgba(239, 68, 68, 0.55);
  /* etc. — exact values computed in wave-1 plan */
}

/* Existing keyframes — retained per D-27 */
@keyframes star-shine { /* ... */ }
@keyframes level-pop { /* ... */ }

/* D-13 global reduced-motion override — must be LAST in file */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

### CVA Button primitive (D-05 / D-07)

```typescript
// src/components/ui/Button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const button = cva(
  ["inline-flex items-center justify-center font-semibold transition-colors",
   "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
   "disabled:opacity-50 disabled:pointer-events-none"],
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-accent)] text-white shadow-[var(--shadow-button-red)]",
        secondary: "bg-[var(--color-card-2)] text-[var(--color-text)] border border-[var(--color-border)]",
        ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-2)]",
      },
      size: {
        sm: "h-9 px-3 rounded-[var(--radius-sm)] text-sm",
        md: "h-11 px-4 rounded-[var(--radius-md)]",
        lg: "h-12 px-6 rounded-[var(--radius-lg)] text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={twMerge(clsx(button({ variant, size }), className))} {...props} />
  )
);
Button.displayName = "Button";
```

### Modal primitive (D-06) wrapping Radix Dialog

```typescript
// src/components/ui/Modal.tsx
"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export function ModalContent({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <Dialog.Content
        className={twMerge(
          clsx(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md p-6 rounded-[var(--radius-3xl)]",
            "bg-[var(--color-card)] text-[var(--color-text)]",
            "shadow-[var(--shadow-card-ring-strong)]"
          ),
          className
        )}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function ModalTitle({ children, srOnly }: { children: ReactNode; srOnly?: boolean }) {
  // Pitfall 5 — every Dialog.Content MUST have Dialog.Title or Radix warns.
  return (
    <Dialog.Title className={srOnly ? "sr-only" : "text-xl font-semibold"}>
      {children}
    </Dialog.Title>
  );
}

export function ModalDescription({ children }: { children: ReactNode }) {
  return <Dialog.Description className="mt-2 text-sm text-[var(--color-text-muted)]">{children}</Dialog.Description>;
}
```

---

## State of the Art

| Old approach (in this codebase today) | Current approach | When it changed | Impact |
|---------------------------------------|------------------|-----------------|--------|
| Tailwind v3 `@layer` + class-based dark mode | Tailwind v4 `@theme` block + `[data-theme]` attr | Tailwind v4 (Mar 2025) | Locked via D-01 — all token work uses v4 idiom |
| `next/script strategy="beforeInteractive"` for theme detection | Inline raw `<script>` | Always for theme zero-flash | D-09 — avoids React framework loader injection delay |
| `cookies().get(...)` (Next 14 sync) | `(await cookies()).get(...)` (Next 15 async) | Next 15 (Oct 2024) | Pitfall 2 — must `await` |
| Class-based dark mode (`<html class="dark">`) | Attribute-based (`<html data-theme="dark">`) | Industry shift toward semantic data attrs | D-02 SPEC-locked |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | `tailwind-merge@3.5.0` gzipped is ~6 KB. Estimated from bundlephobia conventions but the registry's `dist.unpackedSize` of 984 KB raw includes TS source files; real published bundle may differ | Standard Stack | Bundle math wrong — could push budget tighter than the ~15 KB headroom claimed |
| A2 | `class-variance-authority@0.7.1` gzipped is ~2 KB | Standard Stack | Same as A1 — may differ from estimate |
| A3 | Tailwind v4 `@variant dark` declaration can rebind `dark:` to `[data-theme=dark]` selector. CITED to Tailwind v4 docs but not VERIFIED in this codebase | Pitfall 7 | If wrong, the one `RowUnlockModal.tsx:36` `dark:` variant breaks; mitigation is rewrite to direct tokens |
| A4 | The 4 modals identified by grep are the ONLY modals; no other surfaces use a `<div className="fixed inset-0 ... backdrop">` shell that escaped the regex | Audit (§2) | If a 5th modal exists, Wave 2+ migration backlog grows by one |
| A5 | The dashboard route at `src/app/dashboard/page.tsx` is genuinely deprecated (per SPEC out-of-scope) and can be left untouched without lint failures by being in the allowlist OR deleted | Pitfall 6 | If dashboard ships to users, the lint allowlist must include it; if it's truly dead code, delete it as a cleanup task |
| A6 | `disableForReducedMotion: true` on `canvas-confetti` reliably no-ops under `prefers-reduced-motion: reduce` across browsers. CITED in canvas-confetti README but not VERIFIED in this codebase | Pitfall 9 | Edge browsers may need additional client guard at every fire site (3 sites: `LevelUpTakeover.tsx:39`, `RowUnlockModal.tsx:14`, `StarDisplay.tsx:36` per Phase 13 RESEARCH) |
| A7 | Phase 13 SUMMARY's ~16 KB baseline is current as of phase merge commit, no Phase 14 wave-0 work has shifted it | Executive Summary #1 | Reverify by running `npm run size` before Phase 14 plans wave 1 |
| A8 | Node 20 is the project's pinned CI node version (`qa-suite.yml:60`) — `eslint@9.x` and `eslint-config-next@16.x` both support Node 20. CITED to ESLint 9 release notes (requires Node ≥18.18) | §1 (ESLint config) | Low — Node 20 is Active LTS; both packages are well above floor |

---

## Research Question Answers

### 1. Custom ESLint rule for token-compliance under Tailwind v4 (D-17)

**Form:** ESLint 9 **flat config** (`eslint.config.mjs`), per the Next 15 / ESLint 9 standard. Source: [Next.js ESLint config docs](https://nextjs.org/docs/app/api-reference/config/eslint), [Next.js ESLint 9 flat config tutorial](https://chris.lu/web_development/tutorials/next-js-static-first-mdx-starterkit/linting-setup-using-eslint).

**Important note** (per Next 15 docs): Starting in Next.js 16, `next lint` is removed. KitsuBeat is on Next 15.5.14 today (`package.json:60`), so `next lint` still works — but the planner should NOT bind the lint pipeline to `next lint` long-term. Use the `eslint` CLI directly:

```bash
npm install --save-dev eslint eslint-config-next
```

Then update `package.json:13` from `"lint": "next lint"` to `"lint": "eslint ."`.

**`eslint.config.mjs` shape (concrete):**

```javascript
// eslint.config.mjs (Phase 14 wave 1)
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import kitsubeatTokens from "./eslint-plugins/kitsubeat-tokens/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: { "kitsubeat-tokens": kitsubeatTokens },
    rules: {
      "kitsubeat-tokens/no-raw-tokens": "error",
    },
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/components/ui/**",        // primitives may use raw values inside CVA maps
      "src/app/admin/**",            // operator-facing per D-18
      "src/app/__dev/**",            // dev catalog per D-18
      "src/app/error.tsx",           // framework fallback per D-18
      "src/app/global-error.tsx",    // framework fallback per D-18
    ],
  },
];
```

**`eslint-plugins/kitsubeat-tokens/index.js` skeleton (concrete):**

```javascript
// eslint-plugins/kitsubeat-tokens/index.js
const RAW_HEX = /\b(bg|text|border|fill|stroke|ring|shadow|outline|decoration|caret|accent|divide|placeholder)-\[#[0-9a-fA-F]{3,8}\]/;
const ARBITRARY_PX = /\b(text|p[xytrbl]?|m[xytrbl]?|gap|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|space-[xy]|leading|tracking|rounded[a-z-]*|border|shadow|translate-[xy])-\[\d+(\.\d+)?px\]/;
const PALETTE_UTILITIES = /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent|shadow|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-(50|100|200|300|400|500|600|700|800|900|950)\b/;

function checkLiteral(node, context, value) {
  if (typeof value !== "string") return;
  if (RAW_HEX.test(value)) {
    context.report({ node, message: "Raw hex utility found. Use a token from globals.css @theme block." });
  }
  if (ARBITRARY_PX.test(value)) {
    context.report({ node, message: "Arbitrary px utility found. Use a Tailwind size utility (text-sm, p-4) or a CSS var token." });
  }
  if (PALETTE_UTILITIES.test(value)) {
    context.report({ node, message: "Tailwind palette utility found. Use a token from globals.css @theme block." });
  }
}

export default {
  rules: {
    "no-raw-tokens": {
      meta: {
        type: "problem",
        docs: { description: "Disallow raw color/px utilities outside the design system surface." },
        schema: [],
      },
      create(context) {
        return {
          // Catches className="..." JSX attribute string literals
          JSXAttribute(node) {
            if (node.name?.name !== "className") return;
            if (node.value?.type === "Literal") {
              checkLiteral(node.value, context, node.value.value);
            } else if (node.value?.type === "JSXExpressionContainer") {
              // Catches className={`...`} template literals
              const expr = node.value.expression;
              if (expr.type === "TemplateLiteral") {
                expr.quasis.forEach((q) => checkLiteral(q, context, q.value.cooked));
              } else if (expr.type === "Literal") {
                checkLiteral(expr, context, expr.value);
              }
            }
          },
          // Catches clsx("..."), twMerge("..."), cva([...]) string args
          CallExpression(node) {
            if (!["clsx", "cn", "twMerge", "cva"].includes(node.callee.name)) return;
            node.arguments.forEach((arg) => {
              if (arg.type === "Literal") checkLiteral(arg, context, arg.value);
              if (arg.type === "TemplateLiteral") {
                arg.quasis.forEach((q) => checkLiteral(q, context, q.value.cooked));
              }
            });
          },
        };
      },
    },
  },
};
```

**Why this works:**
- AST visitors target `JSXAttribute` (catches `className="..."`) and `CallExpression` for `clsx`/`twMerge`/`cva` (catches `className={clsx(...)}` patterns).
- `Literal` and `TemplateLiteral` both handled.
- Allowlist via `ignores` in flat config — file-pattern based, not rule-based, so the rule is uniform.
- Custom plugin module is **local-only** (no npm publish needed); `eslint.config.mjs` imports it directly via relative path.

### 2. Comprehensive call-site audit (D-21 Wave 2+ backlog)

Verified by grep against `src/`:

| Category | Count | Top files (file:approx-occurrences) |
|----------|------:|-------------------------------------|
| **Inline modal shells** (`fixed inset-0` + backdrop pattern) | **4 files** | `src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx`, `src/app/review/UpsellModal.tsx`, `src/app/kana/components/RowUnlockModal.tsx`, `src/app/components/LevelUpTakeover.tsx` |
| **JLPT badge reimplementations** (refs `jlpt-n[1-5]`) | 2 files (incl. `globals.css` itself + `lib/types/lesson.ts` color-class map) | The badge styling is centralized in `JLPT_COLOR_CLASS` in `src/lib/types/lesson.ts` and consumed by `SongCard`, `WordOfDay` etc. via `className={JLPT_COLOR_CLASS[level]}`. **Already centralized** — Phase 14 just needs to make `Badge` primitive consume the same map |
| **Grammar badge reimplementations** (refs `grammar-(noun\|verb\|...)`) | 2 files (same as JLPT — centralized) | Same pattern: lib/types map already canonicalized |
| **Inline button-shaped elements** (rounded-N + border or rounded-N + bg-color) | **88 occurrences across 43 files** | Hot spots: `src/app/songs/[slug]/components/ExerciseTab.tsx:9`, `SentenceOrderCard.tsx:9`, `GrammarMcqCard.tsx:4`, `SessionSummary.tsx:4`, `ListeningDrillCard.tsx:4`, `KanaSessionSummary.tsx:4`, `ReviewLanding.tsx:2`, `vocabulary/FilterControls.tsx:3` |
| **Card-shaped containers** (rounded-N + border-gray + bg-gray) | Subset of above; conservative estimate ~30 sites | Same hot files as buttons; e.g. `GlobalLearnedCounter.tsx:32`, `JlptGapSummary.tsx:10`, `ReviewLanding.tsx:116, 144` |
| **Raw `bg-[#hex]` arbitrary** | **0 occurrences** | The codebase is clean of `bg-[#…]` (verified by grep). The "raw hex" violation pattern in SPEC §2 is theoretical — the existing problem is palette utilities (`bg-gray-N00`), not arbitrary hex |
| **Tailwind palette `bg-gray-N00` etc.** | **347 occurrences across 53 files** | (See Pitfall 6 — 18 hits in dashboard alone) |
| **Tailwind `bg-red-N00` etc.** | **70 occurrences across 33 files** | Brand-color sites that need to migrate to `bg-[var(--color-accent)]` |
| **Other-color palette** (zinc/slate/neutral/stone/blue/green/etc.) | **64 occurrences across 32 files** | Mostly kana surfaces (`KanaTile.tsx`, `KanaSession.tsx`, `KanaSessionSummary.tsx`) and a few one-off uses (`ProfileHud.tsx`, `LevelUpTakeover.tsx`'s `text-orange-400`) |
| **Arbitrary `[Npx]` classes** | **84 occurrences across 12 files** | Hot file: `dashboard/page.tsx:68` (deprecated stub — see Pitfall 6); legitimate uses in `SongCard.tsx:4`, `SongMasteredBanner.tsx`, `TokenPopup.tsx` |

**Migration backlog summary:** ~50 component files need token migration. Per D-21 sequencing recommendation, the suggested wave order is: `/songs/[slug]` (densest) → `/` → `/songs` → `/review` → `/vocabulary` → `/profile` → `/kana` (×3) → `/path` → `/anime-list`.

### 3. Radix Dialog bundle-size verification (D-06)

**Verified:** [bundlephobia](https://bundlephobia.com) API for `@radix-ui/react-dialog@1.1.15`:
- Raw size: **31,487 bytes**
- Gzipped: **10,830 bytes (~10.8 KB)**
- Direct dependencies: **14** (incl. `react-remove-scroll@^2.6.3` which adds scroll-lock — typically ~3 KB additional gzipped)

**CONTEXT D-06 claim:** "tree-shakes to ~5KB gzipped" — **NOT verified**. Bundlephobia includes the full ESM package; tree-shaking will help with unused submodules (`Dialog.Trigger` etc. that the app doesn't use), but a ~50% reduction to 5 KB is optimistic. Realistic post-tree-shaking is **~7–9 KB gzipped**.

**Bundle implication:**
- Phase 13 baseline: `/songs/[slug]` First Load JS ≈ 16 KB gzipped (per `13-SUMMARY.md`).
- Phase 14 dep cost: Radix Dialog ~9 KB + CVA ~2 KB + clsx 0.5 KB + tailwind-merge ~6 KB = **~17.5 KB**.
- New total: ~33.5 KB.
- Budget: 50 KB.
- **Headroom: ~16.5 KB.** Comfortable. CONTEXT D-23's "~2 KB margin" was based on a stale ~40 KB baseline.

**Action for planner:** Update Phase 14 wave 1 / 2+ dep math against the corrected baseline. The decision to use Radix Dialog stands; the BUDGET PRESSURE narrative needs softening.

### 4. Mobile parity Playwright spec pattern (SPEC AC #11)

**Existing config** (`playwright.config.ts:67`):
```typescript
projects: [{ name: "chromium", use: { browserName: "chromium" } }]
```

There is **NO mobile project** today — only one chromium project. Phase 14 must add one. **Two options:**
- (A) Add a second `mobile` project: `{ name: "mobile", use: { ..., viewport: { width: 390, height: 844 } } }` and gate the new spec to `--project mobile`.
- (B) Set viewport per-spec via `test.use({ viewport: { width: 390, height: 844 } })`.

Option B is simpler and matches the single-spec scope (only `mobile-parity.spec.ts` needs the override). Existing specs continue using the chromium-default viewport.

**Concrete spec skeleton:**

```typescript
// tests/e2e/mobile-parity.spec.ts — Phase 14 SPEC AC #11
import { test, expect } from "../support/fixtures";

const ROUTES_DARK = [
  "/",
  "/songs",
  "/anime-list",
  "/songs/again-yui",                  // SEEDED_SLUGS[0] — Phase 08.1 corpus
  "/kana",
  "/kana/session",
  "/kana/session/summary",
  "/path",
  "/vocabulary",
  "/review",
  "/profile",
];

test.use({ viewport: { width: 390, height: 844 } });  // iPhone 14 portrait

test.describe("Phase 14 / mobile parity (390×844)", () => {
  for (const route of ROUTES_DARK) {
    test(`${route} — no horizontal scroll`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`${route} — tap targets ≥44×44px`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Audit all interactive elements. Returns array of {selector, w, h} for failures.
      const failures = await page.evaluate(() => {
        const targets = Array.from(
          document.querySelectorAll<HTMLElement>(
            'button, a, [role="button"], input:not([type="hidden"]), select, textarea'
          )
        );
        return targets
          .filter((el) => {
            const r = el.getBoundingClientRect();
            // Ignore hidden / zero-size (display:none collapses to 0×0)
            if (r.width === 0 && r.height === 0) return false;
            return r.width < 44 || r.height < 44;
          })
          .slice(0, 20)  // bound output for readable failure
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent?.slice(0, 30),
            w: el.getBoundingClientRect().width,
            h: el.getBoundingClientRect().height,
          }));
      });
      expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    });
  }
});
```

**Existing pattern reference:** `tests/e2e/iframe-defer.spec.ts` shows the convention for grouped `describe` blocks with named test cases — `mobile-parity.spec.ts` follows the same shape.

### 5. axe-core Playwright integration (SPEC AC #13)

**Status:** `@axe-core/playwright` is **NOT installed**. Latest published version is **4.11.3** (`npm view @axe-core/playwright version`).

**Install:**
```bash
npm install --save-dev @axe-core/playwright
```

**Concrete spec skeleton:**

```typescript
// tests/e2e/a11y.spec.ts — Phase 14 SPEC AC #13
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../support/fixtures";

const ROUTES = [
  "/", "/songs", "/anime-list", "/songs/again-yui",
  "/kana", "/kana/session", "/kana/session/summary",
  "/path", "/vocabulary", "/review", "/profile",
];

const THEMES = ["dark", "light"] as const;

test.describe("Phase 14 / a11y (axe-core, both themes)", () => {
  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`${route} (${theme}) — zero serious/critical axe violations`, async ({ page, context }) => {
        // Set the kb_theme cookie BEFORE navigating so SSR picks it up
        await context.addCookies([
          { name: "kb_theme", value: theme, url: "http://localhost:7000",
            sameSite: "Lax" },
        ]);

        await page.goto(route);
        // Pitfall 8 — wait for hydration / lazy content
        await page.waitForLoadState("networkidle");

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        const blocking = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        );

        // Print violation summary on failure for triage
        if (blocking.length > 0) {
          console.error(
            "Axe violations:",
            JSON.stringify(
              blocking.map((v) => ({
                id: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.length,
              })),
              null,
              2
            )
          );
        }
        expect(blocking).toHaveLength(0);
      });
    }
  }
});
```

**This produces 22 test cases (11 routes × 2 themes).** That's heavy for the 15-minute suite budget — consider running a11y in `nightly-full` only, NOT `pr-checks`. The planner can decide based on budget.

### 6. Theme persistence integration test pattern (req 9)

**Pattern reference:** `tests/integration/gamification.test.ts` and `tests/integration/save-session-results.test.ts` are the closest existing patterns. Both:
- Skip-gate on `TEST_DATABASE_URL` (`describeIfTestDb` helper).
- Direct SQL for setup/teardown via `db.execute(sql\`...\`)`.
- Reset state in `beforeEach` / `afterAll` (`resetTestProgress(TEST_USER_ID)`).
- Use `getTestDb()` from `tests/support/test-db.ts`.

**No existing test reads `cookies()` from `next/headers`** — Phase 14 is greenfield here. The closest is `tests/integration/admin-songs-api.test.ts` which calls route handlers directly. For theme persistence, two layers need testing:

1. **Server action layer** (`setThemePreference`) — writes DB column + cookie. Direct test against the action.
2. **SSR cookie → `data-theme` round-trip** — render `RootLayout` server component with mocked cookies.

**Concrete skeleton (action layer is safer to integration-test; SSR layer can be E2E):**

```typescript
// tests/integration/theme-persistence.test.ts — Phase 14 req 9
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setThemePreference, getThemePreference } from "@/app/actions/userPrefs";
import { getTestDb, resetTestProgress, TEST_USER_ID } from "../support/test-db";

const HAS_TEST_DB = !!process.env.TEST_DATABASE_URL;
const describeIfTestDb = HAS_TEST_DB ? describe : describe.skip;

describeIfTestDb("theme persistence", () => {
  beforeEach(async () => {
    await resetTestProgress(TEST_USER_ID);
    // Reset theme_preference column to 'system' default
    const db = getTestDb();
    await db.execute(sql`
      UPDATE users SET theme_preference = 'system' WHERE id = ${TEST_USER_ID}
    `);
  });

  afterAll(async () => {
    await resetTestProgress(TEST_USER_ID);
  });

  it("setThemePreference('dark') writes the DB column", async () => {
    await setThemePreference(TEST_USER_ID, "dark");

    const db = getTestDb();
    const raw = (await db.execute(sql`
      SELECT theme_preference FROM users WHERE id = ${TEST_USER_ID}
    `)) as unknown as Array<{ theme_preference: string }> | { rows: Array<{ theme_preference: string }> };
    const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
    expect(rows[0]?.theme_preference).toBe("dark");
  });

  it("setThemePreference rejects invalid values", async () => {
    await expect(setThemePreference(TEST_USER_ID, "purple" as any))
      .rejects.toThrow();
  });

  it("getThemePreference returns stored value", async () => {
    await setThemePreference(TEST_USER_ID, "light");
    const result = await getThemePreference(TEST_USER_ID);
    expect(result).toBe("light");
  });

  it("getThemePreference returns 'system' for unknown user (default)", async () => {
    const result = await getThemePreference("nonexistent-user");
    expect(result).toBe("system");
  });
});
```

**SSR cookie round-trip is best tested as E2E** (Playwright sets cookie → navigates → asserts `<html data-theme>` attribute). Add this case to `tests/e2e/a11y.spec.ts` setup since it's already setting the cookie there.

```typescript
// tests/e2e/theme-toggle.spec.ts — SSR cookie round-trip
import { test, expect } from "../support/fixtures";

test("dark cookie → html[data-theme=dark]", async ({ page, context }) => {
  await context.addCookies([
    { name: "kb_theme", value: "dark", url: "http://localhost:7000", sameSite: "Lax" }
  ]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("light cookie → html[data-theme=light]", async ({ page, context }) => {
  await context.addCookies([
    { name: "kb_theme", value: "light", url: "http://localhost:7000", sameSite: "Lax" }
  ]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
```

### 7. Existing `__dev/` route conventions (D-15)

**Verified:** No `__dev/` or `__test/` routes exist in the codebase today (`src/app/__dev/` is absent — `Glob` returned no files). This is greenfield.

**Convention recommendation** (informed by similar Next.js dev-route patterns and the project's `NEXT_PUBLIC_APP_ENV` discipline):

```typescript
// src/app/__dev/states/page.tsx — D-15
import { notFound } from "next/navigation";

// Per D-15: visible in dev (env undefined) and test (env === 'test'),
// hidden in production (env === 'production' set explicitly in vercel-build
// and qa-suite.yml:76 build step).
export default function DevStatesPage() {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8">
      <h1 className="text-3xl font-bold mb-2">__dev / states catalog</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Phase 14 D-15 — every async surface × {`{empty, loading, error}`}.
        Hidden in production.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* One <StateCard> per surface × state, e.g.: */}
        {/* <StateCard label="vocabulary / empty"><VocabularyEmptyState mock /></StateCard> */}
        {/* etc — 24 cards total */}
      </div>
    </div>
  );
}
```

**Layout convention:** No `__dev/layout.tsx` needed — the route inherits `RootLayout`. If the planner wants to gate the entire `__dev/*` subtree behind one check, add `src/app/__dev/layout.tsx` with the same `notFound()` check.

**Naming:** `__dev/` (double-underscore prefix) is convention-only — Next.js doesn't treat it specially. The double-underscore signals "internal/private" to readers. Alternative is `_dev/` (single underscore = private folder per Next.js convention, won't get its own URL) — but D-15 explicitly wants the route to be reachable in dev/test, so double-underscore is correct.

### 8. Validation Architecture (Nyquist) — see dedicated section below

### 9. Lint gate failure-mode patterns (req 2 acceptance)

**The exact regexes the audit script will use:**

```typescript
// scripts/audit/token-compliance.ts — pattern set
const PATTERNS = {
  // SPEC §2 acceptance: bg-[#abc123] etc. Violation iff outside allowlist.
  rawHex: /\b(bg|text|border|fill|stroke|ring|shadow|outline|decoration|caret|accent|divide|placeholder)-\[#[0-9a-fA-F]{3,8}\]/g,

  // Arbitrary px utilities — the [14px] / [12px] / [6px] cases SPEC names.
  // Allows numeric-with-decimal (1.5px never seen but semantically same).
  arbitraryPx: /\b(text|p[xytrbl]?|m[xytrbl]?|gap|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|space-[xy]|leading|tracking|rounded[a-z-]*|border|shadow|translate-[xy]|grid-cols|grid-rows|basis|size)-\[\d+(\.\d+)?px\]/g,

  // Tailwind palette utilities — full enumeration of color families × shade scale.
  // Catches bg-gray-950 (the layout.tsx D-08/D-09 violation), bg-red-500
  // (the AdvancedDrillsUpsellModal:101 violation), bg-orange-600
  // (LevelUpTakeover:99), text-zinc-300 (RowUnlockModal:41), etc.
  paletteUtility: /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent|shadow|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,

  // Bare bg-white / bg-black are ALSO violations (no token reference).
  // Less common but RowUnlockModal:36 has bg-white.
  bareWhiteBlack: /\b(bg|text|border|fill|stroke|ring|outline|decoration|divide|placeholder|caret|accent)-(white|black)\b(?!\/)/g,
};

const ALLOWLIST = [
  "src/components/ui/",       // primitives surface (D-18)
  "src/app/admin/",
  "src/app/__dev/",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/globals.css",      // token grammar lives here
];
```

**Specific violations the regexes catch (from this codebase, verified):**
- `src/app/layout.tsx:39` `bg-gray-950` → `paletteUtility` ✓
- `src/app/layout.tsx:55` `text-red-500` → `paletteUtility` ✓
- `src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx:71` `bg-gray-900`, `border-gray-700` → `paletteUtility` ✓
- `src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx:101` `bg-red-600` → `paletteUtility` ✓
- `src/app/components/LevelUpTakeover.tsx:99` `bg-orange-600` → `paletteUtility` ✓
- `src/app/kana/components/RowUnlockModal.tsx:36` `bg-white`, `dark:bg-zinc-900` → `bareWhiteBlack` + `paletteUtility` ✓
- `src/app/dashboard/page.tsx:68` `[14px]` style arbitrary → `arbitraryPx` ✓ (BUT dashboard is out-of-scope per SPEC — Pitfall 6)
- `src/app/songs/[slug]/components/SongLayout.tsx` `bg-gray-950` → `paletteUtility` ✓ (LevelUpTakeover variant)

**Audit script shape (mirrors `scripts/audit/conjugation-form-coverage.ts:1-30` header convention):**

```typescript
#!/usr/bin/env tsx
// scripts/audit/token-compliance.ts — Phase 14 D-17 grep audit
//
// Belt-and-suspenders against the ESLint rule. Catches:
//   - Hex inside template literals the AST visitor missed
//   - Hex inside string-concat patterns
//   - Hex inside non-className props (e.g., style={{ color: '#abc' }})
//
// Exit 0 = clean. Exit 1 = violations found. Used by .github/workflows/qa-suite.yml.
//
// Usage:
//   npx tsx scripts/audit/token-compliance.ts
//   npx tsx scripts/audit/token-compliance.ts --json   # machine-readable

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const PATTERNS = { /* as above */ };
const ALLOWLIST = [ /* as above */ ];

function isAllowed(path: string): boolean {
  const rel = relative(ROOT, path).replace(/\\/g, "/");
  return ALLOWLIST.some((p) => rel.startsWith(p));
}

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) yield full;
  }
}

const violations: Array<{ file: string; line: number; pattern: string; match: string }> = [];

for (const file of walk(SRC)) {
  if (isAllowed(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re] of Object.entries(PATTERNS)) {
      for (const m of line.matchAll(re)) {
        violations.push({
          file: relative(ROOT, file).replace(/\\/g, "/"),
          line: i + 1,
          pattern: name,
          match: m[0],
        });
      }
    }
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(violations, null, 2));
} else {
  for (const v of violations.slice(0, 100)) {
    console.error(`${v.file}:${v.line}  [${v.pattern}]  ${v.match}`);
  }
  console.error(`\n${violations.length} violation(s).`);
}

process.exit(violations.length === 0 ? 0 : 1);
```

### 10. CI workflow extension (D-17)

**Current `pr-checks` job** (`.github/workflows/qa-suite.yml:42-83`):

```yaml
jobs:
  pr-checks:
    name: PR checks (unit + integration + qa)
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      pull-requests: write
    env:
      TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      NEXT_PUBLIC_APP_ENV: test
    steps:
      - name: Checkout
      - name: Setup Node 20
      - name: Install deps                    # npm ci
      - name: Seed test DB                    # npm run test:seed
      - name: Run PR suite                    # npm run test:ci-pr  (qa + unit + integration)
      - name: Build (Phase 13)                # npm run build  (with NEXT_PUBLIC_APP_ENV=production)
      - name: Bundle size check (Phase 13)    # andresz1/size-limit-action@v1
```

**`npm run lint` is NOT currently a CI step.** The `package.json:13` script `"lint": "next lint"` exists but never runs in CI. Phase 14 must add it.

**Diff-style sketch of the workflow extension:**

```yaml
# .github/workflows/qa-suite.yml — Phase 14 D-17 extension
jobs:
  pr-checks:
    # ... existing setup unchanged ...
    steps:
      - name: Checkout
      - name: Setup Node 20
      - name: Install deps
      - name: Seed test DB
      - name: Run PR suite
+     - name: Lint (Phase 14 — D-17 token-compliance ESLint rule)
+       run: npm run lint
+
+     - name: Token compliance grep audit (Phase 14 — D-17 belt-and-suspenders)
+       run: npx tsx scripts/audit/token-compliance.ts
+
      - name: Build (Phase 13 — for bundle measurement)
        run: npm run build
        env:
          NEXT_PUBLIC_APP_ENV: production
      - name: Bundle size check (Phase 13)
        # ... unchanged ...
```

**Sequencing rationale:**
1. Lint runs BEFORE build — fast feedback, no need to compile if lint fails.
2. Audit runs AFTER lint, BEFORE build — same reasoning.
3. Build + size-limit unchanged — Phase 13's hard-fail gate is preserved (D-23).

**Failure mode:** Hard-fail (no `continue-on-error`), per the file's existing zero-flake policy comment (`qa-suite.yml:23-24`).

**Time budget impact:** `npm run lint` over `~150 .tsx` files takes ~5–10 seconds. `tsx scripts/audit/token-compliance.ts` is a single-pass grep over `src/` — ~2 seconds. Total addition: ~12 seconds. Within the 10-minute timeout (currently `pr-checks` runs in ~3 min per Phase 13 SUMMARY).

**`nightly-full` job:** No Phase 14 changes needed. The `test:ci-nightly` script runs the full Playwright suite via `tsx scripts/qa/measure-suite-runtime.ts`. The new `mobile-parity.spec.ts` and `a11y.spec.ts` will be picked up automatically by Playwright's `testDir: "./tests"` + `testMatch: ["**/*.spec.ts"]` (per `playwright.config.ts:14-18`). The 15-minute budget covers this. **However**, 22 a11y test cases are heavyweight — if they break the budget, gate `a11y.spec.ts` to nightly-only by adding it to `playwright.config.ts:testIgnore` for default runs and a separate `npm run test:e2e:a11y` script.

---

## Validation Architecture (Nyquist)

> Phase 14 has `nyquist_validation` enabled (default — no override in `.planning/config.json`). The Wave 0 verification gate uses the table below to derive `VALIDATION.md`.

### Test Framework

| Property | Value |
|----------|-------|
| **Unit framework** | Vitest 4.1.4 (`package.json:91`) + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Integration framework** | Vitest 4.1.4 against Neon test DB (`tests/integration/setup.ts` redirects `DATABASE_URL` → `TEST_DATABASE_URL`) |
| **E2E framework** | Playwright 1.59.1 (`playwright.config.ts`); single chromium project; zero retries (zero-flake policy) |
| **Lint framework** | ESLint 9 (to install) — flat config `eslint.config.mjs` + custom plugin `eslint-plugins/kitsubeat-tokens/` |
| **Audit framework** | Plain `tsx` script — `scripts/audit/token-compliance.ts` — exit-0/1 contract |
| **A11y framework** | `@axe-core/playwright@4.11.3` (to install) — wraps the Playwright runtime |
| **Bundle gate** | `size-limit@12.1.0` + `@size-limit/preset-app@12.1.0` (Phase 13 — already wired) |
| **Lighthouse** | Manual — `npm run lighthouse:baseline` per Phase 13 D-15 (informational only for Phase 14; the post-Phase-14 baseline becomes the Phase 19 entry-gate input) |
| **Quick run command** | `npm run test:unit` (~5s) — narrow primitive variant assertions |
| **Full suite command** | `npm run test:all` (15-min budget per Phase 08.1) |

### Phase Requirements → Test Map

| Req | Behavior to validate | Test type | Automated command | File |
|-----|----------------------|-----------|-------------------|------|
| 1 (tokens) | `globals.css` defines all tokens listed in SPEC §A; toggling `data-theme` flips colors w/o reflow | manual + visual diff | (visual review via `__dev/states`) | (no file — manual) |
| 1 (tokens) | All tokens reach Tailwind via `@theme` block — utility classes resolve correctly | E2E | `npx playwright test theme-toggle.spec.ts` | `tests/e2e/theme-toggle.spec.ts` (Wave 0) |
| 2 (lint gate) | `npm run lint` fails on a deliberately-introduced raw hex in a non-allowlisted file | unit | `node eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` | `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` (Wave 0) |
| 2 (audit) | `npx tsx scripts/audit/token-compliance.ts` exits 0 on green main; exits 1 on a planted violation | smoke | `npx tsx scripts/audit/token-compliance.ts` | `scripts/audit/token-compliance.ts` (Wave 0) |
| 3 (primitives) | Button renders all 9 variant×size combinations correctly | unit | `npx vitest run src/components/ui/__tests__/Button.test.tsx -x` | `src/components/ui/__tests__/Button.test.tsx` (Wave 0) |
| 3 (primitives) | Card renders all 3 variants correctly | unit | `npx vitest run src/components/ui/__tests__/Card.test.tsx -x` | `src/components/ui/__tests__/Card.test.tsx` (Wave 0) |
| 3 (primitives) | Badge renders all 4 variants correctly | unit | `npx vitest run src/components/ui/__tests__/Badge.test.tsx -x` | `src/components/ui/__tests__/Badge.test.tsx` (Wave 0) |
| 3 (primitives) | Modal opens/closes via Trigger; ESC closes; backdrop click closes; focus trapped | unit (jsdom) + E2E | `npx vitest run src/components/ui/__tests__/Modal.test.tsx -x` | `src/components/ui/__tests__/Modal.test.tsx` (Wave 0) |
| 3 (migration) | Every JLPT/grammar badge in the codebase imports from `src/components/ui/Badge.tsx` | grep | `npx tsx scripts/audit/badge-migration-coverage.ts` | (deferred to wave 2+ — coverage tracker) |
| 4 (surfaces) | Every in-scope surface visually matches the Claude Design output (or token-only swap per D-22) | manual | (visual walkthrough) | (no file — manual) |
| 5 (mobile) | No horizontal scroll at 390×844 on every in-scope route | E2E | `npx playwright test mobile-parity.spec.ts` | `tests/e2e/mobile-parity.spec.ts` (Wave 0) |
| 5 (mobile) | All interactive elements ≥44×44px on mobile | E2E | `npx playwright test mobile-parity.spec.ts -g "tap targets"` | (same file) |
| 6 (motion) | `docs/motion-catalog.md` exists with all 12 entries × 5 fields | smoke | `npx tsx scripts/audit/motion-catalog-completeness.ts` | (Wave 0 — small script) |
| 6 (motion) | `prefers-reduced-motion: reduce` skips all cataloged animations | E2E | `npx playwright test reduced-motion.spec.ts` | `tests/e2e/reduced-motion.spec.ts` (Wave 0) |
| 7 (states) | `__dev/states` route renders all 24 states without error in dev/test env | E2E | `npx playwright test dev-states.spec.ts` | `tests/e2e/dev-states.spec.ts` (Wave 0 — single page-load smoke test) |
| 7 (states) | `__dev/states` returns 404 in production env | unit | `npx vitest run src/app/__dev/states/__tests__/gate.test.ts` | (Wave 0) |
| 8 (a11y) | Zero serious/critical axe violations on each in-scope route × 2 themes | E2E | `npx playwright test a11y.spec.ts` | `tests/e2e/a11y.spec.ts` (Wave 0) |
| 8 (a11y) | Lighthouse a11y ≥95 per surface | manual | `npm run lighthouse:baseline` | (manual baseline per D-14 / Phase 13 D-15 pattern) |
| 9 (theme) | `setThemePreference` writes the `users.theme_preference` column | integration | `npx vitest run tests/integration/theme-persistence.test.ts -x` | `tests/integration/theme-persistence.test.ts` (Wave 0) |
| 9 (theme) | `kb_theme` cookie + SSR sets `<html data-theme>` correctly | E2E | `npx playwright test theme-toggle.spec.ts` | `tests/e2e/theme-toggle.spec.ts` (Wave 0) |
| 9 (theme) | First visit reads `prefers-color-scheme` (no cookie set) | manual + E2E | `npx playwright test theme-toggle.spec.ts -g "prefers-color-scheme"` | (same file, with `colorScheme: 'dark' \| 'light'` set in Playwright context) |
| (carry) | `size-limit` budget on `/songs/[slug]` stays ≤50 KB gzipped | smoke | `npm run size` | `.size-limit.cjs` (Phase 13) |

### Sampling Rate

- **Per task commit:** `npm run lint && npm run test:unit` — fast feedback (~10s).
- **Per wave merge:** `npm run lint && npx tsx scripts/audit/token-compliance.ts && npm run test:unit && npm run test:integration && npm run size`.
- **Phase gate (before `/gsd-verify-work`):** Full `npm run test:all` green + `npm run size` green + manual visual walkthrough at 390×844 and 1280×900 in BOTH themes.

### Wave 0 Gaps

The following test infrastructure does NOT exist yet and must land in Wave 0 before any other tasks proceed:

- [ ] `eslint.config.mjs` — flat config + custom plugin import (req 2)
- [ ] `eslint-plugins/kitsubeat-tokens/index.js` — custom rule implementation (req 2)
- [ ] `eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js` — rule's own test fixtures (req 2)
- [ ] `scripts/audit/token-compliance.ts` — grep audit (req 2)
- [ ] `tests/e2e/mobile-parity.spec.ts` — mobile viewport spec (req 5)
- [ ] `tests/e2e/a11y.spec.ts` — axe-core integration (req 8)
- [ ] `tests/e2e/theme-toggle.spec.ts` — SSR cookie round-trip (req 9)
- [ ] `tests/e2e/reduced-motion.spec.ts` — prefers-reduced-motion verification (req 6)
- [ ] `tests/e2e/dev-states.spec.ts` — `__dev/states` smoke test (req 7)
- [ ] `tests/integration/theme-persistence.test.ts` — DB column round-trip (req 9)
- [ ] `src/components/ui/__tests__/{Button,Card,Badge,Modal,EmptyState}.test.tsx` — primitive variant coverage (req 3)
- [ ] `src/app/__dev/states/__tests__/gate.test.ts` — production gate test (req 7)
- [ ] `docs/motion-catalog.md` — 12 entries × 5 fields (req 6 — content, not infra)
- [ ] Framework install: `npm install --save-dev eslint eslint-config-next @axe-core/playwright`
- [ ] Dependency install: `npm install @radix-ui/react-dialog class-variance-authority tailwind-merge clsx`

---

## Environment Availability

| Dependency | Required by | Available? | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20 | All | ✓ | per `qa-suite.yml:60` | — |
| npm | All | ✓ | (bundled with Node) | — |
| Playwright chromium | E2E specs | ✓ | 1.59.1 | — |
| Postgres (test DB) | Integration tests | ✓ via `TEST_DATABASE_URL` | Neon-hosted | Tests skip cleanly without env |
| `npm` registry connectivity | Install Phase 14 deps | ✓ | — | — |
| `bundlephobia.com` | Bundle-size verification | ✓ | — | (used at research time only; not at run time) |
| Local dev server `localhost:7000` | Manual visual review + Playwright `webServer` | ✓ | per `playwright.config.ts:51` | — |
| ChromeDP for Lighthouse | Optional informational baseline | ✓ (per Phase 13 D-15) | Lighthouse 13.1.0 | Skip — Phase 14 not on the hook for Lighthouse perf scores per D-29 |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all Phase 14 needs are either already present or installable from npm.

---

## Open Questions

1. **`/dashboard` route fate** — currently a stub with 18 `bg-gray-N00` hits and 1 `[14px]` hit. SPEC marks it out-of-scope. The lint allowlist as drafted does NOT include `dashboard`. Three options: (a) include in allowlist (allows the stub to silently rot), (b) exclude from allowlist (lint will fail, blocking Phase 14 merge until it's fixed or deleted), (c) delete the route in Phase 14 wave 0 cleanup. Recommendation: **(c) delete** — the route is "likely deprecated" per SPEC and is the largest single source of token violations. Planner: confirm with user / product before deletion.

2. **Tailwind v4 `dark:` variant** — `RowUnlockModal.tsx:36` uses `dark:bg-zinc-900`. With `data-theme` attribute switching, Tailwind v4's default `dark:` (which reads `prefers-color-scheme`) will diverge from `data-theme`. Options: (a) add `@variant dark (&:where([data-theme=dark], [data-theme=dark] *))` declaration in `globals.css` to rebind, (b) rewrite the file to use direct tokens. Recommendation: **(b) rewrite** — only one file affected, and it'll be migrated as part of `/kana` wave anyway.

3. **`a11y.spec.ts` time budget** — 22 test cases (11 routes × 2 themes) at ~3–5 seconds each is ~60–110 seconds. Adding to `pr-checks` may push the suite past 10-minute timeout. Decision needed: gate to `nightly-full` only? Recommendation: gate to nightly-only initially; if nightly is fine, promote to PR checks after a week of green runs.

4. **Theme toggle visual placement** — D-10 says BOTH `/profile` AND header. Header toggle is a sun/moon icon button (Lucide is suggested). The header in `layout.tsx:40-86` is currently a flat row with no obvious slot for a fifth control next to `Profile`. Planner: pick a placement (rightmost slot, replacing or augmenting the icon row).

5. **Existing keyframes (`star-shine`, `level-pop`) reduced-motion behavior** — the global `@media (prefers-reduced-motion: reduce)` override (D-13) collapses `animation-duration: 0ms`, but the keyframes' own `transform: scale(0)` start state will leave the element invisibly scaled. Confirm this is desired ("instant fill, no shine") or whether `animation: none` plus `opacity: 1; transform: scale(1)` reset is needed per element. Likely fine in practice (the `100%` keyframe sets `scale(1) opacity: 1`), but worth a 30-second devtools check during Wave 1.

6. **Cookie name collision risk** — `kb_theme` is fresh; no existing cookie reads in the codebase (verified by grep on `next/headers`/`cookies()` — zero hits). No collision concerns.

7. **Phase 13 `revalidateTag('song:${slug}')` — does theme switch invalidate?** Theme is a per-user attribute on a route that's currently `force-dynamic` for most surfaces and tag-cached for `/songs/[slug]`. Server action that writes `theme_preference` should NOT call `revalidateTag` for any song tag — theme is rendering-side only. Confirm during plan-phase.

---

## Open Risks

1. **Light theme color values are estimated, not designed.** D-03 names contrast targets and provides specific values, but no Claude Design output exists for light theme. The values listed in CONTEXT D-03 are the planner's working baseline. If user-perception testing finds specific values too cold/warm/dim, Wave 1 may need a re-spin. Mitigation: build the light theme with documented values, mark Phase 14.1 as a possible follow-up if visual review reveals issues.

2. **`tailwind-merge@3.5.0` raw size of 984 KB** is unusually large (most utility libs are ~50 KB). The npm package likely ships with TS source files for editor tooling. Bundlephobia is the only authoritative source for the actual bundled size (~6 KB gzipped per estimate). **Action:** in Wave 0, run `npm run build && npm run size` AFTER installing tailwind-merge to confirm actual route bundle delta. If >2 KB delta on `/songs/[slug]`, consider an alternative like `clsx`-only with manual dedupe (acceptable for our limited overlap surface).

3. **The 4 modals identified by grep may not be exhaustive.** A 5th modal could exist using a different DOM shape (e.g., absolutely-positioned inline rather than `fixed inset-0`). Confidence is HIGH that the 4 are the canonical ones (they all have the canonical `aria-modal="true"` attribute, verified by separate grep), but Wave 1 should add a coverage check: every component matching `aria-modal` or `role="dialog"` must use the new `Modal` primitive.

4. **`size-limit` baseline drift between Phase 13 merge and Phase 14 start.** Phase 13 SUMMARY captures ~16 KB on 2026-04-30. Today is 2026-05-01. Plans 11.4 / 12 finalization may have shifted this. Planner: run `npm run size` as the FIRST action in Wave 0 to capture the actual current baseline before adding any deps.

5. **`lighthouse:baseline` artifacts contain no data yet** — `13-SUMMARY.md` shows the baseline IS captured (mobile perf 85, desktop 87 on `/songs/[slug]`). These ARE the Phase 19 entry-gate inputs. Phase 14 must NOT regress these scores significantly (D-29). After wave 5+ ships, re-run `npm run lighthouse:baseline` to verify no regression — if perf drops below 80, escalate.

---

## Sources

### Primary (HIGH confidence)
- [`14-CONTEXT.md`](./14-CONTEXT.md) — locked decisions D-01 through D-29
- [`14-SPEC.md`](./14-SPEC.md) — locked requirements 1–9, 21 acceptance criteria, Appendix A token spec
- [`13-SUMMARY.md`](../13-performance-infrastructure/13-SUMMARY.md) — Performance baseline section (route bundle sizes, Lighthouse scores)
- [`13-CONTEXT.md`](../13-performance-infrastructure/13-CONTEXT.md) — D-09 size-limit, D-18 three-layer test discipline, D-20 test-only state gating
- `kitsubeat/CLAUDE.md` (project instructions) — dual-graph MCP policy, dev port 7000, conventional commits
- `velora-projects/CLAUDE.md` (vault instructions) — interview signal context
- `package.json` — verified deps (`next@15.5.14`, `tailwindcss@4.2.2`, `react@19.2.4`, `vitest@4.1.4`, `@playwright/test@1.59.1`, `size-limit@12.1.0`, `canvas-confetti@1.9.4`)
- `.github/workflows/qa-suite.yml` — `pr-checks` job structure
- `playwright.config.ts` — single chromium project, `viewport` per-spec extension model
- `src/app/globals.css` — current `@theme` block (grammar + JLPT colors, star-shine, level-pop)
- `src/app/layout.tsx` — current `bg-gray-950` violation site, header structure
- `src/lib/db/schema.ts:291-321` — `users` table shape for D-11 column add
- `drizzle/0014_vocab_image_url.sql` — exact pattern for D-11 hand-written migration
- `tests/integration/gamification.test.ts` — pattern for D-09 theme persistence integration test
- `tests/e2e/iframe-defer.spec.ts` — pattern for E2E spec structure
- npm registry queries (`npm view`) — verified versions for all proposed deps

### Secondary (MEDIUM — verified with primary source)
- [bundlephobia API for `@radix-ui/react-dialog@1.1.15`](https://bundlephobia.com/api/size?package=@radix-ui/react-dialog@1.1.15) — gzipped size 10830 bytes
- [Next.js ESLint config docs](https://nextjs.org/docs/app/api-reference/config/eslint) — `next lint` removed in Next 16; use ESLint CLI directly
- [Next.js ESLint flat config tutorial (chris.lu)](https://chris.lu/web_development/tutorials/next-js-static-first-mdx-starterkit/linting-setup-using-eslint) — `eslint.config.mjs` + `FlatCompat` shape
- Phase 13 SUMMARY size baseline cross-referenced against `.size-limit.cjs` baseline-derivation comments (both written same week)

### Tertiary (LOW — single source, training-knowledge or estimate)
- `class-variance-authority@0.7.1` gzipped size estimate ~2 KB (no bundlephobia query — inferred from raw `dist.unpackedSize`)
- `clsx@2.1.1` gzipped size estimate ~0.5 KB (canonical knowledge — clsx is famously small)
- `tailwind-merge@3.5.0` gzipped size estimate ~6 KB (raw 984 KB includes TS source — needs Wave 0 actual measurement)
- Tailwind v4 `@variant dark` selector rebind syntax — CITED to Tailwind docs but not VERIFIED in this codebase (Pitfall 7 / A3)
- Radix Dialog's `react-remove-scroll` dep cost ~3 KB — estimated from typical scroll-lock library sizes

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions confirmed via `npm view`, all bundle estimates either verified via bundlephobia or flagged as estimate
- Architecture: **HIGH** — every reference file inspected, every D-NN cross-checked against the underlying surface
- Pitfalls: **MEDIUM** — Pitfalls 4, 7, 8, 10 are based on Next 15 / Tailwind v4 / Radix conventions but not all verified against this codebase; Wave 0 work will surface any wrong assumptions
- Existing call-site audit: **HIGH** — every grep run against the live `src/` tree, counts and file lists are reproducible
- Validation Architecture: **HIGH** — every test file path proposed maps to an existing pattern in `tests/`
- Cookie / SSR theme persistence: **MEDIUM** — pattern is greenfield; no existing reference in codebase, so the integration test skeleton is built from analogous patterns (gamification, save-session-results)

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable stack — npm versions for Radix/CVA/clsx don't churn weekly; if a Tailwind v4.3+ ships before Phase 14 wave 1 starts, re-verify token mechanism syntax)

---

## RESEARCH COMPLETE
