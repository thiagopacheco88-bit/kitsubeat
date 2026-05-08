# Phase 15: Analytics & Error Tracking - Research

**Researched:** 2026-05-08
**Domain:** Product analytics (PostHog), error monitoring (Sentry), GDPR consent, Next.js 15 instrumentation
**Confidence:** HIGH

---

## Summary

Phase 15 layers observability on a Next.js 15 App Router codebase (Vercel-hosted, Clerk auth,
Supabase/Neon Postgres, Drizzle ORM). The codebase already has a thin homegrown error-reporting
path (`error.tsx` / `global-error.tsx` → `/api/client-errors` → `console.error` → Vercel logs)
and a gamification analytics stub (`src/lib/analytics.ts`) that explicitly calls out "Phase 15
swaps the body for PostHog event emission." Both hand-off points are clean seams.

PostHog is the clear choice over Plausible for KitsuBeat's funnel needs. Plausible is pageview-only;
PostHog supports funnels, cohorts, session recording, and the server-side `posthog-node` SDK — all
needed for the "signup → first star → day-7 return" funnel. PostHog Cloud US free tier is 1M
events/month, sufficient for beta.

Sentry `@sentry/nextjs` v10 is the standard error monitoring layer. The wizard sets up all three
runtime configs (client, server, edge), source maps upload automatically during Vercel build via
`withSentryConfig`, and source maps are deleted from the public bundle after upload by default
(`sourcemaps.deleteSourcemapsAfterUpload: true` is the default since v8+).

GDPR consent is the central design constraint. UK PECR requires prior opt-in consent for
non-essential analytics cookies. The recommended architecture: PostHog initialized with
`opt_out_capturing_by_default: true` and `cookieless_mode: 'on_reject'` — events are queued
but not sent until the user accepts. After acceptance, `posthog.opt_in_capturing()` is called
and tracking begins. Sentry error tracking can start immediately (no cookie = no consent needed;
Sentry is a legitimate-interest processing activity, not advertising tracking).

**Primary recommendation:** PostHog (Cloud US, free tier) with `opt_out_capturing_by_default: true`
for analytics; Sentry v10 for errors. Consent banner shows on first visit; Sentry runs
unconditionally.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Analytics event capture (funnel events) | Client (posthog-js) | Server actions (posthog-node) | Most funnel events are UI-driven (first star, exercise complete); server actions for signup and streak events |
| Error capture | Client (Sentry browser) + Server (Sentry node) | Edge (Sentry edge) | Sentry covers all three runtimes via instrumentation files |
| Consent state management | Client (localStorage via posthog) | — | PostHog's `get_explicit_consent_status()` persists to localStorage; no server cookie |
| Consent banner rendering | Client component | — | Must be client for hydration-safe `useState` + posthog API calls |
| User identity link (Clerk → PostHog) | Client (posthog.identify) | Server actions (posthog-node.capture with distinct_id) | Clerk userId becomes PostHog distinct_id; identify() called after sign-in |
| Source maps upload | Build-time (Vercel CI via withSentryConfig) | — | `@sentry/nextjs` v10 auto-uploads during `next build`; maps deleted from public bundle |
| Funnel dashboard | PostHog Cloud UI | — | No in-app dashboard; PostHog Insights → Funnels |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| posthog-js | 1.372.10 | Client-side analytics, funnels, session recording | Official JS SDK; autocaptures pageviews, has opt-in/opt-out consent API |
| posthog-node | 5.33.4 | Server-side event capture from server actions | Required for server-component and server-action event emission |
| @sentry/nextjs | 10.52.0 | Error monitoring across client + server + edge | Official Sentry SDK; single package covers all Next.js runtimes; wizard handles config |

[VERIFIED: npm registry via `npm view`]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none additional) | — | — | The three packages above cover all requirements |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostHog | Plausible | Plausible is pageview-only, no funnel/cohort/session recording; cannot track "first star" custom events |
| PostHog | Mixpanel | Mixpanel has no free tier at scale; PostHog is open source with generous free tier |
| @sentry/nextjs | Bugsnag | Bugsnag has weaker Next.js App Router support; Sentry wizard is the industry default |

**Installation:**

```bash
npm install posthog-js posthog-node @sentry/nextjs
```

**Version verification:** Confirmed 2026-05-08 via `npm view`.

---

## Architecture Patterns

### System Architecture Diagram

```
User Browser
  │
  ├─ posthog-js (client)
  │    ├─ consent check (get_explicit_consent_status)
  │    ├─ PENDING → show ConsentBanner
  │    ├─ GRANTED → posthog.capture("event_name", props)
  │    │             posthog.identify(clerkUserId)
  │    └─ DENIED  → no events sent
  │
  ├─ Sentry browser SDK (always active, no consent needed)
  │    └─ captures unhandled errors → Sentry Cloud
  │
  └─ page.tsx / Server Components
       └─ posthog-node (server)
            └─ capture server-side events (signup, streak) → PostHog Cloud
                 (uses Clerk userId as distinct_id)

Vercel Build
  └─ next build
       └─ withSentryConfig(nextConfig, { org, project, authToken })
            ├─ uploads source maps to Sentry
            └─ deletes .map files from public bundle (deleteSourcemapsAfterUpload: true default)

GitHub CI (qa-suite.yml)
  └─ SENTRY_AUTH_TOKEN added as GitHub secret (build-time only, not NEXT_PUBLIC_*)
```

### Recommended Project Structure

```
instrumentation-client.ts    ← PostHog init + Sentry.init (client)
instrumentation.ts           ← Sentry server + edge registration; onRequestError
sentry.client.config.ts      ← Sentry client config (imported by instrumentation-client)
sentry.server.config.ts      ← Sentry server config (imported by instrumentation)
sentry.edge.config.ts        ← Sentry edge config (imported by instrumentation)
src/
├── components/
│   └── ConsentBanner.tsx    ← "use client"; opt_in/opt_out; hides on prior decision
├── lib/
│   ├── analytics.ts         ← REPLACE stub with posthog-js wrappers
│   └── posthog-server.ts   ← PostHog Node client singleton (server actions only)
└── app/
    ├── layout.tsx           ← add <ConsentBanner /> (already has Sentry global-error)
    └── global-error.tsx     ← EXTEND: add Sentry.captureException (already sends to /api/client-errors)
next.config.ts               ← wrap with withSentryConfig(...)
.env.example                 ← add NEXT_PUBLIC_POSTHOG_TOKEN, NEXT_PUBLIC_POSTHOG_HOST, SENTRY_DSN
.env.sentry-build-plugin     ← SENTRY_AUTH_TOKEN (auto-created by wizard, gitignored)
```

### Pattern 1: PostHog Client Initialization (Consent-Gated)

**What:** Initialize PostHog in `instrumentation-client.ts` with consent-blocked default.
**When to use:** Root of the client-side app; runs once before any page renders.

```typescript
// instrumentation-client.ts
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  opt_out_capturing_by_default: true,  // GDPR: no events until consent
  cookieless_mode: 'on_reject',        // no cookie until accepted; uses memory until then
  person_profiles: 'identified_only',  // only create profiles for identified (signed-in) users
  disable_session_recording: true,     // enable only after explicit acceptance if desired
})
// Source: PostHog docs https://posthog.com/tutorials/nextjs-cookie-banner
```

### Pattern 2: Consent Banner Component

**What:** Client component that reads PostHog consent state and shows banner only on first visit.
**When to use:** Rendered in `layout.tsx` above `<main>`.

```typescript
// src/components/ConsentBanner.tsx
'use client'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

export function ConsentBanner() {
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    setStatus(posthog.get_explicit_consent_status())
  }, [])

  if (status !== 'pending') return null  // hide for returning users

  return (
    <div role="dialog" aria-labelledby="consent-title">
      <p id="consent-title">We use analytics to improve KitsuBeat. No ads, no third parties.</p>
      <button onClick={() => { posthog.opt_in_capturing(); setStatus('granted') }}>
        Accept
      </button>
      <button onClick={() => { posthog.opt_out_capturing(); setStatus('denied') }}>
        Decline
      </button>
    </div>
  )
}
// Source: PostHog docs https://posthog.com/tutorials/nextjs-cookie-banner
```

### Pattern 3: PostHog User Identification (Clerk → PostHog)

**What:** Link Clerk userId to PostHog distinct_id so server and client events converge.
**When to use:** Client component rendered after sign-in (e.g., layout.tsx or auth callback).

```typescript
// Called after Clerk session is confirmed (client-side)
import posthog from 'posthog-js'

function identifyUser(clerkUserId: string) {
  posthog.identify(clerkUserId)
  // from now on all events from this browser are linked to this user
}
// Source: PostHog docs (identify() links anonymous session to known user)
```

### Pattern 4: PostHog Server-Side Capture (Server Actions)

**What:** Emit analytics events from server actions (signup, streak updates) using posthog-node.
**When to use:** When the event source is a server action (no browser context available).

```typescript
// src/lib/posthog-server.ts
import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

export function getPostHogServer(): PostHog {
  if (!_client) {
    _client = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_TOKEN!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0,  // immediate flush for serverless (Vercel)
      }
    )
  }
  return _client
}

// Usage in a server action:
// const ph = getPostHogServer()
// ph.capture({ distinctId: clerkUserId, event: 'first_star_earned', properties: { song_slug: slug } })
// await ph.shutdown()  // call in short-lived contexts
// Source: PostHog Node docs + instrumentation-client tutorial
```

### Pattern 5: Sentry Setup in next.config.ts

**What:** Wrap Next.js config with Sentry to enable source map upload and tunnel route.
**When to use:** Production builds via Vercel or CI.

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = { /* existing config */ }

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/sentry-tunnel',         // bypass ad-blockers
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,   // default true since v8; maps not public
  },
  silent: !process.env.CI,
})
// Source: Sentry docs https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
```

### Pattern 6: Sentry Initialization Files

**What:** Three runtime-specific configs; `instrumentation.ts` routes to the right one.
**When to use:** Required files; place in project root.

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,   // capture replay on every error
  replaysSessionSampleRate: 0.0,   // no session replay without explicit opt-in
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
})

// instrumentation-client.ts (extend existing or create)
// add: export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
// Source: Sentry docs https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

### Pattern 7: Analytics Stub Replacement

**What:** Replace the existing `src/lib/analytics.ts` stub with real PostHog calls.
**When to use:** The existing `trackGamification()` calls are already in 4+ server actions; swap the body.

```typescript
// src/lib/analytics.ts — REPLACE stub body
// Keep the GamificationEvent union type; replace the function body:
import posthog from 'posthog-js'

export function trackGamification(e: GamificationEvent, userId?: string): void {
  // Runs in client context — use posthog-js directly
  // userId is the Clerk userId (distinct_id)
  posthog.capture(e.event, { ...e, distinct_id: userId })
}
// For server-action callers: use getPostHogServer().capture() pattern instead
// Source: [ASSUMED] — based on existing codebase pattern + PostHog docs
```

### Pattern 8: Event Taxonomy for KitsuBeat Funnel

**What:** Defined event names and required properties for the core funnel.
**When to use:** Reference for every task that adds tracking.

```
Funnel: signup → first_exercise_complete → first_star_earned → day_7_return

Events to instrument:
  user_signed_up          { provider: 'email' }                    → Clerk webhook or sign-up page
  song_opened             { song_slug, jlpt_level, difficulty_tier }
  exercise_session_started { song_slug, exercise_types[] }
  exercise_session_saved  { song_slug, stars_before, stars_after, xp_gained }
  first_star_earned       { song_slug, star_number: 1|2|3 }
  streak_started          { streak_current: 1 }
  streak_updated          { streak_current, grace_applied }
  page_viewed             { $current_url }                          → PostHog autocapture

Day-7 return measurement:
  PostHog: Funnels → add "song_opened" step filtered to
  "event time >= 7 days after user_signed_up" for the same user.
  OR: create a "Returning after day 7" cohort in PostHog.
```

[ASSUMED] — event names chosen to match existing GamificationEvent union and Phase 15 success criteria; confirm with Thiago before locking.

### Anti-Patterns to Avoid

- **Tracking before consent:** Never call `posthog.capture()` without checking `has_opted_in_capturing()` first (the `opt_out_capturing_by_default: true` init config handles this automatically at SDK level — don't add manual guards that could create inconsistency).
- **NEXT_PUBLIC_ prefix on SENTRY_AUTH_TOKEN:** `SENTRY_AUTH_TOKEN` is build-time only; must NOT have `NEXT_PUBLIC_` prefix (would leak the token to the browser bundle).
- **Session replay without consent:** `replaysSessionSampleRate: 0.0` by default; only enable after user consents. `replaysOnErrorSampleRate: 1.0` is OK without consent (Sentry legitimate interest for debugging).
- **posthog.identify() before consent:** Calling `identify()` before `opt_in_capturing()` creates a person profile without consent. Wrap in `has_opted_in_capturing()` check.
- **`posthog.shutdown()` in long-lived contexts:** Only call `shutdown()` in Vercel serverless functions; in long-lived server processes it terminates the client.
- **Turbopack + old @sentry/nextjs:** Sentry Turbopack support requires `@sentry/nextjs >= 10.13.0` + `next >= 15.4.1`. KitsuBeat uses `next ^15.5.14` and the current `@sentry/nextjs` is `10.52.0` — both satisfy the requirement. [VERIFIED: npm registry]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error capture + source maps | Custom error POST to /api/client-errors | @sentry/nextjs | Existing /api/client-errors is stdout-only; Sentry adds stack frames, source maps, replay, release tracking, alerting |
| Product analytics | Custom event table in Postgres | posthog-js + posthog-node | Funnel analysis, cohort queries, session replay require analytical infra; building it is months of work |
| Consent banner state | Custom cookie/localStorage logic | posthog.get_explicit_consent_status() | PostHog SDK manages consent persistence in localStorage; rolling it means duplicating logic and creating inconsistency |
| Day-7 return metric | Custom SQL query | PostHog Funnels + Cohorts | Retention curves, cohort analysis, funnel drop-off all built into PostHog; SQL approach doesn't scale to behavioral questions |
| Source map upload | Manual curl to Sentry API | withSentryConfig + SENTRY_AUTH_TOKEN | withSentryConfig handles map generation, upload, and deletion in the build step |

**Key insight:** The existing `/api/client-errors` route logs to stdout — it's a stop-gap, not a solution. Sentry replaces it with actual debugging context (source maps, breadcrumbs, user session).

---

## Common Pitfalls

### Pitfall 1: PostHog Fires Before Consent on First Load

**What goes wrong:** Events captured during SSR hydration before the consent banner renders.
**Why it happens:** `instrumentation-client.ts` runs before any React component mounts; if `opt_out_capturing_by_default` is not set, autocapture fires immediately.
**How to avoid:** Always set `opt_out_capturing_by_default: true` in `posthog.init()`. With this flag, events are silently dropped until `opt_in_capturing()` is called.
**Warning signs:** Seeing events in PostHog from users who immediately left (bounce before banner renders).

### Pitfall 2: SENTRY_AUTH_TOKEN in Build Env vs Runtime Env

**What goes wrong:** Auth token exposed to client bundle OR not available during Vercel build.
**Why it happens:** Confusion between `NEXT_PUBLIC_` (client bundle) and non-prefixed (server/build-time only).
**How to avoid:** `SENTRY_AUTH_TOKEN` must be set in Vercel project settings under "Build environment variables" — NOT as a runtime variable. Do not add `NEXT_PUBLIC_` prefix. The Sentry wizard writes it to `.env.sentry-build-plugin` which is auto-gitignored.
**Warning signs:** Source maps not appearing in Sentry; build failing with auth error.

### Pitfall 3: PostHog identify() Creates Profile Without Consent

**What goes wrong:** Calling `posthog.identify(clerkUserId)` before the user accepts the consent banner creates a person profile in PostHog linked to a real identifier, which is GDPR-regulated.
**Why it happens:** Auth state resolves quickly; developers call identify() in a useEffect on sign-in before checking consent.
**How to avoid:** Only call `posthog.identify()` inside a `has_opted_in_capturing()` guard, OR after `opt_in_capturing()` is called in the consent banner.
**Warning signs:** Person profiles in PostHog for users who declined tracking.

### Pitfall 4: Sentry Turbopack + Old @sentry/nextjs

**What goes wrong:** Source maps upload silently fails with Turbopack if SDK version is below 10.13.0.
**Why it happens:** Turbopack builds have different compilation order; source maps upload after build instead of during.
**How to avoid:** KitsuBeat's `@sentry/nextjs@10.52.0` + `next^15.5.14` already satisfies the requirement. Do not downgrade either package.
**Warning signs:** Build completes but "No source maps found" in Sentry release.

### Pitfall 5: posthog-node flushInterval in Vercel Functions

**What goes wrong:** Events from server actions never arrive in PostHog.
**Why it happens:** Vercel functions are short-lived; the default flush interval batches events but the function terminates before the batch fires.
**How to avoid:** Set `flushAt: 1, flushInterval: 0` in the posthog-node client (sends immediately). Call `await posthog.shutdown()` in truly one-shot contexts.
**Warning signs:** Custom server-side events missing; client events arrive but server events don't.

### Pitfall 6: Sentry global-error.tsx Conflict

**What goes wrong:** The wizard generates a new `global-error.tsx` that overwrites the existing one (which already has the custom `/api/client-errors` POST and styled UI).
**Why it happens:** The Sentry wizard assumes no existing `global-error.tsx`.
**How to avoid:** Do NOT run the Sentry wizard in automated mode. Manually add `Sentry.captureException(error)` inside the existing `useEffect` in `src/app/global-error.tsx` — keep the existing style and the `/api/client-errors` POST for belt-and-suspenders logging.
**Warning signs:** Existing styled error UI replaced by bare Sentry template.

### Pitfall 7: ConsentBanner Hydration Mismatch

**What goes wrong:** Server renders the banner (no consent state known) → client mounts with "pending" → flash of banner.
**Why it happens:** PostHog's `get_explicit_consent_status()` is a browser-only call; SSR can't know the state.
**How to avoid:** Initialize `status` as `''` (empty string) in `useState`. In `useEffect`, set it to the real status. Render nothing when `status === ''`. The banner only appears after hydration.
**Warning signs:** Banner flashes on every page load even for users who already consented.

---

## Code Examples

### Complete instrumentation-client.ts

```typescript
// instrumentation-client.ts (project root)
import posthog from 'posthog-js'
import * as Sentry from '@sentry/nextjs'

// PostHog — consent-gated
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  opt_out_capturing_by_default: true,
  cookieless_mode: 'on_reject',
  person_profiles: 'identified_only',
  disable_session_recording: true,
  capture_pageview: false,  // manual pageview via usePathname hook
})

// Sentry — always active (legitimate interest, no cookie placed)
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
// Source: Sentry docs; PostHog tutorials/nextjs-cookie-banner
```

### instrumentation.ts (server/edge Sentry)

```typescript
// instrumentation.ts (project root)
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
// Source: Sentry docs https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PHProvider wrapper component in layout | `instrumentation-client.ts` for PostHog init | Next.js 15.3+ | No provider wrapper needed; PostHog initializes before React hydration |
| Sentry v7/v8 Pages Router config files | v10 instrumentation-client.ts + sentry.*.config.ts pattern | 2024-2025 | Simpler; one entry point per runtime |
| posthog-js inside a React Provider | posthog-js directly via instrumentation-client | PostHog 2025 | Lower overhead; module-level singleton instead of Context re-renders |
| `replaysSessionSampleRate: 0.1` default | Set to 0.0 without consent gate | GDPR enforcement trend 2024+ | Session replay is PII under GDPR; needs explicit opt-in |

**Deprecated/outdated:**
- `app/providers.tsx` with `PostHogProvider`: still works but instrumentation-client is preferred for Next.js 15
- `sentry.client.config.js` as standalone file (without instrumentation-client): still supported but wizard now generates instrumentation-client pattern

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Event names in Pattern 8 (event taxonomy) match KitsuBeat's intended funnel | Pattern 8 | Events don't appear correctly in PostHog funnel; need to rename before querying |
| A2 | `trackGamification()` in server actions can be replaced with posthog-node; existing callers in client contexts use posthog-js directly | Pattern 7 | May need two separate implementations; existing call sites span both client and server |
| A3 | Sentry session replay (`replaysOnErrorSampleRate: 1.0`) is acceptable without explicit consent under UK legitimate interest | Pitfall section | ICO challenge possible; if risky, set to 0.0 and require consent |
| A4 | PostHog Cloud US (not EU) is acceptable for KitsuBeat's UK/Brazilian user base | Standard Stack | If EU hosting required (stricter interpretation), switch to `https://eu.i.posthog.com` — no code change, just env var |
| A5 | The existing `/api/client-errors` route will be kept alongside Sentry (belt-and-suspenders) | Architecture | If deleted, lose the console log tee to Vercel logs; acceptable if Sentry is trusted |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Session replay consent**
   - What we know: `replaysOnErrorSampleRate: 1.0` (Sentry) captures a replay when an error occurs; this may contain PII (keystrokes, form data)
   - What's unclear: Whether UK ICO treats Sentry error replay as "strictly necessary" (legitimate interest) or "functional" (requires consent)
   - Recommendation: Default to 0.0 for safety; add to Phase 18 legal analysis; Phase 15 can wire the setting and leave it off pending Phase 17/18

2. **PostHog EU vs US hosting**
   - What we know: PostHog Cloud EU automatically disables IP data capture by default; UK users' data staying in EU may align better with ICO interpretation
   - What's unclear: Whether UK sole trader must use EU hosting or if contractual guarantees suffice
   - Recommendation: Start with US (simpler setup, no config change); note as A4 assumption for Phase 17 review

3. **trackGamification() server vs client split**
   - What we know: The existing `trackGamification()` stub is called from `src/lib/gamification/session-integration.ts` (server action context) AND potentially from client components
   - What's unclear: Whether a single function can serve both contexts or needs two variants
   - Recommendation: Verify call sites before Wave 1; most likely split into `trackGamificationServer()` (posthog-node) and keep `trackGamification()` for client

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | posthog-node, @sentry/nextjs | ✓ | System Node 20 (CI) | — |
| PostHog account + API key | posthog-js + posthog-node | ✗ (not yet) | — | Must create; free tier at posthog.com |
| Sentry account + DSN | @sentry/nextjs | ✗ (not yet) | — | Must create; developer plan free |
| SENTRY_AUTH_TOKEN | withSentryConfig build step | ✗ (not yet) | — | Must create in Sentry org settings |
| Vercel env vars | Production deployment | ✗ (pending) | — | Add after account creation |
| GitHub Actions secrets | CI build with source maps | ✗ (pending) | — | Add SENTRY_AUTH_TOKEN to GitHub secrets |

**Missing dependencies with no fallback:** None — all are free SaaS accounts that must be created by the operator before Wave 1.

**Missing dependencies with fallback:** None — all are required for the phase goal.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit) + Playwright 1.59.1 (e2e) |
| Config file | vitest.config.ts (existing) + playwright.config.ts (existing) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | PostHog tracks 7 specified events (signup, song_opened, etc.) | unit (mock posthog) | `npx vitest run src/lib/analytics.test.ts -x` | ❌ Wave 0 |
| SC-2 | Sentry captures client + server exceptions | smoke (manual Sentry test page) | manual — Sentry wizard generates test route | ❌ Wave 0 |
| SC-3 | Funnel dashboard queryable in PostHog UI | manual | N/A (PostHog cloud UI) | N/A |
| SC-4 | No events fire before consent (opt_out_capturing_by_default) | unit | `npx vitest run src/components/ConsentBanner.test.ts -x` | ❌ Wave 0 |
| SC-5 | No PII in event payloads beyond userId | unit | `npx vitest run src/lib/analytics.test.ts -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:ci-pr`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/analytics.test.ts` — unit tests for trackGamification() event shape + no-PII assertion; mock posthog-js
- [ ] `src/components/ConsentBanner.test.ts` — renders nothing when status is '' (SSR); renders banner when 'pending'; calls opt_in_capturing on Accept
- [ ] `src/lib/posthog-server.test.ts` — getPostHogServer() returns singleton; capture() called with correct event shape

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Event property values must not include raw PII (email, name); validated in analytics.ts wrapper |
| V6 Cryptography | no | — |
| V9 Data Protection | yes | `opt_out_capturing_by_default: true`; no IP stored (PostHog project setting); no email in event props |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SENTRY_AUTH_TOKEN leaking to client bundle via NEXT_PUBLIC_ | Information Disclosure | Never prefix with NEXT_PUBLIC_; store in Vercel Build env only |
| Analytics events containing user email or PII | Information Disclosure | Wrap all captures in analytics.ts; assert shape in tests |
| Consent bypass (events sent before banner renders) | Privacy Violation | opt_out_capturing_by_default: true at SDK init level |
| Session replay capturing password fields | Privacy Violation | Set replaysSessionSampleRate: 0.0 until Phase 17/18 clears it |

---

## Sources

### Primary (HIGH confidence)

- PostHog docs — https://posthog.com/docs/libraries/next-js (Next.js setup)
- PostHog docs — https://posthog.com/tutorials/nextjs-cookie-banner (consent banner implementation)
- PostHog docs — https://posthog.com/tutorials/cookieless-tracking (cookieless_mode options)
- Sentry docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/ (Next.js setup overview)
- Sentry docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ (config files)
- Sentry docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/ (withSentryConfig options)
- npm registry — posthog-js@1.372.10, posthog-node@5.33.4, @sentry/nextjs@10.52.0 (verified 2026-05-08)

### Secondary (MEDIUM confidence)

- Sentry Blog — https://blog.sentry.io/turbopack-support-next-js-sdk/ (Turbopack gotchas verified; requirement is next>=15.4.1 + @sentry/nextjs>=10.13.0)
- WebSearch findings — UK PECR requires opt-in consent for non-essential analytics cookies (multiple ICO references corroborate)
- PostHog tutorials — https://posthog.com/tutorials/nextjs-app-directory-analytics (server-side capture pattern)

### Tertiary (LOW confidence)

- [ASSUMED] Event taxonomy in Pattern 8 — names derived from success criteria + existing GamificationEvent union; not confirmed by Thiago

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm-verified package versions; official docs for all three packages
- Architecture: HIGH — instrumentation-client.ts pattern confirmed in PostHog + Sentry official docs
- Consent/GDPR: MEDIUM — PostHog's `opt_out_capturing_by_default` + `cookieless_mode` verified; ICO interpretation of Sentry replay is LOW
- Pitfalls: HIGH — Turbopack/version requirements confirmed; hydration mismatch confirmed; SENTRY_AUTH_TOKEN leak is well-documented
- Event taxonomy: LOW — [ASSUMED]; needs user confirmation before locking

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable ecosystem; PostHog versions ship frequently but API is stable)
