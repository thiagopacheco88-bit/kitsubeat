# Phase 8: Exercise Engine & Star Mastery - Research

**Researched:** 2026-04-15
**Domain:** Client-side exercise state machine, session persistence, star mastery schema, premium gate abstraction, confetti animation, circular progress UI
**Confidence:** HIGH (stack is well-understood; all critical design decisions verified against codebase and official sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Exercise flow & session structure**
- All 4 exercise types are shuffled and interleaved within a single session — no fixed sequential order
- User chooses between a short session and a full (complete) lesson at session start; short sessions award proportionally less completion percentage toward the song
- Session starts with a config screen where the user picks short/full mode; screen shows estimated time and question count
- Session ends with a summary screen showing overall stats (total score, accuracy %, time) plus suggestions: retry this song, try another song, or go to dashboard
- Session summary shows overall stats only — no per-exercise-type breakdown

**Feedback & explanation design**
- Default feedback: inline card expansion — the selected answer option expands in-place with green/red indicator and a 1-2 sentence explanation
- A small "More" button in the inline feedback opens a full-screen panel with a detailed explanation, example sentence, and a 'Continue' button
- Tone is teacher-like: warm and educational
- Wrong answers show both the correct answer AND an explanation of why the user's choice was wrong

**Progress & completion display**
- In-session progress: top progress bar filling left to right + question counter below it (e.g., "5/20")
- Song card in catalog: circular progress ring showing completion percentage (on the song thumbnail or corner)
- Song page exercise progress placement: Claude's discretion
- Stars hidden on unstarted songs (0 stars, 0% progress) — only shown after the user completes at least one session

**Star mastery presentation**
- Three star icons in a row below the song title on song cards — filled gold for earned, outline/gray for unearned (classic Angry Birds style)
- Stars hidden on cards until user has started practicing the song
- Earning a new star triggers an animated star fill with a shine animation and brief confetti burst (~1.5s)
- Song page displays clear criteria for the next star with current progress toward it

### Claude's Discretion
- Fill-the-Lyric audio replay in feedback (whether to replay the verse moment where the target word appears)
- Exercise progress section placement on the song page (below player, sidebar tab, or other)
- Exact question count for short vs full session modes
- Loading states and transition animations between questions

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXER-01 | User can complete Vocab→Meaning exercises (show Japanese word, pick correct meaning from 4 options) for any song | Client-side question generation from lesson JSONB `vocabulary[]`; distractor selection from same-song vocab + same-JLPT-level pool |
| EXER-02 | User can complete Meaning→Vocab exercises (show meaning, pick correct Japanese word from 4 options) for any song | Same pattern as EXER-01, reversed surface/meaning fields |
| EXER-03 | User can complete Reading Match exercises (match kanji/kana to correct romaji reading) for any song | Same distractor pattern; uses `reading` and `romaji` fields already in VocabEntry |
| EXER-04 | User can complete Fill-the-Lyric exercises (hear verse playing, pick the blanked-out word) for any song | Requires verse timing data + YouTube seek via existing `seekTo` in PlayerContext; distractor from same song |
| EXER-08 | User receives immediate feedback after each answer with explanation of why the answer is correct/incorrect | Inline card expansion + full-screen "More" panel pattern; explanation text generated offline or at exercise generation time |
| EXER-09 | User can resume incomplete exercise sessions across browser refreshes | Zustand `persist` middleware with localStorage; session state shape defined; hydration guard pattern documented |
| EXER-10 | Exercise distractors are generated from same-song vocabulary or same-JLPT-level words, never random | Client-side generation from `lesson.vocabulary[]`; JLPT fallback pool requires `vocabularyItems` query by `jlpt_level`; `vocabGlobal` view is the query target |
| STAR-01 | User sees a 3-star rating for each song reflecting their exercise mastery level | New `user_song_progress` table; star columns derived from `ex1_2_3_best_accuracy` and `ex4_best_accuracy` columns |
| STAR-02 | Star 1 is earned when vocab recognition exercises (Ex 1+2+3) are passed at >=80% | `ex1_2_3_best_accuracy >= 0.80` column in `user_song_progress` |
| STAR-03 | Star 2 is earned when Fill-the-Lyric exercise (Ex 4) is passed at >=80% | `ex4_best_accuracy >= 0.80` column in `user_song_progress` |
| STAR-05 | User sees per-song completion percentage on the song card and song page | `completion_pct` column in `user_song_progress`; updated on session end; displayed as circular progress ring on card |
| FREE-01 | Exercise system is built with a premium gate abstraction so individual features can be toggled free/premium without code changes | `exercise_feature_flags` config object (single source of truth) checked in DAL query functions; no flag checks in UI components |
| FREE-02 | Per-song exercises (all 7 types) are free for all users | Config sets all exercise types to `free`; Phase 10 overrides individual entries for gated types |
| FREE-06 | Free/premium boundaries are enforced at the data access layer, not hidden UI elements | Gate function lives in `src/lib/db/queries.ts` or a new `src/lib/exercises/access.ts`; UI receives either data or `{ gated: true }` |
</phase_requirements>

---

## Summary

Phase 8 builds the complete exercise loop on top of the vocabulary identity infrastructure from Phase 7. The four exercise types (Vocab→Meaning, Meaning→Vocab, Reading Match, Fill-the-Lyric) are all generated **client-side** from the existing `lesson.vocabulary[]` JSONB that is already passed to the song page — no additional API round-trips needed for question generation. This is the key architectural insight: the lesson data is already in the client by the time the user navigates to the exercise tab.

The three new infrastructure pieces required are: (1) a **`user_song_progress` table** to persist per-user-per-song completion state (stars, accuracy, completion percentage), (2) **Zustand with `persist` middleware** for cross-refresh session state (in-progress question index, answers, timing), and (3) a **feature flag config object** at the data access layer for the premium gate abstraction. The session state in Zustand is the source of truth during a session; the database is the source of truth for long-term mastery state.

The confetti burst for star earning is handled by `canvas-confetti` (0.6kb gzip, no React dependency, imperative API). The circular progress ring on song cards is a hand-rolled SVG using `stroke-dashoffset` — a 20-line component with no external dependency. Both avoid adding heavy animation libraries to the bundle.

**Primary recommendation:** Build in this order: (1) DB schema + migration for `user_song_progress`, (2) exercise generator functions (pure TypeScript, testable), (3) session state with Zustand persist, (4) UI components (config screen → question card → feedback → summary), (5) star animation + confetti, (6) song card + song page progress display, (7) feature flag abstraction wired into DAL.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.x (NEW) | Session state + persist to localStorage | Lightweight (< 1kb), no boilerplate, built-in `persist` middleware; standard for Next.js client state |
| canvas-confetti | ^1.9.x (NEW) | Confetti burst on star earn | 0.6kb gzip, zero dependencies, imperative API (`confetti()`) works perfectly in `useEffect` |
| drizzle-orm | ^0.41.0 (already installed) | New `user_song_progress` table + queries | Already the project ORM |
| ts-fsrs | ^5.3.2 (already installed) | FSRS scheduling after session end | Already installed from Phase 7 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SVG (inline) | N/A | Circular progress ring on song cards | 20-line hand-rolled component; no library needed |
| CSS animation (Tailwind) | via tailwind | Star fill shine animation | Keyframe via `@keyframes` in globals.css; no JS animation library needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | react-confetti | react-confetti renders continuously via requestAnimationFrame; canvas-confetti fires once and self-cleans; better for a ~1.5s burst |
| Zustand persist | Custom useLocalStorage hook | Custom hook is fine for simple cases but Zustand persist handles race conditions, partial hydration, and versioned migrations; worth the dep for session-level complexity |
| Inline SVG progress ring | react-circular-progressbar | 4kb extra bundle; inline SVG is 15 lines and fully controlled by Tailwind colors |

**Installation:**
```bash
npm install zustand canvas-confetti
npm install --save-dev @types/canvas-confetti
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   └── schema.ts              # Add user_song_progress table
│   └── exercises/
│       ├── generator.ts           # Pure: buildQuestions(lesson, mode) -> Question[]
│       ├── access.ts              # DAL: checkExerciseAccess(userId, exerciseType)
│       └── feature-flags.ts       # Config: EXERCISE_FEATURE_FLAGS object
├── stores/
│   └── exerciseSession.ts         # Zustand store with persist middleware
└── app/
    └── songs/
        └── [slug]/
            └── components/
                ├── ExerciseTab.tsx         # Tab entry point (config screen)
                ├── ExerciseSession.tsx     # Question loop orchestrator
                ├── QuestionCard.tsx        # Single question UI
                ├── FeedbackPanel.tsx       # Inline expand + "More" full-screen
                ├── SessionSummary.tsx      # End-of-session stats + CTAs
                └── StarDisplay.tsx         # Star icons + confetti trigger
```

### Pattern 1: Client-Side Question Generation
**What:** Pure function transforms `lesson.vocabulary[]` into shuffled `Question[]` for a session.
**When to use:** Always — no server round-trip needed; lesson data already on client.

```typescript
// src/lib/exercises/generator.ts
export type ExerciseType = "vocab_meaning" | "meaning_vocab" | "reading_match" | "fill_lyric";

export interface Question {
  id: string;                      // uuid for deduplication
  type: ExerciseType;
  vocabItemId: string;             // vocab_item_id from VocabEntry
  prompt: string;                  // what to show the user
  correctAnswer: string;           // the right answer
  distractors: string[];           // 3 wrong answers
  explanation: string;             // inline 1-2 sentence explanation
  detailedExplanation?: string;    // for the "More" panel
  verseRef?: {                     // for Fill-the-Lyric
    verseNumber: number;
    startMs: number;
  };
}

export interface SessionConfig {
  mode: "short" | "full";
  targetCount: number;             // short=10, full=all vocab * 2 (all exercise types)
}

export function buildQuestions(
  lesson: Lesson,
  mode: SessionConfig["mode"],
  jlptPool: VocabEntry[]           // same-JLPT-level distractor pool from vocabGlobal
): Question[] {
  const base = lesson.vocabulary.filter(v => v.vocab_item_id);
  const types: ExerciseType[] = ["vocab_meaning", "meaning_vocab", "reading_match", "fill_lyric"];
  const questions: Question[] = [];

  for (const vocab of base) {
    for (const type of types) {
      const distractors = pickDistractors(vocab, type, base, jlptPool);
      questions.push(makeQuestion(vocab, type, distractors, lesson.verses));
    }
  }

  const shuffled = shuffle(questions);
  const count = mode === "short" ? Math.min(10, shuffled.length) : shuffled.length;
  return shuffled.slice(0, count);
}
```

**Short session count recommendation (Claude's Discretion):** 10 questions (~2 min at 12s/question). Full session = all vocab × 4 exercise types, capped at 40 questions for songs with > 10 vocab entries.

### Pattern 2: Zustand Session Store with Persist
**What:** Exercise session state persisted to localStorage; survives browser refresh.
**Key hydration rule:** Never render exercise UI until `_hasHydrated` is true.

```typescript
// src/stores/exerciseSession.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ExerciseSessionState {
  songVersionId: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, { chosen: string; correct: boolean; timeMs: number }>;
  startedAt: number | null;
  mode: "short" | "full" | null;
  _hasHydrated: boolean;

  // Actions
  startSession: (songVersionId: string, questions: Question[], mode: "short" | "full") => void;
  recordAnswer: (questionId: string, chosen: string, correct: boolean, timeMs: number) => void;
  advanceQuestion: () => void;
  clearSession: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useExerciseSession = create<ExerciseSessionState>()(
  persist(
    (set) => ({
      songVersionId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      startedAt: null,
      mode: null,
      _hasHydrated: false,

      startSession: (songVersionId, questions, mode) =>
        set({ songVersionId, questions, currentIndex: 0, answers: {}, startedAt: Date.now(), mode }),
      recordAnswer: (id, chosen, correct, timeMs) =>
        set((s) => ({ answers: { ...s.answers, [id]: { chosen, correct, timeMs } } })),
      advanceQuestion: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
      clearSession: () => set({ songVersionId: null, questions: [], currentIndex: 0, answers: {}, startedAt: null, mode: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "kitsubeat-exercise-session",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
```

**Critical hydration guard (Next.js App Router):**
```typescript
// In ExerciseTab.tsx
const hasHydrated = useExerciseSession(s => s._hasHydrated);
if (!hasHydrated) return <SessionSkeleton />;
```

### Pattern 3: user_song_progress Table
**What:** Persists per-user-per-song mastery state: completion pct, best session accuracy per exercise group, earned stars.
**Design principle:** Store raw accuracy scores; derive stars from thresholds at read time (no star columns that can drift out of sync).

```typescript
// Addition to src/lib/db/schema.ts
export const userSongProgress = pgTable("user_song_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  song_version_id: uuid("song_version_id").notNull().references(() => songVersions.id),

  // Completion percentage (0-100); increments on session end proportionally
  completion_pct: real("completion_pct").default(0).notNull(),

  // Best session accuracy per exercise group (null = never attempted)
  ex1_2_3_best_accuracy: real("ex1_2_3_best_accuracy"),   // Star 1 threshold: >= 0.80
  ex4_best_accuracy: real("ex4_best_accuracy"),             // Star 2 threshold: >= 0.80

  // Session count for display
  sessions_completed: integer("sessions_completed").default(0).notNull(),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("user_song_progress_user_version_unique").on(table.user_id, table.song_version_id),
  index("user_song_progress_user_idx").on(table.user_id),
]);

// Star derivation — computed at read time, never stored
export function deriveStars(progress: { ex1_2_3_best_accuracy: number | null; ex4_best_accuracy: number | null }): 0 | 1 | 2 {
  if ((progress.ex1_2_3_best_accuracy ?? 0) >= 0.80 && (progress.ex4_best_accuracy ?? 0) >= 0.80) return 2;
  if ((progress.ex1_2_3_best_accuracy ?? 0) >= 0.80) return 1;
  return 0;
}
```

### Pattern 4: Premium Gate Abstraction (DAL-level)
**What:** Single config object controls which exercise types are free/premium. Enforcement in query functions — never in UI.
**Requirement (FREE-06):** UI receives either data or `{ gated: true }`, never a hidden element.

```typescript
// src/lib/exercises/feature-flags.ts
export type ExerciseGateStatus = "free" | "premium";

export const EXERCISE_FEATURE_FLAGS: Record<string, ExerciseGateStatus> = {
  vocab_meaning:    "free",   // EXER-01
  meaning_vocab:    "free",   // EXER-02
  reading_match:    "free",   // EXER-03
  fill_lyric:       "free",   // EXER-04
  // Phase 10 will add: grammar_conjugation, listening_drill, sentence_order
};

// src/lib/exercises/access.ts
import { EXERCISE_FEATURE_FLAGS } from "./feature-flags";
import { getUserSubscription } from "@/lib/db/queries";

export async function checkExerciseAccess(
  userId: string,
  exerciseType: string
): Promise<{ allowed: boolean; reason?: string }> {
  const gate = EXERCISE_FEATURE_FLAGS[exerciseType] ?? "premium";
  if (gate === "free") return { allowed: true };

  const sub = await getUserSubscription(userId);
  if (sub?.plan.startsWith("premium") && sub.status === "active") return { allowed: true };
  return { allowed: false, reason: "premium_required" };
}
```

**Usage in Server Action (not in component):**
```typescript
// In a Server Action or Route Handler
const access = await checkExerciseAccess(userId, "fill_lyric");
if (!access.allowed) return { gated: true, reason: access.reason };
// ... return question data
```

### Pattern 5: Distractor Selection (EXER-10)
**What:** Pick 3 wrong answers from same-song vocab first; fall back to same-JLPT-level pool.
**Client-side:** Same-song pool is available from lesson data. JLPT fallback pool is fetched once on session start from `vocabGlobal` view.

```typescript
function pickDistractors(
  correct: VocabEntry,
  type: ExerciseType,
  sameSongPool: VocabEntry[],
  jlptPool: VocabEntry[]
): string[] {
  const field = type === "reading_match" ? "romaji" : type === "meaning_vocab" ? "surface" : "meaning";
  const getVal = (v: VocabEntry) => typeof v.meaning === "string" ? v.meaning : v.meaning["en"] ?? "";

  // Same song first (excluding correct answer)
  const candidates = sameSongPool
    .filter(v => v.vocab_item_id !== correct.vocab_item_id)
    .map(v => extractField(v, type));

  // Pad with JLPT pool if < 3
  if (candidates.length < 3) {
    const jlptCandidates = jlptPool
      .filter(v => v.vocab_item_id !== correct.vocab_item_id)
      .map(v => extractField(v, type));
    candidates.push(...jlptCandidates);
  }

  return shuffle(candidates).slice(0, 3);
}
```

**JLPT pool fetch:** On session start, call a Server Action that queries `vocab_global` filtered by `jlpt_level = lesson.jlpt_level`, returns 30-50 entries. Cached in Zustand store alongside questions.

### Pattern 6: Inline Feedback Card Expansion
**What:** Answer options are rendered as cards. On selection, the chosen card expands in-place with color + explanation.

```typescript
// QuestionCard.tsx — simplified state machine
type AnswerState = "idle" | "correct" | "incorrect";

function QuestionCard({ question, onNext }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const state: AnswerState = chosen === null ? "idle"
    : chosen === question.correctAnswer ? "correct" : "incorrect";

  return (
    <div>
      <p className="text-white text-lg mb-4">{question.prompt}</p>
      {[question.correctAnswer, ...question.distractors].map(option => (
        <AnswerOption
          key={option}
          text={option}
          state={chosen === null ? "idle" : option === question.correctAnswer ? "correct" : chosen === option ? "incorrect" : "neutral"}
          onClick={() => chosen === null && setChosen(option)}
        />
      ))}
      {chosen && (
        <FeedbackBanner
          correct={state === "correct"}
          explanation={question.explanation}
          onMore={() => setShowMore(true)}
          onContinue={onNext}
        />
      )}
      {showMore && (
        <DetailPanel
          question={question}
          onClose={() => { setShowMore(false); onNext(); }}
        />
      )}
    </div>
  );
}
```

### Pattern 7: Circular Progress Ring (SVG, no library)
**What:** SVG with two circles — track + progress arc via `stroke-dashoffset`.

```typescript
// Used in SongCard and song page progress section
function CircularProgress({ pct, size = 40 }: { pct: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} strokeWidth="3"
        className="stroke-gray-700 fill-none" />
      <circle cx={size/2} cy={size/2} r={radius} strokeWidth="3"
        className="stroke-red-500 fill-none transition-all duration-500"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round" />
    </svg>
  );
}
```

### Pattern 8: Confetti on Star Earn
**What:** Imperative `canvas-confetti` call in a `useEffect` triggered when star count increases.

```typescript
// StarDisplay.tsx
import confetti from "canvas-confetti";

function StarDisplay({ stars }: { stars: 0 | 1 | 2 | 3 }) {
  const prevStars = useRef(stars);

  useEffect(() => {
    if (stars > prevStars.current) {
      // Earned a new star
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.4 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
        disableForReducedMotion: true,
      });
    }
    prevStars.current = stars;
  }, [stars]);

  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <StarIcon key={i} filled={stars >= i} animate={stars === i} />
      ))}
    </div>
  );
}
```

### Pattern 9: Session End → DB Write
**What:** On session complete, compute stats and upsert `user_song_progress`. Update FSRS for each answered vocab item.

```typescript
// Server Action: saveSessionResults
"use server";
export async function saveSessionResults(input: {
  userId: string;
  songVersionId: string;
  answers: SessionAnswer[];
  mode: "short" | "full";
  durationMs: number;
}) {
  const ex1_2_3_answers = input.answers.filter(a => ["vocab_meaning","meaning_vocab","reading_match"].includes(a.type));
  const ex4_answers = input.answers.filter(a => a.type === "fill_lyric");

  const ex1_2_3_accuracy = ex1_2_3_answers.length > 0
    ? ex1_2_3_answers.filter(a => a.correct).length / ex1_2_3_answers.length
    : null;
  const ex4_accuracy = ex4_answers.length > 0
    ? ex4_answers.filter(a => a.correct).length / ex4_answers.length
    : null;

  // Proportional completion increment: short = +15%, full = +30% (capped at 100)
  const increment = input.mode === "short" ? 15 : 30;

  await db.insert(userSongProgress)
    .values({ user_id: input.userId, song_version_id: input.songVersionId, completion_pct: increment,
              ex1_2_3_best_accuracy: ex1_2_3_accuracy, ex4_best_accuracy: ex4_accuracy, sessions_completed: 1 })
    .onConflictDoUpdate({
      target: [userSongProgress.user_id, userSongProgress.song_version_id],
      set: {
        completion_pct: sql`LEAST(100, ${userSongProgress.completion_pct} + ${increment})`,
        ex1_2_3_best_accuracy: sql`GREATEST(COALESCE(${userSongProgress.ex1_2_3_best_accuracy}, 0), ${ex1_2_3_accuracy ?? 0})`,
        ex4_best_accuracy: sql`GREATEST(COALESCE(${userSongProgress.ex4_best_accuracy}, 0), ${ex4_accuracy ?? 0})`,
        sessions_completed: sql`${userSongProgress.sessions_completed} + 1`,
        updated_at: sql`NOW()`,
      },
    });

  // Also log to user_exercise_log (one row per answer) for FSRS updates
  // ... (batch insert user_exercise_log rows)
}
```

### Anti-Patterns to Avoid
- **Storing stars as a column:** Stars are a derived view over accuracy thresholds — storing them creates a sync bug when thresholds change. Always derive at read time.
- **Generating distractors server-side for each question:** Adds latency and a server round-trip per question. Generate the full question set once at session start.
- **Using sessionStorage instead of localStorage for session persistence:** sessionStorage is cleared when the tab closes — the requirement is browser refresh, not tab-close, so localStorage is correct.
- **Rendering exercise UI before Zustand hydration:** Causes React hydration mismatch. Always gate on `_hasHydrated`.
- **Putting feature flag checks in React components:** Violates FREE-06. Gate logic lives in Server Actions / DAL functions. UI only receives `{ gated: true }` or real data.
- **re-rendering all answer options on every keystroke:** Answer options should be stable — shuffle once at question generation, not on render.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti animation | CSS particle system | canvas-confetti | 100+ lines of requestAnimationFrame logic; canvas-confetti handles cleanup, reduced-motion, easing |
| Session persistence across refresh | Manual localStorage serialize/deserialize | zustand persist middleware | Handles partial hydration, versioned migrations, storage errors; tested across React 19 / Next.js 15 |
| Shuffle algorithm | `Math.random()` sort (biased) | Fisher-Yates implementation | `arr.sort(() => Math.random() - 0.5)` has statistical bias; implement Fisher-Yates in generator.ts |
| Star count derivation | Stored `stars` column | Derived from accuracy columns at read time | Threshold changes would require data migrations if stored; derivation is 2 lines |
| FSRS rating after session | Custom scoring | ts-fsrs `scheduler.next(card, date, Rating.Good)` | Already installed; consistent with Phase 7 intent |

**Key insight:** The exercise engine's complexity is in the session state machine and question generation logic — not in rendering. Keep components thin; put all business logic in pure functions in `src/lib/exercises/generator.ts`.

---

## Common Pitfalls

### Pitfall 1: Zustand Hydration Mismatch in Next.js App Router
**What goes wrong:** Exercise page renders server-side with empty Zustand state, then client rehydrates from localStorage — React throws hydration error or shows stale session data.
**Why it happens:** `persist` middleware reads localStorage asynchronously; initial server render and first client render are different.
**How to avoid:** Add `_hasHydrated` flag (see Pattern 2). Gate exercise UI rendering behind `if (!hasHydrated) return <Skeleton />`. The `onRehydrateStorage` callback sets the flag after localStorage is read.
**Warning signs:** Console shows "Text content does not match server-rendered HTML" or exercises jump to question 3 on refresh.

### Pitfall 2: Stale Session for a Different Song
**What goes wrong:** User starts an exercise for Song A, navigates away, comes back to Song B — Zustand loads Song A's session.
**Why it happens:** Persist store has no song-scoping guard.
**How to avoid:** On ExerciseTab mount, check `store.songVersionId !== currentSongVersionId`. If mismatch, call `clearSession()` before rendering config screen. Only resume if IDs match.
**Warning signs:** Wrong song's vocabulary appears in exercises after navigation.

### Pitfall 3: Distractor Collision (Same Answer as Correct)
**What goes wrong:** A distractor happens to equal the correct answer text (e.g., two vocab entries with the same English meaning "to do").
**Why it happens:** Same-JLPT pool may contain synonyms or near-synonyms.
**How to avoid:** Filter `candidates` by strict inequality against `correctAnswer` string (after normalization — trim + lowercase). Deduplicate the 4-option array before rendering.
**Warning signs:** Multiple answer cards showing the same text; correct answer highlighted but user selected a "different" card.

### Pitfall 4: Fill-the-Lyric Without Timing Data
**What goes wrong:** A song version has vocabulary data but no `timing_data` — Fill-the-Lyric can't seek to the verse moment.
**Why it happens:** Not all song versions have WhisperX timing data (still `null` for new songs).
**How to avoid:** In `buildQuestions()`, check `lesson.verses[verseIndex].start_time_ms > 0` before generating `fill_lyric` questions. Fall back to showing the verse text only (no audio seek) when timing is unavailable.
**Warning signs:** `seekTo(0)` called — video jumps to beginning.

### Pitfall 5: Completion Percentage Inflation on Short Sessions
**What goes wrong:** User completes 20 short sessions and reaches 100% without demonstrating full mastery.
**Why it happens:** If short sessions add the same `increment` as full sessions, percentage can be gamed.
**How to avoid:** Short = +15%, Full = +30%, capped at 100. Stars are independent of completion_pct — Star 1 requires 80% accuracy regardless of how many sessions completed. This respects the user's time while keeping mastery honest.

### Pitfall 6: SongCard Query N+1 for Progress Data
**What goes wrong:** `getAllSongs()` returns 50 song cards; each card makes a separate `user_song_progress` query → 50 DB calls.
**Why it happens:** Progress data was fetched per-card rather than in bulk.
**How to avoid:** Add a bulk query `getUserSongProgressBatch(userId, songVersionIds[])` using a single `WHERE song_version_id IN (...)` query. Join progress into the song list query server-side before passing to client.

---

## Claude's Discretion Recommendations

### Fill-the-Lyric Audio Replay in Feedback
**Recommendation:** YES — replay the verse moment in feedback. When the user answers a Fill-the-Lyric question, the `songVersionId` and `verseRef.startMs` are already in the question object. In the feedback card, add a small "▶ Hear it in context" button that calls `seekTo(verseRef.startMs)` via the PlayerContext. This reinforces the lyric-to-meaning connection that is the core learning loop. Implementation: expose `seekTo` from PlayerContext; the feedback card calls it if `verseRef` is present.

### Exercise Progress Placement on Song Page
**Recommendation:** Tabbed interface below the player — add a "Practice" tab alongside the existing Vocabulary and Grammar sections. Tabs: [Lyrics] [Vocabulary] [Grammar] [Practice]. The Practice tab contains: star display, completion ring, criteria for next star, and a "Start Practice" button. This keeps the song page clean and makes exercise entry intentional rather than accidental.

### Question Counts
- **Short session:** 10 questions (~2 minutes at 12s average per question)
- **Full session:** All vocabulary × 4 exercise types, capped at 40. For songs with 5 vocab entries = 20 questions. For songs with 15 vocab entries = 40 (capped). Songs with fewer than 3 vocabulary items: disable Fill-the-Lyric (can't make 4 options), show minimum 2 types only.

### Loading States and Transitions
- Between questions: 300ms fade-out / fade-in via CSS transition on the question card container. No full-screen loading state.
- On session start: 500ms skeleton while questions are being generated client-side (near-instant, but prevents flash).
- On session end: immediate transition to summary screen (no delay).

---

## Code Examples

### Fisher-Yates Shuffle (use in generator.ts)
```typescript
// Standard unbiased shuffle — use instead of arr.sort(() => Math.random() - 0.5)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

### canvas-confetti call (proven minimal config)
```typescript
// Source: canvas-confetti README + npm page
import confetti from "canvas-confetti";

confetti({
  particleCount: 80,
  spread: 60,
  origin: { y: 0.4 },
  colors: ["#FFD700", "#FFA500", "#FF6347"],
  disableForReducedMotion: true,
});
// Self-cleans after ~1.5s — no cleanup needed
```

### Zustand persist with hydration guard
```typescript
// Source: zustand GitHub discussions #2476, #1382 — Next.js App Router pattern
const useExerciseSession = create<State>()(
  persist(
    (set) => ({ /* state */ }),
    {
      name: "kitsubeat-exercise-session",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Guard in component:
const hasHydrated = useExerciseSession(s => s._hasHydrated);
if (!hasHydrated) return null; // or skeleton
```

### Drizzle upsert for session results
```typescript
// Source: drizzle-orm docs — onConflictDoUpdate with sql`` expressions
await db.insert(userSongProgress)
  .values(initialValues)
  .onConflictDoUpdate({
    target: [userSongProgress.user_id, userSongProgress.song_version_id],
    set: {
      completion_pct: sql`LEAST(100, ${userSongProgress.completion_pct} + ${increment})`,
      ex1_2_3_best_accuracy: sql`GREATEST(COALESCE(${userSongProgress.ex1_2_3_best_accuracy}, 0), ${newAccuracy})`,
      updated_at: sql`NOW()`,
    },
  });
```

---

## DB Schema Addition Summary

One new table required for Phase 8:

```sql
-- New migration: 0003_exercise_engine.sql
CREATE TABLE IF NOT EXISTS "user_song_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "song_version_id" uuid NOT NULL REFERENCES "song_versions"("id"),
  "completion_pct" real DEFAULT 0 NOT NULL,
  "ex1_2_3_best_accuracy" real,
  "ex4_best_accuracy" real,
  "sessions_completed" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_song_progress_user_version_unique" UNIQUE ("user_id", "song_version_id")
);
CREATE INDEX IF NOT EXISTS "user_song_progress_user_idx" ON "user_song_progress" ("user_id");
```

No changes to existing tables. No new enums. `user_exercise_log` (Phase 7) receives one row per question answered — that table is already in place.

---

## Authentication Status

The `user_id` column in `user_song_progress` follows the same pattern as `user_vocab_mastery` (Phase 7) — a `text` field holding a Clerk user ID. Phase 8 does not require implementing Clerk authentication itself; the user_id is passed from the session context. If Clerk is not yet integrated, use a placeholder `"anonymous"` user_id during development and stub the auth check in Server Actions.

**Implication for planning:** Phase 8 plans should include a `// TODO: replace with Clerk userId` comment in Server Actions and design the auth wiring as a single-file change when Clerk is added.

---

## Open Questions

1. **Clerk/Auth integration status**
   - What we know: `user_id` is used as `text` across all Phase 7 tables; no Clerk dependency in codebase yet
   - What's unclear: Is Clerk planned for Phase 8 or a later phase? Without a real user_id, progress cannot be persisted per-user.
   - Recommendation: Plan Phase 8 with a `getOrCreateUserId()` stub that returns a device-scoped UUID from localStorage (anonymous user). Wire real Clerk userId when auth phase is implemented. This allows full exercise UX without blocking on auth.

2. **JLPT distractor pool size**
   - What we know: `vocab_global` view aggregates all songs by JLPT level; query at session start
   - What's unclear: How many unique vocab items exist per JLPT level? N5 may have fewer than 30 unique items if song catalog is small.
   - Recommendation: Query `vocab_global` for the same JLPT level, limit 50. If fewer than 3 distractors available after same-song exclusion, fall back to adjacent JLPT level (e.g., N5 song falls back to N4 pool). Handle edge case in `pickDistractors()`.

3. **Fill-the-Lyric without audio extraction**
   - What we know: Foundation decision locks in YouTube iframe API (no audio extraction)
   - What's unclear: The YouTube player must be running for Fill-the-Lyric audio replay. If user is in exercise mode (separate tab/view), the player may not be visible.
   - Recommendation: Fill-the-Lyric shows the verse lyric text with the target word blanked (e.g., "___ は 空を飛ぶ"). Audio replay via `seekTo` is a "hear in context" bonus in feedback only — not required for the exercise question itself. PlayerContext's `seekTo` is already available if the player is mounted.

---

## Sources

### Primary (HIGH confidence)
- Project source: `src/lib/db/schema.ts` — existing table structures, confirmed Phase 7 tables in place
- Project source: `src/lib/types/lesson.ts` — VocabEntry.vocab_item_id optional field confirmed at line 58
- Project source: `src/app/songs/[slug]/components/PlayerContext.tsx` — seekTo and registerSeekHandler API confirmed
- Project source: `src/app/songs/[slug]/components/SongContent.tsx` — lesson passed to client already; no extra fetch needed
- Project source: `src/lib/fsrs-presets.ts` — ts-fsrs already installed, FSRS pattern confirmed
- Project `package.json` — zustand NOT yet installed (confirmed); canvas-confetti NOT yet installed (confirmed); ts-fsrs v5.3.2 installed
- https://github.com/catdad/canvas-confetti — canvas-confetti API: `confetti()` imperative call, `disableForReducedMotion` option, self-cleaning
- https://npmjs.com/package/zustand — Zustand v5 persist middleware API
- https://nextjs.org/docs/app/guides/data-security — Next.js DAL pattern (enforce at data layer)

### Secondary (MEDIUM confidence)
- https://github.com/pmndrs/zustand/discussions/2476 — Next.js + Zustand persist + hydration guard pattern (`_hasHydrated` flag)
- https://blog.logrocket.com/build-svg-circular-progress-component-react-hooks/ — SVG circular progress using stroke-dashoffset pattern
- https://dev.to/getstigg/how-to-gate-end-user-access-to-features-shortcomings-of-plan-identifiers-authorization-feature-flags-38dh — feature gate at data access layer pattern
- https://makerkit.dev/blog/tutorials/nextjs-server-actions — Next.js 15 Server Actions best practices (thin actions, Zod validation)

### Tertiary (LOW confidence)
- https://telrp.springeropen.com/articles/10.1186/s41039-018-0082-z — Distractor generation research: same-study-context distractors outperform random; confirms same-song-first approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing project dependencies confirmed from package.json; zustand and canvas-confetti are zero-risk additions
- Architecture: HIGH — question generation pattern derived from existing lesson type structure; Zustand persist pattern verified against official GitHub discussions
- DB schema: HIGH — follows exact same pattern as Phase 7 tables already in schema.ts
- Pitfalls: HIGH — derived from reading existing codebase (PlayerContext, SongContent) and confirmed Zustand hydration behavior
- Feature flag pattern: HIGH — standard DAL pattern; no external service required for Phase 8's "all free" state

**Research date:** 2026-04-15
**Valid until:** 2026-07-15 (stable libraries; zustand v5 API is stable)
