# Phase 12: Learning Path & Gamification — Research

**Researched:** 2026-04-19
**Domain:** Gamification (XP/streaks/levels), path surface, JLPT gap dashboard, reward-slot scaffolding
**Confidence:** HIGH (schema, existing surfaces, animation primitives) / MEDIUM (TZ streak logic, haptic API, starter picks — live DB not queryable) / LOW (specific song slugs for starters — inferred from popularity rankings only)

---

## Table of Contents

1. [User Constraints](#user-constraints)
2. [A. Existing Surfaces to Extend / Reuse](#a-existing-surfaces-to-extend--reuse)
3. [B. Database Schema](#b-database-schema)
4. [C. Starter-Pick Candidates](#c-starter-pick-candidates)
5. [D. Reward-Slot Data Shape](#d-reward-slot-data-shape)
6. [E. Timezone & Streak Rollover Pitfalls](#e-timezone--streak-rollover-pitfalls)
7. [F. Haptics / Sound API](#f-haptics--sound-api)
8. [G. Analytics Plumbing](#g-analytics-plumbing)
9. [H. Authentication / User State](#h-authentication--user-state)
10. [I. Path Surface Design](#i-path-surface-design)
11. [J. Cosmetic Application](#j-cosmetic-application)
12. [K. Testing Strategy](#k-testing-strategy)
13. [L. Migration & Rollout](#l-migration--rollout)
14. [M. Pitfalls to Flag for Planner](#m-pitfalls-to-flag-for-planner)
15. [Recommendations for Planner](#recommendations-for-planner)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Path structure & visualization**
- Duolingo-style stepped vertical map. Each node = one song.
- Songs grouped by existing `difficulty_tier` ENUM (`basic` → `intermediate` → `advanced`). Do NOT introduce new song-tier taxonomy.
- No locks. Level does not gate songs. Freemium quotas (Phase 8 song_quota, Phase 10 advanced_drill quota) remain the only access barriers.
- New user picks from 3 starter songs (curated `basic` tier, varied anime vibes).
- `/path` is primary signed-in landing; `/songs` catalog stays as-is with all filters.

**XP economy**
- Hybrid model: drip per correct answer + chunk per session completion + chunk per star.
- Daily soft cap (~250 XP) → 25% rate beyond it.
- Exponential level curve, ~20% growth per level.
- All four bonus multipliers enabled: daily-first 1.5×, perfect run +25%, path-order +25%, streak milestones (discrete one-time XP awards at 7/30/100-day).

**Streak mechanics**
- One completed session = streak day.
- Auto-detect device TZ via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- One auto-applied silent grace day per week.
- Silent reset on break. Always show `streak_best` high-water mark.

**Level-up celebration**
- Full-screen takeover on every level, every time.
- Sound + visual flash + mobile haptic vibration, all defaults-on, independently configurable.
- Reuse Phase 10 `canvas-confetti` and `star-shine` CSS animation — do NOT add a second confetti library.

**HUD placement**
- `/path` and `/profile` ONLY. Not on `/songs`, not on song player.
- End-of-session summary: XP gained + streak + level progress + next reward slot preview (if applicable).

**Cosmetic unlocks (v3.0)**
- Avatar borders, profile color themes, badge collection. Cosmetic-only.
- Themed to anime aesthetics, not generic silver/gold tiers.

**Reward-slot scaffolding**
- Typed slot infrastructure. Slots with no v3.0 content DO NOT RENDER.
- Data-driven level→slot mapping so v4.0 Phase 21 wires content without code changes.

**JLPT mastery + gap dashboard**
- Extends existing `/vocabulary` dashboard (Phase 11.4 surface).
- Always-on from day 1, not level-gated.
- Groups mastered vocab by JLPT N5–N1, surfaces gaps.

**Taxonomy split**
- Songs: `difficulty_tier` (B/I/A) on path.
- Vocabulary: JLPT N5–N1 in gap dashboard.
- Parallel, never merged.

### Claude's Discretion
- Specific XP values (per answer, per session, per star, daily cap, streak-milestone amounts)
- Exact level curve coefficient
- Schema column names for streak / XP / level / cosmetic-unlock state
- Which 3 songs become the "starter pick" (subject to user review)
- Cosmetic content catalog
- Reward-slot data shape (must support v4.0 Phase 21 anime-scene content as non-breaking extension)
- Whether to stub PostHog events now or defer to Phase 15

### Deferred Ideas (OUT OF SCOPE)
- Anime cultural content (character-name etymology, Japanese moves, mythology) — v4.0 Phase 21
- Functional unlocks via levels (JLPT gap dashboard is always-on, not gated)
- Branching path / multiple parallel tracks
- Streak repair as a premium feature
- Diagnostic onboarding test / placement quiz
</user_constraints>

---

## A. Existing Surfaces to Extend / Reuse

### A1. `/songs` catalog — `src/app/songs/`

**Source:** `src/app/songs/page.tsx`, `src/app/songs/components/SongGrid.tsx`

- `page.tsx` is a server component; calls `getAllSongs(PLACEHOLDER_USER_ID)` and passes to `SongGrid`.
- `SongGrid` is a **client component** with local state for search, `jlptFilter`, and `difficultyFilter`.
- `difficulty_tier` is already surfaced: the filter buttons at the top of `SongGrid` include `basic | intermediate | advanced` as pill toggles (lines 116–133 of SongGrid.tsx).
- `SongListItem` type from `queries.ts` includes `difficulty_tier`, `jlpt_level`, `popularity_rank`, and all per-user accuracy columns.
- The catalog page `page.tsx` exports `dynamic = "force-dynamic"` and does NOT need auth — it works with `PLACEHOLDER_USER_ID`.
- **Impact on Phase 12:** The `/songs` surface requires zero changes. Do not modify `SongGrid` or `SongCard`. The path feature lives entirely in a new `/path` route.

### A2. `/vocabulary` dashboard — Phase 11.4 surface

**Source:** `src/app/vocabulary/page.tsx`, `src/app/vocabulary/VocabularyList.tsx`, `src/app/vocabulary/FilterControls.tsx`

- Server component (`page.tsx`) fetches via `getVocabularyDashboard()` (supports tierFilter, sourceSongId, sortDirection, limit).
- `VocabularyList` renders three buckets: **Mastered** (state=2), **Known** (state=3), **Learning** (state=1).
- Each row shows: `dictionary_form`, `reading`, `romaji`, `meaning`, `part_of_speech`, `jlpt_level`, due date, and `SeenInExpander` (source song count).
- `DashboardRow` interface (queries.ts:438) already carries `jlpt_level: string | null`.
- The existing `getVocabularyDashboard()` query joins `vocabulary_items.jlpt_level` — it is already available in every row.
- **JLPT gap view approach:** Add a new section/tab to this page (or a second server query function `getJlptGapSummary(userId)`) that aggregates `user_vocab_mastery` joined to `vocabulary_items.jlpt_level` to produce per-tier counts. No new table needed. Live derivation from existing data is sufficient. See Section B for the query shape.

### A3. `/profile` page

**Source:** `src/app/profile/page.tsx`, `src/app/profile/ProfileForm.tsx`

- Server component calls `getUserPrefs()` and `isPremium()`.
- `ProfileForm` is a client component with a `<form>` that calls `updateUserPrefs`. Two settings today: `skip_learning` toggle and `new_card_cap` number input.
- **HUD extension:** Add a server-rendered HUD block above the `<section>` with `GlobalLearnedCounter`. The HUD reads XP/level/streak from the extended `users` table (new columns) — simple server SELECT, no client state needed.
- **Settings extension for audio/haptic toggles:** Add two new boolean columns to `users` (`sound_enabled`, `haptics_enabled`) and new toggle controls inside the existing `ProfileForm` (or a second form section). Pattern is identical to `skip_learning`.
- `GlobalLearnedCounter` is already imported at `src/app/components/GlobalLearnedCounter.tsx` — used in layout.tsx nav and profile page header.

### A4. Session-end summary — `SessionSummary.tsx`

**Source:** `src/app/songs/[slug]/components/SessionSummary.tsx`

- Called from `ExerciseSession.tsx` when `currentIndex >= total`.
- Currently calls `saveSessionResults()` server action on mount, then renders accuracy, time, stars, song mastery breakdown, and CTA buttons.
- **XP / streak / level hook:** `saveSessionResults` is the write boundary. Phase 12 extends it to also write XP increments and streak updates, and to return `xpGained`, `newXpTotal`, `currentLevel`, `leveledUp`, `streakCurrent`, `streakBest`, `rewardSlotPreview` in its result payload.
- **SessionSummary rendering additions:**
  - XP gained row (`+45 XP` styled like accuracy row).
  - Streak flame icon with current streak number.
  - Level progress bar (current XP / XP to next level).
  - Level-up modal trigger (if `result.leveledUp === true`).
  - Next reward slot preview chip (only if `result.rewardSlotPreview !== null`).
- The "Practice Again" button already calls `onRetry`; the "Try Another Song" link goes to `/songs` — add a "Continue Path" link to `/path` alongside.

### A5. Phase 10 confetti / star-shine animation primitives

**Source:**
- `canvas-confetti` — installed in `package.json` at `^1.9.4`. Used in `StarDisplay.tsx` via dynamic import.
- `star-shine` CSS animation — defined in `src/app/globals.css` (lines 38–46):
  ```css
  @keyframes star-shine {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .star-shine { animation: star-shine 0.6s ease-out forwards; }
  ```

**Reuse plan for level-up takeover:**
- The level-up full-screen overlay fires `confetti()` with higher `particleCount` (e.g., 200) and a wider `spread` (90) — same import, different params.
- The level-up number can use `star-shine` (scale-in) or a variant like `level-pop` added to globals.css. One new `@keyframes` rule is acceptable. The CSS class must be added to globals.css alongside `star-shine`.
- Do NOT import `framer-motion`, `lottie-react`, or any second animation library.

### A6. Freemium quota gates

**Source:** `src/lib/exercises/feature-flags.ts`, `src/lib/exercises/access.ts`, `src/app/actions/exercises.ts`

- Phase 8 gate: song_quota (10 listening songs free).
- Phase 10 gate: advanced_drill quota (3 songs free shared across Ex5+Ex7).
- Gates live in `checkExerciseAccess()` — called server-side from `getAdvancedDrillAccess()` server action.
- **Phase 12 must NOT add a third gate.** The path's "next up" cue is visual only. When a user clicks any node on the path, they navigate to the existing `/songs/[slug]` page which enforces existing quotas as normal.

---

## B. Database Schema

### B1. Existing tables relevant to Phase 12

**`songs` table** (schema.ts:61):
- `id: uuid`, `slug: text`, `title: text`, `artist: text`, `anime: text`
- `difficulty_tier: difficultyEnum` — values `'basic' | 'intermediate' | 'advanced'`
- `jlpt_level: jlptEnum` — values `'N5' | 'N4' | 'N3' | 'N2' | 'N1'`
- `popularity_rank: integer` — lower = more popular; drives default catalog order
- `genre_tags: text[]`, `mood_tags: text[]`

**`users` table** (schema.ts:267, migrations 0005 + 0006):
Currently has: `id text PK`, `skip_learning boolean`, `new_card_cap integer`, `review_new_today integer`, `review_new_today_date date`, `created_at`, `updated_at`.
No gamification columns exist yet.

**`user_vocab_mastery` table** (schema.ts:177):
- `user_id text`, `vocab_item_id uuid`, `state smallint` (0=New,1=Learning,2=Review,3=Relearning), FSRS scalars, `due timestamp`, `last_review timestamp`.
- Has unique constraint on `(user_id, vocab_item_id)`.

**`vocabulary_items` table** (schema.ts:139):
- `jlpt_level: jlptEnum` — nullable (some anime slang has no JLPT assignment).

**`user_song_progress` table** (schema.ts:300):
- Tracks per-user per-song-version accuracy for each exercise group.
- `sessions_completed integer` — incremented by `saveSessionResults`.
- NO streak, XP, or level columns exist here.

### B2. Proposed new schema (migration 0008_gamification.sql)

**Additions to `users` table:**

```sql
-- XP and leveling
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "xp_total" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "xp_today" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "xp_today_date" DATE,
-- Streak
  ADD COLUMN IF NOT EXISTS "streak_current" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "streak_best" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_streak_date" DATE,
  ADD COLUMN IF NOT EXISTS "streak_tz" TEXT,
  ADD COLUMN IF NOT EXISTS "grace_used_this_week" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "streak_week_start" DATE,
-- Path state
  ADD COLUMN IF NOT EXISTS "current_path_node_slug" TEXT,
-- Audio/haptic prefs
  ADD COLUMN IF NOT EXISTS "sound_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "haptics_enabled" BOOLEAN NOT NULL DEFAULT TRUE;
```

**New `user_cosmetics` table:**

```sql
CREATE TABLE IF NOT EXISTS "user_cosmetics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "slot_id" text NOT NULL,        -- e.g. "avatar_border_lv3", "theme_ember"
  "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "equipped" boolean NOT NULL DEFAULT FALSE,
  CONSTRAINT "user_cosmetics_user_slot_unique" UNIQUE ("user_id", "slot_id")
);
CREATE INDEX IF NOT EXISTS "user_cosmetics_user_idx" ON "user_cosmetics" ("user_id");
```

**New `reward_slot_definitions` table (data-driven slot registry):**

```sql
CREATE TABLE IF NOT EXISTS "reward_slot_definitions" (
  "id" text PRIMARY KEY,              -- e.g. "avatar_border_kitsune", "badge_7day"
  "slot_type" text NOT NULL,          -- "avatar_border" | "color_theme" | "badge" | "anime_scene"
  "level_threshold" integer NOT NULL, -- level at which this slot becomes unlockable
  "content" jsonb NOT NULL,           -- discriminated union per slot_type (see Section D)
  "active" boolean NOT NULL DEFAULT TRUE, -- false hides slot from all surfaces
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Reasoning:**
- `reward_slot_definitions` is data-driven: v4.0 Phase 21 INSERTs new rows with `slot_type = 'anime_scene'` without code changes.
- `user_cosmetics` tracks which slots the user has unlocked and which is equipped per type.
- Streak fields on `users` are additive columns, consistent with the existing `review_new_today` / `review_new_today_date` pattern.
- `current_path_node_slug` on `users` avoids a separate table for the simple "what's your next node" state.

### B3. JLPT gap view — no new table needed

The JLPT gap summary can be derived live:

```sql
SELECT
  vi.jlpt_level,
  COUNT(*) FILTER (WHERE m.state IN (1,2,3))::int AS known_count,
  COUNT(*) FILTER (WHERE m.state = 2)::int         AS mastered_count
FROM vocabulary_items vi
LEFT JOIN user_vocab_mastery m
  ON m.vocab_item_id = vi.id AND m.user_id = $1
WHERE vi.jlpt_level IS NOT NULL
GROUP BY vi.jlpt_level
ORDER BY vi.jlpt_level ASC  -- N5 first (lexicographic matches N1>N2>N3>N4>N5 reversed — use CASE)
```

The total-words-per-JLPT-tier denominator (e.g., "180 N5 words in catalog") comes from a COUNT without the user filter. This is a cheap aggregate; no materialized view required unless performance profiling shows otherwise.

---

## C. Starter-Pick Candidates

**Methodology:** Cannot query the live DB directly. Inferred from `scripts/seed/08-set-popularity.ts` (popularity rankings) and the `difficulty_tier` schema. The planner should verify `difficulty_tier = 'basic'` in the DB before committing.

From the curated popularity rankings, the following are likely `difficulty_tier = 'basic'` candidates based on anime series (simpler vocabulary, OP/ED of mainstream gateway anime):

| Rank | Slug | Anime | Why basic-tier | Vibe |
|------|------|-------|---------------|------|
| 20 | `wind-akeboshi` | Naruto ED1 | N5/N4 level, slow tempo, gentle folk | Chill / nostalgic |
| 18 | `utakata-hanabi-supercell` | Naruto Shippuden ED14 | N4 vocab, emotional ballad | Emotional / romantic |
| 85 (est.) | `crossing-field-lisa` | SAO OP1 | N4 level, iconic, upbeat J-pop | Energetic / fantasy |
| 51 | `misa-no-uta-aya-hirano` | Death Note insert | Simple repetitive vocab, eerie | Dark / atmospheric |
| ~100 (est.) | `heroes-brian-the-sun` | MHA ED1 | N5/N4, anthemic rock | Heroic / shonen |

**Three recommended starter picks (researcher recommendation — user must review):**

1. **`wind-akeboshi`** (Naruto ED1) — chill folk vibe, N5/N4 vocabulary, slow enough for beginners to track lyrics
2. **`utakata-hanabi-supercell`** (Naruto Shippuden ED14) — emotional ballad vibe, N4 vocab, beloved by learners  
3. **`crossing-field-lisa`** (SAO OP1) — rank 1 most popular, energetic J-pop vibe, broad appeal to newcomers

**Variety check:** Chill folk / emotional ballad / energetic J-pop — three distinct vibes from two major franchises (Naruto, SAO). Anime diversity is low (both Naruto items are from the same franchise). The planner should verify tier assignments and consider substituting one Naruto entry for an SAO, MHA, or FMA basic-tier song if available.

**Verification query the planner must run before committing:**
```sql
SELECT slug, title, anime, difficulty_tier, jlpt_level, popularity_rank
FROM songs
WHERE difficulty_tier = 'basic'
  AND EXISTS (SELECT 1 FROM song_versions sv WHERE sv.song_id = songs.id AND sv.lesson IS NOT NULL)
ORDER BY popularity_rank ASC NULLS LAST
LIMIT 10;
```

---

## D. Reward-Slot Data Shape

### D1. Discriminated union TypeScript interface

```typescript
// src/lib/types/reward-slots.ts

/** v3.0 cosmetic content types */
export interface AvatarBorderContent {
  type: "avatar_border";
  css_class: string;        // e.g. "border-kitsune" — applied to avatar wrapper
  preview_color: string;    // hex for quick rendering without CSS class
  label: string;            // "Kitsune Spirit"
}

export interface ColorThemeContent {
  type: "color_theme";
  css_vars: Record<string, string>; // e.g. { "--color-accent": "#ff6b35" }
  label: string;
}

export interface BadgeContent {
  type: "badge";
  icon: string;             // emoji or SVG path reference
  label: string;            // "7-Day Flame"
  description: string;
}

/** v4.0 Phase 21 content types (scaffolded, no content yet) */
export interface AnimeSceneContent {
  type: "anime_scene";
  scene_id: string;
  anime: string;
  title: string;
  description: string;
  /** Populated by Phase 21 — null in v3.0 */
  media_url: string | null;
}

export interface CulturalVocabContent {
  type: "cultural_vocab";
  word: string;             // e.g. "Kisame"
  etymology: string;        // "demon shark"
  explanation: string;
}

/** Union — all current and future slot content shapes */
export type RewardSlotContent =
  | AvatarBorderContent
  | ColorThemeContent
  | BadgeContent
  | AnimeSceneContent
  | CulturalVocabContent;

export interface RewardSlotDefinition {
  id: string;
  slot_type: RewardSlotContent["type"];
  level_threshold: number;
  content: RewardSlotContent;  // stored as JSONB in reward_slot_definitions.content
  active: boolean;
}
```

### D2. Empty-slot filtering

```typescript
// src/lib/reward-slots.ts

export function getVisibleSlotsForUser(
  definitions: RewardSlotDefinition[],
  userLevel: number
): RewardSlotDefinition[] {
  return definitions.filter(
    (slot) => slot.active && slot.level_threshold <= userLevel
  );
}

// End-of-session: preview of NEXT slot the user hasn't unlocked yet
export function getNextRewardPreview(
  definitions: RewardSlotDefinition[],
  userLevel: number
): RewardSlotDefinition | null {
  return (
    definitions
      .filter((slot) => slot.active && slot.level_threshold > userLevel)
      .sort((a, b) => a.level_threshold - b.level_threshold)[0] ?? null
  );
}
```

**Empty-state guarantee:** `getVisibleSlotsForUser` returns empty array for a level-1 user if no v3.0 cosmetics are defined below level 1. Components MUST use `if (visibleSlots.length === 0) return null;` — no "coming soon" placeholder rendered at any slot position.

---

## E. Timezone & Streak Rollover Pitfalls

### E1. Client TZ detection

```typescript
// Called on client, sent to server with each session-complete action
const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
// e.g. "America/Sao_Paulo", "Europe/London", "Asia/Tokyo"
```

The IANA timezone name is sent with each `saveSessionResults` call and stored in `users.streak_tz`. This IANA name is used server-side to compute "today" in the user's local date.

### E2. Server-side date computation

```typescript
import { toZonedTime, format } from "date-fns-tz";
// OR use Intl API (no dep):
function getLocalDate(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short" })
    .format(new Date())
    .split("/").reverse().join("-"); // YYYY-MM-DD
}
```

Store `last_streak_date` as a `DATE` column (just YYYY-MM-DD) — not a timestamp. Comparison is `localToday === last_streak_date` (string compare). This avoids any TZ offset arithmetic on the stored value.

**NOTE:** `date-fns-tz` is not currently in `package.json`. The planner has two options:
- Option A: Install `date-fns-tz` (~12kb) — cleanest API.
- Option B: Use the built-in `Intl.DateTimeFormat` (zero dep, slightly more verbose). **Recommended** — avoid a new dependency for a simple date-format operation.

### E3. DST / travel handling

If a user changes TZ mid-streak (travel from Tokyo to London), `streak_tz` is updated on the next session. The `last_streak_date` is a raw date string (YYYY-MM-DD), not tied to any timezone. The comparison becomes:

- `last_streak_date` = "2026-04-19" (set when user was in Tokyo)
- Next session from London, `localToday` = "2026-04-19" (same calendar day)
- Result: no streak break for same-day TZ switch (correct behaviour)

Edge case: If user plays at 11:58 PM Tokyo time, then the clock ticks to April 20 Tokyo / April 19 London while they're mid-travel, they might get an unexpected "same day" result. This edge is acceptable for v3.0 — it never penalizes the user unfairly.

### E4. Weekly grace logic

**Choice: ISO calendar week (Monday reset).** Rationale: universal, predictable, avoids ambiguity.

- `streak_week_start` column stores the Monday date of the current ISO week.
- When a new week starts (monday), reset `grace_used_this_week = false`.
- When a session misses a day: if `grace_used_this_week = false`, silently set `last_streak_date = today`, set `grace_used_this_week = true`. Show "phew" acknowledgment next session.
- If `grace_used_this_week = true` and another day is missed: silent reset to 0, clear streak state.

**Grace cannot double-apply across a TZ jump:** Grace is keyed on the week, not the TZ. The server checks `grace_used_this_week` before applying it. A TZ jump does not create a second grace opportunity within the same ISO week.

---

## F. Haptics / Sound API

### F1. `navigator.vibrate()` — Web Vibration API

- **Android Chrome/Firefox:** Supported since ~2013. Works reliably on mobile Android.
- **iOS Safari:** Not supported at all (returns `undefined`, silently ignored). No workaround exists.
- **Desktop browsers:** Mostly not supported (Chrome returns false, does nothing).

**Degradation:** Wrap in a try/catch + feature-detect:
```typescript
export function triggerHaptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore — iOS Safari throws on some versions
  }
}
```

The `haptics_enabled` user pref gates this call. iOS users will see "Haptics" in settings but the toggle has no effect (acceptable — better than hiding the toggle based on UA sniffing).

### F2. Sound for level-up SFX

**Existing audio in codebase:** WaveSurfer (`wavesurfer.js` ^7.12.5 + `@wavesurfer/react` ^1.0.12) is used for the Listening Drill exercise (timing editor). It is NOT used for SFX. The codebase has zero SFX implementation today.

**Recommendation: Use `HTMLAudioElement` with a preloaded `.mp3` file in `public/sounds/`.** This is the simplest approach:

```typescript
// src/lib/sfx.ts
let levelUpAudio: HTMLAudioElement | null = null;

export function preloadLevelUpSFX(): void {
  if (typeof window === "undefined") return;
  levelUpAudio = new Audio("/sounds/level-up.mp3");
  levelUpAudio.preload = "auto";
}

export function playLevelUpSFX(enabled: boolean): void {
  if (!enabled || !levelUpAudio) return;
  levelUpAudio.currentTime = 0;
  levelUpAudio.play().catch(() => {/* autoplay policy — silently ignore */});
}
```

**Autoplay policy:** Browsers block audio that is not triggered by a direct user gesture. The level-up celebration fires at session-end (immediately after the user's final answer interaction), which is close to a user gesture. In practice this should work, but the `.catch()` guard is required for browsers that still block it. If it fails silently, the visual animation still plays — acceptable degradation.

**Source audio:** The planner should find or create a short (~1.5 second) royalty-free chime/fanfare in the public domain or CC0. Freesound.org is appropriate. Store at `public/sounds/level-up.mp3`.

---

## G. Analytics Plumbing

**Current state:** No PostHog, no analytics instrumentation in the codebase. Phase 15 will add PostHog/Plausible. `user_exercise_log` is the only event log, used for FSRS scheduling, not analytics.

**Recommendation: Emit to a stub that Phase 15 adapts.**

Rationale: Instrumenting XP/streak/level events now means Phase 15 can drop in the PostHog integration without touching gamification code. The stub is zero-overhead.

```typescript
// src/lib/analytics.ts
type GamificationEvent =
  | { event: "xp_gained"; xp: number; source: "answer" | "session" | "star" | "streak_milestone" }
  | { event: "level_up"; new_level: number }
  | { event: "streak_updated"; streak_current: number }
  | { event: "path_node_started"; slug: string; difficulty_tier: string }
  | { event: "starter_pick_selected"; slug: string };

export function trackGamification(e: GamificationEvent): void {
  // Phase 15 will replace this body with posthog.capture(e.event, e)
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics:gamification]", e);
  }
}
```

Phase 15 swaps out the function body. No caller changes needed.

---

## H. Authentication / User State

**Current auth:** `PLACEHOLDER_USER_ID = "test-user-e2e"` (hardcoded in `src/lib/user-prefs.ts`). The codebase has TODO comments throughout: `// TODO: replace with Clerk userId from auth()`.

Clerk auth is referenced as a future dependency but has NOT been installed yet — no Clerk dependency in `package.json`.

**For Phase 12:** All gamification columns go on the `users` table (same pattern as `skip_learning` / `new_card_cap`). The `PLACEHOLDER_USER_ID` pattern is used for all reads/writes. When Clerk auth lands, a single search for `PLACEHOLDER_USER_ID` will identify all callsites to wire up.

**Hook for HUD reads:** No dedicated `useUser` hook exists. The HUD on `/path` and `/profile` is a server component that reads from `users` table directly (same pattern as `ProfilePage` reading `getUserPrefs`). No client-side hook needed for v3.0.

**No Zustand store for gamification state:** XP/level/streak live in the DB, read via server actions. The only in-session state is "did we level up this session?" which can be returned from `saveSessionResults` and stored in component state.

---

## I. Path Surface Design

### I1. Route

New Next.js App Router route: `src/app/path/page.tsx`

```
src/app/path/
├── page.tsx          # Server component — fetches catalog + user progress + path state
└── components/
    ├── PathMap.tsx   # Client component — renders stepped vertical map
    ├── PathNode.tsx  # Individual node (song card on the path)
    ├── StarterPick.tsx  # First-visit modal — pick 1 of 3 starter songs
    └── PathHUD.tsx   # Level/XP/streak header bar
```

### I2. Server vs client component split

- `page.tsx` = **server component** (`export const dynamic = "force-dynamic"`). Fetches:
  1. Full song list with difficulty_tier and user progress (reuse `getAllSongs(userId)` query)
  2. User's `current_path_node_slug`, `xp_total`, `level`, `streak_current`, `streak_best` from `users` table
  3. Reward slot definitions (small table, infrequently updated — can cache with `revalidateTag`)
  
- `PathMap.tsx` = **client component**. Renders the stepped map. Receives the songs array and current user state as props. Handles the visual layout (CSS grid / absolute positioning for the winding path effect).

- `StarterPick.tsx` = **client component**. Shown only when `current_path_node_slug IS NULL`. Three song cards with a "Start here" button. On select, calls a server action `setStarterSong(userId, slug)` which sets `current_path_node_slug` and redirects.

### I3. Active-node source-of-truth

**Recommendation: DB column `users.current_path_node_slug` text.**

Rationale:
- Derived-from-last-started would require a join to `user_song_progress` and a song-to-path-position calculation on every `/path` load — more complex.
- `current_path_node_slug` advances when the user completes a session on the recommended next node. The update happens inside `saveSessionResults` (new code: check if `songSlug === nextPathNode(userId)`, if so advance `current_path_node_slug`).
- Advancing rules: after completing a session on the current node, set `current_path_node_slug` to the next song in path order (by difficulty_tier grouping, then popularity_rank within tier).

### I4. Path ordering algorithm

Songs on the path are ordered:
1. Tier group: `basic` → `intermediate` → `advanced`
2. Within tier: ascending `popularity_rank` (lower = more popular = appears first)

This is a deterministic sort — no new DB columns needed. The path order is computed at query time: `ORDER BY CASE difficulty_tier WHEN 'basic' THEN 0 WHEN 'intermediate' THEN 1 WHEN 'advanced' THEN 2 END ASC, popularity_rank ASC NULLS LAST`.

---

## J. Cosmetic Application

### J1. Current avatar/cosmetic rendering

No avatar system exists in the codebase today. The profile page has only `GlobalLearnedCounter` and `ProfileForm`. There is no `<Avatar>` component, no user photo, no border rendering.

**Phase 12 introduces the avatar concept as part of cosmetics.**

### J2. Recommended approach: `UserCosmeticsProvider`

```typescript
// src/components/cosmetics/UserCosmeticsContext.tsx
interface UserCosmeticsContext {
  equippedBorderClass: string | null;     // e.g. "border-kitsune"
  equippedThemeCssVars: Record<string, string>; // applied to :root or wrapper
  earnedBadges: BadgeContent[];
}
```

A server component reads equipped cosmetics and passes as props to a thin client `CosmeticsProvider`. All surfaces (profile page HUD, `/path` HUD) consume via `useCosmetics()` hook.

**For v3.0:** Avatar border renders on:
1. `/profile` page — in the new HUD section above ProfileForm
2. `/path` page — in the PathHUD component

It does NOT appear in the global nav or song pages (matches HUD restriction in CONTEXT).

**Avatar placeholder:** Since no real user photo exists (Clerk auth not wired), use a styled fox/kitsune SVG as the avatar with the border applied as a CSS ring (`ring-[4px]` Tailwind class derived from the equipped border color).

---

## K. Testing Strategy

### K1. Existing test infrastructure

- **Vitest** (`vitest ^4.1.4`) — unit + integration tests. Config in `vitest.config.ts`.
- **Playwright** (`@playwright/test ^1.59.1`) — E2E tests in `tests/e2e/`.
- **Testing Library** (`@testing-library/react ^16.3.2`, `@testing-library/jest-dom ^6.9.1`) — component tests.
- Pattern: pure functions in `src/lib/` get Vitest unit tests. Component tests use `// @vitest-environment jsdom` directive. Integration tests in `tests/integration/`.
- Reference test for pure-function pattern: `src/lib/db/__tests__/derive-stars.test.ts` — follows `describe` + `it.each` with a `CASES` array.

### K2. New tests required

**Unit: XP calculator** — `src/lib/gamification/__tests__/xp.test.ts`
```
- calculateXp(answers, mode, multipliers) returns correct XP
- Daily soft cap: full rate below cap, 25% above
- Multiplier stacking: daily-first × path-order × perfect run
- Level curve: xpForLevel(n) ≈ BASE * 1.2^n
- levelFromXp(total) returns correct level
```

**Unit: Streak state machine** — `src/lib/gamification/__tests__/streak.test.ts`
```
- Normal day: streak increments
- Same day: streak unchanged
- Missed one day, grace available: grace applied, streak preserved
- Missed one day, grace already used this week: silent reset
- Missed two days: reset regardless
- Grace resets on ISO week Monday
- streak_best never decreases
```

**Unit: Reward-slot filtering** — `src/lib/gamification/__tests__/reward-slots.test.ts`
```
- getVisibleSlotsForUser: returns only slots with level_threshold <= userLevel AND active=true
- getNextRewardPreview: returns the lowest-threshold locked slot
- Empty array when no active slots exist
```

**Component: Level-up takeover** — Playwright E2E
```
- Complete a session that triggers level-up
- Full-screen overlay appears
- Confetti fires (canvas-confetti mock)
- Dismiss takes user back to /path
```

### K3. Integration tests

`tests/integration/gamification.test.ts`:
- `saveSessionResults` with XP params: verifies `users.xp_total` incremented correctly
- Streak: two consecutive days advance streak; gap day with grace applies grace; gap day without grace resets
- Level-up: verify `leveledUp = true` returned when XP crosses threshold

---

## L. Migration & Rollout

### L1. Drizzle migration pattern

Existing migrations in `drizzle/` follow the naming convention `0000_*, 0001_*, ...`. Next available: `0008_gamification.sql`.

All existing migrations use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for additive changes — safe for re-runs. New table uses `CREATE TABLE IF NOT EXISTS`.

**Backfill defaults:** All new columns have database-level defaults (0, true, null). No backfill script needed. Existing users on first gamification access will have:
- `xp_total = 0`, `level = 1`, `streak_current = 0`, `streak_best = 0`
- `sound_enabled = true`, `haptics_enabled = true`
- `current_path_node_slug = NULL` (triggers starter-pick flow)

### L2. Schema update in drizzle schema.ts

Extend the `users` pgTable definition with the new columns. Follow the existing comment pattern (`// Phase 12: Gamification — ...`).

### L3. `getUserPrefs` / `upsertUser` pattern

The existing `getUserPrefs` in `userPrefs.ts` upserts with `onConflictDoNothing`. Phase 12 adds a `getUserGamificationState(userId)` function that follows the same pattern — reads the new columns from `users`, upserts row if it doesn't exist.

---

## M. Pitfalls to Flag for Planner

### M1. "Next up" arrow must never be a functional gate
The visual highlight / arrow on `/path` is CSS-only — it applies a `ring` or `scale` to the next node. The node is still clickable whether or not it is the "next" one. No `disabled` attribute, no `pointer-events: none`. The path-order XP bonus is the only difference.

### M2. XP soft cap must still show progress
When the user is above the daily cap, XP drip continues at 25% rate — it does NOT stop. The XP counter increments; it just increments more slowly. Visually show "soft cap active" indicator on the XP bar (e.g., a small flame icon with a slash). Do not hide the XP total or counter.

### M3. Level-up celebration fires at session-end, never mid-exercise
The `saveSessionResults` server action determines if a level-up occurred. The `SessionSummary` renders after `saveSessionResults` resolves. The level-up overlay is a child of `SessionSummary`, triggered by `result.leveledUp === true`. It NEVER fires during question rendering inside `ExerciseSession`.

### M4. Reward-slot empty-state is enforced at three surfaces
Empty-state filtering must be applied at:
1. End-of-session summary `rewardSlotPreview` — `getNextRewardPreview()` returns null if no active locked slots exist; summary renders nothing in that position
2. `/path` HUD — `getVisibleSlotsForUser()` returns empty array → no cosmetics section rendered
3. `/profile` page — same function, same null check

No surface may render an empty slot card or "coming soon" placeholder. The check is `if (!preview) return null;` — not a `<div className="hidden">`.

### M5. Streak grace must not double-apply across a TZ jump
The grace flag is `grace_used_this_week: boolean` scoped to `streak_week_start` (ISO week Monday date). When checking whether to apply grace, the server verifies BOTH `grace_used_this_week === false` AND that the ISO week hasn't changed. If the week changed, reset `grace_used_this_week` to false and set new `streak_week_start` before applying grace logic. This prevents a TZ jump that triggers a week boundary from giving two grace days.

### M6. `saveSessionResults` is the single write boundary for XP + streak
XP and streak updates MUST happen inside `saveSessionResults`. Do not create a separate server action or separate client call for gamification updates. The existing `saveSessionResults` already returns `stars`, `previousStars`, `bonusBadge`, `songMastery`. Extend `SaveSessionResult` to include `xpGained`, `newXpTotal`, `previousLevel`, `currentLevel`, `leveledUp`, `streakCurrent`, `streakBest`, `graceApplied`, `rewardSlotPreview`. One server round-trip per session-end.

### M7. Path node advancement is idempotent
The `current_path_node_slug` update must be guarded: only advance if the song completed matches the current `current_path_node_slug`. Without this guard, a user who plays a non-path song will accidentally advance their path position. Check: `if (input.songSlug === user.current_path_node_slug) { advance() }`.

### M8. Starter-pick persists before session starts
The `setStarterSong` server action sets `current_path_node_slug` immediately on selection — before the user starts the first session. This ensures the path-order XP bonus applies to the very first session (which is on the recommended node, since the user just picked it).

### M9. Existing `sessions_completed` vs new streak
`user_song_progress.sessions_completed` counts sessions per-song. `users.streak_current` counts calendar-day streaks globally. They are orthogonal. Do not use `sessions_completed` to derive streak state.

### M10. No Clerk yet — PLACEHOLDER_USER_ID used everywhere
All Phase 12 gamification code uses `PLACEHOLDER_USER_ID`. When Clerk arrives, the migration is a search-and-replace in server actions / server components. Do not design Phase 12 to require Clerk — it must work with the placeholder.

---

## Recommendations for Planner

These are concrete implementation choices the planner should adopt unless overridden after user review.

**1. XP values (researcher recommendation):**
- Per correct answer: **2 XP**
- Per session completion (short mode): **15 XP**, (full mode): **25 XP**
- Per new star earned: Star 1 = **30 XP**, Star 2 = **60 XP**, Star 3 = **100 XP**
- Daily soft cap: **250 XP** → 25% rate above it
- Streak milestone bonuses: 7-day = **50 XP**, 30-day = **150 XP**, 100-day = **400 XP**

**2. Level curve:**
```
xp_for_level(n) = Math.floor(100 * Math.pow(1.2, n - 1))
```
Level 1→2: 100 XP. Level 2→3: 120 XP. Level 10→11: ~516 XP. Level 20→21: ~3,834 XP. This is forgiving early (quick first levels to feel momentum) and meaningful later.

**3. Schema column names (for `users` table):**
`xp_total`, `level`, `xp_today`, `xp_today_date`, `streak_current`, `streak_best`, `last_streak_date`, `streak_tz`, `grace_used_this_week`, `streak_week_start`, `current_path_node_slug`, `sound_enabled`, `haptics_enabled`

**4. Starter songs (pending DB verification):**
1. `wind-akeboshi` (Naruto ED1) — chill/nostalgic vibe
2. `utakata-hanabi-supercell` (Naruto Shippuden ED14) — emotional vibe
3. `crossing-field-lisa` (SAO OP1) — energetic/fantasy vibe

**Run the verification query in Section C before committing. All three must have `difficulty_tier = 'basic'` and a non-null lesson.**

**5. V3.0 cosmetic catalog (researcher proposal, user review required):**
- Level 3: Avatar border "Kitsune Fire" (orange ring, `ring-orange-500`)
- Level 5: Badge "5-Day Flame" 🔥 (re-awarded per streak milestone — see note)
- Level 7: Color theme "Ember" (warm accent `#ff6b35`)
- Level 10: Avatar border "Night Fox" (indigo/purple, `ring-indigo-400`)
- Level 15: Badge "Scholar Fox" 📚
- Level 20: Color theme "Sakura" (pink accent `#f472b6`)

**Note:** Streak-milestone badges (7/30/100 day) are awarded from the XP economy as discrete XP grants, not as reward slots. Cosmetic level-gate badges are separate items in `reward_slot_definitions`.

**6. Reward-slot data is seeded via SQL, not code:**
A `drizzle/seeds/reward-slots.sql` file (or a `scripts/seed/14-seed-reward-slots.ts` script) inserts initial v3.0 cosmetic rows into `reward_slot_definitions`. v4.0 Phase 21 adds rows without touching app code.

**7. Week boundary for grace: ISO week (Monday reset)**
`streak_week_start = startOfISOWeek(today)` using `Intl.DateTimeFormat` with weekday to compute Monday. No new dependency needed.

**8. Sound for level-up: `HTMLAudioElement` + `public/sounds/level-up.mp3`**
Source a ~1.5 second CC0 fanfare from freesound.org before implementation. Store in `public/sounds/`. No new npm package.

**9. Analytics: emit to stub now, Phase 15 adopts**
Add `src/lib/analytics.ts` with a `trackGamification()` stub. Call it from `saveSessionResults` and path-interaction handlers. Phase 15 wires PostHog by replacing the stub body.

**10. JLPT gap query: live derivation, no materialized view**
Two SQL aggregates (total per tier from `vocabulary_items`, known per tier from `user_vocab_mastery`) run at `/vocabulary` page load. Only ~5 rows returned (one per JLPT level). No performance concern. If profiling shows >50ms, create a materialized view at that time.

---

## Sources

### Primary (HIGH confidence — read directly from repo)
- `drizzle/0000_furry_zeigeist.sql` — songs, vocabulary_items schema, ENUM definitions
- `drizzle/0001_song_versions.sql` — song_versions table, version_type enum
- `drizzle/0002_data_foundation.sql` — user_vocab_mastery, user_exercise_log, vocab_global materialized view
- `drizzle/0003_exercise_engine.sql` — user_song_progress table
- `drizzle/0005_user_prefs.sql` — users table, skip_learning, new_card_cap
- `drizzle/0006_review_daily_counter.sql` — review_new_today, review_new_today_date on users
- `drizzle/0007_advanced_exercises.sql` — ex5/6/7 accuracy columns, user_exercise_song_counters
- `src/lib/db/schema.ts` — full Drizzle schema including deriveStars, deriveBonusBadge
- `src/lib/db/queries.ts` — getAllSongs, getVocabularyDashboard, DashboardRow interface
- `src/app/songs/[slug]/components/SessionSummary.tsx` — saveSessionResults call pattern, result shape
- `src/app/songs/[slug]/components/StarDisplay.tsx` — canvas-confetti usage, star-shine class
- `src/app/globals.css` — star-shine @keyframes, full CSS file
- `src/app/songs/components/SongGrid.tsx` — difficulty_tier filter rendering
- `src/app/vocabulary/page.tsx` — JLPT-aware vocabulary dashboard, getVocabularyDashboard call
- `src/app/vocabulary/VocabularyList.tsx` — 3-bucket layout, DashboardRow rendering
- `src/app/profile/page.tsx` and `ProfileForm.tsx` — settings panel shape
- `src/app/actions/userPrefs.ts` — isPremium, getUserPrefs, upsert pattern
- `src/app/actions/exercises.ts` — saveSessionResults, SaveSessionResult shape, quota gates
- `src/lib/user-prefs.ts` — PLACEHOLDER_USER_ID, REVIEW_NEW_DAILY_CAP constants
- `package.json` — canvas-confetti 1.9.4, vitest 4.1.4, playwright 1.59.1, NO Clerk, NO date-fns-tz
- `vitest.config.ts` — test environment, include patterns, setup files
- `scripts/seed/08-set-popularity.ts` — curated popularity rankings (basis for starter-pick inference)
- `.planning/ROADMAP.md` — Phase 12 success criteria, dependency chain

### Secondary (MEDIUM confidence)
- Navigator.vibrate MDN docs (from training data, iOS limitation widely documented)
- Intl.DateTimeFormat IANA TZ support (widely supported, used in CONTEXT.md decision)

### Tertiary (LOW confidence — needs validation)
- Specific `difficulty_tier` values for starter-song candidates — inferred from anime genre, cannot verify without live DB query. Run verification query before committing.
- JLPT N5 total word count "180" — rough estimate. Actual count depends on `vocabulary_items` rows with `jlpt_level = 'N5'`. Run `SELECT COUNT(*) FROM vocabulary_items WHERE jlpt_level = 'N5'` to get the real number.

---

## Metadata

**Confidence breakdown:**
- Schema design: HIGH — based on direct reading of all drizzle migrations and schema.ts
- Existing surface analysis (SessionSummary, VocabularyList, ProfileForm): HIGH — read complete file contents
- Starter-song candidates: LOW — inferred from popularity rankings, cannot query live DB
- Haptics/sound API: MEDIUM — well-documented platform limitations, no new dep needed
- TZ/streak logic: MEDIUM — standard ISO week + IANA TZ approach, well-known pattern

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (stable domain — schema additions, not volatile APIs)
