---
id: SEED-005
status: dormant
planted: 2026-05-03
planted_during: v1.0 / Phase 14.2 (Wave 2 in flight)
trigger_when: adding a new top-level route, OR polishing for an interview demo (Meta E6 / Anthropic), OR users start churning on the nav, OR a new persona (educator / parent) ships and adds yet another link
scope: Small-Medium
---

# SEED-005: Global nav IA review — which links survive top-level vs collapse

## Why This Matters

Phase 14.2 fixes the **visual** mobile-nav overflow with a hamburger + sheet menu (Plan 14.2-11 Task 2). That solves "users can't find the link" — but it leaves the underlying IA question unanswered: **does every current top-level link deserve its slot?**

Today (post-14.2) the global nav lives in [src/app/layout.tsx](src/app/layout.tsx) and surfaces:

- `Path` (the learning roadmap — clear primary)
- `Songs` (route is `/anime-list`; label says Songs — drift signal)
- `Kana` (sub-area of learning — could fold under Path)
- `Progress` (route is `/vocabulary`; label says Progress — second drift signal)
- `Profile`
- `Admin` (allowlist-gated)
- `GlobalLearnedCounter` (vanity metric in nav slot)
- `LanternStreak` (gamification chip)
- `UserButton` / `SignIn`
- `ThemeToggle`

That's 10 surfaces fighting for ~640px of mobile width. The 14.2 sheet hides the link cluster on mobile, but the **information architecture itself wasn't audited** — Path/Songs/Kana/Progress/Profile coexist top-level because they accreted, not because they're equally important.

## What "Good" Looks Like

A learning app with this scope (Duolingo, Memrise, Mango) typically has 3-5 top-level destinations. The discipline question: which of the current 10 surfaces *earn* a top-level slot, and which fold under one?

Strong candidates for **collapse**:
- `Kana` → sub-route of `Path` (it's a structured beginner module, not a separate destination)
- `Progress` → into `Profile` (it's an account-scoped view, not a separate place)
- `GlobalLearnedCounter` → out of nav entirely, into `Profile` or hero (it's a stat, not a link)

Strong candidates for **stay top-level**:
- `Path` (the spine)
- `Songs` (the catalog)
- `Profile` (account/settings)

Pre-decision tension to resolve:
- Does the streak chip belong in the global header or only inside `/path`? Phase 14.2 made it global. Validate that with a real user before committing — global streak everywhere can feel naggy.
- Route-vs-label drift (`/anime-list` labelled `Songs`, `/vocabulary` labelled `Progress`) — either rename routes or rename labels, but not both. Legacy URLs may be linked externally.

## When to Surface

**Trigger:** any of:
1. Adding a new top-level route (forces the question)
2. Polishing the app surface for an external demo — interview screenshare, Anthropic application sample, EB2-NIW evidence package
3. User research surfaces nav-confusion signals (analytics drop-off on `/profile`, support questions about "where do I find Kana")
4. A new persona ships (educator dashboard, parent view) and adds yet another candidate link — the IA debt becomes acute

This seed should be presented during `/gsd-new-milestone` (or proactively on triggers above) when scope matches:
- "user testing"
- "polish for demo"
- "navigation"
- "information architecture"
- "onboarding flow"

## Scope Estimate

**Small-Medium** — 0.5-1.5 days as its own phase:

- ~2h: write the IA hypothesis (which surfaces collapse where, why)
- ~3h: wire route + label changes, add 301-style fallbacks for any renamed routes
- ~2h: e2e specs for new nav structure + mobile sheet contents
- ~2h: visual regression check across `/`, `/path`, `/songs`, `/profile`
- ~1h: analytics tags on collapsed surfaces so we measure usage post-change

Could be larger if user testing is in scope (recruit, sessions, synthesis).

## What 14.2 Already Solved

Don't re-litigate these:
- Mobile horizontal-scroll on header → fixed via Plan 14.2-11 Task 2 (hamburger + sheet)
- Streak chip cross-surface coherence → fixed via Plan 14.2-11 Task 1 (LanternStreak global)
- `/path` vs `/` IA — `/path` is now the focused learning roadmap; `/` is the discovery surface

## Breadcrumbs

- [src/app/layout.tsx](src/app/layout.tsx) — global header, current nav surface
- [.planning/phases/14.2-redesign-home/14.2-11-PLAN.md](.planning/phases/14.2-redesign-home/14.2-11-PLAN.md) — added Task 2 (mobile sheet) which made this IA debt visible
- [.planning/phases/14.2-redesign-home/14.2-SPEC.md](.planning/phases/14.2-redesign-home/14.2-SPEC.md) §Req 1, §Req 2 — global header contract
- `/anime-list` route labelled `Songs` (drift)
- `/vocabulary` route labelled `Progress` (drift)

## Notes

- This is a UX/IA decision, not a layout decision. Don't bundle it with another visual phase — it needs its own focus and ideally its own user signal.
- If this seed activates pre-interview, prefer the safer minimal version: collapse `Kana` under `Path`, keep everything else as-is. Bigger restructures risk regressions on a demo timeline.
- Labels `Songs` / `Progress` are stable in user mental models even if the routes are misnamed. Renaming routes is the safer fix; renaming labels mid-launch invalidates user habit.
