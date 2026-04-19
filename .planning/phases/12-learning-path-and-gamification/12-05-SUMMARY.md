---
phase: 12-learning-path-and-gamification
plan: "05"
subsystem: vocabulary-gap-panel, profile-hud, user-prefs
tags: [jlpt, gamification, hud, vocabulary, profile, sound, haptics]
dependency_graph:
  requires: [12-01, 12-02, 12-03]
  provides: [JlptGapSummary, ProfileHud, getJlptGapSummary, getUserGamificationState, sound_enabled, haptics_enabled]
  affects: [src/app/vocabulary/page.tsx, src/app/profile/page.tsx, src/lib/db/queries.ts, src/app/actions/userPrefs.ts]
tech_stack:
  added: []
  patterns: [server-component-data-fetch, live-derived-aggregates, drizzle-raw-sql, cosmetic-slot-partition-in-js]
key_files:
  created:
    - src/app/vocabulary/JlptGapSummary.tsx
    - src/app/profile/ProfileHud.tsx
    - src/lib/db/__tests__/queries-jlpt.test.ts
  modified:
    - src/lib/db/queries.ts
    - src/app/vocabulary/page.tsx
    - src/app/profile/page.tsx
    - src/app/profile/ProfileForm.tsx
    - src/app/actions/userPrefs.ts
    - src/lib/user-prefs.ts
decisions:
  - "JlptGapSummary is always-on from day 1; not level-gated or reward-slot locked"
  - "getUserGamificationState uses single LEFT JOIN query + JS partition for cosmetics"
  - "iOS haptic caveat shown as visible helper text (not hidden) per RESEARCH F1"
  - "Parallel taxonomies preserved: difficulty_tier untouched; jlpt_level derived live"
metrics:
  duration_seconds: 391
  tasks_completed: 3
  files_modified: 6
  files_created: 3
  completed_date: "2026-04-19"
---

# Phase 12 Plan 05: JLPT Gap Panel + Profile HUD + Sound/Haptics Settings Summary

JLPT gap panel on /vocabulary and gamification HUD + sound/haptics settings on /profile, with live-derived aggregates and no new DB tables.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add getJlptGapSummary + getUserGamificationState queries | b8faa57 | src/lib/db/queries.ts, src/lib/db/__tests__/queries-jlpt.test.ts |
| 2 | Render JlptGapSummary + ProfileHud on their pages | af5216d | src/app/vocabulary/JlptGapSummary.tsx, src/app/profile/ProfileHud.tsx |
| 3 | Add sound_enabled + haptics_enabled toggles | 9bcab56 | src/app/profile/ProfileForm.tsx, src/app/actions/userPrefs.ts |

## Query Shapes

### JlptGapRow
```ts
export interface JlptGapRow {
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  total_count: number;   // all vocabulary_items rows with this jlpt_level
  mastered_count: number; // state = 2
  known_count: number;    // state IN (1, 2, 3)
}
```
Ordered N5 → N1. Live-derived via LEFT JOIN on user_vocab_mastery + vocabulary_items. No new table.

### GamificationState
```ts
export interface GamificationState {
  xp_total: number;
  level: number;
  streak_current: number;
  streak_best: number;
  last_streak_date: string | null;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  current_path_node_slug: string | null;
  equipped_border: { css_class: string; label: string } | null;
  equipped_theme: { css_vars: Record<string,string>; label: string } | null;
}
```
Single query: users LEFT JOIN user_cosmetics LEFT JOIN reward_slot_definitions. Cosmetic type partition happens in JS after the fetch.

## Component File List

| File | Type | Purpose |
|------|------|---------|
| src/app/vocabulary/JlptGapSummary.tsx | Server component | Renders 5 JLPT tier rows with mastered/total + progress bar + gap copy |
| src/app/profile/ProfileHud.tsx | Server component | Avatar + equipped border + level + XP bar + streak |
| src/app/vocabulary/page.tsx | Extended | JlptGapSummary mounted above FilterControls |
| src/app/profile/page.tsx | Extended | ProfileHud mounted above GlobalLearnedCounter |
| src/app/profile/ProfileForm.tsx | Extended | 'Celebration effects' fieldset with sound + haptics toggles |
| src/app/actions/userPrefs.ts | Extended | updateUserPrefs accepts sound_enabled + haptics_enabled |
| src/lib/user-prefs.ts | Extended | UserPrefs interface has soundEnabled + hapticsEnabled |

## HUD Placement Grep Check

```
grep -rn "ProfileHud\|JlptGapSummary" src/app/songs
→ 0 matches (CLEAN)
```

HUD is on /profile only. /songs and /songs/[slug] are unaffected.

## iOS Haptic Caveat Copy Location

File: `src/app/profile/ProfileForm.tsx`

The caveat text reads: "No effect on iOS — Web Vibration API unsupported."
Rendered as a visible `<span className="block text-xs text-gray-500 mt-0.5">` below the haptics toggle label. NOT hidden. Users on iOS see the toggle (functional on Android/Chrome) but it becomes a runtime no-op (enforcement gated in Plan 06's level-up takeover).

## DB Indexes Added

None. Aggregates on vocabulary_items + user_vocab_mastery use existing indexes (vocab_item_id FK + user_id). No additional indexing required.

## Taxonomy Preservation

- `songs.difficulty_tier` (basic/intermediate/advanced) — untouched
- `vocabulary_items.jlpt_level` — untouched
- JLPT gap is derived live at query time; no re-tagging of existing data
- The two taxonomies remain fully parallel (SC6 satisfied)

## Unit Tests

10 tests in `src/lib/db/__tests__/queries-jlpt.test.ts`:
- JlptGapRow field names and types
- mastered_count + known_count semantics
- numeric coercion (DB returns COUNT as string)
- zero-count tier handling
- all 5 JLPT level values
- gap copy: remaining calculation, division-by-zero guard, rounding

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files created:
- FOUND: src/app/vocabulary/JlptGapSummary.tsx
- FOUND: src/app/profile/ProfileHud.tsx
- FOUND: src/lib/db/__tests__/queries-jlpt.test.ts

Commits:
- FOUND: b8faa57 (Task 1)
- FOUND: af5216d (Task 2)
- FOUND: 9bcab56 (Task 3)

TypeScript: clean (no errors in plan-owned files)
Tests: 31/31 passing in src/lib/db/__tests__/
Pre-existing failures (12-04 parallel wave): 3 — unchanged before and after this plan
