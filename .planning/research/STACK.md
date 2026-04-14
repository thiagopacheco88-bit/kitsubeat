# Stack Research

**Domain:** Anime music-based Japanese language learning web app — exercise/learning system additions
**Project:** KitsuBeat (Milestone 2 additions only)
**Researched:** 2026-04-13
**Confidence:** HIGH (auth, payments, SRS algorithm, animation) / MEDIUM (exercise engine state patterns)

> This file covers ONLY net-new additions for Milestone 2. The baseline stack (Next.js 15, React 19,
> TypeScript, Neon Postgres, Drizzle ORM 0.41, Tailwind 4, kuroshiro/kuromoji, Anthropic SDK,
> wavesurfer.js) is already in place and not re-litigated here.

---

## Net-New Stack Additions

### Authentication — User Accounts & Session

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @clerk/nextjs | ^6.x (Core 3, Mar 2026) | User auth, session management, JWT claims | Deepest Next.js 15 App Router integration of any auth provider. `clerkMiddleware()` in middleware.ts, `auth()` server helper, and `<ClerkProvider>` client wrapper. Core 3 (released March 3, 2026) resolves RSC compatibility issues. The `userId` from `auth()` becomes the foreign key in every user-scoped Drizzle table. Free tier: 10,000 MAU. No self-hosted infrastructure. |

**Integration with Drizzle:** Clerk stores identity. Neon stores progress. The pattern is: `clerk_user_id TEXT NOT NULL` as the FK on all user tables (no separate `users` table needed initially). Clerk's `userId` is stable, globally unique, and available in every Server Action via `auth()`. Neon's official guide confirms this exact Clerk + Drizzle + Neon pattern.

### Payments — Freemium Subscriptions

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe | ^17.x | Checkout sessions, webhook verification, Customer Portal | Stripe direct is the right choice at pre-revenue/early stage. MoR fees (Lemon Squeezy: 5% + $0.50; Polar: 4%) are meaningfully higher than Stripe's ~2.9% + $0.30. At this stage, tax complexity is not yet a real burden — "there's no point preparing for global tax remittance before you have a viable business" (Geoff Roberts, Outseta). Stripe Managed Payments (MoR mode) is still in limited preview as of 2026. Migrate to Polar or Lemon Squeezy when EU VAT compliance becomes operationally painful (typically $100K+ ARR). |
| @stripe/stripe-js | ^5.x | Browser-side Embedded Checkout | Stripe now strongly recommends Embedded Checkout (iframe mode, `ui_mode: 'embedded'`). Keeps users on your domain, offloads PCI compliance to Stripe, no redirect required. Pairs with Server Actions for session creation. |
| @stripe/react-stripe-js | ^3.x | `<EmbeddedCheckout>` React component | Renders the embedded Stripe checkout UI inside a Next.js page. Works with App Router. |

**Webhook pattern for Next.js 15:** Route handler at `app/api/webhooks/stripe/route.ts`. Use `await request.text()` (not `request.body()`) for raw body required by `stripe.webhooks.constructEvent()`. Handle `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_succeeded`. Store subscription status in a `subscriptions` Drizzle table keyed by `clerk_user_id`.

**Freemium gating:** Store `plan: 'free' | 'pro'` derived from the `subscriptions` table. Check in Server Components via a DB query — do not rely solely on Clerk metadata (keep Stripe as source of truth, sync to Clerk public metadata on webhook for faster reads if needed).

### SRS Algorithm — Kana Trainer & Mastery Decay

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ts-fsrs | ^5.x | FSRS v6 spaced repetition scheduler | Purpose-built TypeScript SRS library. Implements the FSRS v6 algorithm (the current gold standard, replacing SM-2). Core API: `createEmptyCard()`, `fsrs()`, `scheduler.repeat()`, `scheduler.next(Rating.Good)`. Supports ES modules, CommonJS, and UMD. Actively maintained (78 releases, March 2026 update). Node.js >=20 required — matches current Next.js 15 deployment targets. Zero dependencies. Works in browser and server. |

**Why not custom weighted random:** The project spec describes a "10-star decay system with weighted random selection." FSRS v6 subsumes this: it outputs `due` timestamps and `stability`/`difficulty` floats per card. Map the star system onto FSRS state: `Rating.Again` = stars decrease, `Rating.Good/Easy` = stars increase. Persist the FSRS card state (stability, difficulty, due, reps) per vocab item per user in Drizzle. Use FSRS for scheduling, display stars as a UI metaphor for retention strength.

**Schema addition (Drizzle):**
```typescript
// user_vocab_mastery table
export const userVocabMastery = pgTable('user_vocab_mastery', {
  id: serial('id').primaryKey(),
  clerk_user_id: text('clerk_user_id').notNull(),
  vocab_surface: text('vocab_surface').notNull(), // joins to lesson JSONB
  song_slug: text('song_slug'),                   // null = cross-song index
  // FSRS fields
  stability: real('stability').default(0),
  difficulty: real('difficulty').default(5),
  elapsed_days: integer('elapsed_days').default(0),
  scheduled_days: integer('scheduled_days').default(0),
  reps: integer('reps').default(0),
  lapses: integer('lapses').default(0),
  state: integer('state').default(0),  // FSRS State enum
  due: timestamp('due').defaultNow(),
  last_review: timestamp('last_review'),
  // Star UI
  stars: integer('stars').default(0).notNull(), // 0-10
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => ({
  userVocabIdx: uniqueIndex('user_vocab_idx').on(t.clerk_user_id, t.vocab_surface),
}));
```

### Exercise Engine — State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.x (already in existing STACK.md) | Exercise session state | Already in the recommended stack. Use a dedicated `useExerciseStore` slice: `currentExercise`, `queue`, `score`, `sessionComplete`. Zustand is sufficient — XState adds significant complexity overhead for a 7-exercise-type engine at this scale. The quiz engine GitHub examples consistently use Zustand. |

**Exercise session architecture:** Do NOT use XState unless the exercise graph has more than ~15 distinct states with guard conditions. Zustand + a `phase` enum (`'idle' | 'question' | 'feedback' | 'complete'`) covers all 7 exercise types cleanly. Generate exercise queues server-side (Server Action returns array of exercise items), client holds queue in Zustand, submits answers via Server Actions that update Drizzle mastery rows.

### Animation — Exercise Feedback

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| motion | ^12.x | Correct/wrong answer animations, exercise transitions | Formerly framer-motion, rebranded to `motion` in late 2024. Import from `"motion/react"`. React 19 fully supported in v12. API surface identical to framer-motion — same `<motion.div>`, `AnimatePresence`, `useAnimation`. Used by quiz apps for answer reveal animations, confetti-on-complete, and card flip transitions. shadcn/ui is converging on motion. |

**Note:** `framer-motion` still works as a package name (aliased) but new installs should use `motion`. The package name on npm is `motion`, not `framer-motion`.

### Notifications — Feedback Toasts

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| sonner | ^2.x | Toast notifications for exercise feedback, errors | shadcn/ui's official toast component. 31.2M weekly downloads vs react-hot-toast's 3.5M. No hook required — call `toast.success()` from anywhere. Global observer pattern persists toasts across route changes in Next.js. TypeScript-first. One `<Toaster />` in layout.tsx. |

---

## Existing Libraries — Confirmed Still Correct

These were already in the prior STACK.md and remain the right choice:

- **Zod 3.x** — Validate exercise answer payloads in Server Actions
- **Zustand 5.x** — Exercise session state (see above)
- **TanStack Query 5.x** — Fetch user mastery data, cross-song vocab index
- **shadcn/ui latest** — Exercise card UI components, progress bars, dialogs

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Lemon Squeezy (at launch) | 5% + $0.50 per transaction is ~10% on $10 products; Stripe Managed Payments (their MoR) is still limited preview | Stripe direct; revisit Polar/LemonSqueezy at $100K+ ARR |
| XState | Adds 40KB+ and significant cognitive overhead for an exercise state machine that fits in a 15-line Zustand store | Zustand + `phase` enum |
| Custom SRS algorithm | Requires careful tuning, academic validation; FSRS v6 is peer-reviewed and battle-tested in Anki | ts-fsrs |
| NextAuth / Auth.js | More setup than Clerk for the same outcome; no built-in user management UI, MFA, or plan gating helpers | Clerk |
| Prisma | Already using Drizzle; no reason to add a second ORM | Drizzle (continue) |
| react-hot-toast | Lower weekly downloads, less shadcn/ui ecosystem integration than sonner | sonner |
| IndexedDB / Dexie (offline SRS) | Adds sync complexity; users expect server-backed progress | Server-side Drizzle rows |
| react-confetti | Standalone package for one use case; motion handles confetti via keyframe animations | motion |
| Stripe Tax add-on | Adds cost (0.5-2% of transaction) without removing legal responsibility; you still file returns yourself | Handle manually at small scale, migrate to Polar when needed |

---

## Installation (net-new only)

```bash
# Authentication
npm install @clerk/nextjs

# Payments
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# SRS algorithm
npm install ts-fsrs

# Animation
npm install motion

# Toast notifications
npm install sonner
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Stripe direct | Polar.sh (MoR) | When EU VAT compliance becomes operationally painful; Polar's 4% fee is the lowest MoR option with good DX for indie developers |
| Stripe direct | Lemon Squeezy | If you want MoR from day one and can absorb the ~5% + $0.50 fees; simpler API than Stripe |
| ts-fsrs (FSRS v6) | Custom weighted random | Only if you need a simpler "score 0-10" system without full SRS scheduling; loses the scientifically-validated review interval calculation |
| Clerk | Better Auth (self-hosted) | If vendor lock-in is unacceptable and you have DevOps capacity to maintain auth infrastructure |
| motion | CSS animations only | If animation budget is 0 and you want zero JS overhead; CSS handles simple transitions adequately |
| sonner | shadcn/ui `<Toast>` component | If you're already using shadcn's toast primitive and don't want an extra dependency |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @clerk/nextjs ^6.x | Next.js 15 + React 19 | Clerk Core 3 (Mar 2026) resolves previous RSC issues. Requires `clerkMiddleware()` in `middleware.ts`, not the legacy `authMiddleware`. |
| ts-fsrs ^5.x | Node.js >=20 | Next.js 15 on Vercel deploys on Node 20+. Confirm with `node --version` locally. |
| motion ^12.x | React 19 + Next.js 15 | Full React 19 support in motion v12. Import from `"motion/react"`, NOT `"framer-motion"` for new code. |
| stripe ^17.x | Node.js 18+ | Server-only. Never import `stripe` in Client Components. Use Server Actions or Route Handlers exclusively. |
| @stripe/stripe-js ^5.x | React 19 | Browser-only. Loaded lazily via `loadStripe()`. Compatible with Next.js App Router. |
| sonner ^2.x | React 19 + Next.js 15 | Works in Client Components. Place `<Toaster />` in `app/layout.tsx` inside `<ClerkProvider>`. |

---

## Drizzle Schema Additions (Summary)

New tables needed for this milestone, all keyed by `clerk_user_id`:

```
users_meta         — plan ('free'|'pro'), display preferences, onboarding state
subscriptions      — stripe_customer_id, stripe_subscription_id, status, plan, period_end
user_vocab_mastery — FSRS state per vocab item per user (see schema above)
user_exercise_log  — exercise_type, song_slug, score, completed_at (analytics/streaks)
```

No changes needed to existing `songs`, `song_versions`, or lesson JSONB columns. Exercise content is derived at runtime from existing JSONB lesson data — no separate exercise storage table needed.

---

## Sources

- [Neon: Next.js auth with Clerk + Drizzle + Neon](https://neon.com/blog/nextjs-authentication-using-clerk-drizzle-orm-and-neon) — Clerk + Drizzle integration pattern confirmed, HIGH confidence
- [GitHub: neon-clerk-drizzle-nextjs example](https://github.com/raoufchebri/neon-clerk-drizzle-nextjs) — Working reference implementation
- [ts-fsrs GitHub](https://github.com/open-spaced-repetition/ts-fsrs) — v5.x, FSRS v6, Node >=20, active maintenance confirmed
- [ts-fsrs npm](https://www.npmjs.com/package/ts-fsrs) — Package metadata and install size
- [Stripe + Next.js 2026 guide](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33) — Server Action checkout pattern, Embedded Checkout
- [Stripe subscription lifecycle Next.js](https://dev.to/thekarlesi/stripe-subscription-lifecycle-in-nextjs-the-complete-developer-guide-2026-4l9d) — Webhook events, `request.text()` pattern
- [Just use Stripe directly (Prototypr)](https://prototypr.io/post/stripe-merchant-of-record) — MoR threshold argument, Geoff Roberts quote
- [Stripe vs Lemon Squeezy vs Polar vs Creem (TurboStarter)](https://www.turbostarter.dev/blog/stripe-vs-lemonsqueezy-vs-polar-vs-creem-choosing-the-right-saas-payment-provider) — Fee comparison table
- [Motion docs](https://motion.dev/docs/react) — React 19 support confirmed in v12, import path change
- [motion v12 + React 19 RC thread](https://www.framer.community/c/developers/framer-motion-v12-alpha-for-react-19-rc) — Compatibility confirmed
- [Sonner vs react-hot-toast comparison (LogRocket 2025)](https://blog.logrocket.com/react-toast-libraries-compared-2025/) — Download stats, API comparison
- [React state management 2025 (Makers Den)](https://makersden.io/blog/react-state-management-in-2025) — XState vs Zustand complexity tradeoff
- WebSearch: "Stripe Next.js 15 App Router freemium subscription integration 2026" — MEDIUM confidence, corroborated by official Stripe docs pattern
- WebSearch: "ts-fsrs FSRS algorithm TypeScript npm 2025" — HIGH confidence after GitHub verification

---

*Stack research for: KitsuBeat Milestone 2 — exercise system, kana trainer, vocab tracking, auth, payments*
*Researched: 2026-04-13*
