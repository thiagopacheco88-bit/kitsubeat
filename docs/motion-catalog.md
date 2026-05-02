# KitsuBeat Motion Catalog

Phase 14 / SPEC AC #11. The 12 named microinteractions in KitsuBeat, each with trigger, duration, easing, target, and reduced-motion fallback.

**Source of truth:** This file. Component code references entries by name in comments (e.g., `/* motion-catalog: hover-lift-card */`) so impl → spec link is greppable per D-14.

**Reduced-motion policy (D-13):** A global `@media (prefers-reduced-motion: reduce)` block in `src/app/globals.css` collapses every animation/transition duration to 0ms. JS-driven motion (canvas-confetti, the only such case) is suppressed at the fire site via `disableForReducedMotion: true` (existing pattern at LevelUpTakeover.tsx:39, RowUnlockModal.tsx:14, StarDisplay.tsx:36).

---

## verse-highlight pulse
- **Trigger:** Current verse changes during playback (Phase 2 SyncPlayer state update)
- **Duration:** var(--duration-base) = 200ms
- **Easing:** var(--ease-out)
- **Target:** background-color + border-color of `.verse-current` element
- **Reduced-motion fallback:** Instant color change (CSS @media override collapses transition-duration to 0ms)

## star-earn shine
- **Trigger:** User earns a new star at end of exercise session (StarDisplay component, Phase 8)
- **Duration:** 600ms (existing keyframe at src/app/globals.css:43-50; per D-27 retained)
- **Easing:** ease-out (existing)
- **Target:** transform: scale + opacity on the star SVG
- **Reduced-motion fallback:** Star renders at scale(1) opacity(1) immediately — animation-iteration-count: 1 + animation-duration: 0ms (the global override) collapses it to the 100% keyframe

## correct-answer feedback
- **Trigger:** User picks the correct option in any exercise (FeedbackPanel mounts in green state)
- **Duration:** var(--duration-fast) = 120ms
- **Easing:** var(--ease-out)
- **Target:** background-color + border-color on the chosen option button + opacity on the FeedbackPanel
- **Reduced-motion fallback:** Instant color change + instant FeedbackPanel mount (CSS @media override)

## wrong-answer feedback
- **Trigger:** User picks an incorrect option in any exercise (FeedbackPanel mounts in red state)
- **Duration:** var(--duration-fast) = 120ms
- **Easing:** var(--ease-out)
- **Target:** background-color + border-color on the chosen option button + brief horizontal shake transform
- **Reduced-motion fallback:** Instant color change, NO shake transform (CSS @media override collapses transition + the shake keyframe to 0ms / 1 iteration)

## level-up takeover
- **Trigger:** User levels up (LevelUpTakeover component mounts; Phase 12)
- **Duration:** 800ms (existing keyframe at src/app/globals.css:53-60; per D-27 retained)
- **Easing:** ease-out (existing)
- **Target:** transform: scale + opacity on the takeover headline
- **Reduced-motion fallback:** Headline renders at scale(1) opacity(1) immediately — same global @media override behavior as star-shine

## confetti milestone
- **Trigger:** User earns Star 3 (LevelUpTakeover.tsx:39), unlocks a kana row (RowUnlockModal.tsx:14), or earns first star (StarDisplay.tsx:36)
- **Duration:** ~3 seconds (canvas-confetti default lifecycle)
- **Easing:** N/A (physics-based — gravity + initial velocity)
- **Target:** Canvas overlay on `<body>` (canvas-confetti's default container)
- **Reduced-motion fallback:** Suppressed entirely via `disableForReducedMotion: true` option (already used at all 3 fire sites). The CSS @media override does NOT reach JS-driven motion — the lib-level guard is the suppression mechanism.

## page-transition fade
- **Trigger:** Route navigation (Next.js App Router page transition)
- **Duration:** var(--duration-base) = 200ms
- **Easing:** var(--ease-in-out)
- **Target:** opacity on `<main>` element during route transition
- **Reduced-motion fallback:** Instant page swap (CSS @media override)

## hover lift on cards
- **Trigger:** Mouse hover on Card primitive (`.hover:` state)
- **Duration:** var(--duration-fast) = 120ms
- **Easing:** var(--ease-out)
- **Target:** transform: translateY(-2px) + box-shadow upgrade on `<Card>` / `<CardLink>`
- **Reduced-motion fallback:** Instant translate + shadow change (CSS @media override)

## modal enter
- **Trigger:** Modal primitive opens (Radix Dialog data-state="open")
- **Duration:** var(--duration-base) = 200ms
- **Easing:** var(--ease-out)
- **Target:** opacity (overlay) + opacity + scale (content) on Radix Dialog elements
- **Reduced-motion fallback:** Instant mount (CSS @media override + Radix's own data-state classes resolve to 0ms duration)

## modal exit
- **Trigger:** Modal primitive closes (Radix Dialog data-state="closed")
- **Duration:** var(--duration-fast) = 120ms
- **Easing:** var(--ease-in-out)
- **Target:** opacity (overlay) + opacity (content)
- **Reduced-motion fallback:** Instant unmount

## toast slide-in
- **Trigger:** Toast notification fires (TBD: Phase 14 ships the catalog entry; Phase 18 ships the toast surface)
- **Duration:** var(--duration-base) = 200ms
- **Easing:** var(--ease-out)
- **Target:** transform: translateY + opacity on toast container
- **Reduced-motion fallback:** Instant placement (CSS @media override)

## skeleton shimmer
- **Trigger:** Skeleton primitive mounts (loading state)
- **Duration:** 2000ms (Tailwind animate-pulse default)
- **Easing:** cubic-bezier(0.4, 0, 0.6, 1) — Tailwind's pulse
- **Target:** opacity on Skeleton element via `::after` pseudo-element gradient
- **Reduced-motion fallback:** Static placeholder (CSS @media override collapses pulse to instant rest state)
