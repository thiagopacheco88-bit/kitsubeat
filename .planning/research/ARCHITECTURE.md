# Architecture Research

**Domain:** Exercise/learning system integration into existing KitsuBeat (Next.js 15 + Neon Postgres)
**Researched:** 2026-04-13
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER LAYER                                │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Song Player │  Exercise UI │ Kana Trainer │  Vocab Dashboard       │
│  (existing)  │  (new RSC +  │  (new RSC +  │  (new RSC)             │
│              │  client SPA) │  client SPA) │                        │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬─────────────────┘
       │              │              │              │
┌──────┴──────────────┴──────────────┴──────────────┴─────────────────┐
│                     NEXT.JS APP ROUTER (existing)                     │
├──────────────┬───────────────────────────┬────────────────────────────┤
│  Server      │  Route Handlers (new)      │  middleware.ts (new)       │
│  Components  │  /api/progress/*           │  - session check           │
│  (data fetch)│  /api/webhooks/stripe      │  - plan tier gating        │
│              │                            │  (reads JWT, no DB)        │
└──────┬───────┴──────────────┬────────────┴────────────────────────────┘
       │                      │
┌──────┴──────────────────────┴────────────────────────────────────────┐
│                        DATA LAYER                                     │
├───────────────┬──────────────┬──────────────┬──────────────────────── │
│  songs        │  song_       │  users +     │  vocab_global           │
│  (existing)   │  versions    │  user_       │  (materialized view     │
│               │  (existing)  │  progress +  │   — new, created via    │
│               │              │  kana_prog.  │   raw SQL migration)    │
│               │              │  (new tables)│                         │
├───────────────┴──────────────┴──────────────┴─────────────────────────┤
│                  Neon Postgres (serverless HTTP, existing)              │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Song Player (existing) | Playback sync, lyric display, token popups | React client components, PlayerContext — no changes |
| Exercise UI | Present questions, capture answers, update SRS state | Client SPA component tree, server actions for DB writes |
| Kana Trainer | Kana flashcard drills, character group selection, SRS | Client SPA; localStorage for anonymous users |
| Vocab Dashboard | Cross-song mastery view, due-for-review queue | RSC reading from vocab_global materialized view + user_progress JOIN |
| Auth Layer | Session management, JWT with plan tier encoded | Auth.js v5 (next-auth@beta) with Drizzle adapter |
| Progress API | Save exercise results, advance SRS schedule | Route handler at /api/progress, single-row upsert |
| Stripe Webhook | Sync subscription status to DB | Route handler at /api/webhooks/stripe, excluded from auth middleware |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── songs/[slug]/
│   │   ├── components/          # existing — VocabularySection gains SRS badge
│   │   └── exercises/           # NEW route: /songs/[slug]/exercises
│   │       └── page.tsx         # RSC shell; passes lesson + userProgress to client
│   ├── kana/                    # NEW route group
│   │   └── page.tsx
│   ├── vocabulary/              # NEW route group (premium)
│   │   └── page.tsx             # cross-song vocab dashboard
│   │   └── review/
│   │       └── page.tsx         # global SRS review session
│   ├── upgrade/                 # NEW — payment/upgrade page
│   │   └── page.tsx
│   └── api/
│       ├── progress/
│       │   └── route.ts         # POST: save SRS review result
│       └── webhooks/
│           └── stripe/
│               └── route.ts     # Stripe subscription sync
├── lib/
│   ├── db/
│   │   ├── schema.ts            # MODIFIED — add users, userProgress, kanaProgress
│   │   ├── queries.ts           # UNCHANGED — existing content queries
│   │   └── progress-queries.ts  # NEW — SRS queries, vocab_global reads
│   ├── exercises/
│   │   ├── generator.ts         # NEW — pure fn: Lesson JSONB → Exercise[]
│   │   └── srs.ts               # NEW — thin wrapper around ts-fsrs
│   ├── auth/
│   │   └── index.ts             # NEW — Auth.js v5 config
│   └── types/
│       ├── lesson.ts            # UNCHANGED
│       └── progress.ts          # NEW — UserCard, SRSState, ExerciseResult
├── middleware.ts                 # NEW — auth + plan gating (reads JWT only)
└── migrations/
    └── 0002_vocab_global.sql    # NEW — raw SQL for materialized view
```

### Structure Rationale

- **exercises/ route under songs/[slug]/:** Keeps exercise context coupled to the song it derives from. Navigation flows naturally: song → exercises.
- **lib/exercises/generator.ts:** Exercise generation is pure computation over lesson JSONB with no DB dependency. Lives in lib/ so both Server Components (first question set SSR) and client hooks can import it.
- **lib/exercises/srs.ts:** FSRS schedule math is pure TypeScript. Separation from DB queries keeps it testable in isolation.
- **progress-queries.ts separate from queries.ts:** Progress logic is conceptually distinct from content queries; avoids bloating the existing file.
- **migrations/0002_vocab_global.sql:** Drizzle Kit does not support materialized view DDL. The view is created via a raw migration file run alongside the normal schema push.

---

## Architectural Patterns

### Pattern 1: Client-Side Exercise Generation from Server-Fetched JSONB

**What:** The server fetches the song's lesson JSONB once (via the existing `getSongBySlug` query). The client receives the full lesson object and generates exercise questions deterministically in the browser using a pure function. No additional DB query, no pre-computation step.

**When to use:** All exercise question generation. The JSONB already contains `surface`, `reading`, `romaji`, `meaning`, `jlpt_level`, `grammar` per token and vocab entry.

**Trade-offs:** Eliminates a pre-computation pipeline and round-trip. Questions generate in <5ms for ~20-50 vocab items. Distractors are sampled from the same in-memory vocab array. The downside is that exercise sets cannot be pre-seeded — they only exist for songs a user has opened.

**Example:**
```typescript
// lib/exercises/generator.ts — pure, no DB
export function generateVocabExercises(
  vocab: VocabEntry[],
  userMastery: Map<string, SRSState>
): Exercise[] {
  return vocab.map(entry => ({
    id: `${entry.surface}::${entry.reading}`,
    type: "meaning-recall",
    prompt: entry.surface,
    answer: localize(entry.meaning, "en"),
    distractors: sampleDistractors(vocab, entry, 3),
    srsState: userMastery.get(`${entry.surface}::${entry.reading}`) ?? newCard(),
  }));
}
```

---

### Pattern 2: Server-Authoritative SRS State, Client-Side Schedule Computation

**What:** The DB owns the canonical SRS state (difficulty, stability, due date) per (user_id, vocab_key). The Server Component fetches the current state for a song's vocab keys. The user rates their recall (Again / Hard / Good / Easy). The `ts-fsrs` library runs client-side to compute the next schedule. The result is POSTed to `/api/progress` as a single-row upsert.

**When to use:** All SRS scheduling for authenticated users. For anonymous users, state lives in `localStorage` until account creation, then migrated server-side.

**Trade-offs:** Running FSRS client-side keeps the review loop latency-free (no mid-session DB reads). Each review is a single-row upsert — well within Neon HTTP driver's non-interactive transaction support. The server always wins on conflicts (last-write wins is acceptable for SRS).

**Example:**
```typescript
// Client component — after user rates a card
import { fsrs, createEmptyCard, Rating } from "ts-fsrs";

const f = fsrs();
const scheduling = f.repeat(card.srsState, new Date());
const nextState = scheduling[rating].card;

// Single HTTP call to persist
await fetch("/api/progress", {
  method: "POST",
  body: JSON.stringify({ vocabKey: card.id, nextState }),
});
```

```typescript
// /api/progress/route.ts
await db.insert(userProgress)
  .values({ userId, vocabKey, ...nextState })
  .onConflictDoUpdate({
    target: [userProgress.userId, userProgress.vocabKey],
    set: { ...nextState, updated_at: new Date() }
  });
```

---

### Pattern 3: Middleware-Based Plan Gating (Not Component-Level)

**What:** Route protection happens entirely in `middleware.ts`. Auth checks block unauthenticated access to `/exercises/*`, `/vocabulary/*`, `/kana/*`. Plan-tier checks redirect free users from premium routes. Middleware reads only the JWT — no DB call.

**When to use:** Any route that must be completely inaccessible (not just visually disabled). The user's plan tier is encoded in the JWT at sign-in via Auth.js `jwt()` callback by reading `users.plan` from the DB.

**Trade-offs:** JWT-encoded plan means a downgrade takes effect only at next session refresh (acceptable for a learning app). Stripe webhook updates `users.plan` in DB; next login reissues the JWT with the correct plan. This is the standard Next.js pattern for subscription gating without Edge DB access.

**Example:**
```typescript
// middleware.ts
import { auth } from "@/lib/auth";
export default auth((req) => {
  const premiumRoutes = ["/vocabulary", "/vocabulary/review"];
  const isPremium = premiumRoutes.some(r => req.nextUrl.pathname.startsWith(r));
  
  if (isPremium && req.auth?.user?.plan !== "premium") {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }
});

export const config = {
  matcher: ["/exercises/:path*", "/vocabulary/:path*", "/kana/:path*"],
};
```

---

### Pattern 4: Materialized View for Cross-Song Vocabulary Index

**What:** A PostgreSQL materialized view (`vocab_global`) aggregates all vocab entries from all `song_versions.lesson` JSONB columns, deduplicating by `(surface, reading)` and collecting song_id references. Drizzle reads from it via raw SQL. Refreshed as part of the seeding pipeline.

**When to use:** The cross-song vocabulary dashboard, "words appearing in X songs" display, and global vocab search. Data changes only when new songs are seeded (rare), so stale-by-refresh is acceptable.

**Trade-offs:** Simpler than maintaining a separate normalized `vocabulary` table with FK rows per song. No application-side sync logic — refresh is a single SQL command in the pipeline. The tradeoff is Drizzle does not manage the DDL, so it lives in a separate migration file.

**Example:**
```sql
-- migrations/0002_vocab_global.sql
CREATE MATERIALIZED VIEW vocab_global AS
SELECT
  v->>'surface'                  AS surface,
  v->>'reading'                  AS reading,
  v->>'romaji'                   AS romaji,
  v->>'jlpt_level'               AS jlpt_level,
  jsonb_agg(DISTINCT sv.song_id) AS song_ids,
  count(DISTINCT sv.song_id)     AS song_count
FROM song_versions sv,
     jsonb_array_elements(sv.lesson->'vocabulary') AS v
WHERE sv.lesson IS NOT NULL
GROUP BY v->>'surface', v->>'reading', v->>'romaji', v->>'jlpt_level';

-- Required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX ON vocab_global (surface, reading);
CREATE INDEX ON vocab_global (jlpt_level);
```

---

## Database Schema Design

### New Tables (extend schema.ts)

```typescript
// Users table — populated by Auth.js Drizzle adapter
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  image: text("image"),
  plan: text("plan").default("free").notNull(),       // "free" | "premium"
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Per-user SRS state — one row per (user, vocab_key)
// vocab_key = `${surface}::${reading}` — stable, derived from JSONB
export const userProgress = pgTable("user_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vocab_key: text("vocab_key").notNull(),  // `${surface}::${reading}`
  // FSRS v5 fields
  due: timestamp("due", { withTimezone: true }).notNull(),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  elapsed_days: integer("elapsed_days").notNull().default(0),
  scheduled_days: integer("scheduled_days").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  state: text("state").notNull().default("New"), // New | Learning | Review | Relearning
  last_review: timestamp("last_review", { withTimezone: true }),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  user_vocab_idx: uniqueIndex("user_progress_user_vocab_idx").on(table.user_id, table.vocab_key),
  due_idx: index("user_progress_due_idx").on(table.user_id, table.due),
}));

// Per-user kana mastery — one row per (user, kana character)
export const kanaProgress = pgTable("kana_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kana: text("kana").notNull(),        // the character e.g. "あ"
  script: text("script").notNull(),    // "hiragana" | "katakana"
  // Same FSRS fields
  due: timestamp("due", { withTimezone: true }).notNull(),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  state: text("state").notNull().default("New"),
  last_review: timestamp("last_review", { withTimezone: true }),
}, (table) => ({
  user_kana_idx: uniqueIndex("kana_progress_user_kana_idx").on(table.user_id, table.kana),
}));
```

### Key Schema Decisions

- **vocab_key as string composite** (`surface::reading`) rather than a FK to a vocabulary table: Avoids the migration complexity of normalizing all JSONB vocab. The key is stable because it derives from the canonical Japanese identifiers in the JSONB. Progress rows can be written before any vocabulary normalization exists.
- **FSRS fields as individual columns**, not JSONB blob: The `due` column needs a standard index for the "cards due today" query. JSONB would require a functional index and more complex Drizzle queries.
- **No song_id FK on user_progress**: Progress is per vocab item globally. The same word appearing in two songs shares one progress row. This is the desired behavior for cross-song mastery tracking.

---

## Data Flow

### Exercise Session Flow

```
User opens /songs/[slug]/exercises
    ↓
Server Component (page.tsx):
  1. getSongBySlug(slug) — existing query, no change
  2. getUserProgressForSong(userId, vocabKeys) — new query
     SELECT * FROM user_progress WHERE user_id = $1 AND vocab_key = ANY($2)
    ↓
Props passed to <ExerciseSession> client component:
  { lesson: Lesson, userProgress: Record<string, SRSState> }
    ↓
generator.ts builds Exercise[] from lesson.vocabulary + existing SRS states
(pure computation, <5ms, no network)
    ↓
User answers each question (client-side only)
    ↓
ts-fsrs computes next schedule client-side (no network)
    ↓
POST /api/progress { vocabKey, nextSrsState, rating }
    ↓
Server upserts user_progress row (single-row, Neon HTTP-safe)
    ↓
Client updates local state optimistically
```

### Cross-Song Vocabulary Dashboard Flow

```
User opens /vocabulary (premium route — already checked by middleware)
    ↓
Server Component queries:
  SELECT vg.*, up.state, up.due
  FROM vocab_global vg
  LEFT JOIN user_progress up ON up.vocab_key = vg.surface || '::' || vg.reading
    AND up.user_id = $userId
  ORDER BY up.due ASC NULLS LAST
    ↓
Rendered as server-side HTML table/grid
    ↓
"Review due items" → /vocabulary/review
    ↓
/vocabulary/review: same ExerciseSession component
  seeded from global due-for-review items, not a single song
```

### Auth + Plan Gating Flow

```
User requests /vocabulary (premium route)
    ↓
middleware.ts (Edge runtime, reads JWT only — no DB)
    ↓
session.user.plan === "free" → redirect /upgrade
    ↓
User subscribes → Stripe webhook fires → POST /api/webhooks/stripe
    ↓
Route handler updates: users SET plan = 'premium' WHERE stripe_customer_id = $id
    ↓
User signs out + signs in → Auth.js jwt() callback reads users.plan from DB
    → encodes plan: "premium" in JWT
    ↓
middleware.ts reads plan from JWT → allows /vocabulary
```

### Kana Trainer Anonymous → Auth Migration Flow

```
Anonymous user opens /kana
    ↓
No DB query — 46 hiragana + 46 katakana are static data
Exercise state → localStorage key "kana_progress"
    ↓
User creates account
    ↓
On first authenticated load of /kana:
  client reads localStorage, POSTs to /api/kana/migrate
  server writes kanaProgress rows from the localStorage payload
  localStorage cleared
```

---

## Integration Points with Existing Code

### Component Change Summary

| File | Action | What Changes |
|------|--------|--------------|
| `src/lib/db/schema.ts` | Modify | Add `users`, `userProgress`, `kanaProgress` tables + Auth.js tables |
| `src/lib/db/queries.ts` | No change | All existing queries remain intact |
| `src/lib/db/progress-queries.ts` | New | getUserProgressForSong, getDueCards, upsertProgress |
| `src/lib/types/lesson.ts` | No change | Existing types consumed as-is by exercise generator |
| `src/app/songs/[slug]/page.tsx` | Modify | Fetch userProgress for song vocab keys; pass to SongContent |
| `src/app/songs/[slug]/components/SongContent.tsx` | Modify | Accept exerciseData prop; add Exercise tab alongside Vocabulary tab |
| `src/app/songs/[slug]/components/VocabularySection.tsx` | Modify | Accept mastery map; render SRS state badge per vocab entry |
| `src/app/songs/[slug]/components/PlayerContext.tsx` | No change | Untouched |
| `src/app/layout.tsx` | Modify | Add SessionProvider; add Vocab/Kana nav links |
| `middleware.ts` | New | Auth check + plan gating; matcher covers /exercises, /vocabulary, /kana |
| `src/lib/auth/index.ts` | New | Auth.js v5 config (Drizzle adapter, JWT callback encodes plan) |
| `src/lib/exercises/generator.ts` | New | Pure fn: VocabEntry[] + SRS map → Exercise[] |
| `src/lib/exercises/srs.ts` | New | Thin wrapper: ts-fsrs createEmptyCard, fsrs().repeat() |
| `src/app/songs/[slug]/exercises/page.tsx` | New | RSC shell for exercise session |
| `src/app/kana/page.tsx` | New | Kana trainer (static chars + localStorage SRS) |
| `src/app/vocabulary/page.tsx` | New | Cross-song vocab dashboard (premium) |
| `src/app/api/progress/route.ts` | New | POST: upsert user_progress row |
| `src/app/api/webhooks/stripe/route.ts` | New | Stripe subscription sync |
| `migrations/0002_vocab_global.sql` | New | Raw SQL: CREATE MATERIALIZED VIEW vocab_global |

### Neon HTTP Driver Constraint

The existing codebase uses `drizzle-orm/neon-http`, which supports non-interactive (batch) transactions only — no interactive multi-statement transactions. All new writes are single-row upserts; none require interactive transactions. If a future feature requires atomic multi-row operations, switch only that endpoint to the WebSocket driver (`@neondatabase/serverless` with `drizzle-orm/neon-serverless`) while keeping all other routes on HTTP.

---

## Suggested Build Order

Dependencies create the following natural sequence:

1. **Auth layer** (users table + Auth.js v5 + middleware): Everything gated or user-specific depends on this. Build it first with no features behind it — just sign in/out working.

2. **Database schema additions** (userProgress, kanaProgress tables + drizzle-kit generate/push): Required before any progress writes. Migrations are fast to run but must precede exercise work.

3. **vocab_global materialized view** (raw SQL migration + refresh hook in seeding pipeline): Enables the cross-song dashboard. Can be built in parallel with auth.

4. **Exercise generator + ts-fsrs wrapper** (pure TypeScript, no DB): lib/exercises/*.ts can be written and unit-tested with no server dependency. Build this before any UI that depends on it.

5. **Per-song exercise session** (/songs/[slug]/exercises page + ExerciseSession component + /api/progress route): First user-facing exercise feature. Depends on auth (1), schema (2), and generator (4).

6. **Kana trainer** (/kana page): Simpler than exercises — no server state for anonymous users. Depends on auth for the migration endpoint only.

7. **Cross-song vocabulary dashboard** (/vocabulary, /vocabulary/review pages): Depends on vocab_global (3), exercise session pattern (5), and premium gating in middleware (1).

8. **Stripe integration** (upgrade page + /api/webhooks/stripe): Depends on users table (2) and auth (1). Build last to avoid payment complexity blocking feature development.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current approach is sufficient; no additional caching needed |
| 1k-10k users | Add `REFRESH MATERIALIZED VIEW CONCURRENTLY vocab_global` to a cron job. Cache due-card count per user in Upstash Redis for nav badge (avoid per-request DB hit) |
| 10k-100k users | Partition `user_progress` by `user_id` hash range. Read replica for vocab dashboard queries. Ensure covering indexes exist on `(user_id, due)` |
| 100k+ users | Queue SRS write path via Vercel Queue or Upstash QStash to handle burst review traffic without overwhelming Neon's connection pool |

### Scaling Priorities

1. **First bottleneck:** `user_progress` table growing to millions of rows. Mitigation: composite unique index on `(user_id, vocab_key)` and separate index on `(user_id, due)` from day one — included in schema above.
2. **Second bottleneck:** `vocab_global` refresh blocking concurrent reads. Mitigation: use `REFRESH MATERIALIZED VIEW CONCURRENTLY` which requires the unique index (already specified).

---

## Anti-Patterns

### Anti-Pattern 1: Storing SRS State in JSONB or Session Cookies

**What people do:** Add a `user_progress JSONB` column to the users table or store SRS cards in session cookies as a blob.

**Why it's wrong:** JSONB cannot be efficiently indexed by `due` date. "Cards due today" becomes a full table scan. No conflict resolution on concurrent writes across devices. Cookies have size limits.

**Do this instead:** One row per (user_id, vocab_key) in a dedicated `user_progress` table with a typed `due timestamp` column and a composite index.

---

### Anti-Pattern 2: Pre-Computing All Exercise Questions Server-Side

**What people do:** Add a pipeline step to generate all possible exercises and store them as DB rows before any user visits.

**Why it's wrong:** Overkill for content that is already fully machine-readable JSONB. Adds pipeline complexity, storage cost, and a new table to maintain. Questions break if the lesson JSONB is corrected.

**Do this instead:** Generate exercises client-side from the lesson JSONB at session start. The generation is O(n) over ~20-50 vocab items — imperceptible latency. Distractors are sampled from the same in-memory vocab array.

---

### Anti-Pattern 3: Component-Level Plan Checks as the Only Gate

**What people do:** Render premium content but wrap it in `if (user.plan !== 'premium') return <UpgradePrompt />`.

**Why it's wrong:** Server Components still run their data queries. The premium data may appear in page source. Route protection is fragmented across many files and easy to miss.

**Do this instead:** Block at `middleware.ts` for full pages. The route handler for `/api/progress` must also verify the user's plan for premium-gated exercise types. Component-level checks are acceptable only for UI teasing (showing a lock icon on a locked feature), not for data security.

---

### Anti-Pattern 4: Normalizing All Vocab into Relational Tables as a Prerequisite

**What people do:** Refactor lesson JSONB into `vocabulary`, `tokens`, and `grammar_points` tables before building any exercise features, treating normalization as required scaffolding.

**Why it's wrong:** The JSONB model is working and efficient for current use. A normalization migration is high-effort with risk of data loss. Exercise generation does not require normalized tables — it reads from the already-fetched lesson object.

**Do this instead:** Keep JSONB. Use the `vocab_global` materialized view for cross-song aggregation. Use string composite keys for progress FK. Normalize only if you hit a concrete limitation that the materialized view cannot solve.

---

## External Service Integration

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Auth.js v5 (`next-auth@beta`) | Database adapter using Drizzle; JWT `jwt()` callback encodes `users.plan` | Use `@auth/drizzle-adapter`. Plan in JWT avoids per-request DB read in Edge middleware. Social OAuth (Google/GitHub) requires no extra tables |
| ts-fsrs (npm) | Client-side import only; pure computation, no server dependency | v6 preferred; ~13KB gzipped. Run schedule computation in the browser after each user rating |
| Stripe | Embedded Checkout for subscription; webhook at `/api/webhooks/stripe` syncs plan to DB | Exclude `/api/webhooks/stripe` from auth middleware matcher. Store `stripe_customer_id` on users table for customer portal access |

---

## Sources

- Drizzle + Neon HTTP driver docs: https://orm.drizzle.team/docs/connect-neon — HIGH confidence
- Neon HTTP driver transaction limitations: https://github.com/neondatabase/serverless/issues/31 — HIGH confidence
- ts-fsrs TypeScript FSRS implementation: https://github.com/open-spaced-repetition/ts-fsrs — HIGH confidence
- FSRS algorithm overview: https://open-spaced-repetition.github.io/ts-fsrs/ — HIGH confidence
- Auth.js v5 migration guide: https://authjs.dev/getting-started/migrating-to-v5 — HIGH confidence
- Stripe + Next.js 15 App Router integration: https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/ — MEDIUM confidence
- PostgreSQL materialized view indexing: https://www.crunchydata.com/blog/indexing-materialized-views-in-postgres — HIGH confidence
- Neon Postgres serverless driver docs: https://neon.com/docs/serverless/serverless-driver — HIGH confidence

---

*Architecture research for: KitsuBeat exercise/learning system integration*
*Researched: 2026-04-13*
