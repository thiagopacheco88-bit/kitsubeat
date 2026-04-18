# Phase 10: Advanced Exercises & Full Mastery - Research

**Researched:** 2026-04-18
**Domain:** Exercise engine extensions (grammar conjugation, listening drill, sentence order) + 3-star mastery + premium counter gating
**Confidence:** HIGH on architecture (codebase internals). MEDIUM on verse-token distribution (not empirically sampled against prod DB — guidance is qualitative + based on tokenizer behavior).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Grammar Conjugation exercise**
- Prompt shape: Verse with target word blanked + base form shown above it (e.g., verse with `___` where the conjugated verb goes, `食べる →` displayed as scaffold). Anchors to the song and reuses the fill_lyric verse-blank pattern from Phase 08-02.
- Option generation: Mixed-distractor strategy — correct conjugation + 1 same-verb wrong conjugation + 2 same-JLPT-level alternate verbs in the target form. Balanced difficulty, more song-like than pure form-only drills.
- Form coverage for v1: Driven by what the Phase 7-02 structured-conjugation audit actually supports. Planner/researcher selects the specific forms after reviewing the structured 91% dataset — pick the forms with highest exemplar density first.
- Unstructured grammar (9% from Phase 7-02 audit): Skip those songs entirely for Grammar Conjugation. Clean boundary. Bonus badge simply remains unreachable on those songs until a future backfill phase.

**Listening Drill exercise**
- Audio scope (Claude's pick): Full verse plays at normal speed via the existing YouTube iframe. Reuses Phase 2 verse-sync infrastructure and Phase 08.1-05 test instrumentation. No clip extraction, no bleeping.
- Lyrics visibility during playback: Verse text is visible with the target word blanked. Reading scaffold present; only the target word is ear-only. Gentler than pure listening-test, still isolates listening recognition.
- Replay policy: Unlimited replays, no penalty. Low friction — matches listening-first learning goal.
- Audio unavailability fallback: When YouTubeEmbed's 15s watchdog (Phase 08.1-07) fires or iframe can't load, the listening drill is skipped for that song and the existing fallback message is shown. Star 3 is unreachable on that song until the video works. No silent substitution of Fill-the-Lyric.

**Sentence Order exercise**
- Input mode: Tap-to-build. Scrambled tokens are shown; tapping a token moves it into an "your answer" row in order. Tapping an answer-row token returns it to the pool. Mobile-first, no dnd library dependency.
- Translation hint policy: Hidden by default; user can tap a "Show hint" toggle to reveal the translation. Revealing drops the FSRS rating (same reveal-hatch pattern as Phase 08.2-01's `revealedReading` → rating=1).
- Scoring: All-or-nothing for star/rating purposes (consistent with all other Phase 8 exercise types). FeedbackPanel highlights which positions were wrong so the user learns from the mistake.
- Long verse handling (Claude's pick): Cap at 12 tokens per sentence-order question. Verses longer than 12 tokens either get excluded from Sentence Order for that song OR get tokenized at sub-clause boundaries (grouping particles/phrases as single draggables) if clause boundaries are available. Research step: assess verse-token distribution in the current catalog before picking one strategy.

**Premium gate + Star 3 flow**
- Free-tier limits (reshapes FREE-05):
  - Listening Drill: free for the user's first **10 distinct songs** attempted. Counter increments on first Ex-6 attempt per song.
  - Grammar Conjugation + Sentence Order: **single shared counter**, free for the user's first **3 distinct songs** that touch either exercise type. Counter increments on first attempt per song across the two.
  - Both counters are independent — exhausting the advanced-drills quota (3) does not affect the listening quota (10).
- Upgrade prompt triggers:
  - 11th song's Listening Drill tab-open → premium prompt before session starts.
  - 4th song's Grammar Conjugation or Sentence Order tab-open → premium prompt before session starts.
  - Prompt style: full-screen or modal at tab-open (show cost upfront, no wasted time inside a session).
- Enforcement layer: At the data access layer, consistent with Phase 08-01's `checkExerciseAccess()` pattern. UI never hides exercises unilaterally — the gate returns a locked response that the UI renders.
- Star 3 celebration: Identical confetti + star-glow as Stars 1 and 2 (consistent with Phase 08-04 display). Star 3 additionally pins a persistent **"Song Mastered" badge/banner on the song catalog card** — permanent status marker visible while browsing.
- Bonus mastery badge (Conjugation + Sentence Order): Small icon on the song catalog card alongside the 3 stars. Visible in catalog browsing, not just on the song detail page. Icon is subtle — stars remain the primary signal.

### Claude's Discretion

- Exact audio seek/playback mechanics for Listening Drill (reuses YouTube iframe + existing verse timing; implementation details).
- Tokenization strategy for Sentence Order (word-level vs sub-clause grouping) — pending verse-length audit in research.
- Exact conjugation form list — pending audit of Phase 7-02 structured data coverage.
- Distractor-pool API extensions for Grammar Conjugation (reuses or extends the Phase 08-03 JLPT pool endpoint).
- Session integration with existing Phase 8 ExerciseSession (whether Ex 5/6/7 land in the existing Practice tab or a separate surface) — planner's call.
- Exact visual design of the "Song Mastered" banner and the bonus-badge icon.
- FSRS rating details for each new exercise type (lean on Phase 08.2-01 weights model; weights for Ex 5/6/7 added in planning).

### Deferred Ideas (OUT OF SCOPE)

- Tokenization-at-clause-boundaries for long verses — may become its own research/data task if the simple 12-token cap excludes too many verses.
- Backfill for the 9% unstructured grammar songs so they gain Grammar Conjugation coverage — separate phase after audit.
- Profile-page aggregate "bonus badges earned across library" list — not in Phase 10 scope; catalog-card badge is sufficient.
- Per-position partial scoring for Sentence Order — rejected for Phase 10 (all-or-nothing stars + detailed feedback is enough).
- Larger Star 3 animation distinct from Star 1/2 — rejected in favor of the catalog-card "Song Mastered" banner, which is more persistent and visible.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXER-05 | Grammar Conjugation exercises (given base form + context, pick correct conjugated form) for songs with structured conjugation data | §1 Phase 7-02 audit — 547 structured pairs (91% parse rate) available via `parseConjugationPath()`; §6 reuses fill_lyric verse-blank pattern; §5 extends JLPT pool endpoint for same-JLPT verb distractors |
| EXER-06 | Listening Drill exercises (hear verse audio, identify target word) | §3 YouTube iframe `seekTo(seconds, true) + playVideo()` via `window.__kbPlayer` (currently test-only — must be promoted to first-class API for production); §7 new QuestionCard variant; §3 fallback uses existing `data-yt-state="error"` watchdog |
| EXER-07 | Sentence Order (rebuild scrambled verse by tapping tokens) | §2 tokens already exist on `Verse.tokens[].surface` — no new tokenization; §7 new tap-to-build card with "answer row" + "pool" state; §2 12-token cap per CONTEXT |
| STAR-04 | Star 3 earned when Listening Drill (Ex 6) passes at >=80% | §9 extend `user_song_progress` with `ex6_best_accuracy` column + update `deriveStars()` to 0\|1\|2\|3 |
| STAR-06 | Sentence Order (Ex 7) + Grammar Conjugation (Ex 5) contribute to bonus mastery badge, not gated on stars | §9 add `ex5_best_accuracy` and `ex7_best_accuracy` columns + derive `bonusBadgeEarned` predicate (both >=80%) shown on SongCard |
| FREE-05 | Listening drills premium-gated (reshaped: 10 songs free for listening; 3 shared songs free for conjugation+sentence order) | §10 new `user_exercise_song_counters` (or reuse `users` table) for per-exercise-family song-set persistence; §4 extend `checkExerciseAccess` signature to accept `userId + exerciseType + songVersionId` and consult counter |
</phase_requirements>

## Summary

Phase 10 extends the existing Phase 8 exercise engine with three new `ExerciseType` values (`grammar_conjugation`, `listening_drill`, `sentence_order`), a new Star 3 and bonus-badge mastery surface, and a per-exercise-family song-count premium gate. All the primitives exist: the question generator, Zustand session store, QuestionCard + FeedbackPanel renderer, YouTube iframe player with seek/play support (test-gated today), FSRS rating + scheduler, and the `checkExerciseAccess` data-access gate. The work is mostly wiring + one new UI pattern per exercise, not new infrastructure.

The one genuinely new piece is the **per-user, per-exercise-family song counter** for the 10-free-listening / 3-free-advanced-drill quotas. Phase 08.1's `checkExerciseAccess` is currently a pure function over a feature-flags map — it has no concept of per-user-per-song quotas. Phase 10 must extend this gate with a DB-backed counter without breaking the "UI never checks flags directly" invariant.

**Primary recommendation:**
1. Promote `window.__kbPlayer` from test-only to first-class: expose a minimal `usePlayer` API for `seekTo/play/pause` wired to the real YT iframe.
2. Reuse `pickDistractorsWithVocab` logic for Grammar Conjugation distractors by extending `pickDistractors` to support "conjugated-form" field extraction, keyed by `parseConjugationPath()` output.
3. Extend `user_song_progress` with `ex5_best_accuracy`, `ex6_best_accuracy`, `ex7_best_accuracy` columns and evolve `deriveStars()` from `0 | 1 | 2` to `0 | 1 | 2 | 3`.
4. Add two new columns (or one new table) tracking `user_id + exercise_family → Set<song_version_id>` for the free-song counter; extend `checkExerciseAccess` to accept `songVersionId` and consult the set.
5. Land all three exercises in the existing Practice tab (`ExerciseTab`) as a third "Advanced Drills" mode card, not a separate surface — avoids bifurcating ExerciseSession.
6. Adopt word-level tokenization with a 12-token cap for Sentence Order; exclude verses longer than the cap from that exercise (clean boundary, per CONTEXT deferred-idea rule on clause grouping).

## Standard Stack

All dependencies already installed. No new libraries required.

### Core (already installed, from package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | Session state + per-exercise state (answer-row, pool, replay count) | Already used by `exerciseSession` store with `persist` middleware; extending is a drop-in |
| ts-fsrs | ^5.3.2 | FSRS schedule for new exercise types (via existing `scheduleReview`) | Already wrapped in `src/lib/fsrs/scheduler.ts`; Ex 5/6/7 just need new `RATING_WEIGHTS` entries |
| canvas-confetti | ^1.9.4 | Star 3 celebration burst in `StarDisplay` | Already used for Stars 1 + 2; extending `stars: 0 \| 1 \| 2` to `0 \| 1 \| 2 \| 3` (signature already permits 0-3, see `StarDisplay.tsx`) |
| drizzle-orm | ^0.41.0 | Schema migrations (0006_advanced_exercises.sql) | Existing convention |
| next/react | 15 / 19 | UI primitives | Existing stack |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sglkc/kuromoji | ^1.1.0 | Already tokenizes lyrics into `Verse.tokens[]` at seed time | No runtime use in Phase 10 — tokens already baked into lesson JSONB |

### Explicitly NOT needed
| Considered | Why Skipped |
|-----------|-------------|
| `@dnd-kit/core`, `react-beautiful-dnd`, `@hello-pangea/dnd` | CONTEXT LOCKED: tap-to-build, not drag-and-drop. Mobile-first + no library dependency. |
| Audio extraction libs (ffmpeg, wavesurfer sub-clip) | CONTEXT LOCKED: Full verse plays via the existing YouTube iframe. No clip extraction. (wavesurfer.js is installed but only used elsewhere — not for listening drill.) |
| Client-side Japanese tokenizer | Tokens are already baked into `Verse.tokens[]` during seed — no runtime tokenization needed. |

**Installation:** none — no new dependencies.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── exercises/
│   │   ├── generator.ts        # extend ExerciseType union + buildQuestions
│   │   ├── access.ts           # extend checkExerciseAccess(userId, type, songVersionId?)
│   │   ├── feature-flags.ts    # add grammar_conjugation/listening_drill/sentence_order
│   │   ├── conjugation.ts      # NEW: pickConjugationDistractors + runtime parseConjugationPath use
│   │   ├── counters.ts         # NEW: getSongCount, incrementSongCount for free-quota gating
│   │   └── __tests__/
│   │       ├── conjugation.test.ts
│   │       └── counters.test.ts
│   ├── fsrs/rating.ts          # extend RATING_WEIGHTS for 3 new ExerciseType
│   └── db/schema.ts            # add exX_best_accuracy cols + counter table
├── app/
│   ├── actions/
│   │   ├── exercises.ts        # extend saveSessionResults to track ex5/6/7 accuracy + bump counter
│   │   └── counters.ts         # NEW: server action surface for counter reads
│   └── songs/[slug]/components/
│       ├── ExerciseTab.tsx              # add Advanced Drills mode card + premium gate prompt
│       ├── ExerciseSession.tsx          # dispatch question.type to new card components
│       ├── QuestionCard.tsx             # extend renderPrompt()/renderOption() switch for 3 new types
│       ├── ConjugationCard.tsx          # NEW: verse-blank + base-form scaffold prompt (reuses fill_lyric pattern)
│       ├── ListeningDrillCard.tsx       # NEW: embeds YouTubeEmbed seek/play + verse-text with target blanked
│       ├── SentenceOrderCard.tsx        # NEW: pool + answer-row token taps
│       ├── StarDisplay.tsx              # widen stars prop to 0|1|2|3 (already permits it) + Star 3 SVG slot
│       ├── SongMasteredBanner.tsx       # NEW: catalog-card banner for 3-star songs
│       └── BonusBadgeIcon.tsx           # NEW: catalog-card icon for Ex5+Ex7 ≥80%
└── stores/
    └── exerciseSession.ts      # add fields: listeningReplays, sentenceOrderPool, sentenceOrderAnswer, conjugationRevealedHint
```

### Pattern 1: Exercise type addition — extend the ExerciseType union

**What:** Each new exercise type is a new value in the `ExerciseType` union in `src/lib/exercises/generator.ts`, with corresponding switch branches in `makeQuestion`, `QuestionCard.renderPrompt`, `QuestionCard.renderOption`, and `FeedbackPanel`.

**When to use:** Any new exercise that fits the existing Question shape (prompt + correctAnswer + distractors + explanation).

**Example:**
```typescript
// src/lib/exercises/generator.ts — current
export type ExerciseType =
  | "vocab_meaning"
  | "meaning_vocab"
  | "reading_match"
  | "fill_lyric";

// Phase 10 extension
export type ExerciseType =
  | "vocab_meaning"
  | "meaning_vocab"
  | "reading_match"
  | "fill_lyric"
  | "grammar_conjugation"  // Ex 5
  | "listening_drill"      // Ex 6
  | "sentence_order";      // Ex 7
```

Each new type requires a `RATING_WEIGHTS` entry (src/lib/fsrs/rating.ts), a `EXERCISE_FEATURE_FLAGS` entry (feature-flags.ts), and a branch in the QuestionCard switch. Only `sentence_order` genuinely breaks the 4-option mold — it needs a different card component altogether.

### Pattern 2: Reuse fill_lyric verse-blank for Grammar Conjugation

**What:** fill_lyric already does "show verse with surface replaced by `_____`". Grammar Conjugation adds one scaffold: the base form displayed above the blank.

**Implementation:**
```typescript
// In makeQuestion for grammar_conjugation:
case "grammar_conjugation": {
  // parsed from conjugation_path via scripts/lib/conjugation-audit.ts::parseConjugationPath
  // parsed.base = "食べる", parsed.conjugated = "食べた"
  const ref = findVerseForVocab(parsed.conjugated, verses);
  if (!ref) return null;
  verseRef = ref;
  const verse = verses.find((v) => v.verse_number === ref.verseNumber)!;
  const verseText = verse.tokens.map((t) => t.surface).join("");
  prompt = verseText.replace(parsed.conjugated, "_____");
  correctAnswer = parsed.conjugated;
  // Attach parsed.base to Question as a new field `conjugationBase` so QuestionCard
  // can render "食べる →" above the verse prompt.
  break;
}
```

**Question type extension:**
```typescript
export interface Question {
  // ...existing
  conjugationBase?: string;  // NEW: displayed as scaffold for grammar_conjugation
}
```

### Pattern 3: Tap-to-build token selection (Sentence Order)

**What:** Two arrays — `pool` (scrambled unused tokens) and `answer` (ordered user selection). Tapping a pool token pushes it to answer; tapping an answer token pops it back to pool (preserving its original index for correct shuffle stability). Persisted in the Zustand session store so reloads don't reset mid-question.

**Example:**
```typescript
// Zustand slice additions
interface SentenceOrderSliceState {
  // keyed by question.id — survives across questions in a session
  sentenceOrderPool: Record<string, Token[]>;
  sentenceOrderAnswer: Record<string, Token[]>;
  sentenceOrderHintShown: Record<string, true>;  // maps to revealedReading=true for FSRS
}
```

Correctness check:
```typescript
// Compare answer[] token.surface concatenation to the original verse token surfaces
const correct = answer.map(t => t.surface).join("") === question.correctAnswer;
```

### Pattern 4: Listening Drill — promote test-only YouTube player access to production

**What:** `window.__kbPlayer` is currently test-only (gated on `NEXT_PUBLIC_APP_ENV === 'test'`, see `YouTubeEmbed.tsx` line 124). For Ex 6, listening drill needs `seekTo(ms) + playVideo() + pauseVideo()` from React at runtime.

**Recommendation:** Extend `PlayerContext` with an imperative API rather than leaking the raw YT object:
```typescript
// PlayerContext.tsx additions
interface PlayerState {
  // ...existing
  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;
  isReady: boolean;
}
```
`YouTubeEmbed` sets these via `setSeekTo(() => (ms) => playerRef.current?.seekTo(ms / 1000, true))` inside `onReady`. `ListeningDrillCard` calls `seekTo(verseRef.startMs); play()` on mount and on "Replay" button clicks.

**Important:** The current YT test hook uses `seekTo(seconds, true)` (seconds, not ms). Existing test code at `tests/e2e/player-sync-and-seek.spec.ts` lines 122, 164, 179 confirms: `p.seekTo(startSec, true); p.playVideo();`. Wrap the conversion inside the API surface.

### Pattern 5: Premium gate — extend checkExerciseAccess for per-song quotas

**What:** The current gate is pure: `checkExerciseAccess(userId, type) → { allowed, reason }`. Phase 10 adds a dimension: "free for first N songs of this exercise family." The gate must accept `songVersionId` and consult a counter.

**Example shape:**
```typescript
// src/lib/exercises/access.ts — extend
export async function checkExerciseAccess(
  userId: string,
  exerciseType: string,
  opts?: { songVersionId?: string }
): Promise<{ allowed: boolean; reason?: string; quotaRemaining?: number }> {
  const gate = EXERCISE_FEATURE_FLAGS[exerciseType] ?? "premium";
  if (gate === "free") return { allowed: true };

  // Phase 10: song-quota gate for new types
  if (gate === "song_quota" && opts?.songVersionId) {
    const premium = await isPremium(userId);
    if (premium) return { allowed: true };

    const family = FAMILY_OF[exerciseType];  // "listening" | "advanced_drill"
    const songsUsed = await getSongCountForFamily(userId, family);
    const limit = QUOTA_LIMITS[family];  // 10 | 3
    const alreadyCounted = await userHasTouchedSong(userId, family, opts.songVersionId);
    if (alreadyCounted || songsUsed < limit) {
      return { allowed: true, quotaRemaining: Math.max(0, limit - songsUsed) };
    }
    return { allowed: false, reason: "quota_exhausted", quotaRemaining: 0 };
  }

  // Existing premium behavior
  return { allowed: false, reason: "premium_required" };
}
```

The counter persists in either:
- Option A (recommended): new table `user_exercise_song_counters` with `(user_id, family, song_version_id)` unique constraint. Inserts on first attempt; family-level COUNT is the song count. Explicit + auditable.
- Option B: two text[] columns on `users` table (`listening_songs_used`, `advanced_songs_used`) storing arrays of song_version_ids. Simpler, avoids a join, but cost-prohibitive at >1000 songs per user (not a near-term concern).

Recommend Option A — it mirrors the precedent of per-row persistence already used for `user_vocab_mastery`, `user_song_progress`, `user_exercise_log`.

### Pattern 6: Mastery derivation — evolve deriveStars from (0|1|2) to (0|1|2|3)

**What:** Extend `user_song_progress` schema + `deriveStars()` function in schema.ts.

**Example:**
```typescript
// src/lib/db/schema.ts — extend userSongProgress
export const userSongProgress = pgTable("user_song_progress", {
  // ...existing
  ex5_best_accuracy: real("ex5_best_accuracy"),  // grammar_conjugation
  ex6_best_accuracy: real("ex6_best_accuracy"),  // listening_drill — drives Star 3
  ex7_best_accuracy: real("ex7_best_accuracy"),  // sentence_order
});

export function deriveStars(progress: {
  ex1_2_3_best_accuracy: number | null;
  ex4_best_accuracy: number | null;
  ex6_best_accuracy: number | null;  // NEW
}): 0 | 1 | 2 | 3 {
  const e123 = progress.ex1_2_3_best_accuracy ?? 0;
  const e4 = progress.ex4_best_accuracy ?? 0;
  const e6 = progress.ex6_best_accuracy ?? 0;
  if (e123 >= 0.80 && e4 >= 0.80 && e6 >= 0.80) return 3;
  if (e123 >= 0.80 && e4 >= 0.80) return 2;
  if (e123 >= 0.80) return 1;
  return 0;
}

// NEW bonus badge predicate — NOT gating stars per STAR-06
export function deriveBonusBadge(progress: {
  ex5_best_accuracy: number | null;
  ex7_best_accuracy: number | null;
}): boolean {
  return (progress.ex5_best_accuracy ?? 0) >= 0.80
      && (progress.ex7_best_accuracy ?? 0) >= 0.80;
}
```

### Anti-Patterns to Avoid

- **Checking EXERCISE_FEATURE_FLAGS directly from UI** — Phase 08.1-07's regression test (`tests/e2e/regression-premium-gate.spec.ts`) enforces that no UI component imports the flags. All gate decisions flow through `checkExerciseAccess` server-side. Phase 10 code MUST respect this.
- **Storing "stars" as a column** — explicitly forbidden in `src/lib/db/schema.ts`: "Stars are NEVER stored as a column — they are always derived from accuracy values." Phase 10's `deriveStars` extension continues this.
- **Rendering the correct answer in a `data-correct=` attribute** — `ExerciseSession` tests use `window.__kbExerciseStore` gated on `NEXT_PUBLIC_APP_ENV === 'test'` for answer introspection (see `src/stores/exerciseSession.ts` line 219). Phase 10 must not leak correct answers into the production DOM (especially critical for sentence_order where position matters).
- **Creating a parallel session store for advanced drills** — the existing `exerciseSession` Zustand already persists across browser refreshes and handles tier-aware rendering. Phase 10 should extend slices, not fork the store. (Contrast Phase 11 Plan 05, which correctly forked a *separate* `reviewSession` store because it's a wholly different surface — `/review` route, no song context. Phase 10 is per-song, same surface.)
- **Silent fallback from Listening Drill to Fill-the-Lyric when YouTube fails** — CONTEXT LOCKED: "No silent substitution of Fill-the-Lyric." Star 3 stays unreachable on that song. UI must explicitly show the fallback message (reusing `data-yt-state="error"` surface).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Japanese tokenization for Sentence Order | Runtime kuromoji tokenization | Use pre-baked `Verse.tokens[]` from lesson JSONB | Tokens already exist with surface/reading/romaji/grammar/grammar_color per Phase 1 content pipeline. Running kuromoji client-side would cost ~3MB bundle for no benefit. |
| Conjugation path parsing | A new parser | `scripts/lib/conjugation-audit.ts::parseConjugationPath` | Already parses structured paths at 91% rate (Phase 7-02 summary); per 07-02-SUMMARY the DECISION is "parseConjugationPath called on-demand at exercise generation time (Phase 10)." Phase 10 consumes it. |
| Distractor selection | A new picker | `src/lib/exercises/generator.ts::pickDistractorsWithVocab` with a new `ExerciseType` branch + `extractField` case | Same-song + same-JLPT pool logic is already there. Grammar Conjugation just needs `extractField(v, "grammar_conjugation")` to return the conjugated form (via parseConjugationPath). |
| FSRS rating calculation | Per-type logic | `ratingFor(exerciseType, correct, { revealedReading })` + `RATING_WEIGHTS` | Extend the table; all the reveal-hatch logic is already there. |
| Premium subscription check | New boolean fetcher | `src/app/actions/userPrefs.ts::isPremium` | Single source of truth across the app (Phase 08.4 decision). |
| Confetti + star animation | New celebration primitive | Existing `StarDisplay` (animate prop) + canvas-confetti | `stars` prop already typed `0 \| 1 \| 2 \| 3` (see `StarDisplay.tsx` line 16) — Star 3 SVG is already rendered as the outline. Just swap in the filled SVG and widen `deriveStars`. |
| Song catalog card rendering | New card | `src/app/songs/components/SongCard.tsx` — extend with SongMasteredBanner overlay + BonusBadgeIcon slot | Already renders circular progress + stars. Extension is additive. |
| Zustand persist across refresh | Custom localStorage bridge | The existing `persist` middleware on `useExerciseSession` | Extending state slices is a one-line addition to `initialState`. |

**Key insight:** Phase 10 is ~80% integration work on existing primitives. The only genuinely new component surfaces are `ConjugationCard`, `ListeningDrillCard`, `SentenceOrderCard`, `SongMasteredBanner`, and `BonusBadgeIcon`. All the plumbing (routing, DB writes, gate, FSRS, progress tracking) is extension-of-existing.

## Common Pitfalls

### Pitfall 1: Leaking correct answer via DOM in Sentence Order
**What goes wrong:** Rendering the answer row with `data-correct-index` or giving each token a stable id that matches the correct order lets the user (or tests) inspect devtools and cheat.
**Why it happens:** It's the natural way to implement tap-to-build — assign each token a canonical index.
**How to avoid:** Track each token by a UUID generated at shuffle time, not by its correct-order index. Keep the correct order in Zustand only. Mirror the pattern at `src/stores/exerciseSession.ts` lines 215-219 — gate any test-introspection hook on `NEXT_PUBLIC_APP_ENV === 'test'`.
**Warning signs:** grep finds a `data-correct` or `data-position` attribute on a token in production.

### Pitfall 2: YouTube iframe replay racing onStateChange
**What goes wrong:** Rapid "Replay" clicks fire `seekTo + playVideo` before the previous `playVideo` resolves → playback stutters or doesn't restart. `onStateChange` fires out of order and the verse-sync interval picks up stale currentTime.
**Why it happens:** YT IFrame API calls are async over postMessage; there's no built-in debounce.
**How to avoid:** Debounce replay button to ~400ms. On replay, `pauseVideo()` then `seekTo()` then `playVideo()` with a 50-100ms delay between seek and play (empirically stable). Don't rely on `onStateChange === 1 (PLAYING)` to confirm start; just seek+play and trust the 250ms polling interval at `YouTubeEmbed.tsx` line 68 to catch up.

### Pitfall 3: Listening Drill watchdog collision
**What goes wrong:** The 15s YT watchdog in `YouTubeEmbed.tsx` fires before the user reaches the practice tab. When Listening Drill mounts, the player is already in error state. UI shows blank.
**Why it happens:** Phase 08.1-07 watchdog clock starts on page load, not on drill mount.
**How to avoid:** Listening Drill card must read `embedState` via PlayerContext before rendering controls. If `embedState === "error"`, render the CONTEXT-locked fallback: "Listening Drill unavailable for this song (video not playable). Star 3 is unreachable until the video works."

### Pitfall 4: Grammar Conjugation with unstructured paths
**What goes wrong:** `parseConjugationPath` returns `is_structured: false` for 9% of grammar points. Generating a question from these produces garbage prompts ("dictionary form → te-form" with no actual Japanese).
**Why it happens:** Not all GrammarPoint.conjugation_path fields have structured Japanese pairs; Phase 7-02 left this at a clean 91% boundary.
**How to avoid:** `buildQuestions` branch for grammar_conjugation must skip vocab whose paired grammar_point's `conjugation_path` is null or `parseConjugationPath() === null` or returns `is_structured: false`. CONTEXT LOCKED: "Skip those songs entirely" — if a song has zero structured conjugations, Grammar Conjugation simply doesn't appear in its session. This cleanly implements STAR-06's "not gated on stars" constraint — no grammar_conjugation, no bonus badge possible for that song.

### Pitfall 5: Counter double-increment on session resume
**What goes wrong:** User opens Listening Drill for song N11 when premium expires → gate denies → they refresh / restart → gate denies again, but the first attempt already counted. Now N12 is locked even though they never finished a session.
**Why it happens:** Incrementing on tab-open instead of on first answer.
**How to avoid:** CONTEXT specifies: "Counter increments on **first Ex-6 attempt per song**" and "Counter increments on **first attempt per song** across the two" for advanced drills. Increment only when a user submits the first answer of the first question — not on tab-open. Store the increment in `saveSessionResults` OR in `recordVocabAnswer` when `answer.type` is the new type and no row exists yet for `(user_id, family, song_version_id)`. An `onConflictDoNothing` insert on the counter table makes this idempotent.

### Pitfall 6: Counter mismatch between gate check and gate enforcement
**What goes wrong:** Gate check at tab-open says "allowed, 2 quota remaining." User starts session. Another device counts a third song in parallel. `saveSessionResults` tries to increment; there's no client-side validation. Quota is now -1.
**Why it happens:** Optimistic assumption on counter-increment.
**How to avoid:** The increment write is the authoritative operation. Use `INSERT ... ON CONFLICT DO NOTHING`. After insert, re-count rows for `(user_id, family)`. If count exceeds limit AND no premium, refund the increment (DELETE) + throw `quota_exhausted` from the server action. UI must handle this gracefully by showing the upsell modal post-session rather than silently discarding the answer (document this trade-off in plan).

### Pitfall 7: Star 3 confetti firing on downgrade
**What goes wrong:** User earned Star 3 previously. Premium expires; new songs don't count toward listening drill. User completes a new session on the same song — `stars` stays at 3 (best-accuracy GREATEST is sticky). Confetti fires because `previousStars` logic misfires.
**Why it happens:** `stars > previousStars` in `SessionSummary.tsx` line 124 is correct, but `previousStars` is re-read from same upsert. If the upsert starts with `stars=0, previous=0` on a cross-device race, you could get `stars=3, previous=0` = false confetti.
**How to avoid:** Keep the existing `saveSessionResults` pattern — it already SELECTs the row *before* upsert (line 98) to capture `previousStars`. Phase 10 just extends this to include `ex6_best_accuracy` in the snapshot. No structural change needed.

### Pitfall 8: Listening Drill target-word blank must not leak in roman text
**What goes wrong:** Verse text with target word replaced by `_____` is rendered, but the romaji line below (rendered when `showRomaji` is on) still shows the full romaji.
**Why it happens:** `VerseBlock.tsx` line 52-55 joins `token.romaji` with spaces — there's no blanking logic there.
**How to avoid:** `ListeningDrillCard` renders its own verse display, not VerseBlock. It shows the verse tokens with the target token's surface replaced by `_____` and the corresponding romaji token blanked too. Keep furigana toggle off for the target token.

## Code Examples

### Example 1: Extend RATING_WEIGHTS for new exercise types
```typescript
// src/lib/fsrs/rating.ts — Phase 10 extension
export const RATING_WEIGHTS: Record<ExerciseType, FSRSRating> = {
  meaning_vocab: 4,       // Production-flavored, hardest direction
  vocab_meaning: 3,       // Recognition
  fill_lyric: 3,          // Recognition + context
  reading_match: 2,       // Pure surface, easiest
  grammar_conjugation: 4, // Production-flavored — hardest; user produces a form, not recognizes
  listening_drill: 3,     // Recognition + ear — parallels vocab_meaning difficulty
  sentence_order: 4,      // Production-flavored — user assembles structure, not recognizes one
};
// Source: extends the locked RATING_WEIGHTS in 08.2-01-SUMMARY with three new rows
// following the "production > recognition > surface" weight ordering invariant.
```

### Example 2: Extend deriveStars + add deriveBonusBadge
```typescript
// src/lib/db/schema.ts — Phase 10 extension
export function deriveStars(progress: {
  ex1_2_3_best_accuracy: number | null;
  ex4_best_accuracy: number | null;
  ex6_best_accuracy: number | null;
}): 0 | 1 | 2 | 3 {
  const e123 = progress.ex1_2_3_best_accuracy ?? 0;
  const e4 = progress.ex4_best_accuracy ?? 0;
  const e6 = progress.ex6_best_accuracy ?? 0;
  if (e123 >= 0.80 && e4 >= 0.80 && e6 >= 0.80) return 3;
  if (e123 >= 0.80 && e4 >= 0.80) return 2;
  if (e123 >= 0.80) return 1;
  return 0;
}

export function deriveBonusBadge(progress: {
  ex5_best_accuracy: number | null;
  ex7_best_accuracy: number | null;
}): boolean {
  return (progress.ex5_best_accuracy ?? 0) >= 0.80
      && (progress.ex7_best_accuracy ?? 0) >= 0.80;
}
```

### Example 3: Feature-flag shape for quota-gated types
```typescript
// src/lib/exercises/feature-flags.ts — Phase 10
export type ExerciseGateStatus = "free" | "premium" | "song_quota";

export const EXERCISE_FEATURE_FLAGS: Record<string, ExerciseGateStatus> = {
  vocab_meaning:        "free",
  meaning_vocab:        "free",
  reading_match:        "free",
  fill_lyric:           "free",
  listening_drill:      "song_quota",   // 10-song free quota per CONTEXT
  grammar_conjugation:  "song_quota",   // shared 3-song free quota with sentence_order
  sentence_order:       "song_quota",   // shared 3-song free quota with grammar_conjugation
};

export const QUOTA_FAMILY: Record<string, "listening" | "advanced_drill"> = {
  listening_drill:     "listening",
  grammar_conjugation: "advanced_drill",
  sentence_order:      "advanced_drill",
};

export const QUOTA_LIMITS = {
  listening: 10,
  advanced_drill: 3,
} as const;
```

### Example 4: Conjugation distractor picker (new module)
```typescript
// src/lib/exercises/conjugation.ts — NEW
import { parseConjugationPath, type StructuredConjugation } from "@/../scripts/lib/conjugation-audit";
import type { VocabEntry, GrammarPoint } from "@/lib/types/lesson";

/**
 * Build the 4 options for a grammar_conjugation question:
 *  - correct conjugated form
 *  - 1 same-verb WRONG conjugation (e.g., 食べた → 食べない if target is past)
 *  - 2 same-JLPT alternate verbs conjugated to the same target form
 *
 * Returns null when the conjugation_path is unstructured — caller skips.
 */
export function pickConjugationOptions(
  targetVocab: VocabEntry,
  grammarPoint: GrammarPoint,
  sameJlptPool: VocabEntry[]
): { correct: string; distractors: string[]; base: string } | null {
  const parsed = parseConjugationPath(grammarPoint.conjugation_path);
  if (!parsed || !parsed.is_structured) return null;
  // ... pick 1 same-verb wrong form (heuristic: swap to the opposite polarity or tense)
  // ... pick 2 same-JLPT verbs from sameJlptPool and conjugate them using a small runtime
  //     ruleset (limited to the specific forms planner chooses for v1 per CONTEXT).
  return { correct: parsed.conjugated, distractors: [...], base: parsed.base };
}
```

### Example 5: Extended checkExerciseAccess
```typescript
// src/lib/exercises/access.ts — extend
import { EXERCISE_FEATURE_FLAGS, QUOTA_FAMILY, QUOTA_LIMITS } from "./feature-flags";
import { isPremium } from "@/app/actions/userPrefs";
import { getSongCountForFamily, userHasTouchedSong } from "./counters";

export async function checkExerciseAccess(
  userId: string,
  exerciseType: string,
  opts?: { songVersionId?: string }
): Promise<{ allowed: boolean; reason?: string; quotaRemaining?: number }> {
  const gate = EXERCISE_FEATURE_FLAGS[exerciseType] ?? "premium";
  if (gate === "free") return { allowed: true };
  if (gate === "song_quota") {
    if (!opts?.songVersionId) {
      return { allowed: false, reason: "songVersionId required for quota gate" };
    }
    if (await isPremium(userId)) return { allowed: true };
    const family = QUOTA_FAMILY[exerciseType];
    const alreadyCounted = await userHasTouchedSong(userId, family, opts.songVersionId);
    const count = await getSongCountForFamily(userId, family);
    const limit = QUOTA_LIMITS[family];
    if (alreadyCounted || count < limit) {
      return { allowed: true, quotaRemaining: Math.max(0, limit - count) };
    }
    return { allowed: false, reason: "quota_exhausted", quotaRemaining: 0 };
  }
  return { allowed: false, reason: "premium_required" };
}
```

## Findings By Research Priority

### 1. Phase 7-02 structured conjugation data coverage (CONFIDENCE: HIGH on counts, MEDIUM on form distribution)

**From `.planning/phases/07-data-foundation/07-02-SUMMARY.md`:**
- 648 grammar points total across 116 songs
- 602 have a `conjugation_path` field (93% populated)
- 547 structured (91% parse rate — exceeds 80% threshold)
- 55 unstructured (9% — pattern labels like `〜ている` with no derivation)

**What the audit DOESN'T tell us (gap):** The summary documents parse rate but not a per-form histogram. The plan cannot reference "N5 negative past" exemplar density without actually running a query. The `parseConjugationPath` output's `conjugation_type` field ("past tense", "te-form → te-iru", etc.) is the bucketing key.

**Recommended research step during planning:** Run a one-off script that calls `auditConjugationPaths` across all 116 song_versions and groups `parsed[]` by `conjugation_type`. Pick the top 5-7 forms by frequency as v1 coverage. Expected top forms (based on prevalence in anime JP lyrics and JLPT N5/N4 distribution):
  1. Past affirmative (〜た): very common
  2. Te-form (〜て): very common
  3. Negative (〜ない): very common
  4. Past negative (〜なかった): moderate
  5. Potential (〜られる / 〜える): moderate
  6. Volitional (〜よう / 〜おう): less common
  7. Conditional (〜ば / 〜たら): less common in N5/N4, more in N3+

**Recommendation to planner:** v1 form coverage = top 3-5 by density. Defer the long tail to Phase 10.1 if needed.

### 2. Verse-token distribution audit (CONFIDENCE: MEDIUM — no direct DB sample taken)

**What we know from the code:**
- Tokens are pre-baked at seed time via kuroshiro + kuromoji (`scripts/lib/kuroshiro-tokenizer.ts`).
- kuromoji is morpheme-level: "見ていた" becomes 見 / て / い / た (4 tokens, not 1).
- Each Verse = one line of lyrics in the synced_lrc. Japanese anime OP/ED verses are typically 8-20 morpheme-tokens.
- `VerseBlock.tsx` renders tokens with `flex flex-wrap gap-0.5` — there's no existing max-verse-length check in the codebase.

**Qualitative estimate based on J-pop anime verse structure:**
- Short verses (chorus hooks): 5-10 tokens — fine for Sentence Order.
- Median verse: 10-14 tokens — borderline at 12-token cap.
- Long verses (bridge / story verses): 14-25 tokens — exceeds cap, must be excluded.

**Recommendation to planner:** Adopt the 12-token cap per CONTEXT. Exclude verses above the cap from Sentence Order for that song (not the whole song). Run an ad-hoc audit during planning to count: for each song, how many verses are ≤12 tokens? If <30% of songs have ≥3 eligible verses, re-evaluate with 14 or 16 token cap. The CONTEXT deferred item on "tokenization-at-clause-boundaries" is the fallback if this coverage is too thin.

### 3. YouTube iframe replay mechanics (CONFIDENCE: HIGH)

**Current surface in `YouTubeEmbed.tsx`:**
- `playerRef.current` is a `YT.Player` instance.
- Methods available per `@types/youtube`: `seekTo(seconds, allowSeekAhead)`, `playVideo()`, `pauseVideo()`, `getCurrentTime()`, `getPlayerState()`.
- `onStateChange(event)` — `event.data === 1` means PLAYING.
- `setInterval` polls `getCurrentTime()` every 250ms → `setCurrentTimeMs(Math.floor(seconds * 1000))` in PlayerContext. This is the sync heartbeat.
- Test hook: `window.__kbPlayer = event.target` ONLY when `NEXT_PUBLIC_APP_ENV === 'test'` (line 124, single-condition gate). Production must not leak this.

**What Listening Drill needs (API surface):**
- `seekToMs(ms: number): void` — converts to seconds and calls `seekTo`.
- `play(): void`
- `pause(): void`
- `isReady: boolean` — derived from PlayerContext's embedState (PlayerContext doesn't expose embedState today; extend it).

**Recommendation:** Extend `PlayerContext.tsx` (not `YouTubeEmbed.tsx` directly) with callbacks that YouTubeEmbed registers inside `onReady`. This keeps the YT player reference private to YouTubeEmbed while exposing imperative controls to any consumer.

### 4. Phase 08.1 checkExerciseAccess() pattern (CONFIDENCE: HIGH)

**Current shape** (`src/lib/exercises/access.ts`):
- `checkExerciseAccess(userId, exerciseType): Promise<{ allowed, reason? }>`.
- Looks up `EXERCISE_FEATURE_FLAGS[type] ?? "premium"`.
- Free → allowed. Premium → denied with `reason: "premium_required"`.
- TODO in code: "replace with Clerk userId + real subscription check when auth is added."

**Where it's called today:** Nowhere in the UI directly. The regression test at `tests/e2e/regression-premium-gate.spec.ts` asserts `EXERCISE_FEATURE_FLAGS` is never imported by UI components. Today it's only invoked by tests. Phase 10 is where it first becomes load-bearing in production.

**Counter persistence — where should it live?**
- NOT in `users` table (per-user scalar prefs — wrong shape for a set-of-songs relation).
- NOT in `user_song_progress` (per-song row, but doesn't cleanly represent "first N songs in family" without a sorted-list scan).
- **Recommend: new table `user_exercise_song_counters`**:
  ```sql
  CREATE TABLE user_exercise_song_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    exercise_family TEXT NOT NULL,  -- 'listening' | 'advanced_drill'
    song_version_id UUID NOT NULL REFERENCES song_versions(id),
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, exercise_family, song_version_id)
  );
  CREATE INDEX ON user_exercise_song_counters(user_id, exercise_family);
  ```
- COUNT by `(user_id, exercise_family)` gives quota used. INSERT ... ON CONFLICT DO NOTHING on first attempt. Idempotent. Auditable.

### 5. Phase 08.3 JLPT distractor pool endpoint (CONFIDENCE: HIGH)

**Current endpoint** (`src/app/api/exercises/jlpt-pool/route.ts`):
- `GET /api/exercises/jlpt-pool?jlpt_level=N5`
- Returns up to 50 vocabulary items joined from `vocab_global` materialized view × `vocabulary_items`.
- Returns `{ id, dictionary_form, reading, romaji, part_of_speech, meaning }`.

**For Grammar Conjugation** (picking 2 same-JLPT alternate verbs):
- Existing endpoint gives the raw vocab rows. It does NOT filter by part_of_speech — but the query returns `part_of_speech` so the client can filter to `"verb"` easily.
- **Gap:** It doesn't return `conjugation_path` or link to the specific grammar point. For the 2 same-JLPT alternate-verb distractors, we need verbs where we can re-apply the same target form. Those verbs must also have structured `conjugation_path` data, or we need a runtime conjugation engine.

**Recommendation:** Two paths for the planner:
- **Path A (minimal):** Runtime conjugation of alternate verbs using a tiny rule table for the v1 top-N forms (past, te-form, negative). Conjugation of regular Godan/Ichidan verbs is mechanical and ~50 LOC. Irregular verbs (する, くる) are a closed set and hardcoded. This avoids extending the endpoint.
- **Path B (expansive):** Extend the JLPT pool endpoint to accept `?conjugation_form=past` and return pre-conjugated distractors by scanning all song lessons for verbs already conjugated into that form. More data-accurate but relies on coincidental coverage in the catalog.

Path A is simpler and more reliable for v1. CONTEXT doesn't pin this — planner's call.

### 6. Phase 08.2 fill_lyric verse-blank UI component (CONFIDENCE: HIGH)

**Current shape** — there is no standalone "VerseBlank" component. The blanking happens inline in `src/lib/exercises/generator.ts::makeQuestion` line 312:
```typescript
const verseText = verse.tokens.map((t) => t.surface).join("");
prompt = verseText.replace(surface, "_____");
correctAnswer = surface;
```
`QuestionCard.renderPrompt` just renders `<span>{question.prompt}</span>` for fill_lyric (line 149) — no special component.

**Implication for Grammar Conjugation:** Can literally reuse this code pattern. The only addition is rendering the `question.conjugationBase` scaffold above the prompt. In QuestionCard:
```typescript
case "grammar_conjugation":
  return (
    <div className="flex flex-col gap-2">
      {question.conjugationBase && (
        <span className="text-sm text-gray-400">{question.conjugationBase} →</span>
      )}
      <span className="text-xl font-bold leading-snug text-white">{question.prompt}</span>
    </div>
  );
```

### 7. ExerciseSession routing (CONFIDENCE: HIGH)

**Current architecture:** `ExerciseTab` has two modes (`"short"`, `"full"`) that call `buildQuestions(lesson, mode, jlptPool)` to get `Question[]` and drop into `ExerciseSession`. `ExerciseSession` dispatches each question to a single `QuestionCard` component which has a `switch (question.type)` for rendering.

**Recommendation:** Add a third mode card "Advanced Drills" to `ExerciseTab` that:
- Pre-checks `checkExerciseAccess("listening_drill", songVersionId)` + `checkExerciseAccess("grammar_conjugation", songVersionId)` in parallel with the existing fetches.
- If denied → render an in-tab upsell block (not a modal) showing "quota exhausted, upgrade to premium."
- If allowed → call `buildQuestions` with new types enabled and route through `ExerciseSession`.
- `ExerciseSession` extension: when the incoming question type is `listening_drill`, `grammar_conjugation`, or `sentence_order`, route to the matching card (`<ListeningDrillCard>`, `<ConjugationCard>`, `<SentenceOrderCard>`) instead of `<QuestionCard>`.

This keeps the Practice tab as the single surface, avoids a separate `/songs/[slug]/drills` route, and lets sessions mix exercise types if the planner ever wants "Full Lesson includes Ex 5/6/7."

**Alternative considered:** Separate "Drills" tab alongside Practice. Rejected because:
- Phase 08.1 tests assert exactly 3 tabs (vocabulary / grammar / practice) in `SongContent.tsx`.
- Forking the session store violates the "one session per song" contract.
- Bonus badge derivation would need to cross-join two session contexts.

### 8. FSRS weights model (CONFIDENCE: HIGH)

Per `src/lib/fsrs/rating.ts` + 08.2-01-SUMMARY, the weight ordering invariant is: production > recognition > surface. New type weights:
- `grammar_conjugation`: 4 (Easy) — production-flavored, user constructs a form
- `listening_drill`: 3 (Good) — recognition + ear, parallels vocab_meaning
- `sentence_order`: 4 (Easy) — production-flavored, user assembles structure

Reveal hatch (CONTEXT) on `sentence_order`'s "Show hint" maps to `revealedReading: true` → rating=1 per `ratingFor()` existing branch. No code change needed — just plumb the boolean through `recordVocabAnswer`.

### 9. Song catalog card rendering (CONFIDENCE: HIGH)

**Primary file:** `src/app/songs/components/SongCard.tsx`.
- Renders thumbnail, circular progress overlay (`<CircularProgress>`), stars via `<StarDisplay>`, JLPT + difficulty tags.
- `showProgress` condition: `progress.completionPct > 0 || progress.stars > 0`.

**Phase 10 additions (CONTEXT-locked):**
- `SongMasteredBanner` — overlay strip/ribbon on thumbnail when `stars === 3`. Persistent status marker (CONTEXT: "permanent status marker visible while browsing").
- `BonusBadgeIcon` — small icon alongside stars when `deriveBonusBadge(progress)` is true. "Subtle — stars remain the primary signal" (CONTEXT).

Both new surfaces consume data already shaped in `userSongProgress` + extended `deriveStars` / new `deriveBonusBadge`. The catalog SSR (`src/app/songs/page.tsx` — needs verification during planning) must be updated to fetch the new accuracy columns. Today the `SongListItem` query shape lives in `src/lib/db/queries.ts`.

### 10. Premium counter persistence (CONFIDENCE: HIGH on pattern, HIGH on requirement)

Covered in detail in §4 above. Summary:
- NEW table `user_exercise_song_counters` (recommended).
- Insert happens on first answer of an Ex-5/6/7 session for a song, ON CONFLICT DO NOTHING.
- `COUNT(*) WHERE user_id=X AND family='listening'` = quota used.
- `checkExerciseAccess(userId, type, { songVersionId })` consults this count + `isPremium()`.
- `user_exercise_song_counters` mirrors the `user_vocab_mastery` / `user_song_progress` per-row persistence style already in use.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stars: 0 \| 1 \| 2` derived from 2 accuracy columns | `stars: 0 \| 1 \| 2 \| 3` derived from 3 accuracy columns + new `ex6_best_accuracy` | Phase 10 | Fully additive; `StarDisplay` prop already typed for 0-3 |
| `FREE-05: 3-song listening cap` (original ROADMAP) | `FREE-05: 10-song listening + 3-song shared advanced-drill caps` | Phase 10 CONTEXT | Reshapes single counter into two independent counters + shared advanced-drill bucket |
| `checkExerciseAccess(userId, type)` pure-function gate | `checkExerciseAccess(userId, type, { songVersionId? })` quota-aware gate | Phase 10 | Extension; existing callers remain compatible via optional parameter |
| Test-only `window.__kbPlayer` | Production `PlayerContext` imperative API (`seekTo`, `play`, `pause`) | Phase 10 | Internal YouTube player reference stays private in YouTubeEmbed; context exposes just the verbs |

**Deprecated/outdated:** none. Phase 10 extends; it does not retire any Phase 8 pattern.

## Open Questions

1. **Per-form conjugation distribution in the structured 91%**
   - What we know: 547 parsed pairs total; `conjugation_type` field tags them.
   - What's unclear: the histogram — which forms have >50 exemplars (plentiful for v1) vs <10 (too sparse).
   - Recommendation: run an ad-hoc audit script during planning that calls `auditConjugationPaths` across all lessons + `groupBy(conjugation_type).count()`. Commit the output as `.planning/phases/10-advanced-exercises-full-mastery/conjugation-coverage.md` and let the planner pick the top N forms for v1. Time-box 30 minutes.

2. **Verse-token distribution in the catalog**
   - What we know: kuromoji morpheme-level tokens; anime OP/ED verses are typically 8-20 tokens.
   - What's unclear: empirical distribution per song — how many songs have ≥3 verses at ≤12 tokens?
   - Recommendation: one-shot SQL query during planning — `SELECT song_id, COUNT(*) FILTER (WHERE jsonb_array_length(elem->'tokens') <= 12) FROM song_versions, jsonb_array_elements(lesson->'verses') elem GROUP BY song_id`. If <80% of songs pass the "≥3 eligible verses" bar, reconsider cap.

3. **Whether Listening Drill needs per-verse timing or whole-song seek**
   - What we know: `Verse.start_time_ms` exists and drives verse-sync (Phase 2).
   - What's unclear: if verses with `start_time_ms <= 0` (per `findVerseForVocab` filter at generator.ts:119) get filtered out for Ex 6 too — what % of songs have full timing coverage?
   - Recommendation: assume same coverage as fill_lyric (which already requires `start_time_ms > 0`). Phase 10 inherits this constraint. If a song's timing data is missing, Listening Drill simply doesn't emit questions for it.

4. **Counter reset / refund semantics on canceled session**
   - What we know: CONTEXT says counter increments on "first attempt per song."
   - What's unclear: what happens if the user closes the browser after 1 answer and never completes? Is that one song consumed?
   - Recommendation: Yes — CONTEXT is clear ("first attempt"). If the user regrets, tough. Alternative is much more complex state machine. Document clearly in upsell copy: "You have X of N free songs remaining. Starting counts."

5. **Bonus badge SQL for catalog list**
   - What we know: `SongListItem` query is in `src/lib/db/queries.ts` (not fully read during this research).
   - What's unclear: whether the catalog query already fetches `user_song_progress` per song per user, or whether Phase 10 needs a new join.
   - Recommendation: verify during planning. If catalog is currently unauthenticated (shows all songs, `progress: null`), Phase 10 needs to extend the authenticated catalog path to include `ex5_best_accuracy` and `ex7_best_accuracy`.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/10-advanced-exercises-full-mastery/10-CONTEXT.md` — all locked decisions
- `.planning/phases/07-data-foundation/07-02-SUMMARY.md` — Phase 7-02 conjugation audit stats (647 grammar points, 547 structured)
- `.planning/phases/08.1-end-to-end-qa-suite/08.1-07-PLAN.md` + SUMMARY — premium gate regression contract
- `.planning/phases/08.2-fsrs-progressive-disclosure/08.2-01-PLAN.md` — RATING_WEIGHTS locked policy + reveal-hatch = 1
- `src/lib/exercises/access.ts` — `checkExerciseAccess` pure-function gate (current)
- `src/lib/exercises/feature-flags.ts` — `EXERCISE_FEATURE_FLAGS` map
- `src/lib/exercises/generator.ts` — `buildQuestions`, `pickDistractorsWithVocab`, `makeQuestion` case for fill_lyric (line 305-315)
- `src/lib/fsrs/rating.ts` — `ratingFor` + `RATING_WEIGHTS`
- `src/lib/db/schema.ts` — `userSongProgress`, `userVocabMastery`, `deriveStars` (0|1|2)
- `src/app/songs/[slug]/components/YouTubeEmbed.tsx` — `window.__kbPlayer` test hook + watchdog
- `src/app/songs/[slug]/components/PlayerContext.tsx` — `currentTimeMs` sync surface
- `src/app/songs/[slug]/components/ExerciseTab.tsx` — Practice-tab mode card pattern
- `src/app/songs/[slug]/components/ExerciseSession.tsx` — question dispatcher
- `src/app/songs/[slug]/components/QuestionCard.tsx` — type-switch for prompt + option rendering
- `src/app/songs/[slug]/components/StarDisplay.tsx` — already accepts `stars: 0 | 1 | 2 | 3`
- `src/app/songs/components/SongCard.tsx` — catalog-card surface for banner + bonus badge
- `src/stores/exerciseSession.ts` — Zustand persist + test-only answer-introspection gate
- `src/app/actions/exercises.ts` — `saveSessionResults` + `recordVocabAnswer` patterns
- `src/app/actions/userPrefs.ts` — `isPremium()` single source of truth
- `scripts/lib/conjugation-audit.ts` — `parseConjugationPath` + `StructuredConjugation` type
- `tests/e2e/regression-premium-gate.spec.ts` — contract: no UI imports EXERCISE_FEATURE_FLAGS
- `tests/e2e/player-sync-and-seek.spec.ts` — confirms YT API seek/play pattern (seconds, not ms)
- `.planning/ROADMAP.md` lines 230-240 — Phase 10 goal + success criteria
- `.planning/REQUIREMENTS.md` lines 15-20, 27-32, 71-74, 140-148 — requirement IDs

### Secondary (MEDIUM confidence)
- Qualitative J-pop verse-length estimates in §2 (not empirically sampled against the catalog — flagged in Open Questions).
- Top-conjugation-form hypothesis in §1 (based on JLPT N5/N4 typical curriculum distribution; not measured on the 547-pair dataset).

### Tertiary (LOW confidence)
- None in this research. All claims trace to either codebase source or a Phase 7/8 summary/plan/research document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new libraries.
- Architecture: HIGH — extends documented Phase 8 patterns verbatim.
- Pitfalls: HIGH — each pitfall is tied to a specific codebase file + line or a CONTEXT decision.
- Counter persistence: HIGH — follows `user_vocab_mastery` / `user_song_progress` precedent.
- Conjugation-form distribution: MEDIUM — count is certain, per-form histogram not empirically sampled (Open Question 1).
- Verse-token distribution: MEDIUM — qualitative only (Open Question 2).

**Research date:** 2026-04-18
**Valid until:** 30 days — foundation patterns are stable; re-verify if Phase 11 or a Clerk-auth phase lands first and changes `isPremium` or adds a real-user-id model.
