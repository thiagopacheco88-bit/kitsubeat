# Phase 14: UX Polish — Specification

**Created:** 2026-05-01
**Ambiguity score:** 0.17 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

Every learner-facing surface in KitsuBeat (11 surfaces) renders against a single tokenized design system in two colorways (dark + light), uses shared Button/Card/Badge/Modal primitives instead of inline implementations, ships designed empty/loading/error states for every async surface, honors a 12-entry microinteraction catalog with `prefers-reduced-motion` fallbacks, and passes a CI-enforced token-compliance lint gate plus axe/Lighthouse accessibility ≥95.

## Background

**Current state (verified by codebase scout, 2026-05-01):**

| Layer | What exists | What's missing |
|---|---|---|
| **Design tokens** | `src/app/globals.css` `@theme` block defines grammar colors (noun/verb/adj/adv/particle/expression/other) and JLPT colors (N5–N1) only | No bg/card/border/text/muted hierarchy, no radii scale, no shadow scale, no motion durations, no spacing rhythm, no light theme vars |
| **Typography** | Inter (UI) + Noto Sans JP (JP) loaded via `next/font` and Google Fonts CDN | No type ramp documented; sizes/weights set inline per surface |
| **Color usage** | Tailwind palette (`bg-gray-950`, `bg-gray-900`, `text-red-500`, etc.) plus arbitrary values (`bg-[#191919]`) scattered across components | Inconsistent — no enforcement, no token-only path |
| **Component primitives** | Inline-styled buttons/cards/badges/modals across every surface (e.g., `AdvancedDrillsUpsellModal`, `RowUnlockModal`, `UpsellModal`, `LevelUpTakeover` all reimplement modal shell) | No `<Button>`, `<Card>`, `<Badge>`, `<Modal>` shared primitive |
| **Motion** | `globals.css` defines `star-shine` and `level-pop` keyframes; `canvas-confetti` used at milestones; CSS transitions inline on cards | No catalog, no reduced-motion fallback policy, no shared duration/easing tokens |
| **Mobile** | `max-w-6xl` container on most surfaces; song page tested mobile-OK; remainder unverified | No mobile-first design produced; no per-surface viewport audit |
| **Theming** | Dark only (hard-coded `bg-gray-950` in `layout.tsx`) | No light theme; no `prefers-color-scheme` switching; no toggle |
| **States** | Some loading skeletons (`KnownWordCount`); some empty states (`/vocabulary`); error.tsx + global-error.tsx exist as Next defaults | No designed empty/loading/error per async surface; states unsystematic |
| **A11y** | No measured baseline | Phase 18 will do full WCAG audit, but Phase 14 must lock the floor for what ships now |
| **Existing design assets** | Two Claude Design handoffs in repo: `design_handoff_kitsubeat_home/` (mobile, 390×844) + `design_handoff_kitsubeat_web/design_handoff_kitsubeat_desktop/` (desktop, 1280px). Both home-only. Define detailed dark-theme tokens (`#0E0E0E` bg, `#191919` card, `#ef4444` red), type ramp (44/72px JP, mono eyebrows), radii scale (8/10/12/14/16/18/20/22/24/26/999), shadow recipes, motion 120–200ms. Light theme not in handoff. | Coverage gap: only the home screen is designed; the other 10 in-scope surfaces have no Claude Design output yet. Light theme has no design at all. |

**Trigger for the phase:** v3.0 entry milestone. Phases 12 (gamification) and 13 (perf infrastructure) just landed. Phase 19 launch gate requires Lighthouse perf ≥85 measured against the post-polish design — meaning Phase 13 deferred its Lighthouse measurement to wait for Phase 14's redesign so it doesn't score a soon-to-be-discarded UI.

**Phase 14's role in the v3.0 chain:** UX polish sits before Phase 15 (analytics — events fire from polished components), Phase 16 (security review — auditing the final UI shape), and Phase 19 (free beta — launch surface). Visual identity must be locked here.

## Requirements

1. **Design token system (light + dark)**: Single source-of-truth design tokens exposed as CSS variables, themable via `[data-theme="dark"]` / `[data-theme="light"]` on `<html>`, available to Tailwind v4's `@theme` block.
   - Current: `@theme` defines grammar + JLPT colors only; no surface/text/border/radii/shadow/motion/spacing tokens; no light theme.
   - Target: Tokens defined for: **color** (bg, bg-elevated, card, card-elevated, border, border-strong, text, text-muted, text-dim, accent — all in dark + light variants); **typography** (font-sans, font-jp, font-mono, full size/weight/letter-spacing ramp); **spacing** (4/8/12/16/20/24/32/40/48/64); **radii** (8/10/12/14/16/18/20/22/24/26/999); **shadows** (card-ring, card-ring-strong, hero-glow, button-red, focus-ring); **motion** (duration-fast/base/slow, ease-out/ease-in-out). Plus retained grammar + JLPT color tokens.
   - Acceptance: `src/app/globals.css` `@theme` block + `[data-theme=light]` override block defines every token listed in the §Brand Inputs appendix; running `grep -r "data-theme" src/app/` shows the toggle wired in `layout.tsx`; manually toggling `data-theme` in devtools flips every surface's color without layout reflow.

2. **Token-compliance lint gate**: Raw color hex values and arbitrary `px` Tailwind classes are forbidden in component code; CI fails on violations.
   - Current: Components use raw hex (`bg-[#191919]`), Tailwind palette (`bg-gray-950`), and arbitrary px (`px-[14px]`) freely. No lint rule, no audit.
   - Target: ESLint rule (custom or `eslint-plugin-tailwindcss`) blocks `bg-[#...]`, `text-[#...]`, `border-[#...]`, and arbitrary numeric Tailwind classes outside an allowlist. Plus a `scripts/audit/token-compliance.ts` grep audit that fails if any `*.tsx` file under `src/app/**` (excluding `src/app/admin/**`) contains raw 6-digit hex or `gray-N00`/`red-N00`/etc. Tailwind palette classes. Both wired into `pr-checks` workflow.
   - Acceptance: Running `npm run lint` fails on a deliberately-introduced `bg-[#abc123]` in any in-scope component; running `npx tsx scripts/audit/token-compliance.ts` on the post-phase main branch exits 0; CI workflow `pr-checks.yml` includes both gates and they're green on the merge commit.

3. **Component primitives extracted**: Button, Card, Badge, Modal exist as typed React components in `src/components/ui/`; every existing inline implementation is migrated.
   - Current: Buttons, cards, badges, and modals are reimplemented inline in every surface. Examples: `AdvancedDrillsUpsellModal.tsx`, `RowUnlockModal.tsx`, `UpsellModal.tsx`, `LevelUpTakeover.tsx` each define their own modal shell; every CTA is a raw `<Link className="rounded-lg border…">`; JLPT badges are reinvented in `SongCard`, `WordOfDay`, etc.
   - Target: `src/components/ui/Button.tsx` (variants: `primary | secondary | ghost`; sizes: `sm | md | lg`), `src/components/ui/Card.tsx` (variants: `flat | elevated | hero`), `src/components/ui/Badge.tsx` (variants: `jlpt | grammar | mono | accent`), `src/components/ui/Modal.tsx` (with backdrop, focus trap, ESC-to-close, ARIA `role="dialog"`). Each consumes only design tokens. All existing inline implementations migrated.
   - Acceptance: Running `grep -rn "rounded-lg border" src/app/ | grep -v ui/` returns zero hits in component files; `grep -rn "fixed inset-0.*backdrop" src/app/ | grep -v ui/Modal.tsx` returns zero hits; every JLPT/grammar badge in the codebase imports from `src/components/ui/Badge.tsx`; component primitives have unit tests (Vitest + Testing Library) covering every variant prop.

4. **Surface redesign across 11 in-scope surfaces**: Every learner-facing surface uses the design system, has a Claude Design-produced layout for ≥390px (mobile) and ≥1280px (desktop) viewports, and uses extracted primitives.
   - Current: 11 surfaces ship with ad-hoc layouts, inconsistent visual treatment, no per-surface mobile design.
   - Target: For each in-scope surface (listed in §Boundaries), a Claude Design output exists (mobile + desktop, dark + light) and the implementation matches the design within token compliance. Tablet (768–1279px) gracefully scales — no separate design.
   - Acceptance: Manual visual walkthrough at 390×844 (iPhone 14) and 1280×900 (desktop) viewports shows every surface uses tokens-only colors, shared primitives, and matches the Claude Design output; no surface shows horizontal scroll at 390px viewport; tablet gracefully renders without broken layouts at 768px / 1024px.

5. **Mobile parity floor**: Every in-scope surface renders without horizontal scroll at ≥390px viewport, all interactive tap targets are ≥44×44px.
   - Current: Mobile not systematically tested. Some surfaces likely have tap targets <44px (e.g., text links in carousels, small icon buttons).
   - Target: Manual mobile audit across all 11 in-scope surfaces. Playwright E2E test asserts no horizontal scroll at 390px viewport for each route. CSS-level audit confirms `min-height: 44px; min-width: 44px` on all `<button>`, `<a>` with role `button`, and form inputs in the in-scope surfaces.
   - Acceptance: `npm run test:e2e -- mobile-parity.spec.ts` passes — verifies `document.documentElement.scrollWidth <= window.innerWidth` at 390×844 for each in-scope route; tap-target audit script reports zero violations.

6. **Microinteraction catalog (12 named interactions)**: A documented catalog of motion interactions, each with name, trigger, duration, easing, target element, and `prefers-reduced-motion` fallback.
   - Current: `star-shine` (0.6s) and `level-pop` (0.8s) animations exist; `canvas-confetti` fires at milestones; CSS hover transitions inline. No catalog. No reduced-motion fallback for star-shine, level-pop, or confetti.
   - Target: `docs/motion-catalog.md` documents 12 interactions: (1) verse-highlight pulse, (2) star-earn shine, (3) correct-answer feedback, (4) wrong-answer feedback, (5) level-up takeover, (6) confetti milestone, (7) page-transition fade, (8) hover lift on cards, (9) modal enter, (10) modal exit, (11) toast slide-in, (12) skeleton shimmer. Each entry includes: trigger condition, duration (ms), easing function, target CSS property, reduced-motion fallback (e.g., "no animation; instant state change"). Implemented in `src/lib/motion/` and `globals.css`.
   - Acceptance: `docs/motion-catalog.md` exists with all 12 entries, each containing the 5 fields; manually setting `prefers-reduced-motion: reduce` in browser devtools causes every cataloged animation to either skip or instantly resolve (no motion); confetti is suppressed; star-shine becomes an instant fill.

7. **Empty/loading/error states for every async surface**: Each of the 7 async-loading surfaces ships a designed empty state, loading skeleton, and error state, each consuming tokens + primitives.
   - Current: Some surfaces have skeleton (`KnownWordCount`); some have empty states (`/vocabulary` 0-words case); error states are Next.js default `error.tsx` + `global-error.tsx`.
   - Target: For each of `/songs`, `/anime-list`, `/songs/[slug]`, `/kana`, `/path`, `/vocabulary`, `/review`, `/profile` — designed empty + loading + error state. ~24 designed states total. Generic shells live in `src/components/ui/EmptyState.tsx`, `src/components/ui/Skeleton.tsx`; per-surface variants compose those shells.
   - Acceptance: Each in-scope async surface has all three states demoable via `?state=empty|loading|error` URL param OR via Storybook stories OR via a `__dev/states` catalog route; visual review confirms each state uses tokens-only colors and shared primitives; error state shows recovery action (retry button or link home).

8. **Accessibility floor (WCAG 2.1 AA on in-scope surfaces)**: Lighthouse a11y ≥95 on every in-scope surface; all interactive elements keyboard-navigable; color contrast ≥4.5:1 on body text; visible focus indicators on all interactive elements.
   - Current: A11y not measured. Existing surfaces likely have multiple violations (low-contrast `text-gray-400`, missing focus rings on `<Link>` elements, missing ARIA on custom modals, no visible focus on the in-page nav).
   - Target: Lighthouse a11y score ≥95 on every in-scope surface; axe-core (via Playwright) reports zero violations of severity `serious` or `critical`; manual keyboard-only walkthrough completes the primary user journey on each surface (browse → open song → start exercise → complete session); `prefers-reduced-motion` honored everywhere per req 6.
   - Acceptance: `npm run test:e2e -- a11y.spec.ts` runs `@axe-core/playwright` on each in-scope route and fails on serious/critical violations; Lighthouse CI run (manual baseline acceptable for v1) reports ≥95 a11y per surface; manual keyboard walkthrough video or checklist signed off.

9. **Theme switching (dark + light)**: User can switch between dark and light themes; preference persists across sessions; respects `prefers-color-scheme` on first visit.
   - Current: Dark only, hardcoded in `layout.tsx`.
   - Target: `<html>` carries `data-theme="dark"|"light"`. First visit reads `prefers-color-scheme` to choose default. User toggle in `/profile` (or header — TBD in discuss-phase) writes preference to `users.theme_preference` column (or `localStorage` for unauthenticated). All token CSS vars defined in both colorways. Switching is instant — no page reload.
   - Acceptance: Toggling theme in profile flips `data-theme` attribute on `<html>` within 100ms; reload preserves theme; logging out and back in preserves theme (DB column, if logged in); first-visit incognito with system dark mode renders dark; first-visit incognito with system light mode renders light.

## Boundaries

**In scope:**

11 learner-facing surfaces (full Claude Design + token migration + mobile + states + a11y):

1. `/` — home
2. `/songs` — catalog list
3. `/anime-list` — anime franchise browse
4. `/songs/[slug]` — synced player + 3 tabs (Lesson, Practice, Drills) + sub-content (LearnCard, FeedbackPanel, SessionSummary, etc.)
5. `/kana` — landing grid + mode toggle
6. `/kana/session` — drill session UI
7. `/kana/session/summary` — post-session summary
8. `/path` — learning path map
9. `/vocabulary` — cross-song dashboard with search/filters
10. `/review` (and child routes: landing, session, feedback panel) — cross-song SRS
11. `/profile` — settings (incl. theme toggle), HUD, prefs form

Cross-cutting deliverables:

- Design token system (CSS vars, dark + light, exposed to Tailwind v4 `@theme`)
- Component primitives: Button, Card, Badge, Modal in `src/components/ui/`
- 12-entry motion catalog + reduced-motion fallbacks
- 24 empty/loading/error states for async surfaces
- Token-compliance ESLint rule + grep audit + CI gate (`pr-checks.yml`)
- Mobile parity Playwright spec
- Accessibility Playwright spec (axe-core)
- Theme persistence (DB column for authed users, `localStorage` for guests)
- Updated `globals.css`, updated `layout.tsx` header (mobile nav included), updated `docs/motion-catalog.md`

**Out of scope:**

- `/admin/timing` and child routes — operator-facing internal tooling; explicitly excluded per Round 3 boundary call. Stays functional, un-polished.
- `/dashboard` route (currently a stub/placeholder per scout) — likely deprecated; no design investment until product decides whether to keep it.
- `error.tsx` and `global-error.tsx` — token migration only (no Claude Design redesign); these are last-resort framework fallbacks.
- Information architecture changes — route structure, nav labels, tab names, page section ordering all FROZEN per Round 3. Visual changes only.
- Copy rewrites — existing English/JP strings stay verbatim. Lengthening or shortening copy to fit a layout is allowed; rewriting copy intent is not.
- New features — Phase 14 is polish, not function. No new product capability ships.
- Phase 13 Lighthouse score remediation — measurement is deferred to Phase 19 entry gate, which runs *after* Phase 14 ships. Phase 14 must not regress bundle (`size-limit` from Phase 13 stays green) but is not on the hook for the LCP/TTI numbers themselves.
- Full WCAG 2.1 AA audit — this phase locks the *floor* (≥95 Lighthouse a11y, no critical axe violations). The full audit-and-remediate-everything pass is Phase 18.
- Push notifications, native app shells, PWA manifest polish — separate phases.
- Animation libraries beyond what already ships (CSS keyframes + `canvas-confetti`) — adding Framer Motion or similar is a discuss-phase decision; the spec doesn't lock it in.
- Custom icon set — existing inline SVGs + Lucide imports stay; not redrawing icons in this phase.

## Constraints

- **Stack**: Next.js 15.5 (App Router), Tailwind v4 (postcss-based, `@theme` block), `next/font` for Inter, Google Fonts CDN for Noto Sans JP. Tokens MUST be defined in a way Tailwind v4 can consume (CSS vars in `@theme`).
- **Bundle budget**: `size-limit` gate from Phase 13 (50 KB gzipped on `/songs/[slug]`) MUST stay green. New design system code goes through tree-shaking.
- **Font loading**: No additional web fonts beyond Inter + Noto Sans JP. Mono is system stack only (`ui-monospace, "SF Mono", Menlo, monospace`). Self-hosting Noto Sans JP is allowed (and preferred for performance) but not required by this phase.
- **Browser targets**: Same as project default (modern evergreen — Chrome/Edge/Safari/Firefox last 2 versions, iOS Safari 15+). `oklch()` in tokens is permitted (universal modern support). CSS custom properties required.
- **Theming mechanism**: `data-theme` attribute on `<html>` (NOT class-based, NOT separate stylesheets) — keeps SSR theme flicker minimal and matches Tailwind v4 idiom.
- **No JS-driven layout**: Theme switch and motion must be CSS-driven where possible. JS only for state (toggle, persistence) — not for animation calculations.
- **Image handling**: Existing `next/image` usage stays. Album art remains a YouTube thumbnail or DB-stored URL — placeholder gradient recipe from handoffs is fallback only.
- **Test infrastructure**: Reuses Phase 08.1 Playwright + Vitest setup. New tests live under `tests/e2e/` and `src/**/__tests__/`. No new test runner.
- **CI**: Existing `pr-checks.yml` workflow is extended, not replaced.

## Acceptance Criteria

- [ ] `src/app/globals.css` defines color, typography, spacing, radii, shadow, and motion tokens for both `[data-theme="dark"]` and `[data-theme="light"]`
- [ ] Toggling `data-theme` in browser devtools flips every in-scope surface's colors without layout shift
- [ ] `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx` exist with documented variant props and unit-test coverage of every variant
- [ ] `grep -rn "rounded-lg border" src/app/ | grep -v components/ui/` returns zero matches in `*.tsx` files
- [ ] `grep -rn "fixed inset-0.*backdrop" src/app/ | grep -v components/ui/Modal.tsx` returns zero matches
- [ ] `npm run lint` fails when a raw hex `bg-[#abc123]` is introduced in any in-scope component
- [ ] `npx tsx scripts/audit/token-compliance.ts` exits 0 on the post-phase main branch
- [ ] `pr-checks.yml` workflow includes both lint + token-compliance gates and is green on the phase merge commit
- [ ] All 11 in-scope surfaces have a Claude Design output (mobile + desktop, dark + light) checked into `design_handoff_phase14/` (or per-surface subfolders)
- [ ] Manual visual walkthrough at 390×844 viewport shows zero horizontal scroll on every in-scope surface
- [ ] Tap-target audit script reports zero buttons/links/inputs <44×44px on in-scope surfaces
- [ ] `tests/e2e/mobile-parity.spec.ts` passes — asserts no horizontal scroll at 390×844 on every in-scope route
- [ ] `docs/motion-catalog.md` exists with all 12 named interactions, each containing trigger / duration / easing / target / reduced-motion fallback
- [ ] Setting `prefers-reduced-motion: reduce` in devtools causes every cataloged animation (incl. confetti, star-shine, level-pop) to skip or resolve instantly
- [ ] Each of the 7 async surfaces has all three states (empty + loading + error) demoable via URL param, Storybook story, or `__dev/states` route
- [ ] `tests/e2e/a11y.spec.ts` runs `@axe-core/playwright` on each in-scope route and reports zero serious/critical violations
- [ ] Lighthouse a11y score ≥95 on each in-scope surface (manual baseline run captured in `phases/14-ux-polish/14-LIGHTHOUSE-A11Y.md`)
- [ ] Manual keyboard-only walkthrough of the primary journey (home → catalog → song → exercise session → review queue) completes without mouse
- [ ] Theme toggle in `/profile` flips `data-theme` within 100ms; preference persists across reload (DB column for authed users, localStorage for guests); first visit reads `prefers-color-scheme` for default
- [ ] `size-limit` gate from Phase 13 stays green on the phase merge commit (50 KB gzipped on `/songs/[slug]`)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes |
|--------------------|-------|------|--------|-------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | Surface inventory + per-surface bar locked |
| Boundary Clarity   | 0.80  | 0.70 | ✓      | Out-of-scope list explicit (admin, dashboard, IA, copy, new features) |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Stack, bundle budget, theming mechanism, browser targets locked |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | 21 pass/fail criteria covering every requirement |
| **Ambiguity**      | 0.17  | ≤0.20| ✓      | Gate met after 4 rounds |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| 1 | Researcher | How should existing Claude Design home handoffs be treated? | Starting point, may evolve — handoff doesn't cover all current page elements |
| 1 | Researcher | Which surfaces are in-scope for polish? | All 11 learner-facing surfaces (home, catalog, anime-list, song page, kana × 3, path, vocabulary, review, profile) |
| 1 | Researcher | Light mode in scope? | Yes — both dark + light shipped |
| 2 | Simplifier | What's the minimum acceptable polish floor per surface? | Token compliance + shared primitives + mobile + states (no raw hex/px outside @theme) |
| 2 | Simplifier | What's the falsifiable bar for "purposeful microinteractions"? | Catalog of 8–12 named interactions with duration/easing/reduced-motion fallback per entry |
| 2 | Simplifier | What does mobile parity mean concretely? | Mobile-first per-surface design at ≤390px AND desktop ≥1280px; tablet scales gracefully |
| 3 | Boundary Keeper | IA / copy / route changes in scope? | Visual only — IA, routes, nav labels, tab names, copy frozen |
| 3 | Boundary Keeper | Are operator-facing surfaces in scope? | Out of scope — `/admin/timing` and `/dashboard` excluded |
| 3 | Boundary Keeper | Which component primitives must be extracted? | Core 4: Button, Card, Badge, Modal |
| 4 | Failure Analyst | How is token compliance verified? | Linter + grep audit + CI gate (both must be green) |
| 4 | Failure Analyst | What's the a11y bar? | WCAG 2.1 AA on in-scope surfaces; Lighthouse a11y ≥95; axe zero serious/critical |
| 4 | Failure Analyst | How is "every async surface gets states" defined? | All 3 states (empty + loading + error) for each of 7 async surfaces — ~21+ designed states |
| 4 | Failure Analyst | What's the worst failure mode? | Token drift — system silently rots if linter doesn't enforce. Linter is THE keystone deliverable. |

---

## Appendix A — Brand Inputs & Claude Design Briefing

This appendix is a self-contained prompt for Claude Design when producing per-surface designs. It captures everything Claude Design needs without rereading other docs.

### A.1 Product context

**KitsuBeat** is a Japanese-learning app where learners study vocabulary and grammar through anime/J-pop song lyrics. Audience: beginner-to-intermediate JP learners (JLPT N5–N3 primary). Use case: open-app-during-music-time (commute, gym, dinner). Tone: warm, energetic, anime-coded, but not childish. Reference apps: Duolingo (gamification, but warmer), Spotify (music-first surface), Wanikani (deep mastery feel).

### A.2 Brand tokens (frozen baseline — extend, don't override)

These are inherited from `design_handoff_kitsubeat_home/` and `design_handoff_kitsubeat_web/`. Treat as v0; light theme is new.

**Color (dark theme):**
```
--color-bg          #0E0E0E   app background (outer)
--color-bg-2        #111111   sidebar / elevated surface
--color-card        #191919   card fill
--color-card-2      #1E1E1E   raised card fill
--color-border      rgba(255,255,255,0.06)   default card stroke
--color-border-strong rgba(255,255,255,0.10) prominent stroke
--color-text        #F5F5F4   primary text
--color-text-muted  rgba(245,245,244,0.56) secondary text
--color-text-dim    rgba(245,245,244,0.40) tertiary / mono eyebrow
--color-accent      #ef4444   brand red — single accent, use sparingly
```

**Color (light theme — to be designed by Claude Design, must clear WCAG AA contrast):**
```
--color-bg          (warm off-white, e.g. #FAFAF9)
--color-bg-2        (slightly darker; sidebar)
--color-card        (white-ish; cards)
--color-card-2      (raised card)
--color-border      (subtle slate; ~rgba(0,0,0,0.06))
--color-border-strong (stronger; ~rgba(0,0,0,0.12))
--color-text        (near-black; ≥4.5:1 vs bg)
--color-text-muted  (slate; ≥4.5:1 for body)
--color-text-dim    (lighter slate; meta only — must clear 3:1 for large text)
--color-accent      #ef4444 (same red; verify on light bg)
```

**Grammar colors (same in both themes):**
```
--color-grammar-noun        #3b82f6
--color-grammar-verb        #ef4444
--color-grammar-adjective   #22c55e
--color-grammar-adverb      #f97316
--color-grammar-particle    #6b7280
--color-grammar-expression  #8b5cf6
--color-grammar-other       #6b7280
```

**JLPT colors (same in both themes; badges fade BG to 12% alpha, ring at 25%):**
```
--color-jlpt-n5  #22c55e
--color-jlpt-n4  #3b82f6
--color-jlpt-n3  #f59e0b
--color-jlpt-n2  #f97316
--color-jlpt-n1  #ef4444
```

### A.3 Typography ramp

**Font families:**
- `--font-sans`: `Inter, -apple-system, "SF Pro Text", system-ui, sans-serif` (UI)
- `--font-jp`: `"Noto Sans JP", -apple-system, system-ui` (JP — weights 400/500/600/700)
- `--font-mono`: `ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace` (eyebrows, keycaps, counters, percentages)

**Type scale (desktop; mobile typically -2 to -4px):**

| Role | Font | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Page greeting (EN) | sans | 28 | 700 | -0.6 |
| Page greeting (JP) | jp | 15 | 500 | 0.2 |
| Hero title (JP) | jp | 44 | 700 | -1.2 |
| Hero subtitle | sans | 16 | 400 | — |
| Word-of-day kanji | jp | 72 | 600 | -2 |
| Word-of-day romaji | mono | 18 | 400 | — |
| Section title | sans | 18 | 700 | -0.3 |
| Section subtitle (JP) | mono | 11 | 400 | 0.5 |
| Card title (JP) | jp | 15 | 650 | -0.2 |
| Card subtitle | sans | 12 | 400 | — |
| Body | sans | 14 | 400 | — |
| Eyebrow / label | mono | 10–11 | 400 | 0.4–1.4 (UPPERCASE) |
| Stat value | sans | 18–30 | 700 | -0.3 to -0.8 |
| Button label | sans | 14 | 600/650 | -0.1 |

### A.4 Spacing rhythm

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64` — in design tokens as `--space-1` … `--space-9`.

Section gaps: 18–28px between vertical sections. Card internal padding: 14–24px. Page horizontal padding: 20px mobile, 24px desktop.

### A.5 Radii scale

```
--radius-xs   8   mono chip / kbd
--radius-sm   10  small button / segment
--radius-md   12  nav item / input
--radius-lg   14  album art (small)
--radius-xl   16  stat tile / rail card
--radius-2xl  18  song card / CTA
--radius-3xl  20  word-of-day card
--radius-4xl  22  hero (mobile) / CTA (mobile)
--radius-5xl  24  hero (desktop)
--radius-6xl  26  primary pill button
--radius-pill 9999 badges / streak / chip pills
```

### A.6 Shadow recipes

```
--shadow-card-ring        inset 0 0 0 1px var(--color-border)
--shadow-card-ring-strong inset 0 0 0 1px var(--color-border-strong)
--shadow-hero-glow        inset 0 0 0 1px rgba(239,68,68,0.32), 0 16px 40px rgba(239,68,68,0.14)
--shadow-hero-inner       inset 0 0 80px rgba(239,68,68,0.18)
--shadow-button-red       0 8px 22px rgba(239,68,68,0.45)
--shadow-cta-red          0 8px 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15)
--shadow-logo-glow        drop-shadow(0 0 14px rgba(239,68,68,0.32))
--shadow-focus-ring       0 0 0 2px rgba(239,68,68,0.40)
```

Light theme variants required: shadow opacities increase ~30% to remain visible on light bg.

### A.7 Motion tokens

```
--duration-fast  120ms
--duration-base  200ms
--duration-slow  400ms
--ease-out       cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out    cubic-bezier(0.4, 0, 0.2, 1)
```

Reduced-motion policy: ALL motion tokens resolve to `0ms` and animations are skipped under `@media (prefers-reduced-motion: reduce)`.

### A.8 Surface inventory for Claude Design

For each in-scope surface, Claude Design must produce 4 outputs: **dark mobile**, **dark desktop**, **light mobile**, **light desktop**. Plus designed empty/loading/error states for the 7 async surfaces (in dark + light, mobile + desktop — 8 frames per state per surface).

| # | Surface | Route | Function summary | Has async states? |
|---|---|---|---|---|
| 1 | Home | `/` | Greeting, today's track, continue CTA, recently played, word-of-day | Yes |
| 2 | Catalog | `/songs` | Filterable list of all songs with JLPT/anime/artist filters | Yes |
| 3 | Anime list | `/anime-list` | Browse by anime franchise | Yes |
| 4 | Song page | `/songs/[slug]` | YouTube player + 3-tab UI: Lesson (lyrics+furigana+translation), Practice (4 core exercises), Drills (advanced exercises) | Yes |
| 5 | Kana home | `/kana` | Hiragana/katakana grid + mode toggle + signup nudge | No |
| 6 | Kana session | `/kana/session` | 20-question drill with weighted random | No |
| 7 | Kana summary | `/kana/session/summary` | Post-session result + row unlock modal | No |
| 8 | Path | `/path` | Curated learning path (B/I/A tiers); starter pick | Yes |
| 9 | Vocabulary | `/vocabulary` | Cross-song dashboard; search; filters; tier-grouped list | Yes |
| 10 | Review | `/review` (+ session, feedback panel) | Cross-song SRS queue + active review session | Yes |
| 11 | Profile | `/profile` | Settings (theme toggle, skip-learning pref, new-card cap), HUD, level progress | Yes |

### A.9 Components Claude Design must specify

For each surface, Claude Design output must include:

1. **Layout** — desktop (≥1280px) and mobile (≥390px). Tablet scales — not separately designed.
2. **Color application** — every surface element annotated with token name (e.g., `bg: --color-card`, not `#191919`).
3. **Typography** — every text element annotated with role from §A.3.
4. **Spacing** — every gap/padding annotated with `--space-N` token.
5. **Radii** — every rounded element annotated with `--radius-N` token.
6. **Shadows** — every elevated element annotated with `--shadow-N` token.
7. **Motion** — every animated element annotated with motion catalog entry name (§5 of motion catalog).
8. **States** (async surfaces) — empty, loading, error designs.
9. **Mobile-specific elements** — bottom nav (mobile), hamburger or sidebar (desktop), responsive tab bars.

### A.10 Pillars (for Claude Design judgment calls)

1. **Music-first warmth**: Surface feels like Spotify, not Duolingo. Album art and song presence anchor visual hierarchy.
2. **Anime energy without childishness**: Red accent, soft glow, JP typography do the brand work. No emoji. No cartoon mascots beyond the existing fox in `logo-horizontal.png`.
3. **Information density tuned for repeat users**: This is a daily-use product. Avoid chrome that wastes space; show the data.
4. **Quiet motion**: Brand red glow carries energy; motion is accent, not entertainment. Reduced-motion users get a fully-functional, instant UI.
5. **Mastery affordance**: Every surface should reinforce that learning is happening — stars, streaks, progress rings, JLPT badges always visible at a glance.

### A.11 Acceptance for Claude Design output (per surface)

Each Claude Design surface output is acceptable when:

- [ ] Mobile (390×viewport) + desktop (1280×viewport) frames provided
- [ ] Both dark + light theme frames provided
- [ ] Every visual property annotated to a token (no raw hex/px in spec)
- [ ] Tap targets ≥44×44px on mobile
- [ ] Empty + loading + error states provided (if async surface)
- [ ] Motion notes reference catalog entries by name
- [ ] Implementer can recreate without asking color/spacing/typography questions

---

*Phase: 14-ux-polish*
*Spec created: 2026-05-01*
*Next step: /gsd-discuss-phase 14 — implementation decisions (theme persistence layer, lint rule choice, Storybook vs `__dev/states` route, motion library decision, Claude Design output cadence)*
