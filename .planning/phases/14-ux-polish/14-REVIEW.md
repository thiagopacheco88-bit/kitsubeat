---
phase: 14-ux-polish
reviewed: 2026-05-02T11:07:39Z
depth: quick
files_reviewed: 97
files_reviewed_list:
  - .github/workflows/qa-suite.yml
  - drizzle/0016_user_theme_preference.sql
  - eslint-plugins/kitsubeat-tokens/__tests__/no-raw-tokens.test.js
  - eslint-plugins/kitsubeat-tokens/index.js
  - eslint.config.mjs
  - next.config.ts
  - package.json
  - scripts/audit/motion-catalog-completeness.ts
  - scripts/audit/token-compliance.ts
  - scripts/debug/verify-theme-preference-column.ts
  - src/app/%5F%5Fdev/states/__tests__/gate.test.ts
  - src/app/%5F%5Fdev/states/page.tsx
  - src/app/actions/userPrefs.ts
  - src/app/admin/lyrics/actions/ai-fill.ts
  - src/app/admin/lyrics/actions/flag-song.ts
  - src/app/admin/lyrics/actions/publish.ts
  - src/app/admin/lyrics/actions/regenerate.ts
  - src/app/admin/lyrics/actions/save-draft.ts
  - src/app/admin/lyrics/actions/save-kanji-breakdown.ts
  - src/app/admin/lyrics/actions/swap-video.ts
  - src/app/anime-list/page.tsx
  - src/app/components/GlobalLearnedCounter.tsx
  - src/app/components/LevelUpTakeover.tsx
  - src/app/error.tsx
  - src/app/global-error.tsx
  - src/app/globals.css
  - src/app/kana/components/KanaGrid.tsx
  - src/app/kana/components/KanaLearnCard.tsx
  - src/app/kana/components/KanaQuestionCard.tsx
  - src/app/kana/components/KanaSession.tsx
  - src/app/kana/components/KanaSessionSummary.tsx
  - src/app/kana/components/KanaTile.tsx
  - src/app/kana/components/ModeToggle.tsx
  - src/app/kana/components/RowUnlockModal.tsx
  - src/app/kana/components/SignupNudge.tsx
  - src/app/kana/page.tsx
  - src/app/kana/session/page.tsx
  - src/app/kana/session/summary/page.tsx
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/path/components/PathHud.tsx
  - src/app/path/components/PathMap.tsx
  - src/app/path/components/PathNode.tsx
  - src/app/path/components/StarterPick.tsx
  - src/app/path/page.tsx
  - src/app/profile/ProfileForm.tsx
  - src/app/profile/ProfileHud.tsx
  - src/app/profile/page.tsx
  - src/app/review/ReviewFeedbackPanel.tsx
  - src/app/review/ReviewLanding.tsx
  - src/app/review/ReviewQuestionCard.tsx
  - src/app/review/ReviewSession.tsx
  - src/app/review/UpsellModal.tsx
  - src/app/songs/[slug]/components/AdvancedDrillsUpsellModal.tsx
  - src/app/songs/[slug]/components/ConjugationCard.tsx
  - src/app/songs/[slug]/components/ExerciseTab.tsx
  - src/app/songs/[slug]/components/FeedbackPanel.tsx
  - src/app/songs/[slug]/components/GrammarMcqCard.tsx
  - src/app/songs/[slug]/components/KnownWordCount.tsx
  - src/app/songs/[slug]/components/LearnCard.tsx
  - src/app/songs/[slug]/components/ListeningDrillCard.tsx
  - src/app/songs/[slug]/components/QuestionCard.tsx
  - src/app/songs/[slug]/components/SentenceOrderCard.tsx
  - src/app/songs/[slug]/components/SessionSummary.tsx
  - src/app/songs/[slug]/components/SongLayout.tsx
  - src/app/songs/components/BonusBadgeIcon.tsx
  - src/app/songs/components/SongCard.tsx
  - src/app/songs/components/SongGrid.tsx
  - src/app/songs/components/SongMasteredBanner.tsx
  - src/app/songs/page.tsx
  - src/app/vocabulary/FilterControls.tsx
  - src/app/vocabulary/JlptGapSummary.tsx
  - src/app/vocabulary/SeenInExpander.tsx
  - src/app/vocabulary/VocabularyList.tsx
  - src/app/vocabulary/page.tsx
  - src/components/ui/Badge.tsx
  - src/components/ui/Button.tsx
  - src/components/ui/Card.tsx
  - src/components/ui/EmptyState.tsx
  - src/components/ui/Modal.tsx
  - src/components/ui/Skeleton.tsx
  - src/components/ui/ThemeToggle.tsx
  - src/components/ui/__tests__/Badge.test.tsx
  - src/components/ui/__tests__/Button.test.tsx
  - src/components/ui/__tests__/Card.test.tsx
  - src/components/ui/__tests__/EmptyState.test.tsx
  - src/components/ui/__tests__/Modal.test.tsx
  - src/components/ui/__tests__/ThemeToggle.test.tsx
  - src/lib/db/schema.ts
  - src/lib/gamification/cosmetic-catalog.ts
  - src/lib/types/lesson.ts
  - tests/e2e/a11y.spec.ts
  - tests/e2e/dev-states.spec.ts
  - tests/e2e/mobile-parity.spec.ts
  - tests/e2e/reduced-motion.spec.ts
  - tests/e2e/theme-toggle.spec.ts
  - tests/integration/theme-persistence.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-05-02T11:07:39Z
**Depth:** quick
**Files Reviewed:** 97
**Status:** issues_found

## Summary

Phase 14 ux-polish migration to design tokens + 6 primitive components + theme persistence is in solid shape. The XSS surface in `layout.tsx` (the SSR zero-flash inline script) is well-defended in depth — literal-only `__html`, regex-constrained cookie read, server-action enum validation, DB CHECK constraint. Primitives (Button / Card / Modal / Badge / EmptyState / Skeleton) are clean, forwardRef'd, token-only, and well-typed. Server actions (`setThemePreference`, `flagSong`, `updateUserPrefs`) all validate input server-side.

Findings below are bounded:
- 2 warnings — one allowlist drift between ESLint and the grep audit (URL-encoded `__dev` folder), one minor effect-deps re-fire on `LevelUpTakeover`.
- 4 info — placeholder userId TODOs, missing length cap on admin notes, redundant Tailwind class composition, and a defensive null-coalescing observation on `popularity_rank`.

No critical bugs or security issues found. No hardcoded secrets, no XSS surfaces beyond the documented one, no SQL injection (all writes go through Drizzle parameterized templates), no path traversal, no `eval`, no empty catch blocks, no debug `debugger;` artifacts.

## Warnings

### WR-01: ESLint allowlist misses the URL-encoded `%5F%5Fdev` folder

**File:** `eslint.config.mjs:29`
**Issue:** The flat-config `ignores` entry `"src/app/__dev/**"` does NOT match the on-disk folder name `src/app/%5F%5Fdev/` (literal URL-encoded underscores — Plan 14-04's workaround for Next.js dropping underscore-prefixed folders from routing). The token-compliance grep audit (`scripts/audit/token-compliance.ts:48-53`) correctly allowlists BOTH forms; ESLint allowlists only the decoded form. Today this is dormant because the only file under `%5F%5Fdev/states/` is `page.tsx` and it currently consumes only token vars. But the moment a Plan 14-04 contributor adds a raw palette utility to a new `__dev` surface (allowed by D-18), the kitsubeat-tokens lint rule will flag it and fail the PR — even though D-18 explicitly permits raw values there.
**Fix:**
```js
// eslint.config.mjs
ignores: [
  "src/components/ui/**",
  "src/app/admin/**",
  "src/app/__dev/**",
  "src/app/%5F%5Fdev/**",   // Plan 14-04 URL-encoded folder; mirror token-compliance.ts allowlist.
  "src/app/error.tsx",
  // ...rest unchanged
],
```

### WR-02: `LevelUpTakeover` confetti/SFX/haptic effect re-fires when sound or haptics prefs change mid-takeover

**File:** `src/app/components/LevelUpTakeover.tsx:57-73`
**Issue:** The `useEffect` deps array is `[visible, soundEnabled, hapticsEnabled]`. The `if (!visible) return;` early-return guards against running while hidden, but if a user toggles a celebration-effects pref (sound or haptics) while the takeover is open, the effect re-fires — re-loading `canvas-confetti` and re-triggering a 200-particle burst, an SFX replay, and another vibration. In practice this is unlikely (user is unlikely to toggle prefs mid-celebration) but it is observable in the `__dev/states` catalog and any test that drives both visible=true and a pref toggle in sequence.
**Fix:** Latch the trigger to the `visible` transition only — read prefs from refs (or only on the rising edge), or fire once with a `useRef` sentinel:
```ts
const firedRef = useRef(false);
useEffect(() => {
  if (!visible) {
    firedRef.current = false;
    return;
  }
  if (firedRef.current) return;
  firedRef.current = true;
  void import("canvas-confetti").then(({ default: confetti }) => {
    confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, disableForReducedMotion: true });
  });
  playLevelUpSFX(soundEnabled);
  triggerHaptic(hapticsEnabled, [120, 60, 120]);
}, [visible, soundEnabled, hapticsEnabled]);
```
Alternative: drop `soundEnabled`/`hapticsEnabled` from deps and accept the eslint-react-hooks warning with a comment — but the ref pattern above is cleaner.

## Info

### IN-01: `flagSong` accepts unbounded `notes` string

**File:** `src/app/admin/lyrics/actions/flag-song.ts:21-48`
**Issue:** `FlagSongInput.notes: string` is written verbatim into `songs.quality_notes` with no length cap, no whitespace trim, and no empty-string guard. The admin gate (`requireAdminUser()`) means this is not an external attack surface, but a slipped-finger keyboard mash or pasted multi-MB text could bloat the row and the catalog cache. The DB column is unbounded `text`.
**Fix:** Add a server-side guard mirroring the `setThemePreference` enum-check pattern (lines 189-194 of userPrefs.ts):
```ts
const trimmed = input.notes.trim().slice(0, 500);  // 500 chars matches admin UX expectations
if (trimmed.length === 0) return { ok: false, error: "notes_required" };
// ...then write `trimmed` instead of `input.notes`.
```

### IN-02: `PLACEHOLDER_USER_ID` TODOs in production paths

**File:** `src/app/components/GlobalLearnedCounter.tsx:20-32`, `src/components/ui/ThemeToggle.tsx:23-28`, plus 8 more callers grep'd
**Issue:** Multiple Phase-14 surfaces still hardcode `PLACEHOLDER_USER_ID` instead of resolving Clerk's `auth().userId`. Every call site has a `TODO(Phase 10 auth)` comment, so this is tracked, not forgotten — but `ThemeToggle` writes the theme preference to the placeholder user's row regardless of who is actually signed in, which means a signed-in user's persisted theme is written to the wrong DB record. This is pre-existing tech debt (CROSS-cutting per CONTEXT) but Phase 14 introduced one new caller (`ThemeToggle`).
**Fix:** Phase 10 (Clerk auth) is the right place to land this; no Phase-14-blocking action. Just confirm the deferred-items.md tracker has theme-toggle-userId on the list before close.

### IN-03: `Modal` wraps `Dialog.Title` in a `<span>` inside `LevelUpTakeover`

**File:** `src/app/components/LevelUpTakeover.tsx:91-98`
**Issue:** `ModalTitle` (Radix `Dialog.Title`) renders as a heading semantically. Inside `LevelUpTakeover` the title's only child is a `<span>` carrying the visual styling. This is correct for the visual contract (the `.level-pop` keyframe needs an inline-block target) but means the heading text-content is `"LEVEL {n}!"` plus an `aria-live="assertive"` on the span — which can cause double-announcement on screen readers (the heading announces, then the assertive live region announces). Low-impact; iOS VoiceOver typically de-duplicates.
**Fix:** Remove the redundant `aria-live="assertive"` — Radix Dialog already announces the title on open via its own a11y contract:
```tsx
<ModalTitle>
  <span className="level-pop inline-block ...">
    LEVEL {newLevel}!
  </span>
</ModalTitle>
```

### IN-04: `PathMap` casts `SongListItem` to read `popularity_rank`

**File:** `src/app/path/components/PathMap.tsx:39-40`
**Issue:** Two `as unknown as { popularity_rank?: number | null }` casts indicate `SongListItem` does not surface `popularity_rank` in its public type, but PathMap reads it for sort. Either the type should expose it (preferred) or PathMap should accept a richer prop type. As-is, a future schema rename of `popularity_rank` would silently break the sort with no compile-time signal.
**Fix:** Extend `SongListItem` (in `@/lib/db/queries`) to include `popularity_rank: number | null` in the returned shape, then drop the casts. Alternatively, define a `PathSong = SongListItem & { popularity_rank: number | null }` local type and have the caller pass that.

---

_Reviewed: 2026-05-02T11:07:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
