# Phase 11: Cross-Song Vocabulary - Research

**Researched:** 2026-04-18
**Domain:** Aggregation / surfacing of per-vocab FSRS mastery across songs + premium SRS review queue
**Confidence:** HIGH (data layer, gate, patterns) / MEDIUM (new /review engine shape — no prior art in repo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Known-word counts on song pages**
- **"Known" threshold:** FSRS Tier 2+ (kanji+furigana reveal). Tier 1 (Learning/Relearning) does NOT count.
- **Placement:** Song header, near the title — visible pre-scroll, same horizontal band as play/start buttons.
- **Refresh strategy:** SSR on page load, then client refetches after `saveSessionResults` so newly-mastered words update without a full navigation. Not fully reactive.
- **Zero state:** When user has 0 Tier-2+ words for the song, render a "New to you" pill instead of "0/12".

**Vocabulary dashboard UX**
- **Primary layout:** Grouped by FSRS tier — three stacked sections (Mastered / Known / Learning). Maps 1:1 to TierText tiers.
- **Sort/filter controls:**
  - Sort by tier/mastery (most → least or inverse)
  - Filter by tier (T1 only / T2 only / T3 only)
  - Filter by source song
  - (Last-seen sort NOT selected — omit from v1)
- **Per-word metadata shown:**
  - Source song count + click-through expandable list (satisfies CROSS-02)
  - Part of speech + JLPT level
  - FSRS due date
  - (Tier badge is implicit from the grouped layout — do not duplicate as inline chip)
- **Entry points:** Both header nav link (next to Profile) AND a Profile page section/CTA.

**Cross-song SRS review queue**
- **Surface:** Dedicated `/review` page with its own session engine. Explicitly NOT reusing ExerciseSession verbatim.
- **Exercise types in queue:** Meaning→Vocab, Vocab→Meaning, Reading Match. Fill-the-Lyric is EXCLUDED.
- **Session bounds:** FSRS-style daily limit (e.g. 50 new + all due). Exact new-card cap tunable; "all due" is uncapped by design for this phase.
- **Free-tier behavior:** Free users see the "X cards due" count on `/review` but cannot start a session — `Start Review` CTA triggers the upsell modal.

**Free vs premium gating**
- **Dashboard access:**
  - Free users see a PREVIEW (e.g. top 20 words) + CTA to upgrade for the full list
  - Premium users see the complete tier-grouped dashboard with all controls
- **Global learned counter:** Free on BOTH profile and header.
- **Upsell placement:** Modal triggered on free user's `Start Review` click on `/review`. No inline banner. Preview-dashboard CTA is a separate link/button.

### Claude's Discretion

- **Gate implementation:** Pick whichever fits cleaner at implementation time — either reuse `isPremium()` from `userPrefs.ts` OR add a `reviewAccess()` helper alongside `checkExerciseAccess()`. Planner/researcher decides. (**Researcher recommendation: see Section 6 — use `isPremium()` directly, add a thin `checkReviewAccess()` wrapper only for parity with `checkExerciseAccess` naming.**)
- **Preview dashboard composition:** Which 20 words appear in the free-tier preview. Default to "most recently mastered" unless a better UX reason emerges.
- **Daily-limit exact numbers:** New-per-day cap and overall session ceiling tunable; "50 new + all due" is the shape, not a locked number.
- **Header nav placement and layout.**
- **Upsell modal copy and visual treatment.**

### Deferred Ideas (OUT OF SCOPE)

Out of scope: leech handling, streak mechanics, push/email reminders, per-word reset/bury actions, empty-state copy polish, mobile-specific layouts beyond responsive, last-seen sort.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CROSS-01 | "You know X/Y words" count on song pages | Section 2 — `vocab_global` view + `user_vocab_mastery` join; SSR in `page.tsx`; client refresh hook after `saveSessionResults` |
| CROSS-02 | "Seen in: [songs]" per-word cross-reference | Section 3 — `vocab_global` reverse-join; integrates into `MasteryDetailPopover` via an extended API response |
| CROSS-03 | Global counter of unique words learned | Section 2 — single `COUNT(DISTINCT vocab_item_id) WHERE state >= 2` query; SSR in layout/header + profile page |
| CROSS-04 | Mastering a word in one song reflects in all other songs | Already delivered infra — `user_vocab_mastery` keyed on `(user_id, vocab_item_id)`, not per-song. Phase 11 only reads this correctly. |
| CROSS-05 | Vocabulary dashboard | Section 4 — new `/vocabulary` route, server component consuming searchParams for sort/filter, grouped by tier |
| FREE-04 | Cross-song review queue is premium-only | Section 5–6 — gate on `isPremium()` at server action boundary; view-only count visible to free users |
</phase_requirements>

## Summary

Phase 11 is a **surfacing + aggregation** phase, not a schema phase. Every requirement maps to an existing database primitive delivered in phases 07 and 08.2:

- **`vocabulary_items`** — canonical word identity (UUID PK, `(dictionary_form, reading)` unique key)
- **`user_vocab_mastery`** — per-user FSRS state keyed by `(user_id, vocab_item_id)`, already cross-song by design (CROSS-04 is essentially free)
- **`vocab_global` materialized view** — pre-joins every `song_versions.lesson->vocabulary` entry to its `vocab_item_id`, refreshed on song update. This is the exact index needed for both "words in this song" and "songs containing this word" queries.
- **`tierFor(state)`** — deterministic FSRS-state → display-tier mapper. Tier 2+ == "known", which matches the CONTEXT threshold verbatim.

The **only meaningfully new engineering** is:
1. A dedicated `/review` session engine (cannot reuse `ExerciseSession` verbatim per CONTEXT — but can reuse `QuestionCard`, `FeedbackPanel`, `ratingFor`, `scheduleReview`, `recordVocabAnswer`).
2. A daily-limit bookkeeping counter for new-card introductions (ts-fsrs has no built-in daily limit per upstream issue #300).
3. A distractor pool that is NOT bound to the current song — Section 5 recommends the existing `/api/exercises/jlpt-pool` route which already returns same-JLPT distractors from `vocab_global`.

**Primary recommendation:** Implement CROSS-01 through CROSS-05 as a set of pure-read queries in `src/lib/db/queries.ts` + one new `/review` route. Reuse `isPremium()` as the single gate. Do NOT add a new schema migration — phase 08.2 already delivered everything required.

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ts-fsrs` | ^5.3.2 | FSRS algorithm | Already the source of truth for `state`, `due`, `reps`. `scheduleReview()` wraps it in `src/lib/fsrs/scheduler.ts`. |
| `drizzle-orm` | ^0.41.0 | DB queries | All new queries land in `src/lib/db/queries.ts`. `db.execute(sql` ... `)` escape hatch for the complex CTE joins (pattern already used by `saveSessionResults` step 8). |
| `@neondatabase/serverless` | ^0.10.4 | Postgres HTTP driver | No callback transactions — see saveSessionResults comment in `src/app/actions/exercises.ts:367`. New mutations must follow the same linearized-writes pattern. |
| `zustand` | ^5.0.12 | Client session state | Used by `src/stores/exerciseSession.ts`. **Recommendation: new `src/stores/reviewSession.ts` store mirroring the same persist-middleware + `_hasHydrated` guard pattern.** |
| `next` | ^15.5.14 | App Router | `searchParams` is now `Promise<...>` in Next 15 — must be `await`ed in server components (dashboard sort/filter). |

### What's NOT yet installed (deferred)

The STACK.md research lists Clerk, Stripe, motion, sonner as Milestone 2 additions but `package.json` shows only the base stack. **Phase 11 MUST NOT add these** — gate on the existing `isPremium()` helper which already hits the `subscriptions` table. User is still the `"test-user-e2e"` placeholder pending auth integration (Phase 10).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side sort/filter via URL searchParams | Client-side Zustand state | searchParams gives shareable/bookmarkable URLs and lets SSR paginate — matches the "tab-killed-and-reopened should work" invariant the rest of the app follows. Go with searchParams. |
| New `reviewAccess()` helper | Direct `isPremium()` call in the server action | The `checkExerciseAccess` precedent (Phase 08.1) is a per-exercise-type gate, so it's not a great fit for a single /review route. Direct `isPremium()` is simpler — mirror only the naming convention with a one-line `checkReviewAccess(userId): Promise<{allowed, reason?}>` wrapper if parity matters. |
| Extra `user_review_daily` table for new-card counter | Reuse an existing column or add `users.reviews_today_*` columns | **Recommendation: add two columns on `users`** — `review_new_today INTEGER NOT NULL DEFAULT 0` and `review_new_today_date DATE`. Simple, atomic, no new table, follows the Phase 08.4 `users` extension precedent. Date column detects rollover: if stored date != today, reset counter to 0 before incrementing. |
| Materialized view refresh in real-time | Current on-song-update refresh | `vocab_global` already refreshes CONCURRENTLY on song update via `refreshVocabGlobal()`. Do NOT add per-session refresh — mastery queries hit `user_vocab_mastery` directly and don't need the MV refreshed for each review. |

**Installation:** None. Phase 11 adds zero dependencies.

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   ├── layout.tsx                          # ADD global-learned counter in <header>
│   ├── profile/page.tsx                    # ADD learned-counter display + dashboard CTA
│   ├── songs/[slug]/
│   │   ├── page.tsx                        # ADD known-word count to SSR data
│   │   └── components/
│   │       ├── SongContent.tsx             # ADD KnownWordCount pill in header band
│   │       ├── KnownWordCount.tsx          # NEW — client component, refetches on session end
│   │       └── MasteryDetailPopover.tsx    # EDIT — render "Seen in" list from API response
│   ├── vocabulary/                         # NEW route
│   │   ├── page.tsx                        # server component, reads searchParams
│   │   ├── VocabularyList.tsx              # client component, tier-grouped UI
│   │   └── FilterControls.tsx              # client — updates URL via router.push
│   ├── review/                             # NEW route
│   │   ├── page.tsx                        # server component — counts due, gates on isPremium
│   │   ├── ReviewLanding.tsx               # shows "X due", Start CTA (triggers upsell for free)
│   │   ├── ReviewSession.tsx               # client — runs the session loop, mirrors ExerciseSession
│   │   └── UpsellModal.tsx                 # NEW — premium-required modal
│   ├── api/
│   │   ├── exercises/vocab-mastery/[vocabItemId]/route.ts  # EDIT — add seenInSongs[] to response
│   │   └── review/
│   │       ├── queue/route.ts              # NEW — returns the due+new review queue
│   │       └── known-count/route.ts        # NEW — client refetch after session save
│   └── actions/
│       ├── review.ts                       # NEW — startReviewSession(), recordReviewAnswer()
│       └── userPrefs.ts                    # (existing — isPremium() lives here)
├── lib/
│   ├── db/
│   │   ├── schema.ts                       # ADD columns to users: review_new_today, review_new_today_date
│   │   └── queries.ts                      # ADD getKnownWordCountForSong, getGlobalLearnedCount,
│   │                                        # getSeenInSongsForVocab, getVocabularyDashboard, getDueReviewQueue
│   └── review/                             # NEW
│       ├── queue-builder.ts                # pure fn: (dueCards, newCards, cap) → queue
│       └── __tests__/queue-builder.test.ts
└── stores/
    ├── exerciseSession.ts                  # (existing)
    └── reviewSession.ts                    # NEW — mirrors exerciseSession shape minus song context
```

### Pattern 1: SSR-first with client refresh

**What:** Server components fetch known-word counts and learned counters on initial render. A small client component then refetches the same value after `saveSessionResults` resolves, without a full page navigation.

**When to use:** CROSS-01 (song page pill), CROSS-03 (global counter).

**Example (precedent already in repo):**
```typescript
// src/app/songs/[slug]/page.tsx — SSR pattern
// Source: existing — https://nextjs.org/docs/app/api-reference/file-conventions/page
export const dynamic = "force-dynamic";

export default async function SongPlayerPage({ params }) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  // ADD:
  const known = await getKnownWordCountForSong(PLACEHOLDER_USER_ID, song.id);
  return <SongContent song={...} versions={...} known={known} />;
}
```

```typescript
// src/app/songs/[slug]/components/KnownWordCount.tsx — client refresh
"use client";
import { useState, useEffect } from "react";
import { useExerciseSession } from "@/stores/exerciseSession";

export default function KnownWordCount({ songId, userId, initial }) {
  const [known, setKnown] = useState(initial);
  const questions = useExerciseSession(s => s.questions);
  const currentIndex = useExerciseSession(s => s.currentIndex);
  const justFinished = questions.length > 0 && currentIndex >= questions.length;
  useEffect(() => {
    if (!justFinished) return;
    fetch(`/api/review/known-count?songId=${songId}&userId=${userId}`)
      .then(r => r.json())
      .then(data => setKnown(data));
  }, [justFinished, songId, userId]);
  if (initial.total === 0 || known.known === 0) return <span>New to you</span>;
  return <span>You know {known.known}/{known.total}</span>;
}
```

**Key invariant:** the client refetches from a GET endpoint so stale SW/proxy caches can't lie. Follow the `Cache-Control: private, no-store` pattern already in `src/app/api/exercises/vocab-tiers/route.ts`.

### Pattern 2: searchParams for filter/sort state

**What:** URL is the source of truth for dashboard filter/sort. Client components call `router.push` with updated query; server component reads `searchParams` (Next 15: `Promise<...>`) and re-queries.

**When to use:** CROSS-05 vocabulary dashboard filters (tier, source song, sort direction).

**Example:**
```typescript
// src/app/vocabulary/page.tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page (Next 15)
export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; song?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const data = await getVocabularyDashboard(userId, {
    tierFilter: sp.tier ? Number(sp.tier) as 1|2|3 : undefined,
    sourceSongId: sp.song,
    sortDirection: sp.sort === "asc" ? "asc" : "desc",
  });
  return <VocabularyList groups={data} />;
}
```

### Pattern 3: Gate at the server action boundary, never in the UI

**What:** Premium decisions live in one place (`isPremium()` or a thin `checkReviewAccess()` wrapper). UI receives either data or `{ gated: true }`. Phase 08.1 locked this (FREE-06).

**When to use:** FREE-04 review queue gate, dashboard preview cutoff.

**Example:**
```typescript
// src/app/actions/review.ts
"use server";
import { isPremium } from "@/app/actions/userPrefs";

export async function startReviewSession(userId: string) {
  const premium = await isPremium(userId);
  if (!premium) return { gated: true, reason: "premium_required" } as const;
  // ... build queue ...
  return { gated: false, questions, stats } as const;
}
```

### Anti-Patterns to Avoid

- **Refetching the full song page on session end** — the `saveSessionResults` UX is already tuned to stay on the page (`SessionSummary.tsx:93`). Do NOT use `router.refresh()` just to update a header pill; that triggers a whole lesson re-render, breaking the Practice tab state. Refetch via a narrow API endpoint.
- **Double-gating** — if the server action returns `gated: true`, the UI must only decide *how* to present the upsell, not re-check `isPremium()`. Reading the subscription table twice on one request defeats the single-source-of-truth rule.
- **Querying `user_vocab_mastery` without `vocab_global`** — for "seen in songs" and "known X of Y", you must join through `vocab_global`. Going to `song_versions.lesson->vocabulary` via LATERAL every time works (saveSessionResults step 8 does it for a single song) but is ~10× slower per query than joining the materialized view. Use `vocab_global` for list-scoped queries.
- **Building a custom new-card counter** — don't use a Redis/in-memory counter. Two `users` columns (`review_new_today`, `review_new_today_date`) are atomic with the session write, survive deploys, and don't need an eviction policy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FSRS scheduling for review queue | New scheduler | `scheduleReview()` from `src/lib/fsrs/scheduler.ts` | Phase 08.2 locked the scheduler wrapper. The review-queue engine calls it exactly like `recordVocabAnswer()` does today. |
| Tier classification for counts | `state >= 2` inline checks | `tierFor(state)` from `src/lib/fsrs/tier.ts` | Keeps the tier-ladder definition in one place. "Known" is `tierFor(state) >= 2`. |
| Rating from exercise outcome | Custom weighting | `ratingFor(type, correct, opts)` from `src/lib/fsrs/rating.ts` | Already weights meaning_vocab=Easy, reading_match=Hard. Reveal-reading → Again. Identical contract across song and /review engines. |
| Distractor pool for /review | New query | `GET /api/exercises/jlpt-pool?jlpt_level=N5` | Already returns 50 same-level vocab from `vocab_global`. Matches EXER-10 "same-JLPT-level pool, not random" per Phase 08 research. |
| Per-answer FSRS + log write | Inline in new action | `recordVocabAnswer()` from `src/app/actions/exercises.ts` | **Pass `songVersionId: null`** — the column is already nullable precisely for cross-song reviews. The function handles the FSRS + log upsert correctly. Do NOT duplicate this logic. |
| Known-count aggregation per song | New N+1 loop | CTE in a single `db.execute(sql` ... `)` call | saveSessionResults step 8 (`src/app/actions/exercises.ts:277–300`) is the template: one CTE for song vocab, LEFT JOIN to user_vocab_mastery, COUNT FILTER for each tier bucket. |
| Materialized view queries | New view | `vocab_global` | Already has `(vocab_item_id, song_id, version_type, dictionary_form, reading, jlpt_level)`. Everything cross-song you want is one SQL join away. |
| Confetti on new-mastery | canvas-confetti call from scratch | Same pattern used in `SessionSummary.tsx` (see `newStarEarned` logic) | Precedent exists; copy-paste the new-star celebration. |

**Key insight:** Phase 11 is 80% SQL query writing and 20% thin React glue. Every piece of business logic already exists — your only job is to read the existing primitives through the right indexes.

## Common Pitfalls

### Pitfall 1: `state = 2` vs `state >= 2` for "known"

**What goes wrong:** FSRS state values are `0=New, 1=Learning, 2=Review, 3=Relearning`. The CONTEXT says "Tier 2+ counts as known", but state=3 (Relearning) maps to `tierFor()=2` while state=2 (Review) maps to `tierFor()=3`. So "known" = `tierFor(state) >= 2` means states 1, 2, and 3 (learning, review, relearning), NOT `state >= 2` in the raw DB column.

**Why it happens:** The raw FSRS state order is non-monotonic with respect to "how well the user knows this word" — state=1 (Learning) is newer than state=3 (Relearning), which is in turn below state=2 (Review).

**How to avoid:** The CONTEXT decision is **Tier 2+**. Translate this to SQL exactly once:
```sql
-- Known = state IN (1, 2, 3) i.e. "has any mastery data beyond New"
-- Mastered = state = 2
-- Learning = state IN (1, 3)
```
The saveSessionResults CTE (exercises.ts:291–295) already uses this exact pattern. Copy it.

**Warning signs:** A count that undercounts relearning words, or overcounts by including new cards.

### Pitfall 2: `vocab_global` contains duplicates per version_type

**What goes wrong:** A song can have both `tv` and `full` versions. Each maps the same vocabulary_items row via a separate row in `vocab_global`. A naïve `COUNT(*)` over `vocab_global` joined to user_vocab_mastery double-counts words that appear in both versions of the same song.

**Why it happens:** The materialized view's unique index is on `(vocab_item_id, song_id, version_type)` — by design, each version contributes its own row.

**How to avoid:** Always `SELECT DISTINCT vocab_item_id` (or `GROUP BY`) before joining. The existing `/api/exercises/jlpt-pool` route does this: `GROUP BY vi.id, ...`. Follow the precedent.

**Warning signs:** Global counter returns numbers that look suspiciously close to 2× reality on songs with multi-version lessons.

### Pitfall 3: `users` row may not exist yet

**What goes wrong:** `getUserPrefs()` seeds a `users` row on first read, but any new daily-limit counter queries that don't go through `getUserPrefs()` will see no row and skip the increment.

**Why it happens:** Phase 08.4 added the `users` table with on-demand insert-if-missing.

**How to avoid:** Either (a) call `getUserPrefs(userId)` before the daily counter logic runs, or (b) use an upsert (`INSERT ... ON CONFLICT DO UPDATE`) for the counter — same pattern as `saveSessionResults` uses for `userSongProgress`. Recommendation: (b), since it's a single statement.

**Warning signs:** New-card cap stops working after a day because the counter never increments.

### Pitfall 4: neon-http has no callback transactions

**What goes wrong:** You can't wrap review-session mutations in `db.transaction(async tx => { ... })` — the Neon HTTP driver doesn't support callback-form transactions (documented in `src/app/actions/exercises.ts:367`).

**Why it happens:** HTTP serverless driver is stateless; transaction mode requires `neon` WebSocket driver, which isn't installed.

**How to avoid:** Linearize writes. Order mutations by durability priority (FSRS mastery first, then exercise log, then daily counter). Accept the rare window where one succeeds and the next fails — same contract as `recordVocabAnswer` today.

**Warning signs:** A runtime error about "transaction not supported" or data inconsistency complaints.

### Pitfall 5: Dashboard queries without an index hit

**What goes wrong:** A "show all my mastered words grouped by tier" query without the right index scans the whole `user_vocab_mastery` table for any user with >1000 words.

**Why it happens:** `userVocabMastery` has `due_idx` on `(due)` and `user_due_idx` on `(user_id, due)` — great for "what's due" but not ideal for "all rows for this user ordered by state".

**How to avoid:** The `user_vocab_mastery_user_vocab_unique` UNIQUE constraint on `(user_id, vocab_item_id)` already covers user-scoped reads efficiently (every row is reachable via the user_id prefix). For the dashboard, `WHERE user_id = ? ORDER BY state DESC, due ASC` hits this index. Verify with `EXPLAIN ANALYZE` once the route is wired.

**Warning signs:** Dashboard page >2s latency on a user with hundreds of words.

### Pitfall 6: Refreshing `vocab_global` mid-review

**What goes wrong:** If an admin adds a new song while a user is mid-review-session, `refreshVocabGlobal()` may block writes for a few seconds. CONCURRENTLY refresh shouldn't block, but fallback mode (first run) does.

**Why it happens:** `refreshMaterializedView(...).concurrently()` falls back to blocking refresh if the view is empty or lacks the unique index.

**How to avoid:** Accept the risk — song adds are operator-gated, infrequent. Review queue can tolerate a 200–500ms hitch. Do NOT call `refreshVocabGlobal()` from /review flows at all; it's refresh-on-song-update only (see `queries.ts:224`).

**Warning signs:** Admin reports "site froze for a few seconds when I pushed a song update".

### Pitfall 7: Zombie `users.new_card_cap` vs `users.review_new_today`

**What goes wrong:** Phase 08.4 already uses `users.new_card_cap` for the per-song-session new-card limit. If /review adds a different daily cap, naming can collide (both are "new cards per X").

**Why it happens:** Two distinct caps with similar semantics — per-session (existing) vs per-day (new).

**How to avoid:** Name the new columns unambiguously: `review_new_today` (int counter), `review_new_today_date` (date). Make the per-day cap a constant in `src/lib/user-prefs.ts` alongside `DEFAULT_NEW_CARD_CAP` — e.g. `REVIEW_NEW_DAILY_CAP = 50`. Separate namespace, separate column, no confusion.

**Warning signs:** Reviewers asking "wait, is 10 per session or per day?" during code review.

## Code Examples

Verified patterns from existing code in this repo:

### Known-word count for a song (CROSS-01)

```typescript
// src/lib/db/queries.ts — NEW function
// Pattern source: src/app/actions/exercises.ts:277 (saveSessionResults step 8)
export async function getKnownWordCountForSong(
  userId: string,
  songId: string
): Promise<{ total: number; known: number; mastered: number; learning: number }> {
  const rows = await db.execute<{
    total: number;
    known: number;
    mastered: number;
    learning: number;
  }>(sql`
    WITH song_vocab AS (
      SELECT DISTINCT vg.vocab_item_id
      FROM vocab_global vg
      WHERE vg.song_id = ${songId}::uuid
    )
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE m.state IN (1, 2, 3))::int AS known,
      COUNT(*) FILTER (WHERE m.state = 2)::int AS mastered,
      COUNT(*) FILTER (WHERE m.state IN (1, 3))::int AS learning
    FROM song_vocab s
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = s.vocab_item_id
      AND m.user_id = ${userId}
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const r = raw[0];
  return {
    total: Number(r?.total ?? 0),
    known: Number(r?.known ?? 0),
    mastered: Number(r?.mastered ?? 0),
    learning: Number(r?.learning ?? 0),
  };
}
```

### Global learned counter (CROSS-03)

```typescript
// src/lib/db/queries.ts — NEW function
// "Learned" = Tier 2+ (state in 1,2,3). The count is per vocab_item_id, never per song.
export async function getGlobalLearnedCount(userId: string): Promise<number> {
  const rows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM user_vocab_mastery
    WHERE user_id = ${userId}
      AND state IN (1, 2, 3)
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  return Number(raw[0]?.count ?? 0);
}
```

### "Seen in songs" for a vocab item (CROSS-02)

```typescript
// src/lib/db/queries.ts — NEW function
// Returns [{ slug, title, anime }] deduped across version_types.
export async function getSeenInSongsForVocab(vocabItemId: string) {
  return db.execute<{ slug: string; title: string; anime: string }>(sql`
    SELECT DISTINCT s.slug, s.title, s.anime
    FROM vocab_global vg
    JOIN songs s ON s.id = vg.song_id
    WHERE vg.vocab_item_id = ${vocabItemId}::uuid
    ORDER BY s.title ASC
  `).then(r => Array.isArray(r) ? r : (r.rows ?? []));
}
```

Then extend `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` to include `seenInSongs` in the `MasteryDetail` response, and extend `MasteryDetailPopover.tsx` to render a collapsible list.

### Vocabulary dashboard query (CROSS-05)

```typescript
// src/lib/db/queries.ts — NEW function
// Returns one flat list; groupBy happens in the UI. Orders by state DESC then due ASC
// so Mastered/Review words come first, within each group "most urgent" (soonest due) first.
interface DashboardRow {
  vocab_item_id: string;
  dictionary_form: string;
  reading: string;
  romaji: string;
  meaning: unknown; // Localizable JSON
  part_of_speech: string;
  jlpt_level: string | null;
  state: 0 | 1 | 2 | 3;
  due: Date;
  reps: number;
  source_song_count: number;
}

export async function getVocabularyDashboard(
  userId: string,
  opts: {
    tierFilter?: 1 | 2 | 3;
    sourceSongId?: string;
    limit?: number;       // preview mode: free users get e.g. 20
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<DashboardRow[]> {
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;
  const tierClause = opts.tierFilter
    ? (opts.tierFilter === 1 ? sql`AND m.state = 0`
      : opts.tierFilter === 2 ? sql`AND m.state IN (1, 3)`
      : sql`AND m.state = 2`)
    : sql``;
  const songClause = opts.sourceSongId
    ? sql`AND EXISTS (
        SELECT 1 FROM vocab_global vg2
        WHERE vg2.vocab_item_id = m.vocab_item_id AND vg2.song_id = ${opts.sourceSongId}::uuid
      )`
    : sql``;
  const orderDir = opts.sortDirection === "asc" ? sql`ASC` : sql`DESC`;

  const rows = await db.execute<DashboardRow>(sql`
    SELECT
      m.vocab_item_id, vi.dictionary_form, vi.reading, vi.romaji,
      vi.meaning, vi.part_of_speech, vi.jlpt_level,
      m.state, m.due, m.reps,
      (SELECT COUNT(DISTINCT vg.song_id)::int
       FROM vocab_global vg WHERE vg.vocab_item_id = m.vocab_item_id) AS source_song_count
    FROM user_vocab_mastery m
    JOIN vocabulary_items vi ON vi.id = m.vocab_item_id
    WHERE m.user_id = ${userId}
      AND m.state IN (1, 2, 3)  -- Tier 2+ only (excludes pure-new cards)
      ${tierClause}
      ${songClause}
    ORDER BY m.state ${orderDir}, m.due ASC
    ${limitClause}
  `);
  return Array.isArray(rows) ? rows : (rows.rows ?? []);
}
```

### Review queue due + new cards (FREE-04)

```typescript
// src/lib/db/queries.ts — NEW function
// "Due" = user_vocab_mastery.due <= now() AND state IN (1, 2, 3).
// "New" = state = 0 (but bounded by the daily new-card cap, enforced in the server action).
// Fill-the-lyric is excluded by question-type at build time, not here.
export async function getDueReviewQueue(
  userId: string,
  newCardCap: number,
  now: Date = new Date()
) {
  // 1. Due cards (all of them, no cap per CONTEXT)
  const due = await db.execute<{ vocab_item_id: string; state: 0|1|2|3; due: Date }>(sql`
    SELECT m.vocab_item_id, m.state, m.due
    FROM user_vocab_mastery m
    WHERE m.user_id = ${userId}
      AND m.state IN (1, 2, 3)
      AND m.due <= ${now.toISOString()}::timestamptz
    ORDER BY m.due ASC
  `);

  // 2. New cards — vocab that the user has NEVER reviewed, capped at newCardCap.
  //    These come from vocab_global (any song) minus what they already have a row for.
  const newCards = await db.execute<{ vocab_item_id: string }>(sql`
    SELECT DISTINCT vg.vocab_item_id
    FROM vocab_global vg
    WHERE NOT EXISTS (
      SELECT 1 FROM user_vocab_mastery m
      WHERE m.user_id = ${userId} AND m.vocab_item_id = vg.vocab_item_id
    )
    ORDER BY vg.vocab_item_id
    LIMIT ${newCardCap}
  `);

  return {
    due: Array.isArray(due) ? due : (due.rows ?? []),
    new: Array.isArray(newCards) ? newCards : (newCards.rows ?? []),
  };
}
```

### Review session answer recorder (FSRS write path)

```typescript
// src/app/actions/review.ts — NEW server action
// Reuses recordVocabAnswer with songVersionId=null.
"use server";
import { recordVocabAnswer } from "@/app/actions/exercises";
import { isPremium } from "@/app/actions/userPrefs";
import type { ExerciseType } from "@/lib/exercises/generator";

export async function recordReviewAnswer(input: {
  userId: string;
  vocabItemId: string;
  exerciseType: Exclude<ExerciseType, "fill_lyric">;
  correct: boolean;
  revealedReading?: boolean;
  responseTimeMs: number;
}) {
  const premium = await isPremium(input.userId);
  if (!premium) throw new Error("premium_required");

  // Pass songVersionId=null — the column is already nullable for this exact case.
  return recordVocabAnswer({
    userId: input.userId,
    vocabItemId: input.vocabItemId,
    songVersionId: null,
    exerciseType: input.exerciseType,
    correct: input.correct,
    revealedReading: input.revealedReading,
    responseTimeMs: input.responseTimeMs,
  });
}
```

### Daily-new-card counter (tunable cap tracking)

```typescript
// src/app/actions/review.ts — NEW helper, called before handing out a "new" card.
// Atomic upsert with rollover.
export async function consumeNewCardBudget(
  userId: string,
  cap: number,
  today: string  // "YYYY-MM-DD" in server tz
): Promise<{ allowed: boolean; remaining: number }> {
  const rows = await db.execute<{ review_new_today: number }>(sql`
    INSERT INTO users (id, review_new_today, review_new_today_date)
    VALUES (${userId}, 1, ${today}::date)
    ON CONFLICT (id) DO UPDATE SET
      review_new_today = CASE
        WHEN users.review_new_today_date = ${today}::date AND users.review_new_today >= ${cap}
          THEN users.review_new_today  -- cap hit, don't increment
        WHEN users.review_new_today_date = ${today}::date
          THEN users.review_new_today + 1
        ELSE 1  -- new day, reset
      END,
      review_new_today_date = ${today}::date,
      updated_at = NOW()
    RETURNING review_new_today
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const count = Number(raw[0]?.review_new_today ?? 0);
  return { allowed: count <= cap, remaining: Math.max(0, cap - count) };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store vocab progress by surface text | UUID-keyed `vocabulary_items` + `user_vocab_mastery` | Phase 07 Data Foundation | CROSS-04 is automatic — no per-song duplication to reconcile |
| Derive cross-song facts via LATERAL joins every query | Materialized `vocab_global` view | Phase 07 | Sub-100ms queries; refreshed CONCURRENTLY on song update |
| Single new-card cap per-session only | Per-session cap + daily cap for /review (new in Phase 11) | Phase 11 (this phase) | Distinct namespaces prevent confusion; Phase 08.4's `new_card_cap` stays per-session |
| `checkExerciseAccess()` for gating | `isPremium()` single-source-of-truth | Phase 08.4 | Cleaner for non-exercise surfaces like /review and dashboard |
| searchParams synchronous | searchParams is `Promise<>` and must be `await`ed | Next 15 | Dashboard route must `await` or the TS compiler + runtime will error |

**Deprecated/outdated:**
- Nothing deprecated — all referenced primitives are current as of Phase 08.4 (shipped 2026-04).

## Open Questions

1. **Preview-dashboard cutoff: which 20 words?**
   - What we know: CONTEXT leaves this to Claude's discretion, defaulting to "most recently mastered".
   - What's unclear: "most recently" = `MAX(last_review)`? Or `last_review DESC` among state=2 only? Or highest-tier-first?
   - Recommendation: `ORDER BY m.state DESC, m.last_review DESC NULLS LAST LIMIT 20`. Surfaces mastery wins first, then shows learning progress. Revisit if UX feedback says otherwise.

2. **Daily-limit exact number: 50 new? 25 new? 10 new?**
   - What we know: CONTEXT says "50 new + all due" is the shape, not locked.
   - What's unclear: whether 50 is the right default for a mobile-first daily ritual.
   - Recommendation: start with `REVIEW_NEW_DAILY_CAP = 20` (matches Phase 08.4 per-session premium ceiling / 1.5). Easy to tune later with a single constant change.

3. **Header counter: badge vs inline text?**
   - What we know: CONTEXT grants discretion; existing header has only Songs/Profile links.
   - What's unclear: whether a numeric badge pushes the nav layout.
   - Recommendation: text link `"📚 {count} words"` next to Profile link — stays monospace-width and keeps the existing nav rhythm. Alternatively a small pill badge adjacent to Profile.

4. **Upsell modal: bespoke or reuse?**
   - What we know: no upsell modal currently exists. Sonner (toast library) is not yet installed.
   - What's unclear: whether to build a bespoke modal or defer to a future payments phase that owns it.
   - Recommendation: build a minimal bespoke modal for /review — plain Tailwind dialog, headline + two buttons (Upgrade / Close). No new dependency. Can be generalized later when Phase 10 Stripe flow lands.

5. **Fill-the-Lyric exclusion — enforced where?**
   - What we know: CONTEXT excludes it from the review queue.
   - What's unclear: whether the queue builder filters by type, or the question generator is just never called with `fill_lyric`.
   - Recommendation: queue builder (in `src/lib/review/queue-builder.ts`) only emits `vocab_meaning | meaning_vocab | reading_match` question types. Never reaches `buildQuestions` with `fill_lyric` as an option. Cleaner invariant.

## Sources

### Primary (HIGH confidence — verified against existing code)

- `src/lib/db/schema.ts` — `vocabulary_items`, `user_vocab_mastery`, `vocab_global` MV, `users`, `subscriptions` schemas verified verbatim
- `src/lib/db/queries.ts` — existing cross-song query patterns (getSongBySlug, getUserSongProgressBatch, refreshVocabGlobal)
- `src/app/actions/exercises.ts` — saveSessionResults step 8 CTE is the template; recordVocabAnswer supports `songVersionId: null` out of the box (line 334: "nullable — kana exercises have no song")
- `src/app/actions/userPrefs.ts` — `isPremium()` is the single source of truth for premium gating (lines 134–148)
- `src/lib/fsrs/tier.ts` — `tierFor(state)` mapping; state=1,2,3 → "known" per CONTEXT Tier 2+ decision
- `src/lib/fsrs/scheduler.ts`, `src/lib/fsrs/rating.ts` — existing primitives the /review engine composes against
- `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — API response contract to extend with `seenInSongs`
- `src/app/api/exercises/jlpt-pool/route.ts` — distractor pool reuse for /review
- `src/stores/exerciseSession.ts` — zustand + persist pattern to mirror for `reviewSession.ts`
- `.planning/phases/08.2-fsrs-progressive-disclosure/08.2-01-PLAN.md` — FSRS-locked decisions (Tier 2+ = known)
- `.planning/research/STACK.md` — Milestone 2 stack (ts-fsrs, Clerk, Stripe — none-beyond-ts-fsrs installed yet)

### Secondary (MEDIUM confidence — verified against Next 15 / ts-fsrs official docs)

- [Next.js App Router `page.js` file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/page) — `searchParams: Promise<...>` signature for Next 15 server components
- [Next.js `useSearchParams`](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — client-side searchParams access for filter controls
- [Next.js Dashboard tutorial: search + pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) — pattern for server-component filter/sort/pagination via searchParams
- [Managing advanced search param filtering (Aurora Scharff)](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) — debounce + router.push pattern
- [ts-fsrs issue #300 — daily review limits](https://github.com/open-spaced-repetition/ts-fsrs/issues/300) — confirms ts-fsrs has NO built-in daily-new-card cap; app must implement
- [ts-fsrs GitHub](https://github.com/open-spaced-repetition/ts-fsrs) — scheduler.next() is the only scheduling primitive; due filtering is app-side SQL

### Tertiary (LOW — used only to confirm ecosystem direction, not load-bearing)

- [Anki FSRS daily review limits discussion](https://forums.ankiweb.net/t/maximum-review-limit-using-fsrs-mode/66221) — corroborates that daily caps are always caller-implemented in FSRS ecosystems

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every primitive is already installed and used; zero new deps
- Data layer queries: HIGH — CTEs follow the exact pattern of `saveSessionResults` step 8 which is tested
- Architecture: HIGH — Phase 08.1/08.2/08.4 locked the gate, store, and FSRS patterns; this phase mirrors them
- Pitfalls: HIGH — pulled from observed behaviors in this repo (neon-http no-tx, state=3 collapse, MV duplicates)
- /review UX shape: MEDIUM — new surface, no prior art in repo; the session mechanics are clear but the landing/empty state copy is TBD
- Daily-cap counter design: MEDIUM — recommended column design is consistent with Phase 08.4 `users` evolution but has not been prototyped

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stable phase; no external dependencies changing)

Sources:
- [Next.js App Router page.js conventions](https://nextjs.org/docs/app/api-reference/file-conventions/page)
- [Next.js dashboard tutorial — search & pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)
- [ts-fsrs GitHub](https://github.com/open-spaced-repetition/ts-fsrs)
- [ts-fsrs issue #300 — daily review limits](https://github.com/open-spaced-repetition/ts-fsrs/issues/300)
- [Managing Advanced Search Param Filtering (Aurora Scharff)](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/)
