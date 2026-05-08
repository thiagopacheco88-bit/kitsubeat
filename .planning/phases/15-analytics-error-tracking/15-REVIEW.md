---
phase: 15-analytics-error-tracking
reviewed: 2026-05-08T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/lib/posthog-server.ts
  - src/lib/analytics.ts
  - instrumentation-client.ts
  - src/components/ConsentBanner.tsx
  - src/app/components/PostHogIdentify.tsx
  - src/app/layout.tsx
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - instrumentation.ts
  - src/app/error.tsx
  - src/app/global-error.tsx
  - next.config.ts
  - src/app/songs/[slug]/page.tsx
  - src/app/songs/[slug]/components/ExerciseTab.tsx
  - src/lib/exercises/access.ts
  - src/app/actions/exercises.ts
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-05-08
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 15 wires PostHog (client + server) and Sentry into a Next.js 15 app. The
consent architecture is sound — `opt_out_capturing_by_default: true` is set and
`posthog.identify()` is correctly guarded by `has_opted_in_capturing()`. The
`SENTRY_AUTH_TOKEN` is not prefixed `NEXT_PUBLIC_` anywhere in `src/`. No PII
(email, name, password) was found in any PostHog event payload.

Two critical issues were found: (1) `error.tsx` and `global-error.tsx` send raw
`error.stack` to an unauthenticated internal API endpoint that logs it to stdout
— in production this can expose server file paths and internal module names; (2)
the `premium_gate_hit` event incorrectly labels the `song_slug` property but
actually stores a `songVersionId` UUID, creating permanently misleading analytics
data. Three warnings cover an unbounded localStorage array, a missing consent
guard for `exercise_started`, and a dual-banner race condition in layout.tsx.

---

## Critical Issues

### CR-01: Raw stack traces sent to unauthenticated endpoint and logged to stdout

**File:** `src/app/error.tsx:16-29`, `src/app/global-error.tsx:16-29`

**Issue:** Both error boundaries POST `error.stack` and `window.location.href`
to `/api/client-errors` without any authentication check. The route handler
(`src/app/api/client-errors/route.ts:21-30`) logs the full payload — including
`stack` — via `console.error`, which surfaces in Vercel logs. In production,
`error.stack` from server-side errors rendered to the client boundary may contain
full server file paths (e.g. `/var/task/.next/server/chunks/...`), internal
module names, and framework internals. The endpoint accepts any POST from any
origin with no rate limiting, authentication, or body size cap, making it a
low-cost information-harvesting target.

`error.digest` (the opaque Next.js error ID) already exists for this purpose —
it lets you look up the full error in Sentry without exposing internals to the
client or to log scrapers.

**Fix:** Remove `stack` from the fetch body in both error boundaries and from the
API route log. Use `digest` as the correlation handle and let Sentry (already
wired) carry the full stack with source-mapped frames. Also add a body size cap
and drop unauthenticated posts that exceed it.

```tsx
// src/app/error.tsx (and global-error.tsx) — remove stack from the POST body
void fetch("/api/client-errors", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    at: new Date().toISOString(),
    digest: error.digest,          // opaque ID — safe to log
    // REMOVED: url, userAgent, message, stack
  }),
  keepalive: true,
});

// src/app/api/client-errors/route.ts — only log the digest
console.error("[client-error]", JSON.stringify({
  at: body.at ?? new Date().toISOString(),
  digest: body.digest,             // correlate in Sentry; no path disclosure
}));
```

---

### CR-02: `premium_gate_hit` event stores a songVersionId UUID in the `song_slug` property

**File:** `src/lib/exercises/access.ts:95-99`, `src/lib/exercises/access.ts:113-117`

**Issue:** Both `premium_gate_hit` capture calls set `song_slug` to
`opts?.songVersionId ?? "unknown"`. `opts.songVersionId` is a UUID (e.g.
`"018f4e2a-5c3b-7d9a-b4e1-0f1c3d2e5a6b"`), not a human-readable slug. This data
lands permanently in PostHog under a misleading property name. Every funnel
query that groups by `song_slug` will produce UUID bins instead of song names,
making the field useless for product analytics without a corrective migration.

**Fix:** Either pass the actual `songSlug` into `checkExerciseAccess` alongside
`songVersionId`, or rename the property to `song_version_id` to match the actual
data stored.

```ts
// Option A — rename to match what is actually stored (minimal change)
properties: {
  song_version_id: opts?.songVersionId ?? "unknown",
  reason: "quota_exhausted",
},

// Option B — thread songSlug through opts (requires callers to pass it)
export async function checkExerciseAccess(
  userId: string,
  exerciseType: string,
  opts?: { songVersionId?: string; songSlug?: string }
): Promise<CheckExerciseAccessResult> { ... }
// then:
properties: {
  song_slug: opts?.songSlug ?? "unknown",
  song_version_id: opts?.songVersionId ?? "unknown",
  reason: "quota_exhausted",
},
```

---

## Warnings

### WR-01: `exercise_started` fires without a consent guard

**File:** `src/app/songs/[slug]/components/ExerciseTab.tsx:188-201`

**Issue:** The `posthog.capture("exercise_started", ...)` call at line 192 is not
wrapped in `posthog.has_opted_in_capturing()`. `PostHogIdentify` correctly gates
`identify()` and `signup` behind the consent check (line 17 of
`PostHogIdentify.tsx`), but `exercise_started` fires unconditionally whenever
`tabState` transitions to `"session"` or `"grammar-session"`.

The posthog-js SDK's `opt_out_capturing_by_default: true` flag does make
`capture()` a no-op server-side when consent is absent, and the SDK comment in
`instrumentation-client.ts` (line 48–50) notes this. However, relying solely on
the SDK-level gate is fragile — an SDK upgrade, a different init path, or a test
environment where PostHog is replaced by a mock will silently bypass the gate.
Explicit guards at the call site are the defensive pattern used everywhere else in
this phase.

**Fix:**

```tsx
useEffect(() => {
  const isActive = tabState === "session" || tabState === "grammar-session";
  if (isActive && !hasTrackedExerciseStartRef.current) {
    hasTrackedExerciseStartRef.current = true;
    if (posthog.has_opted_in_capturing()) {       // add explicit guard
      posthog.capture("exercise_started", {
        song_slug: songSlug,
        exercise_types: [activeTrackKind],
      });
    }
  }
  if (!isActive) {
    hasTrackedExerciseStartRef.current = false;
  }
}, [tabState, songSlug, activeTrackKind]);
```

---

### WR-02: `ph_known_users` localStorage array grows without bound

**File:** `src/app/components/PostHogIdentify.tsx:22-27`

**Issue:** Every distinct `userId` that signs in on a given device is appended
to the `ph_known_users` JSON array in localStorage. On a shared device (school
lab, library kiosk, family computer) this array accumulates one entry per user
indefinitely. After a few dozen accounts the serialized JSON exceeds comfortable
localStorage entry size. More importantly, `known.includes(userId)` is an O(n)
scan on every page load for every signed-in user.

The correct idiom for "have I seen this userId before on this device?" is a Set
serialized as a JSON array with a bounded maximum, or more simply, a per-user key
(`ph_seen_${userId}`).

**Fix:**

```ts
// Replace the array lookup with a single per-user boolean key
const SEEN_KEY = `ph_seen_${userId}`
try {
  if (!localStorage.getItem(SEEN_KEY)) {
    posthog.capture('signup', { provider: 'clerk', is_first_time: true })
    localStorage.setItem(SEEN_KEY, '1')
  }
} catch {
  // localStorage may be blocked in private browsing — non-fatal
}
```

This eliminates the unbounded growth and the O(n) scan with no behaviour change.

---

### WR-03: Dual consent banners rendered simultaneously in layout.tsx

**File:** `src/app/layout.tsx:201-203`

**Issue:** `layout.tsx` renders both `<ConsentBanner />` (phase 15 PostHog
consent, from `src/components/ConsentBanner.tsx`) and `<CookieConsentBanner />`
(phase 18 PECR consent, from `src/components/CookieConsentBanner.tsx`) in the
same layout, one after the other (lines 201–203). Both target "first visit"
users and both render a fixed/bottom-anchored overlay. A new user will see two
overlapping consent banners stacked at the bottom of the screen.

Even if `CookieConsentBanner` is the "official" PECR banner and `ConsentBanner`
is the PostHog-only one, having two banners visible simultaneously is a UX
defect and may confuse users about what they are consenting to.

**Fix:** Determine which banner is the canonical one for Phase 15 and remove or
gate the other. If `CookieConsentBanner` (Phase 18) supersedes `ConsentBanner`
(Phase 15), remove the `<ConsentBanner />` mount from layout.tsx now. If both
serve distinct purposes, they must coordinate so only one shows at a time.

---

## Info

### IN-01: `trackGamification` passes the full event object as `properties`, duplicating the `event` field

**File:** `src/lib/analytics.ts:68-71`

**Issue:** The capture call passes `properties: e` where `e` is the
`GamificationEvent` union, which includes the `event` field (e.g.
`{ event: "xp_gained", xp: 10, source: "session" }`). PostHog already receives
the event name as the top-level `event` key, so `properties.event` is redundant
noise in every gamification event's property payload.

**Fix:** Destructure the event name out before spreading into properties:

```ts
const { event: _eventName, ...props } = e;
ph.capture({
  distinctId: userId ?? "anonymous",
  event: e.event,
  properties: props,
});
```

---

### IN-02: `instrumentation-client.ts` imports `@sentry/nextjs` solely for `captureRouterTransitionStart`

**File:** `instrumentation-client.ts:17`, `instrumentation-client.ts:60`

**Issue:** The entire `@sentry/nextjs` namespace is imported as `* as Sentry` but
only `Sentry.captureRouterTransitionStart` is used. This is a minor tree-shaking
concern in a client-instrumentation file. Named import is cleaner and more
explicit.

**Fix:**

```ts
import { captureRouterTransitionStart } from "@sentry/nextjs";
// ...
export const onRouterTransitionStart = captureRouterTransitionStart;
```

---

### IN-03: `posthog-server.ts` module-level singleton is shared across hot-reload cycles in development

**File:** `src/lib/posthog-server.ts:22`, `src/lib/posthog-server.ts:30-46`

**Issue:** The `_client` variable is a plain module-level `let`. In Next.js dev
mode with Fast Refresh, modules may be re-evaluated while the Node.js process
continues running (the module cache is cleared but the process isn't restarted).
This means `_client` is reset to `null` on each hot reload, creating a new
`PostHog` instance without shutting down the previous one. Repeated hot reloads
can accumulate open HTTP connections to PostHog's ingest endpoint. The established
pattern in this codebase (per the file's own comment referencing `src/lib/db/index.ts`)
is to store the singleton on `globalThis` to survive hot-reload cycles.

This is low severity in practice — it only affects the development experience and
does not affect production (serverless functions always start fresh).

**Fix:** Follow the same `globalThis` pattern used by the database singleton:

```ts
const g = global as typeof globalThis & { _phServer?: PostHog };

export function getPostHogServer(): PostHog {
  if (g._phServer) return g._phServer;
  // ... init ...
  g._phServer = new PostHog(key, { ... });
  return g._phServer;
}
```

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
