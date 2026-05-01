# Phase 14: UX Polish — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in [`14-CONTEXT.md`](./14-CONTEXT.md) — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 14-ux-polish
**Areas discussed:** Theme persistence + toggle UX, State-demo strategy, Motion library, Claude Design cadence + zip handling

**Mode:** SPEC.md is locked (9 requirements, 21 acceptance criteria). User accepted recommended defaults across all 4 selected gray areas. No follow-up questions raised; user signaled "go with recommendations."

---

## Theme persistence + toggle UX

| Option | Description | Selected |
|--------|-------------|----------|
| DB column on `users.theme_preference` for authed + cookie + inline no-flash script + toggle in **both** `/profile` and header (hand-rolled, no `next-themes`) | SSR-safe, zero-flash via cookie+inline script. Toggle in both places: `/profile` is SPEC floor; header gives one-click access. ~250-byte inline script. Cookie is source of truth (SSR-readable; localStorage is not). | ✓ |
| `next-themes` package + provider in `layout.tsx` | ~2KB JS + provider re-render churn. Solves a problem we can solve in 200 bytes inline. | |
| localStorage-only + client-only `useEffect` provider | Causes flash of wrong theme on first paint. SSR can't read localStorage. | |
| Toggle in `/profile` only (no header toggle) | SPEC's stated floor. Loses one-click access from anywhere in the app. | |

**User's choice:** Recommended option (DB column + cookie + inline script + both surfaces, hand-rolled).
**Notes:** Phase 12 user-prefs convention (camelCase TS prop, snake_case DB column) followed for `themePreference`. Hand-written migration per Phase 11.4 D-01 schema-drift rule.

---

## State-demo strategy

| Option | Description | Selected |
|--------|-------------|----------|
| `__dev/states` catalog route gated by `NEXT_PUBLIC_APP_ENV !== 'production'` | Centralized review surface. Zero new build deps. Dev-bundle only via gate. Easy to grep/audit. | ✓ |
| Storybook stories | Tailwind v4 + Storybook 8 wiring is days of yak-shaving. Adds a separate dev runner. Brittle to Tailwind/Next upgrades. | |
| `?state=empty\|loading\|error` URL param on each surface | Scatters demo logic into prod components. Every component grows a "fake" mode. Hard to review centrally. | |

**User's choice:** Recommended option (`__dev/states` catalog route).
**Notes:** Storybook is a Phase 18+ candidate when primitives outgrow what a flat catalog can show.

---

## Motion library decision

| Option | Description | Selected |
|--------|-------------|----------|
| Pure CSS keyframes + transitions, motion tokens in `@theme`, `prefers-reduced-motion` media query | Zero JS deps. Bundle-budget-safe. SPEC's 12-entry catalog fully expressible in CSS. Reduced-motion is a single `@media` block. | ✓ |
| Framer Motion (~30KB gzipped) | Blows the 50KB `/songs/[slug]` bundle budget (Phase 13 D-09). Overkill for the 12 cataloged interactions. | |
| `motion` package (~5KB) | Eats most of the ~10KB headroom for one feature CSS handles natively. | |
| Radix animation primitives (no separate motion lib) | Tied to Radix component lifecycle. Doesn't help with non-Radix animations (verse pulse, star shine, level-up). | |

**User's choice:** Recommended option (pure CSS).
**Notes:** Phase 13 left ~10KB bundle headroom on `/songs/[slug]`. CVA + tailwind-merge + clsx (~3KB) + Radix Dialog (~5KB tree-shaken) eats most of it. No room for a motion lib.

---

## Claude Design cadence + zip handling

| Option | Description | Selected |
|--------|-------------|----------|
| Triage untracked zips first → ship tokens + primitives in waves 1–2 (no design dep for dark) → interleave per-surface migrations as designs land. Token-only fallback allowed if a surface has no design. | De-risks the phase by unblocking primitives independent of creative dependencies. Home ships first (already designed). Surfaces without design can ship token-only and accept design later via 14.1. | ✓ |
| Wait for all 11 surfaces to be designed before any code | Blocks the entire phase on a creative dependency. No early validation of primitives. | |
| All-up-front: tokens + primitives + all 11 surface migrations as one wave | Coordination nightmare; a single bad design rev blocks the merge. | |
| Code-first then design-revisions | Wastes work; surfaces get migrated twice. | |

**User's choice:** Recommended option (interleaved waves with zip triage as first plan-phase action).
**Notes:** D-19 in CONTEXT.md captures the triage protocol for `Kitsubeat Design.zip` and `Kitsubeat Design (1).zip`. D-22 captures the token-only fallback path for design-blocked surfaces.

---

## Claude's Discretion

The user accepted recommended defaults for these unselected areas; planner has flexibility within the documented bounds:

- **Lint enforcement mechanism (req 2):** Custom ESLint rule + `scripts/audit/token-compliance.ts` grep, both in `pr-checks.yml`. Skip `eslint-plugin-tailwindcss`. (D-17, D-18)
- **Component primitives API style (req 3):** CVA + tailwind-merge + clsx for Button/Card/Badge; Radix Dialog substrate for Modal. (D-05, D-06, D-07)
- **Self-host Noto Sans JP:** Skip in Phase 14; revisit if Phase 19 LCP regresses.
- **Modal portal target, skeleton shimmer specifics, header icon set, tablet scaling, `__dev/states` page styling** — all planner's call within SPEC and CONTEXT bounds.

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Highlights: polymorphic `<Button asChild>` via Radix Slot (Phase 18), per-route bundle budgets for non-`/songs/[slug]` routes (Phase 19), Storybook (Phase 18+), tablet per-surface design (its own phase if needed), `error.tsx` redesign (Phase 18+), full WCAG 2.1 AA audit (Phase 18).
