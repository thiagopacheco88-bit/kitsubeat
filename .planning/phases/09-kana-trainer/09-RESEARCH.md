# Phase 9: Kana Trainer - Research

**Researched:** 2026-04-18
**Domain:** Client-side drill trainer (Next.js 15 app router, React 19, Zustand persist, Drizzle/Postgres, canvas-confetti, Web Speech TTS)
**Confidence:** HIGH (all integration points verified against existing source files)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Drill interaction & feedback**
- Answer input: tap 4 romaji options (one correct, three distractors). Matches Phase 8 multiple-choice pattern.
- Feedback timing: immediate correct/wrong indicator on tap + tap-to-continue. No auto-advance in either direction — full manual pacing.
- 0-star pre-reveal: kana AND romaji both shown; no distractors; single "Got it" button earns 1 star on tap.
- Audio: optional Web Speech TTS button per question (speaker icon). Off by default. Reuses the `tts.ts` helper from Phase 08.4 LearnCard.

**Mastery & row unlock display**
- Star visualization: row of 10 small dots/pips under each kana tile; filled dots = earned stars.
- Unlock rule: percentage-of-chars threshold (Claude's Discretion for exact numbers — recommend 80% of row's characters at ≥5 stars). Strict "every char ≥ N" ruled out.
- Unlock ceremony: celebratory modal + confetti on row unlock. Reuses the `canvas-confetti` dependency already installed for Phase 8 star mastery.
- Progress overview location: Claude's Discretion (recommend: full kana grid on `/kana` landing doubles as the dashboard — locked rows greyed, tiles show pip count).

**Session & entry flow**
- Session start: grid landing page with "Start session" button. Hiragana/katakana mode toggle is on the landing page (not inside the drill).
- End-of-20-Q summary: accuracy (e.g. "18/20"), per-character star deltas for chars seen this session, new-row unlock callout (if any), and weakest-chars-to-watch list.
- Post-session loop: two CTAs — "Next session" (restart immediately) and "Back to grid" (return to landing/overview).
- Onboarding: zero onboarding. No intro modal, no tutorial session. The 0-star pre-reveal mechanic is self-teaching — first visit starts with every char at 0 stars so the learner sees the answer and taps through.

**Anonymous state + script scope**
- Guest persistence: `localStorage` for signed-out users with a sign-up nudge after N sessions ("save forever / sync devices"). Signed-in users write to the database.
- Guest → signed-up migration: on sign-up, merge the localStorage stars into the new account's `user_kana_mastery` rows. No progress loss.
- Hiragana/katakana stars: fully separate. あ and ア have independent 10-star counters and independent row unlocks. Each script is its own skill track.
- Mode switching: three modes — Hiragana, Katakana, Mixed. Mixed pools both scripts into one 20-Q session (draws weighted by per-character mastery across both).

### Claude's Discretion
- Unlock threshold exact numbers (percentage and star target) — recommend 80% of row at ≥5 stars.
- Progress overview layout — recommend the landing-page grid pattern.
- Sign-up nudge cadence (after how many sessions / how prominent).
- Migration implementation specifics, including how it integrates with Phase 3 auth when that lands (this phase may ship with localStorage-only until auth is ready; DB-write path + merge-on-signup can be phased).
- Mixed-mode weighting formula (likely same weighted-random as single-script, applied to combined pool).
- Visual/layout details of the end-session summary (card layout, delta formatting).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KANA-01 | User can drill hiragana recognition (see kana, pick correct romaji from 4 options) | Section 1 (reference data shape), Section 2 (QuestionCard fork), Section 9 (route) |
| KANA-02 | User can drill katakana recognition in the same trainer | Section 1 (both scripts in one JSON), mode-toggle on `/kana` landing |
| KANA-03 | 10-star mastery: +1 correct, −2 wrong, min 0 | Section 7 (weighted draw) — applyStarDelta helper is trivial; testable as a pure function |
| KANA-04 | 0-star chars show answer pre-revealed; +1 for acknowledgment | Section 2 (QuestionCard fork — new 0-star variant renders kana+romaji with a single "Got it" button) |
| KANA-05 | 10-star chars appear at 1/5 frequency but still appear | Section 7 (weight table: stars=10 → weight 1; stars=0 → weight 10; mastered still in pool) |
| KANA-06 | Row-by-row unlock | Section 8 (isRowUnlocked helper), Section 1 (row metadata in reference data) |
| KANA-07 | 20-question sessions with weighted random selection | Section 7 (weighted draw algorithm, 20 iterations, duplicates allowed within session) |
| KANA-08 | Dakuten, handakuten, combo (yōon) as separate unlockable rows | Section 1 (full kana tables with row tags: "base", "dakuten", "handakuten", "yoon") |
| FREE-03 | Free for all users | Section 9 (no `checkExerciseAccess` call; route is public) |
</phase_requirements>

## Summary

Phase 9 is a standalone `/kana` drill route. The codebase already provides every integration point needed: the multiple-choice card pattern in `QuestionCard.tsx`, the `tts.ts` Web Speech helper, `canvas-confetti` (v1.9.4) with a verified dynamic-import shape in `StarDisplay.tsx`, and a Zustand + `persist` middleware store pattern in `exerciseSession.ts`. The DB schema already anticipates kana (note `user_exercise_log.song_version_id` is **nullable** with the comment "kana exercises have no song"), but there is **no** `user_kana_mastery` table and **no** kana reference data in the repo yet — both must be added in this phase.

The phase should ship **localStorage-only** for persistence in the first pass. The `users` table uses a text primary key matching Clerk `user_id`, and every caller today passes either `"anonymous"` (SongContent.tsx:186) or `"test-user-e2e"` (profile/page.tsx:10). A DB write path for signed-in users can be wired later behind an `isSignedIn` check without refactoring the client store; design the localStorage shape and the proposed SQL schema to be structurally identical so migration is a straight JSON → rows insert.

No new runtime dependencies are required. `wanakana` is **not** installed and is **not** needed — Hepburn romaji is baked into a static TypeScript data file. The only novel logic is (a) the weighted-random selection algorithm for the 20-Q draw and (b) the row-unlock predicate; both are small pure functions that should be unit-tested.

**Primary recommendation:** Create `src/lib/kana/` containing (1) `chart.ts` — the authoritative kana character set with row metadata, (2) `selection.ts` — weighted-random picker + row-unlock predicate, (3) `mastery.ts` — pure star-delta helpers; then build a `src/stores/kanaProgress.ts` Zustand store (persist middleware, same shape as `exerciseSession.ts`) and a `/kana` route tree that reuses the 4-option tap UI from `QuestionCard.tsx` with a thin kana-specific wrapper.

## Standard Stack

### Core (already installed — no new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5.14 (app router) | Route at `/kana` | Already the framework |
| React | ^19.2.4 | UI | Already the framework |
| zustand | ^5.0.12 | Client state + localStorage persist | Exact pattern used in `src/stores/exerciseSession.ts` |
| canvas-confetti | ^1.9.4 | Row-unlock celebration | Already used in `StarDisplay.tsx` |
| tailwindcss | ^4.2.2 | Styling | Already the styling system |
| drizzle-orm | ^0.41.0 | `user_kana_mastery` schema (when auth lands) | Existing migration pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written kana JSON | `wanakana` (romaji ↔ kana converter) | wanakana solves a harder problem (free-text input). For fixed multiple-choice where romaji strings are pre-computed, adding a 30KB library is unnecessary. **Do NOT install.** |
| Custom weighted random | `d3-random` / seedrandom | Overkill — weighted draw is ~15 lines. No need for deterministic seeds. |
| New confetti variant | Install `react-rewards` / `party-js` | `canvas-confetti` is already shipped; using it keeps one animation lib, one bundle chunk. |

**Installation:** None. All deps already in `package.json`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── kana/
│       ├── page.tsx                    # Landing: grid + mode toggle + "Start" button
│       ├── components/
│       │   ├── KanaGrid.tsx            # Full chart view with row dim states + pip counts
│       │   ├── KanaTile.tsx            # Single character + 10 pips + star count
│       │   ├── KanaSession.tsx         # 20-Q drill loop (client-only)
│       │   ├── KanaQuestionCard.tsx    # Fork of QuestionCard for 4-option tap
│       │   ├── KanaLearnCard.tsx       # 0-star pre-reveal card with "Got it" button
│       │   ├── RowUnlockModal.tsx      # Celebration modal with confetti
│       │   └── KanaSessionSummary.tsx  # Per-char deltas + weakest list + CTAs
│       └── layout.tsx                  # (optional) kana-specific header/back link
├── lib/
│   └── kana/
│       ├── chart.ts                    # KANA_CHART constant + row metadata
│       ├── chart.test.ts               # Structural invariants (every char has romaji etc.)
│       ├── selection.ts                # pickWeighted(), buildSession()
│       ├── selection.test.ts           # Weighted-draw fairness + row filter
│       ├── mastery.ts                  # applyStarDelta(), isRowUnlocked()
│       ├── mastery.test.ts             # Pure-function tests for all transitions
│       └── types.ts                    # KanaChar, Script, Row, MasteryMap types
└── stores/
    ├── kanaProgress.ts                 # Zustand + persist: mastery map + session counter
    └── __tests__/kanaProgress.test.ts
```

### Pattern 1: Zustand + persist + hydration guard (already used in repo)
**What:** Client store that survives refresh.
**When:** Any per-user persistent state without auth (kana mastery, guest progress).
**Example:**
```typescript
// Source: src/stores/exerciseSession.ts — production pattern in this repo.
// Mirror this exactly for kanaProgress.ts.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface State {
  hiragana: Record<string, number>;  // char -> stars 0..10
  katakana: Record<string, number>;
  sessionsCompleted: number;
  _hasHydrated: boolean;
}

export const useKanaProgress = create<State & Actions>()(
  persist(
    (set) => ({
      hiragana: {},
      katakana: {},
      sessionsCompleted: 0,
      _hasHydrated: false,
      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),
      // ...actions
    }),
    {
      name: "kitsubeat-kana-mastery-v1",        // use versioned key — see Section 6
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { _hasHydrated, ...rest } = s; void _hasHydrated;
        return rest;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
```

### Pattern 2: Hydration guard before reading persisted state
**What:** Render a skeleton until `_hasHydrated` is true.
**Why:** Server HTML is pre-hydration empty; first client render reads empty store; without a guard you either flash wrong content or cause a React hydration mismatch.
**Example:**
```typescript
// Source: src/app/songs/[slug]/components/ExerciseTab.tsx lines 54-63
if (!_hasHydrated) {
  return <div className="flex flex-col gap-4 py-8 animate-pulse">...</div>;
}
```

### Pattern 3: Dynamic confetti import (zero bundle cost before first fire)
**What:** Import canvas-confetti lazily on the event it's needed.
**Example:**
```typescript
// Source: src/app/songs/[slug]/components/StarDisplay.tsx lines 30-37
void import("canvas-confetti").then(({ default: confetti }) => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.4 },
    colors: ["#FFD700", "#FFA500", "#FF6347"],
    disableForReducedMotion: true,
  });
});
```
For row unlock, scale up (e.g. `particleCount: 200`, `spread: 120`) to differentiate from per-question star feedback.

### Anti-Patterns to Avoid
- **Rendering mastery state directly on initial client render without `_hasHydrated` guard** — causes a hydration mismatch warning and flashes empty grid to returning users.
- **Installing wanakana** — the drill is multiple-choice, not free-text. The library is not needed and adds bundle size.
- **Generating 4 options by random Math.random() slice of all kana** — you'll get duplicates and options from locked rows. Use a deterministic distractor pool restricted to unlocked rows of the same script.
- **Storing stars in a numeric-keyed object** — use the kana character itself as the key (e.g. `{ "あ": 3 }`). Keys are strings in JS; JSON round-trips cleanly.
- **Writing the confetti call inside the render path** — put it in a `useEffect` on the unlock event, otherwise StrictMode double-invocation will fire it twice.
- **Using the existing `exerciseSession` store for kana** — that store is session-scoped to a song and resets every new session. Kana mastery is persistent across sessions. Keep them separate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Romaji ↔ kana conversion at runtime | Custom transliteration | **Static table** in `chart.ts` (see Section 1) | Romaji is a fixed, tiny set (~150 entries). Hardcoding is simpler, faster, and ships zero JS for conversion. |
| Confetti animation | Custom particle system | `canvas-confetti` (already installed) | Physics, reduced-motion respect, browser quirks already handled. |
| localStorage-sync'd state | Raw `localStorage.getItem` + `useState` | `zustand/middleware/persist` (already used) | Handles SSR, hydration events, JSON serialization, cross-tab awareness. |
| Weighted random selection | `Math.random()` < threshold loops | Prefix-sum sampling in `selection.ts` (Section 7) | ~15 lines, unbiased, easily unit-testable. |
| TTS for kana pronunciation | Audio file bundle | `speakJapanese()` from `src/lib/tts.ts` | On-device, no hosting cost. **Caveat:** single-character kana may read as English letter on voices without a clear Japanese model. See Pitfall 5. |
| Star/pip display | New SVG | Extract pattern from `StarDisplay.tsx` | Existing pattern for "filled vs outline" — replicate with 10 dots instead of 3 stars. |

**Key insight:** This phase is almost entirely composition of existing primitives. The only genuinely new code is `chart.ts` (data) and `selection.ts` + `mastery.ts` (two short pure-function modules). Everything UI-side is a fork of `QuestionCard.tsx` with simpler props (no FSRS, no tiers, no revealed-reading state).

## Common Pitfalls

### Pitfall 1: SSR / hydration mismatch on first render
**What goes wrong:** The `/kana` landing page grid reads mastery from localStorage on mount; server-rendered HTML shows empty grid; client re-renders with actual pip counts; React logs a hydration mismatch warning.
**Why it happens:** Next.js app router still produces server HTML for client components on initial navigation.
**How to avoid:** Mark the grid `"use client"` and render a skeleton until `_hasHydrated === true` (Pattern 2). Do NOT call `useKanaProgress()` selectors during SSR.
**Warning signs:** Console warning "Text content did not match"; flashing empty grid for returning users.

### Pitfall 2: Confetti double-fire in React 19 StrictMode dev
**What goes wrong:** Unlock modal mounts, `useEffect` runs twice in dev, two confetti bursts.
**Why it happens:** StrictMode intentionally double-invokes effects in development.
**How to avoid:** Gate the effect with a `useRef` flag (pattern from `StarDisplay.tsx` — `prevStarsRef`). Fire only when the transition from "locked" to "unlocked" actually happens, not on every mount with `unlocked=true`.
**Warning signs:** Two confetti bursts in dev; only one in production (usually goes unnoticed).

### Pitfall 3: Web Speech TTS mispronounces single kana
**What goes wrong:** User taps speaker on あ; depending on the OS voice, either nothing plays, or the voice reads "a" as English letter "ay".
**Why it happens:** Some `ja-JP` voices handle single-syllable utterances poorly. TTS quality is OS- and voice-dependent.
**How to avoid:** (a) Keep the speaker icon **optional + gated on `hasJapaneseVoice()`** — exactly as `LearnCard.tsx` does. (b) Consider passing a short carrier phrase (e.g. "あ、あ" or "これはあ") if QA finds wide pronunciation issues — **not required for MVP**; log as open question. (c) Do NOT make TTS a correctness mechanism; it's a supplementary aid.
**Warning signs:** User reports "the speaker says the wrong sound". Verify with multiple OS/voice combinations.
**Source:** [WebAudio/web-speech-api issue #49 — Japanese transcript limitations](https://github.com/WICG/speech-api/issues/49)

### Pitfall 4: Keyboard accessibility on 4 tap options
**What goes wrong:** Users using Tab/arrow-keys can't navigate options; screen reader announces nothing meaningful.
**Why it happens:** The existing `QuestionCard.tsx` uses `<button>` elements — accessible by default — but has no keyboard shortcut (1/2/3/4 keys). Kana drill benefits from numeric shortcuts for fast repetition.
**How to avoid:** (a) Keep `<button>` semantics (copy from QuestionCard.tsx). (b) Add a `useEffect` keydown listener for keys `1`-`4` that maps to option index. (c) Include `aria-label` on options that reads the romaji. (d) Respect `prefers-reduced-motion` for the correct/wrong animation.
**Warning signs:** `npx next lint` catches missing aria-label; manual keyboard-only test fails.

### Pitfall 5: Duplicate options when distractor pool is small
**What goes wrong:** Only the a-row is unlocked (5 chars). Drill asks for き; buildDistractors picks from unlocked pool of {あ,い,う,え,お}; but き's row is ka-row which must also be unlocked if き was drawn. Edge case: first 0-star reveal round from a newly-unlocked row where the row only has 3 chars (e.g. や-row with ya/yu/yo) — buildDistractors cannot fill 3 distractors from 2 siblings.
**Why it happens:** Small rows + single-row unlock state.
**How to avoid:** Distractor pool = all **unlocked romaji from the same script**, minus the correct answer. If fewer than 3 unique romaji available (extremely rare — only possible before first row unlock, which is the 0-star pre-reveal case anyway), fall back to showing only the correct answer with no distractors (i.e. the 0-star pre-reveal branch — **this is the KANA-04 design**, so it's self-resolving).
**Warning signs:** Same option appearing twice in the 4-button grid.

### Pitfall 6: Over-counting mastered characters (KANA-05)
**What goes wrong:** The "mastered chars appear at 1/5 frequency" rule is interpreted as "5 × fewer slots allocated" but the draw can still hit them disproportionately by chance.
**Why it happens:** Per-draw random selection with low but nonzero weight still gives long-run fairness but short-run variance.
**How to avoid:** Weight-table approach (Section 7) gives the correct long-run distribution. Acceptance criterion should be framed as "over N=20 questions, mastered chars make up roughly (mastered_weight / total_weight) of draws" — not "exactly 4 out of 20". Test with a fixed seed if deterministic assertion is needed.
**Warning signs:** Manual QA says "I got the same mastered character 3 times in one session". Explain as variance, not a bug, unless long-run tests confirm bias.

### Pitfall 7: Saving localStorage too aggressively
**What goes wrong:** Every star change writes the entire mastery map to localStorage. With 180+ characters this is ~5KB per write. Not a performance issue, but triggers "storage" events in other tabs.
**Why it happens:** Zustand persist writes synchronously on every `set`.
**How to avoid:** Accept the write (5KB is trivial). Do NOT debounce — debouncing means losing data on refresh mid-session. The store's `partialize` can exclude transient fields like the current session's question state, but mastery map should write immediately.

### Pitfall 8: Confusing "mastered" vs "unlocked"
**What goes wrong:** Semantics drift — reviewers ask "what counts as mastered" and "does mastered mean unlocked?"
**Why it happens:** Three related but distinct concepts share vocabulary.
**How to avoid:** Fix terminology up front in `types.ts`:
- **Locked row** — no character in the row appears in the draw pool.
- **Unlocked row** — every character in the row appears in the draw pool (subject to weighting).
- **Mastered character** — star count = 10. Still in pool at weight 1 (Section 7).
- **Mastered row** — 80% of chars at ≥5 stars (the unlock threshold for the *next* row). Note: "mastering the row" triggers the next row's unlock, NOT the row's own unlock.

## Code Examples

### 1) Kana reference data shape (authoritative source verified against [Wikipedia Hepburn romanization](https://en.wikipedia.org/wiki/Hepburn_romanization))

```typescript
// src/lib/kana/chart.ts
export type Script = "hiragana" | "katakana";
export type RowKind = "base" | "dakuten" | "handakuten" | "yoon";

export interface KanaChar {
  hiragana: string;
  katakana: string;
  romaji: string;         // Modified Hepburn: し→shi, ち→chi, つ→tsu, じ→ji
  rowId: string;          // "a", "ka", "sa", ... for gojūon; "ga", "za", ... for dakuten; "pa" for handakuten; "kya", "sha", ... for yoon
  rowKind: RowKind;
  rowOrder: number;       // stable display order (unlock sequence follows this)
}

export const KANA_CHART: KanaChar[] = [
  // ─── Base gojūon (row 0..9) ───────────────────────────
  { hiragana: "あ", katakana: "ア", romaji: "a",  rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "い", katakana: "イ", romaji: "i",  rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "う", katakana: "ウ", romaji: "u",  rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "え", katakana: "エ", romaji: "e",  rowId: "a", rowKind: "base", rowOrder: 0 },
  { hiragana: "お", katakana: "オ", romaji: "o",  rowId: "a", rowKind: "base", rowOrder: 0 },
  // ka-row: か/カ ki/ku/ke/ko
  // sa-row: さ shi す せ そ        (note: し = "shi", not "si")
  // ta-row: た chi tsu て と        (note: ち = "chi", つ = "tsu")
  // na, ha (は hi ふ he ho — ふ = "fu"), ma, ya (3 chars), ra, wa (わ を ん — を = "o" in Hepburn; ん = "n")
  // ─── Dakuten (row 10..13) ─────────────────────────────
  // ga-row, za-row (じ = "ji"), da-row (ぢ = "ji", づ = "zu"), ba-row
  // ─── Handakuten (row 14) ──────────────────────────────
  // pa-row
  // ─── Yoon / combos (row 15..) ─────────────────────────
  // きゃ/きゅ/きょ (kya/kyu/kyo), しゃ/しゅ/しょ (sha/shu/sho), ちゃ/ちゅ/ちょ (cha/chu/cho),
  // にゃ/にゅ/にょ, ひゃ/ひゅ/ひょ, みゃ/みゅ/みょ, りゃ/りゅ/りょ
  // ぎゃ..., じゃ/じゅ/じょ (ja/ju/jo), ぢゃ (ja — same romaji as じゃ), びゃ..., ぴゃ/ぴゅ/ぴょ
  // full table: ~104 hiragana + 104 katakana = ~46 base + 25 dakuten + 5 handakuten + 36 yoon = 104
];

// Row-level metadata used by the grid view and the unlock logic.
export interface KanaRow {
  id: string;          // "a", "ka", ..., "kya", ...
  kind: RowKind;
  label: string;       // "a-row", "ka-row (voiced: ga)", ...
  order: number;       // canonical unlock order — a < ka < sa ... < kya ...
  chars: KanaChar[];
}
export const HIRAGANA_ROWS: KanaRow[] = /* grouped from KANA_CHART */ [];
export const KATAKANA_ROWS: KanaRow[] = /* same structure, same row ids */ [];
```

**Notes on the authoritative source:**
- Hepburn is the required system. Key non-obvious mappings: し→shi, ち→chi, つ→tsu, ふ→fu, じ→ji, ぢ→ji (homophone), づ→zu (homophone), を→o (particle).
- Total character count: 46 base + 25 dakuten + 5 handakuten + 36 yoon = **112 per script** (some sources quote 104 excluding archaic ゐ/ゑ — match Wikipedia's modern table).
- Yoon are 2-character sequences (e.g. きゃ = き + small ゃ). Store them as the full 2-char string; don't try to decompose.
- Homophones (ぢ/じ, づ/ず, を/お) — drill them independently; each gets its own 10-star counter.

### 2) QuestionCard reuse — what's forkable

**Reusable verbatim:**
- The `shuffle<T>()` Fisher-Yates helper (lines 23-31)
- The `options.map` 2x2 grid render (lines 220-232)
- `getOptionStyle()` color logic (lines 103-118) — correct=green, chosen-wrong=red, others dimmed
- `useMemo(shuffle, [question.id])` — shuffle once per question, stable across re-renders

**Drop entirely (kana-specific):**
- `userId`, `songVersionId` props — kana has neither
- `useExerciseSession()` tier/reveal state — no tiers in kana
- `recordVocabAnswer` server action call — kana writes to `useKanaProgress` store only
- `renderPrompt()` / `renderOption()` branching on `question.type` — kana has exactly one question type
- `TierText` / `FeedbackPanel` / `MasteryDetailPopover` integrations

**New in kana:**
- A "Got it" button path for 0-star chars (KANA-04) — same layout as the 4-option grid but with 1 big button and both kana + romaji shown above
- Optional speaker icon in the prompt row — wired to `speakJapanese(kanaString)`
- Keyboard shortcuts (1/2/3/4) for fast drill

**Concrete props shape:**
```typescript
// src/app/kana/components/KanaQuestionCard.tsx
interface KanaQuestionCardProps {
  kana: string;           // "あ" or "ア" or "きゃ"
  script: Script;
  correctRomaji: string;
  distractors: string[];  // length 3 — built by buildDistractors() in selection.ts
  currentStars: number;   // 0..10; if 0, render learning variant (KANA-04)
  onAnswer: (correct: boolean) => void;  // caller applies star delta + advances
}
```

### 3) Weighted random selection algorithm (Section 7 — full sketch)

```typescript
// src/lib/kana/selection.ts
import type { KanaChar, Script } from "./types";

/**
 * Star → weight table.
 * - 0 stars (learning mode): heaviest (drill until first tap)
 * - 1..9 stars: linear taper
 * - 10 stars (mastered): 1/5 of the base weight (KANA-05)
 *
 * Values chosen so that a 0-star char is 5× more likely than a 5-star char,
 * and a 10-star char is 1/5× the weight of a 5-star char.
 */
export function weightFor(stars: number): number {
  if (stars <= 0) return 10;
  if (stars >= 10) return 1;          // KANA-05 — mastered floor at 1
  return 10 - stars;                  // 1 star → 9, 9 stars → 1
  // Result: stars=5 → weight 5; stars=0 → weight 10; stars=10 → weight 1 (1/5 of stars=5)
}

export interface EligibleChar {
  char: KanaChar;
  stars: number;
  weight: number;
}

/** Pick one char using weighted random. O(n). */
export function pickWeighted<T extends { weight: number }>(pool: T[], rng: () => number = Math.random): T {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of pool) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return pool[pool.length - 1]; // floating-point safety
}

/**
 * Build a 20-question session pool, restricted to unlocked rows.
 * Duplicates allowed across draws — that's the point of weighted selection.
 */
export function buildKanaSession(params: {
  script: Script | "mixed";
  mastery: { hiragana: Record<string, number>; katakana: Record<string, number> };
  unlockedRows: { hiragana: Set<string>; katakana: Set<string> };
  chart: KanaChar[];
  questionCount?: number;
  rng?: () => number;
}): EligibleChar[] {
  const { script, mastery, unlockedRows, chart, questionCount = 20, rng = Math.random } = params;

  // Build eligible pool once
  const pool: EligibleChar[] = [];
  for (const c of chart) {
    if (script === "hiragana" || script === "mixed") {
      if (unlockedRows.hiragana.has(c.rowId)) {
        const stars = mastery.hiragana[c.hiragana] ?? 0;
        pool.push({ char: c, stars, weight: weightFor(stars) });
      }
    }
    if (script === "katakana" || script === "mixed") {
      if (unlockedRows.katakana.has(c.rowId)) {
        const stars = mastery.katakana[c.katakana] ?? 0;
        pool.push({ char: c, stars, weight: weightFor(stars) });
      }
    }
  }

  // Draw 20 with replacement (duplicates OK; a returning char is deliberate reinforcement)
  return Array.from({ length: questionCount }, () => pickWeighted(pool, rng));
}

/**
 * Build 3 distractors from unlocked pool of same script, excluding the correct answer.
 * Unique romaji — avoids ぢ/じ double-presentation.
 */
export function buildDistractors(params: {
  correctRomaji: string;
  script: Script;
  unlockedRows: Set<string>;
  chart: KanaChar[];
  count?: number;
  rng?: () => number;
}): string[] {
  const { correctRomaji, script, unlockedRows, chart, count = 3, rng = Math.random } = params;
  const field = script === "hiragana" ? "hiragana" : "katakana";
  const romajiSet = new Set<string>();
  for (const c of chart) {
    if (unlockedRows.has(c.rowId) && c.romaji !== correctRomaji) romajiSet.add(c.romaji);
  }
  const pool = [...romajiSet];
  // Fisher-Yates partial shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  void field;
  return pool.slice(0, count);
}
```

### 4) Row-unlock predicate (Section 8)

```typescript
// src/lib/kana/mastery.ts
import type { KanaRow, Script } from "./types";

/** Clamp to [0, 10]; correct → +1, wrong → -2. */
export function applyStarDelta(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 2;
  return Math.max(0, Math.min(10, next));
}

/**
 * KANA-06: Row A unlocks when the PREVIOUS row has been "mastered".
 * A row counts as mastered when ≥80% of its characters are at ≥5 stars.
 * The first row (a/ア) is unlocked by default.
 *
 * @param row - the row being checked as "passing the threshold for unlocking the next row"
 * @param scriptMastery - map of kana char → stars for the relevant script
 */
export function isRowMastered(
  row: KanaRow,
  scriptMastery: Record<string, number>,
  script: Script,
): boolean {
  if (row.chars.length === 0) return true; // defensive
  const threshold = Math.ceil(row.chars.length * 0.8);
  const masteredCount = row.chars.reduce((n, c) => {
    const key = script === "hiragana" ? c.hiragana : c.katakana;
    return n + ((scriptMastery[key] ?? 0) >= 5 ? 1 : 0);
  }, 0);
  return masteredCount >= threshold;
}

/** Compute the unlocked-row set from mastery. Strictly monotonic: once unlocked, stays unlocked. */
export function computeUnlockedRows(
  rows: KanaRow[],       // sorted by row.order
  scriptMastery: Record<string, number>,
  script: Script,
): Set<string> {
  const unlocked = new Set<string>();
  if (rows.length === 0) return unlocked;
  unlocked.add(rows[0].id);              // first row is always unlocked
  for (let i = 0; i < rows.length - 1; i++) {
    if (isRowMastered(rows[i], scriptMastery, script)) {
      unlocked.add(rows[i + 1].id);
    } else {
      break; // strict sequential unlock
    }
  }
  return unlocked;
}
```

### 5) Proposed DB schema for later (Section 5)

```typescript
// src/lib/db/schema.ts — append when auth lands (NOT in this phase if shipping pre-auth)
export const userKanaMastery = pgTable("user_kana_mastery", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),          // matches users.id (Clerk user_id)
  script: text("script").notNull(),             // "hiragana" | "katakana"
  kana: text("kana").notNull(),                 // the character itself (e.g. "あ", "キャ")
  stars: smallint("stars").default(0).notNull(),// 0..10 — CHECK constraint in SQL
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("user_kana_mastery_user_script_kana_unique").on(t.user_id, t.script, t.kana),
  index("user_kana_mastery_user_id_idx").on(t.user_id),
]);
// Add CHECK (stars >= 0 AND stars <= 10) via raw SQL in the migration file.
// RLS: when auth lands, enforce user_id = auth.uid(). For now, pre-Clerk, no RLS.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fetch-all-kana API route + SSR | Static TypeScript module bundled with client | N/A | Eliminates 1 request. Entire kana table is < 10KB. |
| Pages router layout | App router `src/app/kana/` | Next.js 13+ | Matches repo's current convention. |
| `getInitialProps` SSR | "use client" + `_hasHydrated` guard | Next.js 15 | Already the dominant pattern in this repo. |
| Manual confetti particle code | `canvas-confetti` single call | 2022 | Already adopted in `StarDisplay.tsx`. |

**Deprecated/outdated:**
- Pages Router patterns (this repo doesn't use it; mentioned only for planner context).
- Any references to `wanakana` from older Phase research notes — **not** needed for this phase (multiple-choice, not free-text).

## Open Questions

1. **Should the DB write path ship in Phase 9, or wait for Phase 3 auth?**
   - What we know: CONTEXT.md explicitly marks "how it integrates with Phase 3 auth" as Claude's discretion; schema is anticipated (`user_exercise_log.song_version_id` is nullable already).
   - What's unclear: Whether investing in the DB write path now (behind an `isSignedIn` check that always returns false until Clerk lands) is worth the up-front work, or whether localStorage-only ships faster.
   - Recommendation: **Ship localStorage-only in Phase 9.** Defer `user_kana_mastery` migration + server action to the phase that adds Clerk auth. Design the localStorage JSON shape to be structurally isomorphic to the proposed table (Section 5) so migration-on-signup is a straight `INSERT ... SELECT unnest(...)`. Add a migration stub in the planner (a dedicated plan file marked "blocked on auth") so the shape stays in planners' heads.

2. **What exact numbers for the unlock threshold?**
   - What we know: CONTEXT says "percentage-of-chars threshold", recommend 80% at ≥5 stars.
   - What's unclear: Whether 80%/5-stars produces the right pacing — if too lenient, users unlock rows before feeling fluent; if too strict, users grind forever.
   - Recommendation: Lock in 80% at ≥5 stars for MVP. Expose the two constants (`ROW_UNLOCK_MASTERY_PCT`, `ROW_UNLOCK_MIN_STARS`) in one place so tuning is a 2-line change based on user feedback.

3. **Does Web Speech TTS pronounce single-kana reliably enough?**
   - What we know: The `tts.ts` helper works for multi-character vocab in LearnCard. Some voices handle single syllables poorly.
   - What's unclear: Actual Chrome / Safari / Firefox behavior across Windows / macOS / iOS for `speakJapanese("あ")`.
   - Recommendation: Ship it behind the existing `hasJapaneseVoice()` gate (same as LearnCard). Add a Playwright smoke test that asserts the speaker button is visible only when a Japanese voice is detected, not that audio is correct. Flag "consider carrier phrase" as a follow-up if users complain.

4. **Sign-up nudge cadence — hardcode a number, or make it configurable?**
   - What we know: CONTEXT says "after N sessions".
   - What's unclear: N.
   - Recommendation: N = 3 sessions. Hardcode as `KANA_SIGNUP_NUDGE_AFTER_SESSIONS = 3` in one constants file. Phase 9 scope is localStorage-only — the nudge is just a banner, no auth integration until Phase 3 lands.

5. **Do we need a test-mode window hook like `__kbExerciseStore`?**
   - What we know: The exercise engine exposes the store for E2E when `NEXT_PUBLIC_APP_ENV === "test"` (exerciseSession.ts:219).
   - What's unclear: Whether the kana drill needs the same mechanism.
   - Recommendation: Yes — mirror the pattern on the kana store as `__kbKanaStore`. Playwright tests will want to peek at "what's the correct answer to the currently-rendered question" without scraping DOM (which would leak the answer).

## Sources

### Primary (HIGH confidence)
- `src/app/songs/[slug]/components/QuestionCard.tsx` — 4-option MC card pattern (shuffle, option grid, getOptionStyle)
- `src/app/songs/[slug]/components/StarDisplay.tsx` — canvas-confetti dynamic import, reduced-motion respect
- `src/app/songs/[slug]/components/LearnCard.tsx` — TTS usage pattern (hasJapaneseVoice, onVoicesChanged, speakJapanese)
- `src/lib/tts.ts` — Web Speech API wrapper, lang="ja-JP", cancel-before-speak
- `src/stores/exerciseSession.ts` — Zustand + persist + `_hasHydrated` + test-only window hook
- `src/lib/db/schema.ts` — existing schema; comments already anticipate kana (userExerciseLog.song_version_id nullable "kana exercises have no song")
- `src/app/profile/page.tsx` + `src/app/songs/[slug]/components/SongContent.tsx` — userId placeholder pattern
- `package.json` — canvas-confetti 1.9.4, zustand 5.0.12, Next 15.5.14, React 19.2.4 (no wanakana)

### Secondary (MEDIUM confidence — verified against primary)
- [Hepburn Romanization — Wikipedia](https://en.wikipedia.org/wiki/Hepburn_romanization) — authoritative kana/romaji table (gojūon, dakuten, handakuten, yōon)
- [canvas-confetti GitHub README](https://github.com/catdad/canvas-confetti) — all options verified: particleCount, spread, origin, colors, disableForReducedMotion, ticks, gravity, scalar, startVelocity, angle, drift

### Tertiary (LOW confidence — flagged as open questions)
- [WebAudio/web-speech-api issue #49](https://github.com/WICG/speech-api/issues/49) — documents Japanese TTS limitations; specifically called out in Pitfall 3 as a known risk.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed and already used in repo, no speculation.
- Architecture patterns: HIGH — every pattern (zustand persist, dynamic confetti import, hydration guard, TTS gating) is copy-adapted from an existing file with a line number reference.
- Kana reference data: HIGH — verified against Wikipedia's modern Hepburn table; cross-referenced against the CONTEXT decision "dakuten, handakuten, combo kana as separate unlockable rows".
- Weighted-random algorithm: HIGH — classic prefix-sum technique, ~15 lines, directly testable.
- Pitfalls: MEDIUM-HIGH — most are grounded in real code patterns in the repo (hydration mismatch, StrictMode double-fire); TTS single-char quality is MEDIUM (cross-browser variance).
- DB schema for later: MEDIUM — proposed shape matches existing `user_vocab_mastery` + comments in schema.ts; actual migration timing depends on Phase 3 auth.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — domain is stable; canvas-confetti, Web Speech API, and Hepburn romaji all extremely low-churn)
