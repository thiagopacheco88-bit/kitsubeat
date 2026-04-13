# Project Research Summary

**Project:** KitsuBeat
**Domain:** Anime music-based Japanese language learning web app
**Researched:** 2026-04-06
**Confidence:** MEDIUM-HIGH

## Executive Summary

KitsuBeat is a niche but well-defined product: a freemium web app that teaches Japanese through curated anime songs using synchronized lyrics, furigana, grammar annotation, and AI-generated lesson content. The market gap is real — no competitor combines Japanese-specific features (furigana, grammar color-coding, kanji/kana/romaji toggles) with anime-focused curated content and an AI search interface. The recommended approach is to pre-generate all lesson content offline using Claude API at authoring time, store it as structured JSONB in Neon Postgres, and serve it as static data at runtime — eliminating AI latency from the user path entirely. The full-stack is Next.js 15 App Router with Clerk for auth, Lemon Squeezy for payments, and Vercel for deployment.

The most defensible competitive position comes from content quality, not features. LyricsTraining, Musixmatch, Lirica, and Lingopie all exist but none offer the combination of furigana, inline grammar color-coding, structured vocabulary tables, and anime-specific curation that KitsuBeat targets. The core product loop — watch anime song, see synced grammar-annotated lesson, learn vocabulary in context — is validated by Migaku and Language Reactor's traction in the broader "learn from media" niche, but no one has built this specifically for anime music on the web.

The two non-negotiable risks to address before writing a line of application code are: (1) the lyric copyright question — displaying verbatim song lyrics synced to media is a controlled exploitation of music composition rights under both US and Japanese law, and the product must be designed around AI-generated grammatical breakdowns rather than verbatim reproduction; and (2) the YouTube API policy constraint — lesson annotation panels must be placed beside or below the YouTube iframe, never overlaid on top of it. Both require foundational design decisions that are expensive to retrofit.

## Key Findings

### Recommended Stack

The stack is modern and well-validated for this use case. Next.js 15 with App Router is the correct foundation — Server Components handle data fetching, Server Actions eliminate API boilerplate, and Vercel deployment is zero-config. Neon Postgres is preferred over Supabase because its serverless connection pooling (PgBouncer built in) avoids the connection exhaustion issues Supabase exhibits under high Vercel serverless concurrency. Drizzle ORM is preferred over Prisma for its smaller bundle and SQL-transparent query model, which matters for Vercel Edge deployment. Clerk Core 3 (March 2026) is the correct auth choice for its native Next.js 15 App Router integration and built-in freemium gating primitives. Lemon Squeezy (Stripe Managed Payments) handles billing as Merchant of Record, removing VAT/GST complexity for an international anime audience.

For the AI pipeline, the Vercel AI SDK (`generateObject`) is used for any on-demand generation, but the primary approach is `@anthropic-ai/sdk` directly in offline seeding scripts that pre-populate all 200 songs before launch. The YouTube integration uses react-player (maintained by Mux), not react-youtube (unmaintained). Lyrics sync is implemented via 250ms polling of `getCurrentTime()` — the YouTube iframe API emits no time events; polling is the only approach.

**Core technologies:**
- **Next.js 15 + React 19**: Full-stack framework with App Router — Server Components, Server Actions, zero-config Vercel deploy
- **Neon Postgres + Drizzle ORM**: Serverless Postgres with built-in connection pooling; Drizzle preferred for edge bundle size and TypeScript-first schema
- **Clerk Core 3**: Auth with native Next.js 15 RSC support; `has()` helper and `<Protect>` for freemium gating without custom middleware
- **Lemon Squeezy (Stripe Managed Payments)**: Merchant of Record billing; handles VAT/GST globally — critical for Japan/EU/Brazil audience
- **Vercel AI SDK + @anthropic-ai/sdk**: Structured offline content generation; `generateObject()` for schema-constrained lesson output
- **react-player**: YouTube embed with `onProgress` callback at 250ms — maintained by Mux; replaces unmaintained react-youtube
- **Zustand + TanStack Query**: Client state (player position, active lyric index) + server state (song library, progress) — coexist cleanly
- **kuroshiro + @sglkc/kuromoji**: Server-side furigana generation during content seeding only; zero NLP shipped to browser
- **Upstash Rate Limiting**: HTTP-based rate limiter for AI chatbox and content generation endpoints; works on Vercel Edge

### Expected Features

No direct competitor offers the full combination of furigana, inline grammar color-coding, and anime-specific curation. The competitive white space is clear, but table stakes must be met first or the product feels unfinished before users encounter the differentiators.

**Must have (table stakes):**
- YouTube embed with synced karaoke-style lyrics — without this, the product is a lyrics site, not a learning tool
- Furigana (ruby text) over kanji — beginners cannot engage without pronunciation help; no competitor offers this
- Romaji toggle — training wheels for absolute beginners; LyricsTraining's Japanese support is Romaji-only for a reason
- Line-by-line English translation synced to playback — core learning value; Musixmatch built a business on this alone
- Song catalog browse with JLPT difficulty and genre filters — 200 songs require structured discovery
- User accounts and progress tracking — required for freemium model and return visits
- Freemium gating — users expect to try before buying; free tier must deliver genuine value, not a paywall at the door
- Mobile-responsive design — anime fan demographic skews heavily mobile; 375px viewport must work during playback

**Should have (competitive):**
- Grammar color-coding by grammatical category — no competitor does inline grammar annotation within synced lyrics; this is the primary differentiator
- Vocabulary breakdown table per song categorized by part of speech — separates KitsuBeat from LyricsTraining immediately
- AI chatbox song search — conversational song discovery ("beginner song about seasons from Ghibli") is unique in this space
- JLPT difficulty tagging — gives users a progression ladder, drives return visits

**Defer (v2+):**
- Built-in SRS review queue (FSRS algorithm) — significant engineering; validate demand with Anki CSV export first
- Progressive Web App with offline mode — validate mobile web usage data before investing
- Native iOS/Android app — after web traction is proven and revenue supports dual-platform investment
- Social graph, follows, shared decks — after async community features (v1.x) prove social demand exists

### Architecture Approach

The architecture separates concerns cleanly into three layers: an offline content generation pipeline (Claude API → structured JSON → Neon Postgres), a Next.js App Router server layer (Server Components for data fetching, Route Handlers for AI search), and a client layer with three tightly coupled components — YouTubePlayer, LyricSyncEngine, and LyricDisplay — that share state via a single `useYouTubeSync` hook. Freemium gating is enforced at the database layer via Row-Level Security, not in application code — free users receive a structurally empty lesson response for premium songs, not hidden UI elements. The AI search chatbox calls a Route Handler that embeds the query and runs pgvector similarity search — one embedding API call per unique query, cached with Upstash Redis to prevent quota drain.

**Major components:**
1. **Offline Content Pipeline** — CLI script reads song manifest, calls Claude API for structured lesson JSON (verses, furigana tokens, grammar tags, translations, vocabulary), generates embeddings, upserts to Postgres; runs at authoring time, never at request time
2. **Song Player (Client)** — YouTubePlayer wraps react-player; LyricSyncEngine polls `getCurrentTime()` at 250ms and computes active verse index; LyricDisplay renders active verse with `<ruby>` furigana markup and grammar color classes
3. **AI Search Route Handler** — embeds user query via OpenAI text-embedding-3-small, runs pgvector cosine similarity against song embeddings, returns ranked song cards; rate-limited per user via Upstash
4. **Freemium Gate (DB Layer)** — Postgres RLS policy: premium song `lesson` JSONB column returns null for free-tier users; Clerk middleware enforces session before rendering song routes
5. **Webhook Handler** — Lemon Squeezy webhook fires on successful payment → updates Clerk user metadata `plan: 'pro'` → no polling or client-side trust required

### Critical Pitfalls

1. **Verbatim lyric reproduction without a license** — JASRAC (Japan) and NMPA (US) actively enforce synced lyric display rights; LyricFind sued Musixmatch for $1B in 2025. Design the content model as AI-generated grammatical breakdowns, not lyric reproduction. Legal review required before launch in Japan and US.

2. **Overlaying lesson content on the YouTube iframe** — YouTube Developer Policies explicitly prohibit HTML overlays on the player. The furigana/grammar panel must be placed beside or below the video, never on top. This must be locked in as a layout constraint before the sync engine is built.

3. **AI-generated Japanese grammar errors at scale** — LLMs hallucinate particle assignments (は vs. が), furigana readings, and grammar rules for Japanese. Every lesson in the 200-song catalog requires a human review pass before going live. Build a review queue into the content pipeline. Add a user-facing "flag this explanation" button from day one.

4. **YouTube Data API quota exhaustion** — Default quota is 10,000 units/day; a search costs 100 units. Pre-populate all catalog metadata at build time and cache AI chatbox queries in Redis. Never hit the YouTube Data API at user request time for catalog songs.

5. **Lyric sync timing tied to a specific video ID** — If a YouTube video is removed or region-blocked, all timing data for that song is orphaned. Store timing data scoped to a specific video ID, maintain a backup video ID field per song, and run a periodic health check job against all 200 catalog videos.

## Implications for Roadmap

Architecture research explicitly defines a build order based on component dependencies. The recommended phase structure follows that order, with legal and content architecture decisions front-loaded because they are expensive to retrofit.

### Phase 1: Foundation — Legal, Schema, and Content Pipeline

**Rationale:** Two critical constraints (lyric copyright, YouTube overlay policy) require foundational design decisions that affect every subsequent phase. The database schema and content pipeline must exist before any UI can be built — the player needs real lesson data to develop against. This phase has no user-facing output but makes everything else possible.

**Delivers:** Validated content model (legally sound, no verbatim lyrics), finalized database schema, working offline content pipeline producing structured lesson JSON, 10-20 seeded songs for development use.

**Addresses:** Table stakes feature dependencies — synced lyrics requires LRC/timestamp data; grammar color-coding requires POS-tagged tokens; vocabulary breakdown requires categorized vocabulary. All these come from the pipeline.

**Avoids:** Lyric copyright pitfall (design decision made here), AI grammar hallucination at scale (human review queue built into pipeline), video ID rot (timing data scoped to video ID from day one).

**Research flag:** NEEDS RESEARCH — lyric copyright strategy requires legal domain research specific to target markets (US + Japan). The content model (grammatical breakdowns vs. verbatim lyrics) should be reviewed by a lawyer before Phase 1 ends.

---

### Phase 2: Core Player Experience

**Rationale:** The synced player is the product's core value proposition. All differentiating features (grammar color-coding, furigana, vocabulary breakdown) live inside the player. This phase must ship before auth or payments — it validates the core learning loop. Architecture identifies YouTube integration as the "highest-risk component (browser API, cross-origin iframe)" and recommends isolating it early.

**Delivers:** Functional song player with synced karaoke display, furigana toggle, romaji toggle, grammar color-coding, line-by-line translation, vocabulary breakdown table. Static rendering (no auth, no paywall) — just the core lesson experience working end-to-end.

**Uses:** react-player with 250ms `onProgress` polling; `useYouTubeSync` hook; LyricDisplay with `<ruby>` markup; GrammarTag color components; pre-generated lesson JSON from Phase 1.

**Implements:** YouTubePlayer + LyricSyncEngine + LyricDisplay component group; FuriganaText and VocabCard presentational components.

**Avoids:** YouTube overlay policy violation (lesson panel beside/below player, not over it — verified in visual QA before moving on).

**Research flag:** STANDARD PATTERNS — YouTube iframe polling, React component architecture, and Tailwind responsive layout are well-documented. No phase research needed.

---

### Phase 3: Auth, Catalog, and Freemium Gate

**Rationale:** Auth must exist before payments and before user progress can be saved. The song catalog and freemium gating give the player phase commercial viability. FEATURES.md notes: "the free tier must deliver genuine value — don't gate the homepage." PITFALLS.md confirms that requiring account creation before showing content causes 20%+ next-day retention drop.

**Delivers:** User accounts (Clerk), song library browse with JLPT + genre filters, freemium gate (first N songs free, premium for full catalog), user progress tracking (completed songs, current lesson position), mobile-responsive layout.

**Uses:** Clerk Core 3 with `has()` gating; Neon Postgres with Drizzle; Postgres RLS for lesson access control; Zustand + TanStack Query for client/server state split; next-themes for dark mode default.

**Implements:** Auth middleware, freemium gate at database layer (RLS), user_profiles table, song library Server Component with filter UI.

**Avoids:** Account-before-value UX pitfall (one full lesson accessible without sign-in); freemium conversion failure (free tier defined as N full lessons before building, not after).

**Research flag:** STANDARD PATTERNS — Clerk Next.js 15 integration has official documentation and Core 3 resolves RSC issues. Drizzle + Neon patterns are well-documented. No phase research needed.

---

### Phase 4: AI Search and Payments

**Rationale:** AI chatbox search requires auth (for rate limiting per user) and the embeddings generated in Phase 1. Payments require auth. Both are enablers of the freemium revenue model but not required for the core learning experience validation. Shipping after auth ensures rate limiting is built on real user sessions.

**Delivers:** AI chatbox song search (natural language → ranked song cards), Lemon Squeezy subscription checkout, webhook handler to flip user plan on successful payment, contextual upgrade prompts at value moments.

**Uses:** Vercel AI SDK or `@anthropic-ai/sdk` for chatbox; OpenAI text-embedding-3-small for query embedding; pgvector similarity search in Neon; Upstash rate limiting on chatbox endpoint; Lemon Squeezy webhook handler updating Clerk user metadata.

**Implements:** `/api/search/semantic` Route Handler; AIChatbox Client Component; `/api/webhooks/lemonsqueezy` Route Handler; upgrade CTA components.

**Avoids:** YouTube Data API quota exhaustion (all catalog metadata pre-populated in Phase 1; chatbox only searches internal embeddings, not YouTube API); Claude API key exposure (all AI calls server-side only); freemium hard paywall before value (5 free chatbox queries before upgrade prompt).

**Research flag:** NEEDS RESEARCH — pgvector semantic search configuration (IVFFlat index tuning, match threshold calibration) and Lemon Squeezy webhook integration may benefit from targeted research during planning.

---

### Phase 5: Content Expansion and Engagement Loop

**Rationale:** Once the core loop is validated (target: 30%+ week-2 retention), add the engagement mechanics that drive return visits and word-of-mouth. These are explicitly called out as v1.x in FEATURES.md — defer until the core is proven.

**Delivers:** Vocabulary save + Anki CSV export, streak and daily goal gamification, verse-by-verse lesson mode (for users overwhelmed by full songs), async leaderboards (high score per song), user-facing error reporting on lesson content.

**Uses:** FSRS-lite scheduling logic (simplified, not full SRS system); Zustand for streak/goal client state; TanStack Query for leaderboard data.

**Avoids:** Full SRS at launch anti-feature (export to Anki CSV is the right v1.x scope); gamification without learning scaffold (active recall before streaks reward anything).

**Research flag:** STANDARD PATTERNS for Anki CSV export and leaderboard async patterns. NEEDS RESEARCH if building even a simplified in-app SRS review queue — FSRS algorithm implementation has nuances.

---

### Phase Ordering Rationale

- **Legal and schema before player:** Lyric copyright and YouTube overlay constraints are foundational design decisions. Building the player before these are resolved risks a full rework of the content model and UI layout.
- **Player before auth:** The core learning loop must be validated before adding the conversion funnel. Auth adds friction; validate the product is worth the friction first.
- **Auth before payments:** Clerk must be operational before Lemon Squeezy webhooks can update user plan metadata.
- **AI search after auth:** Rate limiting per user requires user sessions. Without auth, the chatbox is vulnerable to quota exhaustion.
- **Engagement after core validation:** SRS, streaks, and leaderboards solve retention problems that only matter once users are arriving. Build them when retention data justifies the investment.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Lyric copyright strategy for US + Japan markets — specific legal requirements, JASRAC licensing mechanics, "AI-generated breakdown vs. verbatim" legal standard. Recommend consulting legal counsel before content model is finalized.
- **Phase 4:** pgvector IVFFlat index tuning for 200-song catalog; Lemon Squeezy webhook integration and idempotency patterns. Both have specific implementation nuances worth researching before building.
- **Phase 5 (if in-app SRS):** FSRS algorithm implementation has known complexity; research before committing to build vs. using an existing library.

Phases with standard patterns (skip research-phase):
- **Phase 2:** YouTube iframe polling, React component architecture — well-documented; official YouTube IFrame API reference covers the sync pattern explicitly.
- **Phase 3:** Clerk Core 3 + Next.js 15 integration has official docs; Drizzle + Neon patterns are well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Next.js 15, Clerk, Neon, Drizzle, Lemon Squeezy) verified against official documentation and release notes. Japanese NLP libraries (kuroshiro/@sglkc/kuromoji) are MEDIUM — kuromoji fork is the recommended path but has less community documentation. |
| Features | MEDIUM | Competitor analysis across LyricsTraining, Musixmatch, Lirica, Lingopie, Migaku is solid. Engagement metric claims (retention percentages, conversion rates) are LOW confidence — vendor blog sources, not verified studies. Feature categories themselves are HIGH confidence. |
| Architecture | MEDIUM-HIGH | YouTube iframe polling pattern and pgvector similarity search have official documentation. Freemium RLS gating pattern is verified against Supabase official docs. The architecture diagram references Supabase for auth (inconsistent with the stack recommendation of Clerk + Neon) — the synthesized architecture in this summary uses Clerk + Neon as the correct combination. |
| Pitfalls | HIGH for legal/API policy; MEDIUM for UX | YouTube API policy pitfalls sourced from official Google developer documentation. Lyric copyright findings sourced from official music rights organizations and court records. UX retention claims (20% drop from pre-registration gate) are MEDIUM confidence — corroborated by Duolingo case studies but not primary research. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Architecture inconsistency:** ARCHITECTURE.md was researched using Supabase as the reference auth/database provider, but the STACK.md recommendation is Clerk (auth) + Neon (database). During roadmap and implementation planning, use Clerk + Neon. The architectural patterns (RLS, middleware, webhook) translate directly — the provider names change, not the patterns. Specifically: Supabase RLS → Neon Postgres RLS enforced via Drizzle; Supabase Auth → Clerk; Supabase SSR client → Neon serverless client.

- **Lyric content legality:** Research identifies this as a critical risk but cannot resolve the legal question — that requires jurisdiction-specific legal review. The content model design (grammatical breakdowns, not verbatim lyrics) is the recommended mitigation, but validation by a lawyer before launch in Japan and the US is a hard gap.

- **Furigana accuracy for song lyrics:** The research recommends cross-validating AI-generated furigana with a morphological analyzer (MeCab, Sudachi) during the content pipeline. The specific integration pattern between Claude API output and a Japanese NLP library for verification was not researched in detail — this needs a focused spike during Phase 1 pipeline development.

- **Video timing data sourcing:** The research identifies LRC/timestamp data as the hardest content production constraint but does not resolve where to obtain it for 200 songs. Options include: manually authoring timings, sourcing from licensed providers, or using AI to generate approximate timings. This is an operational gap that affects Phase 1 scope significantly.

- **Embedding model consistency:** ARCHITECTURE.md references OpenAI text-embedding-3-small for both indexing and query time. STACK.md does not explicitly call out an embedding model. The architectural choice to use OpenAI embeddings (rather than Anthropic's native embeddings) adds a second AI provider dependency. This is a minor but explicit gap to decide during Phase 1.

## Sources

### Primary (HIGH confidence)
- [Next.js App Router docs](https://nextjs.org/docs/app/getting-started) — App Router status, Server Components, Server Actions
- [Clerk Billing for B2C docs](https://clerk.com/docs/nextjs/guides/billing/for-b2c) — `has()` gating, Core 3 RSC compatibility
- [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies) — Overlay prohibition, quota system
- [YouTube IFrame API Reference](https://developers.google.com/youtube/iframe_api_reference) — No time events; polling required
- [Supabase pgvector docs](https://supabase.com/docs/guides/ai/semantic-search) — Semantic search patterns
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — Freemium gating pattern
- [WaniKani SRS docs](https://knowledge.wanikani.com/wanikani/srs-stages/) — SRS feature scope reference
- [AI hallucinations in language learning (Tandfonline 2025)](https://www.tandfonline.com/doi/full/10.1080/17501229.2025.2509759) — Grammar hallucination risk

### Secondary (MEDIUM confidence)
- [shadcn/ui Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4) — v4 compatibility
- [Neon + Vercel integration](https://vercel.com/marketplace/neon) — Connection pooling behavior
- [Drizzle vs Prisma 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — Serverless recommendation
- [LyricFind vs. Musixmatch $1B lawsuit (2025)](https://www.digitalmusicnews.com/2025/03/06/lyricfind-musixmatch-lawsuit/) — Lyric rights enforcement
- [Lyric rights requirements](https://www.musicadmin.com/guides/what-are-lyric-rights/) — JASRAC and NMPA enforcement scope
- [AI hallucinations in Japanese grammar](https://selftaughtjapanese.com/2025/07/10/the-dangers-of-using-ai-to-learn-japanese-grammar-a-case-of-hallucinating-chatgpt/) — Japanese-specific LLM error modes
- [Stop Using kuromoji.js](https://aiktb.dev/blog/better-kuromoji-fork) — @sglkc/kuromoji recommendation
- [Lemon Squeezy 2026 update](https://www.lemonsqueezy.com/blog/2026-update) — Stripe Managed Payments, MoR model

### Tertiary (LOW confidence)
- [Language learning app statistics — ElectroIQ](https://electroiq.com/stats/language-learning-app-statistics/) — 60%+ mobile usage claim; needs validation
- [Freemium app monetization — Adapty](https://adapty.io/blog/freemium-app-monetization-strategies/) — 67% freemium preference claim; vendor source
- [Onboarding retention lift — Design Bootcamp](https://medium.com/design-bootcamp/case-study-the-onboarding-of-a-language-learning-app-dc70d7e467f8) — 20% retention drop claim; corroborated by Duolingo case studies but not primary research

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*
