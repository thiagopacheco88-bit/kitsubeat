# Stack Research

**Domain:** Anime music-based Japanese language learning web app
**Project:** KitsuBeat
**Researched:** 2026-04-06
**Confidence:** HIGH (core framework, auth, DB, AI) / MEDIUM (Japanese NLP libraries)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x | Full-stack React framework | App Router is stable and the 2026 standard for full-stack React. Server Components reduce bundle size, Server Actions eliminate API boilerplate, and Vercel deployment is zero-config. The Pages Router is entering maintenance mode — new projects should not start there. |
| React | 19.x | UI library | Bundled with Next.js 15. React 19 Server Components, improved Suspense, and the new `use()` hook matter for streaming lesson content from Claude. |
| TypeScript | 5.x | Type safety | Non-negotiable for a project with complex domain objects (lyrics timings, furigana tokens, lesson schemas). Drizzle and Zod are designed around TypeScript-first usage. |
| Tailwind CSS | 4.x | Styling | v4 (CSS-first config, no tailwind.config.js) ships ~70% smaller production CSS than v3. shadcn/ui components are updated for v4. Use for all layout, spacing, and responsive design. |
| shadcn/ui | latest | Component library | Not an npm package — copies components into your project. Best library for production-quality accessible components (dialogs, dropdowns, toasts). Ships with Tailwind v4 as of 2026. |

### Database

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Neon Postgres | managed | Primary database (users, songs, lessons, progress, subscriptions) | Serverless Postgres that powers Vercel Postgres natively. Built-in connection pooling (PgBouncer) is essential for Next.js serverless — avoids the connection exhaustion problem that plagues Supabase on high-traffic Vercel deployments. Database branching creates preview environments automatically. Free tier is usable for development. |
| Drizzle ORM | 0.30.x | Database access layer | Chosen over Prisma for this project specifically: KitsuBeat will likely deploy to Vercel's serverless Edge infrastructure, where Drizzle's smaller bundle and SQL-transparent query model outperforms Prisma. Schema is defined in TypeScript (no separate .prisma file), which simplifies the monorepo. Drizzle surpassed Prisma in weekly downloads in late 2025. |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Clerk | Core 3.x (released March 2026) | User accounts, session management, freemium gating | Clerk has the deepest Next.js 15 App Router integration of any auth provider. The `has()` method and `<Protect>` component handle freemium feature gating natively without building custom middleware. Free tier covers 50,000 MAU — more than enough for launch. Core 3 (released March 3, 2026) resolves previous RSC compatibility issues. Better Auth is a valid self-hosted alternative but adds operational overhead. |

### Payments

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Lemon Squeezy (via Stripe Managed Payments) | latest | Freemium subscriptions, one-time purchases | Stripe acquired Lemon Squeezy in 2024. The combined product (Stripe Managed Payments) gives you Lemon Squeezy's simple API plus Stripe's infrastructure. Critically: it acts as Merchant of Record, handling VAT/GST globally. For an anime/language learning app with an international audience (Japan, Brazil, EU, US), MoR removes significant tax compliance burden. Stripe direct requires you to collect and remit sales tax yourself. Use Lemon Squeezy's official Next.js billing package. |

### AI / Content Generation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK | 4.x (ai@4.x) | Structured output generation from Claude | Wraps Anthropic API with `generateObject()` for schema-constrained outputs. This is the right tool for pre-generating lessons (furigana, grammar annotations, translations) in a type-safe way. `@ai-sdk/anthropic@1.x` is the Anthropic provider. |
| @anthropic-ai/sdk | 0.82.x | Direct Claude API access | Use this for background content generation scripts (seeding the 200 song lessons) where you don't need the Vercel AI SDK streaming abstractions. Requires Node 18+. |

### YouTube Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-player | 2.x | YouTube embed with playback control | Maintained by Mux (taken over 2024), actively developed. Supports YouTube, provides `onProgress` callback at configurable intervals (use 250ms for lyrics sync). Critical advantage over react-youtube: react-youtube's latest version (10.1.0) was published 3 years ago and has one maintainer — too risky for a core dependency. react-player has broader multi-platform support and better maintenance posture. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.x | Schema validation | Validate all API inputs, Claude-generated lesson content, and form submissions. Use with react-hook-form for client forms. Pairs with Drizzle for runtime type safety. |
| react-hook-form | 7.x | Form handling | Sign-up/login forms, settings. Minimal re-renders. Use with Zod resolver. |
| kuroshiro + kuromoji | 1.x + 0.1.x | Japanese tokenization and furigana generation | Used during content pre-generation (server-side, not client-side). kuroshiro converts kanji to hiragana with furigana mode; kuromoji is its tokenizer backend. Pre-generate all furigana and store in DB — do not run tokenization on the client or at request time. Note: kuromoji.js core package is 8 years old but has no modern full replacement in JS. Use @sglkc/kuromoji fork if kuromoji.js exhibits Node 18+ compatibility issues. |
| react-furi | latest | Render furigana (ruby text) in UI | Thin React component rendering kanji+reading pairs as HTML `<ruby>` elements. Use with pre-generated furigana data from DB. Do not use as a tokenizer — it only renders. |
| @upstash/ratelimit + @upstash/redis | latest | Rate limiting Claude API calls and content gen endpoints | HTTP-based, works in Vercel serverless and Edge. Prevents abuse of Claude API endpoints. Essential for any API route that proxies to Claude. |
| Zustand | 5.x | Client state (player state, current lyric index) | Lightweight client state for video player position, active verse tracking, and vocabulary panel open/close. Do not use Redux — overkill. Do not use TanStack Query for this (it's server state, not client state). |
| TanStack Query | 5.x | Server state caching | Song library fetching, lesson data, user progress. Handles stale-while-revalidate, background refetching, and optimistic updates for progress tracking. Coexists with Zustand: TanStack Query = server state, Zustand = client state. |
| next-themes | latest | Dark mode | Single-dependency dark mode with system preference detection. KitsuBeat's anime aesthetic calls for dark mode as default. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit and integration tests | Faster than Jest, native TypeScript, compatible with Next.js 15. Test lesson generation logic, furigana parsing utilities, and Clerk webhook handlers. |
| Playwright | E2E tests | Test the full "play song + lyrics sync" flow and checkout flow. Run against a Neon preview branch. |
| Drizzle Kit | Migration management | `drizzle-kit generate` and `drizzle-kit migrate` for schema evolution. Part of the Drizzle ecosystem. |
| ESLint + Prettier | Linting and formatting | Use Next.js ESLint config. Add eslint-plugin-tailwindcss to catch Tailwind class ordering issues. |
| Turbopack | Dev server bundler | Enabled by default in Next.js 15 dev mode. Do not switch to Webpack — Turbopack is 10-700x faster for HMR. |

---

## Installation

```bash
# Bootstrap project
npx create-next-app@latest kitsubeat --typescript --tailwind --eslint --app --src-dir

# Core runtime deps
npm install drizzle-orm @neondatabase/serverless
npm install @clerk/nextjs
npm install ai @ai-sdk/anthropic @anthropic-ai/sdk
npm install react-player
npm install react-hook-form zod @hookform/resolvers
npm install zustand @tanstack/react-query
npm install react-furi
npm install next-themes
npm install kuroshiro @sglkc/kuromoji

# Lemon Squeezy payments
npm install @lemonsqueezy/lemonsqueezy.js

# Rate limiting
npm install @upstash/ratelimit @upstash/redis

# Dev dependencies
npm install -D drizzle-kit
npm install -D vitest @vitejs/plugin-react
npm install -D @playwright/test
npm install -D eslint-plugin-tailwindcss

# shadcn/ui (installs components into project, not as a package)
npx shadcn@latest init
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Drizzle ORM | Prisma | If the team prefers a visual schema editor, automated migrations, or is unfamiliar with SQL. Prisma 7 narrowed the performance gap. |
| Clerk | Better Auth | If you want zero auth vendor lock-in and are comfortable hosting your own auth server. Adds 1-2 days of setup vs Clerk's <2 hours. |
| Clerk | NextAuth v5 (Auth.js) | If auth budget is zero and user management features (MFA, org management) are not needed. Higher implementation effort. |
| Lemon Squeezy | Stripe direct | If you expect >$50K MRR and need custom checkout flows. Stripe direct requires you to handle VAT/tax compliance yourself. |
| Neon Postgres | Supabase | If you want a Firebase-alternative with realtime subscriptions and a built-in admin dashboard. Supabase has connection pooling issues under heavy Vercel serverless load. |
| react-player | Custom YouTube IFrame API | If you need sub-100ms timing precision for lyrics sync. react-player's `onProgress` fires at ~250ms intervals by default, which is acceptable for verse-level sync. For word-level karaoke sync, you'd need to poll `player.getCurrentTime()` manually via the underlying YT player instance. |
| Vercel AI SDK | @anthropic-ai/sdk direct | For background/offline content generation scripts (seeding songs). Use the Anthropic SDK directly there — no need for streaming UI abstractions. |
| TanStack Query | SWR | Both are valid. TanStack Query has better TypeScript inference, more cache control, and better Zustand coexistence patterns. SWR is simpler but less powerful. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-youtube | Last published 3 years ago (v10.1.0), single maintainer, no active development | react-player (maintained by Mux, multi-source support) |
| Pages Router | Entering maintenance mode, no Server Components, no Server Actions | App Router |
| Tailwind v3 | v4 is the current standard; shadcn/ui is updating all components for v4 | Tailwind v4 |
| Redux / Redux Toolkit | Overcomplicated for this scale; Server Components + TanStack Query + Zustand cover all state cases | Zustand (client state) + TanStack Query (server state) |
| kuromoji.js (vanilla) | 8-year-old package, potential Node 18+ issues | @sglkc/kuromoji (modern fork) or use Claude API to generate furigana server-side during content pre-gen |
| Client-side furigana tokenization | Kuromoji ships a 30MB dictionary; loading it in the browser is impractical | Pre-generate all furigana data during content seeding, store in DB, serve as JSON |
| Supabase auth | Auth and database entangled — hard to migrate one without the other; use separate best-of-breed services | Clerk (auth) + Neon (database) separately |
| OpenAI API | The project explicitly uses Claude; mixing AI providers adds complexity and cost unpredictability | Anthropic Claude via Vercel AI SDK |

---

## Stack Patterns by Variant

**For content pre-generation (offline seeding pipeline):**
- Use `@anthropic-ai/sdk` directly with structured prompts
- Run kuroshiro + kuromoji server-side in a Node script
- Output lesson JSON to database via Drizzle
- Do not run this at request time

**For the production web app:**
- Use Vercel AI SDK (`generateObject`) only if users trigger on-demand generation (e.g., custom song requests in a future phase)
- All 200 curated songs: pre-generated, no Claude calls at request time

**For lyrics timing sync:**
- Store lyric timings as `{ startMs: number, endMs: number, text: string }[]` in Postgres (jsonb column)
- Use react-player's `onProgress` callback (interval: 250ms) to get current playback position
- Match active lyric in Zustand client state using `currentTimeMs >= startMs && currentTimeMs < endMs`
- Do NOT rely on YouTube API's native time events — there are none; polling is the standard approach

**For freemium gating:**
- Store `plan` field on Clerk user metadata (`free` | `pro`)
- Use Clerk's `has()` server-side helper in Server Components to gate premium songs
- Sync Lemon Squeezy webhook events → update Clerk user metadata on successful payment

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15.x | React 19.x | Next.js 15 requires React 19. Some third-party libraries may not support React 19 yet — check before installing. |
| Clerk Core 3.x | Next.js 15 App Router | Core 3 (March 2026) resolves RSC compatibility issues from Core 2. Do not use Clerk <3.0 with Next.js 15. |
| Tailwind v4 | shadcn/ui latest | shadcn/ui CLI as of early 2026 initializes with Tailwind v4. Older shadcn component installs may use v3 syntax — use `npx shadcn@latest` to get updated components. |
| drizzle-orm 0.30.x | @neondatabase/serverless | Use Neon's serverless HTTP driver (`neon()`) with Drizzle, not `pg` or `postgres.js` — the serverless driver works without persistent connections, which is required on Vercel. |
| ai@4.x | @ai-sdk/anthropic@1.x | Must use `@ai-sdk/anthropic` provider package, not `@anthropic-ai/sdk` directly, when using Vercel AI SDK's `generateObject`. Both can coexist in the same project for different use cases. |
| kuroshiro@1.x | @sglkc/kuromoji (fork) | kuroshiro's docs reference `kuromoji`, but the vanilla `kuromoji` package has Node 18+ async issues. Use `@sglkc/kuromoji` as a drop-in replacement with the same API. |

---

## Sources

- [Next.js App Router docs](https://nextjs.org/docs/app/getting-started) — App Router status, Server Components, Server Actions
- [shadcn/ui Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 + shadcn compatibility confirmed
- [Clerk Billing for B2C docs](https://clerk.com/docs/nextjs/guides/billing/for-b2c) — `has()` gating method, Core 3 release date
- [Neon + Vercel integration](https://vercel.com/marketplace/neon) — Neon as Vercel Postgres, connection pooling
- [Vercel AI SDK docs](https://vercel.com/docs/ai-sdk) — `generateObject`, `@ai-sdk/anthropic` provider
- [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) — Unified generateObject/generateText, Agent abstraction
- [Anthropic SDK npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.82.0 current, Node 18+ required
- [react-player GitHub](https://github.com/cookpete/react-player) — Mux maintenance takeover, active status
- [react-youtube npm](https://www.npmjs.com/package/react-youtube) — v10.1.0, last published 3 years ago (maintenance concern)
- [Drizzle vs Prisma 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — Drizzle recommendation for serverless/edge
- [Upstash ratelimit docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — HTTP-based, Vercel Edge compatible
- [Stop Using kuromoji.js](https://aiktb.dev/blog/better-kuromoji-fork) — @sglkc/kuromoji as modern fork
- [Lemon Squeezy 2026 update](https://www.lemonsqueezy.com/blog/2026-update) — Stripe Managed Payments, MoR model
- [YouTube IFrame API reference](https://developers.google.com/youtube/iframe_api_reference) — No native timeupdate event; polling required
- WebSearch: "Next.js 15 App Router full stack web app 2026" — MEDIUM confidence, corroborated by official docs
- WebSearch: "Drizzle ORM vs Prisma Next.js 2025 2026" — MEDIUM confidence, multiple sources agree
- WebSearch: "Better Auth vs Clerk vs NextAuth 2026" — MEDIUM confidence, corroborated by Clerk official docs

---

*Stack research for: Anime music-based language learning web app (KitsuBeat)*
*Researched: 2026-04-06*
