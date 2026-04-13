# Architecture Research

**Domain:** Music-based language learning web app (KitsuBeat)
**Researched:** 2026-04-06
**Confidence:** MEDIUM-HIGH

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                        │
├───────────────────┬─────────────────────┬───────────────────────────┤
│   Player Page     │   Library / Search  │   Account / Settings      │
│  ┌─────────────┐  │  ┌───────────────┐  │  ┌─────────────────────┐  │
│  │ YouTube     │  │  │ AI Search     │  │  │ Auth / Profile      │  │
│  │ iframe      │  │  │ Chatbox       │  │  │ Subscription Status │  │
│  │ (Client     │  │  │ (Client Comp) │  │  │ (Server + Client)   │  │
│  │ Component)  │  │  └───────────────┘  │  └─────────────────────┘  │
│  ├─────────────┤  │                     │                            │
│  │ Lyric Sync  │  │                     │                            │
│  │ Engine      │  │                     │                            │
│  │ (Client     │  │                     │                            │
│  │ Component)  │  │                     │                            │
│  ├─────────────┤  │                     │                            │
│  │ Lyric       │  │                     │                            │
│  │ Display     │  │                     │                            │
│  │ (Client     │  │                     │                            │
│  │ Component)  │  │                     │                            │
│  └─────────────┘  │                     │                            │
├───────────────────┴─────────────────────┴───────────────────────────┤
│                      NEXT.JS APP ROUTER                              │
│   Server Components (page data)  +  Route Handlers (API endpoints)  │
├───────────────────┬─────────────────────┬───────────────────────────┤
│   Song API        │   Search API        │   Auth / User API         │
│   /api/songs/     │   /api/search/      │   (Supabase Auth)         │
│   [slug]          │   semantic          │                            │
├───────────────────┴─────────────────────┴───────────────────────────┤
│                         SUPABASE (Postgres + Auth + RLS)             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ songs        │  │ lyrics       │  │ embeddings │  │ users     │  │
│  │ (metadata)   │  │ (timed JSON) │  │ (pgvector) │  │ (plans)   │  │
│  └──────────────┘  └──────────────┘  └────────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                 OFFLINE / BUILD-TIME PIPELINE                        │
│   Claude API → Content Generator → Supabase Insert + Embed          │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| YouTube iframe (Client) | Video playback; exposes `getCurrentTime()` and `onStateChange` events | Lyric Sync Engine via ref/callback |
| Lyric Sync Engine (Client) | Polls `getCurrentTime()` at ~250ms interval; maps timestamp → active lyric verse index | YouTube iframe ref, Lyric Display |
| Lyric Display (Client) | Renders active verse with furigana `<ruby>` markup, color-coded grammar, translations | Lyric Sync Engine (receives active index) |
| AI Search Chatbox (Client) | Takes natural-language user query; calls `/api/search/semantic`; renders matched song cards | Search API Route Handler |
| Search API Route Handler (Server) | Embeds user query via OpenAI; runs pgvector similarity search in Supabase | OpenAI Embeddings API, Supabase |
| Song Page (Server Component) | Fetches static song + lyrics from Supabase at request time; passes to client components | Supabase, Lyric Display, YouTube iframe |
| Auth Middleware (Next.js) | Protects premium routes; checks Supabase session; redirects to upgrade if plan = free | Supabase Auth, User table |
| Content Generation Pipeline (CLI/script) | Calls Claude API to generate vocabulary breakdowns, grammar annotations, translations; inserts into Supabase; generates and stores embeddings | Claude API, OpenAI Embeddings, Supabase |

---

## Recommended Project Structure

```
kitsubeat/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Public pages (landing, pricing)
│   │   └── page.tsx
│   ├── (app)/                    # Authenticated app shell
│   │   ├── layout.tsx            # Auth check, session provider
│   │   ├── library/              # Song library + search
│   │   │   └── page.tsx          # Server Component — fetches song list
│   │   └── songs/
│   │       └── [slug]/
│   │           └── page.tsx      # Server Component — fetches lesson data
│   ├── api/
│   │   ├── search/
│   │   │   └── semantic/route.ts # Embedding + pgvector similarity search
│   │   └── user/
│   │       └── subscription/route.ts
│   └── layout.tsx
├── components/
│   ├── player/
│   │   ├── YouTubePlayer.tsx     # Client Component — iframe API wrapper
│   │   ├── LyricSyncEngine.tsx   # Client Component — polling + active index
│   │   └── LyricDisplay.tsx      # Client Component — renders verse with ruby
│   ├── lyrics/
│   │   ├── FuriganaText.tsx      # Renders <ruby> markup from structured data
│   │   ├── GrammarTag.tsx        # Color-coded grammar label
│   │   └── VocabCard.tsx         # Inline vocabulary breakdown tooltip
│   ├── search/
│   │   └── AIChatbox.tsx         # Client Component — semantic search UI
│   └── ui/                       # Shared buttons, cards, layout primitives
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client (cookies)
│   │   └── types.ts              # Generated Supabase types
│   ├── youtube/
│   │   └── useYouTubeSync.ts     # Hook: player ref + polling + active verse
│   └── auth/
│       └── middleware.ts         # Route protection + plan checks
├── scripts/
│   └── generate-lesson/
│       ├── index.ts              # CLI entry: process song list
│       ├── claude-prompt.ts      # Claude API prompt builder
│       ├── embed.ts              # OpenAI embedding generator
│       └── insert.ts             # Supabase upsert logic
├── types/
│   ├── song.ts                   # Song + lesson data types
│   └── lyrics.ts                 # Timed lyric line / token types
└── supabase/
    └── migrations/               # SQL migrations for schema
```

### Structure Rationale

- **`app/(marketing)` vs `app/(app)`:** Route groups separate public pages (no auth) from the authenticated app shell. The `(app)` group applies a layout with session checks once, not per-page.
- **`components/player/`:** The YouTube iframe, sync engine, and lyric display are grouped because they share state via a single `useYouTubeSync` hook. They are all Client Components because they depend on browser APIs and real-time polling.
- **`components/lyrics/`:** Presentational components for furigana, grammar, vocabulary — no side effects, can be used in both the player page and static previews.
- **`lib/youtube/useYouTubeSync.ts`:** Centralizes all polling logic. Other components only consume the `activeVerseIndex` it emits — they never touch `getCurrentTime()` directly.
- **`scripts/generate-lesson/`:** Entirely separate from the app runtime. This pipeline runs offline (locally or in CI) to populate the database. Keeping it outside `app/` prevents accidental exposure.
- **`supabase/migrations/`:** Schema-as-code prevents drift between environments. Required when you have complex RLS policies.

---

## Architectural Patterns

### Pattern 1: Polling-Based Lyric Sync via Interval

**What:** A `useEffect` sets up a `setInterval` at ~250ms that calls `player.getCurrentTime()` and computes which lyric verse is active by binary searching the timed lyrics array.

**When to use:** YouTube iframe API does not emit time-update events. Polling is the only supported approach for time-based sync. 250ms gives sub-quarter-second accuracy — sufficient for verse-level (not word-level) sync.

**Trade-offs:** Small CPU cost from constant polling; acceptable because it only runs when video is playing. Pause `onStateChange` to stop the interval when the video is not in state `PLAYING`.

```typescript
// lib/youtube/useYouTubeSync.ts
export function useYouTubeSync(player: YT.Player | null, verses: TimedVerse[]) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      const state = player.getPlayerState();
      if (state !== YT.PlayerState.PLAYING) return;

      const t = player.getCurrentTime();
      const idx = verses.findLastIndex(v => v.startTime <= t);
      setActiveIndex(Math.max(0, idx));
    }, 250);

    return () => clearInterval(interval);
  }, [player, verses]);

  return activeIndex;
}
```

**Source confidence:** HIGH — pattern confirmed by official YouTube IFrame API docs + multiple React integration examples.

---

### Pattern 2: Pre-Generated Content as Structured JSON in Postgres

**What:** Run the Claude API pipeline offline (not at request time). Store the full structured lesson object (verses, tokens, furigana, translations, grammar tags, vocabulary) as a JSONB column in Postgres alongside normalized relational fields for querying.

**When to use:** With 200 songs and content that changes rarely, there is no reason to call Claude at request time. Pre-generation gives instant page loads, predictable costs, and zero AI latency in the user path.

**Trade-offs:** Requires a re-run pipeline when content needs updating. JSONB avoids over-normalizing a complex nested structure that is read-only after generation.

```sql
-- songs table
CREATE TABLE songs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,        -- URL-safe identifier
  title       text NOT NULL,
  artist      text NOT NULL,
  anime       text,
  youtube_id  text NOT NULL,               -- The YouTube video ID
  tier        text NOT NULL DEFAULT 'free', -- 'free' | 'premium'
  lesson      jsonb NOT NULL,              -- Full pre-generated lesson blob
  embedding   vector(1536),               -- For pgvector search
  created_at  timestamptz DEFAULT now()
);

-- Index for fast vector similarity search
CREATE INDEX songs_embedding_idx ON songs
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

### Pattern 3: pgvector Semantic Search via Route Handler

**What:** AI chatbox POSTs the user's natural-language query to `/api/search/semantic`. The route handler embeds the query using the same model used at index time (text-embedding-3-small), then runs a Supabase RPC `match_songs` function that uses pgvector cosine similarity. Returns the top-N songs ranked by similarity.

**When to use:** User wants to search by feel ("sad anime song about leaving home") not exact keywords. With only 200 songs, exact-keyword search would be too brittle.

**Trade-offs:** Requires one OpenAI embedding API call per search (~$0.00002 per call — negligible). Embedding quality determines search quality; use the same model for indexing and querying.

```sql
-- Supabase RPC for similarity search
CREATE OR REPLACE FUNCTION match_songs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (id uuid, title text, artist text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, title, artist, 1 - (embedding <=> query_embedding) AS similarity
  FROM songs
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

---

### Pattern 4: Freemium Gating via Supabase RLS + Middleware

**What:** Each user has a `plan` field (`free` | `premium`) in a `user_profiles` table. Songs have a `tier` field. RLS policies on the `songs` table expose all metadata but gate the `lesson` JSONB column for premium songs. Next.js middleware checks the session before rendering `/songs/[slug]` for premium content.

**When to use:** This is simpler and more secure than application-level checks. The database refuses to return premium lesson data for free users — there is no way to accidentally expose it from a missed API check.

**Trade-offs:** RLS adds query complexity; test policies carefully in Supabase Studio before deploying.

```sql
-- RLS policy: premium lesson content
CREATE POLICY "lesson_access" ON songs
  AS RESTRICTIVE
  USING (
    tier = 'free'  -- Free songs: always accessible
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.plan = 'premium'
    )
  );
```

---

## Data Flow

### Song Player Page Load

```
Browser requests /songs/[slug]
    ↓
Next.js Server Component
    ↓ Supabase server client (service role or user session)
Postgres: SELECT song + lesson WHERE slug = ?
    ↓ (RLS filters lesson if user is free-tier and song is premium)
Server Component renders HTML shell + passes lesson JSON to Client Components
    ↓
Client hydrates:
  - YouTubePlayer (loads iframe, waits for onReady)
  - LyricDisplay (receives pre-rendered verse array)
    ↓
useYouTubeSync hook starts 250ms polling interval
    ↓
activeVerseIndex updates → LyricDisplay re-renders active verse
```

### AI Song Search

```
User types query in AIChatbox
    ↓
POST /api/search/semantic { query: "..." }
    ↓
Route Handler: OpenAI text-embedding-3-small(query) → vector[1536]
    ↓
Supabase RPC match_songs(vector) → ranked song list
    ↓
Response: [{ id, title, artist, similarity }]
    ↓
AIChatbox renders song cards
```

### Content Generation Pipeline (offline)

```
scripts/generate-lesson/index.ts reads song manifest CSV
    ↓
For each song:
  Claude API (claude-3-5-sonnet) → structured lesson JSON
    (verses, tokens, furigana, translations, grammar_tags, vocab)
    ↓
  OpenAI text-embedding-3-small(title + artist + anime + themes) → vector
    ↓
  Supabase upsert: songs table (lesson JSONB + embedding)
```

### Auth + Freemium Check

```
User navigates to /songs/[slug]
    ↓
Next.js Middleware checks Supabase session cookie
  - No session → redirect /login
  - Has session → continue
    ↓
Server Component fetches lesson
  - RLS: if song.tier = 'premium' AND user.plan = 'free' → lesson = null
    ↓
Client Component: if lesson = null → render upgrade CTA, not player
```

---

## Suggested Build Order

The component dependencies create a natural build order:

1. **Database schema + migrations** — Everything depends on this. Define `songs`, `lyrics` (timed JSON structure), `user_profiles`, and `embeddings` tables with RLS policies before any app code.

2. **Content generation pipeline** — Before building the player UI, you need real lesson data in the database. Build the CLI script first, run it on 5-10 songs, and use that data to drive UI development. This also validates your data model before it gets used everywhere.

3. **Song page + static lyric display** — Build the Server Component page that fetches and renders a lesson. No sync, no YouTube yet — just verify the data model renders correctly as HTML with furigana.

4. **YouTube iframe integration + sync engine** — Add the player and wire up `useYouTubeSync`. This is the highest-risk component (browser API, cross-origin iframe) so isolate it. Test on multiple browsers.

5. **Auth + freemium gating** — Add Supabase Auth, user profiles, and RLS policies. Implement middleware. At this point the app is functional but unprotected.

6. **AI search chatbox** — Add semantic search route handler and UI. Depends on embeddings being populated (from step 2) and auth (from step 5) for rate-limiting.

7. **Payments (Stripe)** — Wire Stripe to flip `user_profiles.plan`. Depends on auth working correctly.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| YouTube iframe API | Browser-loaded script (`youtube.com/iframe_api`), instantiated via `YT.Player` constructor in a `useEffect` | No API key required for basic embedding. Must handle `onReady` before calling any methods. Cross-origin restrictions limit some event access. |
| Claude API (Anthropic) | Called only in offline pipeline script, never from browser or request path | Use `claude-3-5-sonnet` for structured output (tool_use / JSON mode). Batch song generation in series to manage rate limits. |
| OpenAI Embeddings API | Called in offline pipeline (indexing) and in `/api/search/semantic` route handler (query time) | Use `text-embedding-3-small` consistently for both. Dimension: 1536. Cost is negligible at 200 songs. |
| Supabase Auth | Supabase SSR client with cookie-based sessions; Next.js middleware validates session on each request | Use `@supabase/ssr` package (not deprecated `@supabase/auth-helpers-nextjs`). |
| Stripe | Webhook → Supabase Edge Function → flip `user_profiles.plan` | Do not trust client-side Stripe events to update plan. Webhook is authoritative. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Component ↔ Client Component | Props (serializable only — no functions, no class instances) | Pass the full `lesson` JSON from server; Client Components consume it locally without further fetches. |
| YouTubePlayer ↔ LyricSyncEngine | React ref forwarding; the ref holds the `YT.Player` instance | Do not lift player state to a global store — keep it scoped to the player page. |
| LyricSyncEngine ↔ LyricDisplay | `activeVerseIndex: number` passed as prop | Keep the sync engine and display decoupled — display only needs the index, not the player. |
| App ↔ Supabase | `@supabase/ssr` browser client for client components; server client via Next.js `cookies()` for server components and route handlers | Never use the anon key in route handlers when user context is needed — always use the session-scoped server client. |
| Pipeline Script ↔ Supabase | Supabase service-role key (bypasses RLS) | Store in `.env.local`, never commit. Only used in offline scripts, never deployed to Vercel. |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture is sufficient. Supabase free tier handles it. No CDN caching needed beyond Vercel's default. |
| 1k-10k users | Add ISR (Incremental Static Regeneration) to song pages — content is pre-generated and changes rarely, so pages can be cached at the edge. Add rate limiting to `/api/search/semantic` to prevent embedding API cost runaway. |
| 10k-100k users | pgvector IVFFlat index needs reindexing as song count grows (rebuild when lists parameter is tuned). Consider caching popular search queries (Redis/Upstash) to avoid repeated embedding calls. Supabase Pro tier needed for connection pooling. |
| 100k+ users | Song content is static — move to CDN-delivered JSON blobs (R2/S3) rather than database reads per page load. Supabase remains only for auth and user progress data. |

### Scaling Priorities

1. **First bottleneck: OpenAI embedding API calls at search time.** Every search fires an API call. Fix: cache embeddings for frequent queries in Redis (Upstash), or pre-embed common search categories.

2. **Second bottleneck: Supabase connection pool exhaustion.** Next.js Server Components can open many concurrent DB connections. Fix: use Supabase's connection pooler (PgBouncer) on Pro tier, or switch to Supabase Edge Functions for DB-heavy routes.

---

## Anti-Patterns

### Anti-Pattern 1: Calling Claude API at Request Time

**What people do:** Build a `/api/lesson/generate` endpoint that calls Claude when a user loads a song page — treating it like a real-time AI app.

**Why it's wrong:** Claude API latency (2-10 seconds) makes page load unbearable. Costs scale with users, not with content. You lose control over content quality (can't review before users see it). You risk rate limits under traffic spikes.

**Do this instead:** Pre-generate all 200 songs offline, store the structured output in Postgres, serve it as static data. The app has no AI latency in the user path at all.

---

### Anti-Pattern 2: Storing Lyrics as Flat Strings

**What people do:** Store lyrics as a single `text` field (one big string with newlines), then try to do timestamp matching and furigana rendering client-side.

**Why it's wrong:** You cannot efficiently binary-search timestamps in a flat string. Furigana data has no place to live. Grammar color-coding has no structure. This forces fragile text-parsing on every render.

**Do this instead:** Store lyrics as a structured JSON array of verse objects at generation time:

```json
{
  "verses": [
    {
      "startTime": 12.4,
      "endTime": 16.8,
      "tokens": [
        {
          "surface": "夢",
          "reading": "ゆめ",
          "romaji": "yume",
          "grammar": "noun",
          "meaning": "dream"
        }
      ],
      "translation": "A dream..."
    }
  ]
}
```

The Claude generation pipeline produces this structure. The player consumes it directly.

---

### Anti-Pattern 3: Deriving Furigana Client-Side with a Library

**What people do:** Ship a Japanese NLP library (like kuromoji.js, ~30MB) to the browser to auto-generate furigana at render time.

**Why it's wrong:** 30MB bundle addition. Auto-generated furigana for song lyrics has significant error rates on poetic/archaic usage. No room for manual correction.

**Do this instead:** Pre-generate furigana per-token during the Claude pipeline (or supplement with a server-side NLP call at generation time). Store verified furigana as part of the lesson JSON. Ship zero NLP code to the browser.

---

### Anti-Pattern 4: Implementing Feature Gating Only in UI

**What people do:** Hide the premium content in React (don't render the component for free users) but still fetch all lesson data from the API.

**Why it's wrong:** Any user can inspect network traffic and retrieve the premium lesson JSON. React rendering is not a security boundary.

**Do this instead:** Enforce gating at the database layer via RLS. The `lesson` JSONB column for premium songs simply does not return data for free-tier users. The API response is structurally empty, not just hidden.

---

## Sources

- YouTube IFrame Player API Reference (updated March 15, 2026): https://developers.google.com/youtube/iframe_api_reference — HIGH confidence
- Supabase pgvector / Vector Search docs: https://supabase.com/docs/guides/ai/semantic-search — HIGH confidence
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security — HIGH confidence
- Next.js App Router data fetching: https://nextjs.org/docs/app/getting-started/fetching-data — HIGH confidence
- Next.js Server vs Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components — HIGH confidence
- freemium gating Next.js + Supabase pattern: https://www.skene.ai/nextjs-supabase-nextauth-stripe-freemium-gating-apps — MEDIUM confidence (third-party, consistent with official Supabase RLS docs)
- React YouTube iframe polling pattern: https://www.freecodecamp.org/news/use-the-youtube-iframe-api-in-react/ — MEDIUM confidence
- LRC/JSON lyric data model research: https://www.blog.brightcoding.dev/2025/12/13/the-ultimate-guide-to-automating-synchronized-lyrics-for-your-music-library-2025/ — MEDIUM confidence
- HTML ruby/furigana spec: https://www.w3.org/International/questions/qa-ruby — HIGH confidence
- Supabase + Next.js vector search example: https://supabase.com/docs/guides/ai/examples/nextjs-vector-search — HIGH confidence

---

*Architecture research for: KitsuBeat — anime song Japanese learning web app*
*Researched: 2026-04-06*
