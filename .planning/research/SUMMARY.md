# Project Research Summary

**Project:** KitsuBeat v2.0 Exercise and Learning System
**Domain:** Music-based language learning with SRS, exercise engine, auth, and freemium payments
**Researched:** 2026-04-13
**Confidence:** HIGH (stack, architecture, pitfalls) / MEDIUM (features)

## Executive Summary

KitsuBeat v2.0 adds a structured exercise system, kana trainer, cross-song vocabulary tracking, spaced repetition, user auth, and a freemium payment layer on top of the existing Next.js 15 / Neon Postgres / Drizzle baseline. This is a well-understood domain: FSRS v6 via ts-fsrs, Clerk Core 3, Stripe Embedded Checkout, and Zustand + Server Actions all have established, battle-tested implementations that map directly onto the existing stack. The baseline infrastructure does not need to change.

The recommended approach is to build auth and the database schema additions first, followed by the per-song exercise session, then the kana trainer and cross-song vocabulary dashboard, and finally Stripe subscription gating. Exercise content should be generated client-side from the already-fetched lesson JSONB. SRS state is server-authoritative but schedule computation runs client-side via ts-fsrs, keeping review sessions latency-free with one DB write per session end.

The two critical risks are: (1) vocabulary identity -- if progress is tracked by surface string instead of a stable UUID, a single content correction orphans all user progress; and (2) auth depth -- Next.js middleware alone is insufficient for security (CVE-2025-29927, CVSS 9.1), and every server action must independently validate session and plan tier via a Data Access Layer helper.

## Key Findings

### Recommended Stack

The existing stack (Next.js 15, React 19, Neon Postgres, Drizzle ORM, Tailwind 4, Zustand, TanStack Query, shadcn/ui) requires only targeted additions for v2.0. No major migrations or replacements are warranted.

**Core technologies (net-new):**
- @clerk/nextjs ^6.x: User auth and session management -- deepest Next.js 15 App Router integration; Clerk Core 3 (Mar 2026) resolves RSC compatibility issues; clerk_user_id becomes the FK on all user-scoped tables
- stripe + stripe-js: Freemium subscriptions via Embedded Checkout -- Stripe direct is correct at pre-revenue stage; MoR alternatives (Lemon Squeezy, Polar) are meaningfully more expensive
- ts-fsrs ^5.x: FSRS v6 spaced repetition scheduler -- purpose-built TypeScript, zero dependencies, actively maintained; Node.js >=20 required
- motion ^12.x: Exercise answer animations and transitions -- formerly framer-motion, React 19 fully supported
- sonner ^2.x: Toast notifications -- shadcn/ui official toast, 31.2M weekly downloads

**New Drizzle tables required:** users_meta, subscriptions, user_vocab_mastery, user_exercise_log, processed_stripe_events

**Do not add:** XState, Lemon Squeezy at launch, IndexedDB/Dexie, custom SRS algorithm, NextAuth/Auth.js.

### Expected Features

The exercise system research (verified against WaniKani, Bunpro, Duolingo, LyricsTraining) defines a clear two-tier feature set.

**Must have (table stakes):**
- Vocab recognition (surface to meaning, meaning to surface) -- every SRS app baseline
- Reading match (kana to romaji) -- Japanese-specific, distinct skill from meaning recall
- Fill-the-lyric cloze -- LyricsTraining built an entire product on this; omitting it fails the music-learning premise
- Immediate feedback with explanation -- Duolingo standard user expectation
- Per-song exercise completion percentage and cross-session progress persistence
- Kana trainer with row-by-row unlock (hiragana first, 46+46+variants total)
- User accounts with freemium plan gating

**Should have (differentiators):**
- Grammar conjugation drill tied to actual song context -- no competitor does this
- Sentence order / token scramble -- 56% syntactic improvement in peer-reviewed research
- Listening drill (audio-only cloze) -- unique in music learning space; star 3 mastery
- Cross-song vocabulary tracking: same word in two songs shares SRS state
- 3-star mastery system per song (Star 1 = recognition, Star 2 = fill-the-lyric, Star 3 = listening drill)
- JLPT-aware exercise ordering within songs
- Context-anchored prompts referencing which song introduced a word

**Defer (v2+):**
- Hearts/lives system -- use score degradation instead
- Social leaderboards for initial milestone -- personal bests and streaks only
- IME typing input -- multiple choice first
- Handwriting/stroke order -- separate product scope

### Architecture Approach

The architecture follows a clear RSC + Client SPA hybrid: Server Components fetch data once per session start, pass it to a client-side ExerciseSession component that drives the full exercise loop in memory, and a single Server Action upserts SRS state to the DB when the session ends. No pre-computation pipeline; no interactive DB transactions; no per-answer writes.

**Major components:**
1. lib/exercises/generator.ts -- Pure function: Lesson JSONB + user SRS state to Exercise[]; no DB dependency; generates questions in under 5ms client-side
2. lib/exercises/srs.ts -- Thin wrapper around ts-fsrs; schedule computation runs client-side; result POSTed to /api/progress as a single-row upsert
3. middleware.ts -- Clerk auth check + plan-tier gating on route level; reads JWT only; UX convenience only, not the security gate
4. vocab_global materialized view -- PostgreSQL view aggregating vocabulary across all song_versions.lesson JSONB; enables cross-song dashboard
5. app/api/webhooks/stripe/route.ts -- Stripe subscription sync; idempotent via processed_stripe_events table

**Key patterns:**
- FSRS columns as individual scalar columns (not JSONB) -- required for indexed due queries
- Server Actions carry the security gate via requireAuth() + requirePlan() helpers; middleware is redirect-only
- vocab_key as UUID FK to vocabulary_items table -- not surface string composite

### Critical Pitfalls

1. **Vocabulary identity crisis** -- Track progress by UUID FK to vocabulary_items table, never by surface string. Any content correction orphans all progress rows if the key is text-based. Recovery cost after data exists is HIGH.

2. **Middleware-only auth (CVE-2025-29927, CVSS 9.1)** -- middleware.ts can be bypassed via crafted headers. Every server action must call requireAuth(). Feature gates must query users.plan from DB at request time.

3. **Stripe webhook race condition** -- Checkout redirect arrives 1-5 seconds before webhook. Success page must show processing state and poll /api/me/plan. Webhooks must be idempotent via processed_stripe_events table.

4. **SRS review queue explosion** -- Auto-adding all encountered vocabulary causes 80-200+ overdue reviews within a week. Must enforce daily new-item cap (default 10-15) and implement two-phase learning.

5. **JSONB write amplification** -- Postgres cannot HOT-update indexed JSONB columns. Buffer exercise session state in React state; write to DB once per session end, not per answer.

## Implications for Roadmap

Based on the dependency graph and pitfall prevention requirements, the following phase structure is recommended:

### Phase 1: Auth Foundation
**Rationale:** clerk_user_id is the FK on every user table; middleware CVE demands DAL from day one; public-to-auth cache boundaries must be audited before adding user-specific content to existing song pages.
**Delivers:** Sign in/out with Clerk, requireAuth() / requirePlan() DAL helpers, middleware for route redirects, plan-tier JWT encoding, public/authenticated render boundaries
**Addresses:** Auth table stakes (FEATURES.md), CVE-2025-29927 DAL pattern (PITFALLS.md P2), cache boundary audit (PITFALLS.md P3), cookie write correctness (PITFALLS.md P10)
**Research flag:** Standard -- Clerk + Next.js 15 is thoroughly documented; skip /gsd:research-phase

### Phase 2: Database Schema + Vocab Identity
**Rationale:** All progress tables must exist and vocab identity must be resolved before any exercise or payment code writes data. Retrofitting vocabulary_items UUID table after progress data exists requires a HIGH-cost ambiguous migration.
**Delivers:** Drizzle schema additions (vocabulary_items, user_vocab_mastery, subscriptions, processed_stripe_events), vocab_global materialized view, all scalar FSRS columns, user_exercise_log
**Addresses:** Vocabulary identity crisis (PITFALLS.md P1), JSONB mutable state prevention (PITFALLS.md P9)
**Research flag:** Standard for Drizzle + Neon; may need brief data audit if existing JSONB vocabulary quality is inconsistent

### Phase 3: Exercise Engine (Per-Song)
**Rationale:** Core learning loop. Depends on auth (Phase 1) and schema (Phase 2). Pure-function generator and ts-fsrs wrapper can be unit-tested independently before UI exists.
**Delivers:** lib/exercises/generator.ts, lib/exercises/srs.ts, /songs/[slug]/exercises route, ExerciseSession client component, /api/progress upsert, Exercises 1-4, star 1 and star 2 mastery
**Uses:** ts-fsrs, Zustand useExerciseStore, motion for feedback animations, sonner for toasts
**Avoids:** Per-answer DB writes, same-song-only distractor pool (pull from vocabulary_items)
**Research flag:** Standard -- skip /gsd:research-phase

### Phase 4: Kana Trainer
**Rationale:** Self-contained module with no server state for anonymous users. Can be built in parallel with Phase 3 if resources allow.
**Delivers:** /kana route, hiragana/katakana recognition drills, row-by-row unlock, SRS scheduling via ts-fsrs, anonymous localStorage fallback, migration endpoint on account creation
**Addresses:** Kana trainer features (FEATURES.md), row-by-row unlock pattern (PITFALLS.md P4)
**Research flag:** Standard -- skip /gsd:research-phase

### Phase 5: Cross-Song Vocabulary Dashboard
**Rationale:** Depends on vocab_global view (Phase 2) and exercise session pattern (Phase 3). The core differentiator that separates KitsuBeat from all music-learning competitors; must be premium-gated.
**Delivers:** /vocabulary dashboard (premium), /vocabulary/review global SRS session, seen-in-N-songs display, due-for-review queue
**Addresses:** Cross-song tracking differentiator (FEATURES.md), distractor quality (PITFALLS.md P7)
**Avoids:** Full JSONB scan for cross-song queries (use materialized view), feature gate data leak
**Research flag:** Standard -- skip /gsd:research-phase

### Phase 6: Stripe Payments
**Rationale:** Build last -- all premium gates are structurally in place after Phase 5; Stripe activates them.
**Delivers:** /upgrade page, Stripe Embedded Checkout, /api/webhooks/stripe idempotent handler, processing-payment polling pattern, Customer Portal link, post-cancellation gating
**Addresses:** Freemium model (FEATURES.md), gating leak prevention (PITFALLS.md P6), webhook race condition (PITFALLS.md P5)
**Research flag:** Recommend /gsd:research-phase -- webhook race condition handling should be validated against current Stripe docs before implementation

### Phase 7: Advanced Exercises + Mastery Depth
**Rationale:** Grammar conjugation drill requires grammar_points[].conjugation_path to be machine-parseable -- a content data quality dependency that may require re-generation of existing grammar JSONB. Listening drill requires YouTube IFrame segment isolation with hidden lyrics.
**Delivers:** Grammar conjugation drill (Ex 5), listening drill / star 3 mastery (Ex 6), sentence order / token scramble (Ex 7), JLPT-aware exercise ordering, stuck-word needs-review escalation
**Addresses:** Differentiator exercises and star 3 mastery (FEATURES.md), star purgatory trap (PITFALLS.md P8)
**Research flag:** Recommend /gsd:research-phase -- grammar data quality audit needed before writing the generator

### Phase Ordering Rationale

- Auth precedes all: clerk_user_id is the FK on all user tables; the DAL pattern must be established before any user-scoped code is written
- Schema before exercises: retrofitting vocabulary UUID table after progress data is the single highest-cost pitfall identified
- Per-song exercises before cross-song: the cross-song dashboard reuses the same ExerciseSession component
- Kana trainer can be parallelized with Phase 3: same SRS library and exercise component patterns, no cross-dependencies
- Stripe last: premium gates are structurally present before Stripe is wired; avoids payment complexity blocking feature validation
- Advanced exercises last: grammar conjugation depends on content data quality that requires an audit step

### Research Flags

Phases likely needing /gsd:research-phase during planning:
- **Phase 6 (Stripe Payments):** Webhook race condition handling and pending-state polling pattern
- **Phase 7 (Advanced Exercises):** Grammar conjugation_path field structure audit across existing songs

Phases with standard patterns (skip /gsd:research-phase):
- **Phase 1 (Auth):** Clerk + Next.js 15 App Router is thoroughly documented
- **Phase 2 (Schema):** Drizzle + Neon, FSRS column structure, materialized view DDL all well-documented
- **Phase 3 (Exercise Engine):** ts-fsrs API is simple; Zustand + Server Actions patterns are standard
- **Phase 4 (Kana Trainer):** Static data + same SRS pattern as Phase 3
- **Phase 5 (Cross-Song Dashboard):** Materialized view + premium gating patterns established in Phase 1-3

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Clerk + Next.js 15, ts-fsrs, Stripe + Next.js all verified against official docs and working reference implementations |
| Features | MEDIUM | Core exercise types verified across WaniKani/Duolingo/Bunpro/LyricsTraining; engagement metrics are secondary sources |
| Architecture | HIGH | Drizzle + Neon HTTP constraints, FSRS client-side pattern, materialized view sourced from official docs |
| Pitfalls | HIGH | CVE sourced from official report; JSONB write amplification from Postgres internals; SRS abandonment from peer-reviewed research |

**Overall confidence:** HIGH

### Gaps to Address

- **Grammar data quality:** Exercise 5 requires grammar_points[].conjugation_path to be machine-parseable. This field may be free-text prose in existing songs. Audit a sample before Phase 7 planning.

- **Vocabulary identity resolution:** STACK.md recommends composite key; PITFALLS.md argues for normalized vocabulary_items UUID table. Recommendation: use UUID from Phase 2 onward. Do not defer.

- **Distractor pool at small catalog size:** Pool is thin until 30+ songs are seeded. Add validateDistractorPool() in the generator with a same-JLPT-level fallback strategy.

- **Daily SRS cap calibration:** Research supports 10-15 new items/day. Ship with 10 as default, surface the setting prominently, review analytics at 30 days.

## Sources

### Primary (HIGH confidence)
- Neon: Next.js auth with Clerk + Drizzle + Neon -- Clerk + Drizzle integration pattern confirmed
- ts-fsrs GitHub (open-spaced-repetition/ts-fsrs) -- FSRS v6 algorithm, Node >=20, API surface
- Next.js CVE-2025-29927 (CVSS 9.1, WorkOS) -- Auth bypass via middleware, DAL pattern requirement
- Next.js official authentication guide (nextjs.org/docs) -- DAL pattern, RSC cookie write constraints
- Stripe webhook idempotency documentation (docs.stripe.com) -- constructEvent, raw body pattern
- PostgreSQL materialized view indexing (Crunchy Data) -- REFRESH CONCURRENTLY index requirement
- Drizzle + Neon HTTP driver docs (orm.drizzle.team) -- Non-interactive transaction constraint
- FSRS algorithm overview (domenic.me/fsrs) -- Learning phase vs. review phase distinction

### Secondary (MEDIUM confidence)
- Stripe + Next.js 2026 integration guides -- Server Action checkout pattern, Embedded Checkout
- SRS queue overflow and abandonment (LessWrong, 7 years classroom data) -- Daily cap rationale
- React state management 2025 (Makers Den) -- XState vs. Zustand complexity tradeoff
- Competitor feature analysis (LyricsTraining, Musixmatch, Lirica, Lingopie, WaniKani, Migaku) -- Feature expectations

### Tertiary (LOW confidence)
- Freemium conversion rate benchmarks (67% user preference for freemium) -- Single secondary source; directional only
- 56% syntactic improvement from sentence scramble exercises -- Cited in feature research; study not directly verified

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*
