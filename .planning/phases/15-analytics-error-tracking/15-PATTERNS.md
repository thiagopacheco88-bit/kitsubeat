# Phase 15: Analytics & Error Tracking - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 13 new/modified files
**Analogs found:** 11 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `instrumentation-client.ts` | config | request-response (init) | `src/lib/sfx.ts` (module-level singleton init) | partial |
| `instrumentation.ts` | config | request-response (init) | `src/lib/db/index.ts` (lazy singleton + runtime branch) | partial |
| `sentry.client.config.ts` | config | request-response | `src/lib/sfx.ts` (module-level side-effectful init) | partial |
| `sentry.server.config.ts` | config | request-response | `src/lib/sfx.ts` | partial |
| `sentry.edge.config.ts` | config | request-response | `src/lib/sfx.ts` | partial |
| `src/lib/analytics.ts` | utility | event-driven | `src/lib/analytics.ts` itself (MODIFY existing stub) | exact |
| `src/lib/posthog-server.ts` | utility/service | event-driven | `src/lib/db/index.ts` (lazy `_client` singleton pattern) | role-match |
| `src/components/ConsentBanner.tsx` | component | request-response | `src/components/ui/ThemeToggle.tsx` (useEffect + useState for browser-only state) | role-match |
| `src/app/layout.tsx` | config | request-response | `src/app/layout.tsx` itself (MODIFY — ClerkProvider wrapper precedent) | exact |
| `src/app/error.tsx` | component | request-response | `src/app/error.tsx` itself (MODIFY — add Sentry call inside existing useEffect) | exact |
| `src/app/global-error.tsx` | component | request-response | `src/app/global-error.tsx` itself (MODIFY — add Sentry call inside existing useEffect) | exact |
| `next.config.ts` | config | batch/build | `next.config.ts` itself (MODIFY — wrap pattern already present via withBundleAnalyzer) | exact |
| `.env.example` | config | — | `.env.example` itself (MODIFY — append block) | exact |

---

## Pattern Assignments

### `instrumentation-client.ts` (NEW — config, init)

**Analog:** `src/lib/sfx.ts` (module-level initialization with `typeof window` guard pattern) and RESEARCH.md Code Examples section.

**No existing instrumentation-client.ts exists.** Use RESEARCH.md "Complete instrumentation-client.ts" example verbatim. The key project conventions to preserve:

**Module-level singleton pattern from `src/lib/sfx.ts`** (lines 1-13):
```typescript
// Module-level mutable singleton — assigned once, never reset
let levelUpAudio: HTMLAudioElement | null = null;

export function preloadLevelUpSFX(): void {
  if (typeof window === "undefined") return;  // SSR guard
  if (!levelUpAudio) {
    // lazy init
  }
}
```

**Adaptation for instrumentation-client.ts:** Module-level init runs eagerly (no lazy wrapper). Export `onRouterTransitionStart` as a named export — Next.js 15 expects this specific export name.

**Full pattern (from RESEARCH.md):**
```typescript
// instrumentation-client.ts (project root)
import posthog from 'posthog-js'
import * as Sentry from '@sentry/nextjs'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  opt_out_capturing_by_default: true,
  cookieless_mode: 'on_reject',
  person_profiles: 'identified_only',
  disable_session_recording: true,
  capture_pageview: false,
})

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 0.0,  // Phase 17/18 will clear this
  replaysSessionSampleRate: 0.0,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
```

---

### `instrumentation.ts` (MODIFY — config, server/edge runtime branching)

**Analog:** `src/lib/db/index.ts` (lazy singleton + `process.env` runtime branch).

**Runtime branch pattern from `src/lib/db/index.ts`** (lines 117-136):
```typescript
export function getDb(): DrizzleDb {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. ...");
  }
  // ... init
  return _db;
}
```

**Adaptation — `instrumentation.ts` uses `process.env.NEXT_RUNTIME` to branch** (from RESEARCH.md):
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
```

If an `instrumentation.ts` already exists (check before writing), ADD the `register()` and `onRequestError` exports — do not replace the file wholesale.

---

### `sentry.client.config.ts` (NEW — config, init)

**Analog:** `src/lib/sfx.ts` (module-level side-effectful init with no exports other than the init call itself).

**Pattern from `src/lib/sfx.ts`** (lines 1-25): Module runs once on import; no default export; named exports are the API.

```typescript
// sentry.client.config.ts (project root)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 0.0,
  replaysSessionSampleRate: 0.0,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
})
```

Note: `sentry.server.config.ts` and `sentry.edge.config.ts` follow identical structure — only `Sentry.init` options differ (edge omits `replays*`).

---

### `sentry.server.config.ts` (NEW — config, init)

Same structural pattern as `sentry.client.config.ts` above. No replays on server.

```typescript
// sentry.server.config.ts (project root)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
})
```

---

### `sentry.edge.config.ts` (NEW — config, init)

Same structural pattern. Edge runtime has reduced API surface (no Node.js APIs).

```typescript
// sentry.edge.config.ts (project root)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
})
```

---

### `src/lib/analytics.ts` (MODIFY — utility, event-driven)

**Analog:** `src/lib/analytics.ts` itself (MODIFY existing file).

**Existing file** (`src/lib/analytics.ts`, lines 1-38): The `GamificationEvent` union type is already complete and must be preserved exactly. The `trackGamification` function body is the ONLY thing being replaced.

**Existing type block to preserve** (lines 15-21):
```typescript
export type GamificationEvent =
  | { event: "xp_gained"; xp: number; source: "answer" | "session" | "star" | "streak_milestone" }
  | { event: "level_up"; new_level: number }
  | { event: "streak_updated"; streak_current: number; grace_applied: boolean }
  | { event: "path_node_started"; slug: string; difficulty_tier: string }
  | { event: "starter_pick_selected"; slug: string }
  | { event: "cosmetic_unlocked"; slot_id: string; level: number };
```

**Caller context:** `trackGamification` is called from `src/lib/gamification/session-integration.ts` (server action context, lines 335-350) and `src/app/actions/gamification.ts` (line 17 import). Both are server action files — `posthog-js` does NOT run in server context. The replacement must use `posthog-node` (`getPostHogServer()`) not `posthog-js`.

**Existing call pattern from `session-integration.ts`** (lines 335-350) — no `userId` passed:
```typescript
trackGamification({ event: "xp_gained", xp: xpResult.xpAfterCap, source: "session" });
trackGamification({ event: "level_up", new_level: newLevel });
trackGamification({ event: "streak_updated", streak_current: ..., grace_applied: ... });
trackGamification({ event: "path_node_started", slug: pathAdvancedTo, difficulty_tier: "unknown" });
```

**CRITICAL:** The existing callers do not pass `userId`. The function signature must either add an optional `userId?: string` parameter, or the server-side posthog-node call uses `'anonymous'` as distinct_id for gamification events. Preferred: add `userId?: string` as a second parameter (non-breaking).

**Replacement body pattern:**
```typescript
import { getPostHogServer } from './posthog-server'

export function trackGamification(e: GamificationEvent, userId?: string): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[analytics:gamification]', e)
  }
  try {
    const ph = getPostHogServer()
    ph.capture({
      distinctId: userId ?? 'anonymous',
      event: e.event,
      properties: e,
    })
  } catch {
    // Non-fatal: analytics must never throw into the gamification path
  }
}
```

---

### `src/lib/posthog-server.ts` (NEW — utility/service, event-driven)

**Analog:** `src/lib/db/index.ts` (lazy `_db` singleton pattern, lines 23-136).

**Singleton pattern from `src/lib/db/index.ts`** (lines 23-26, 117-136):
```typescript
let _db: DrizzleDb | null = null;

export function getDb(): DrizzleDb {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. ...");
  // ... init ...
  _db = drizzle(sql);
  return _db;
}
```

**Adaptation for posthog-server.ts:**
```typescript
// src/lib/posthog-server.ts
import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

/**
 * Lazy PostHog Node.js client singleton for server actions.
 *
 * flushAt: 1, flushInterval: 0 — required for Vercel serverless functions;
 * events flush immediately instead of batching (functions terminate before batch fires).
 *
 * Phase 15 — server-side analytics only. Client-side uses posthog-js directly.
 */
export function getPostHogServer(): PostHog {
  if (_client) return _client
  const key = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_POSTHOG_TOKEN is not set. Add it to .env.local or Vercel env vars.'
    )
  }
  _client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  return _client
}
```

**File header comment style** — copy from `src/lib/db/index.ts` lines 1-16: JSDoc block explaining two usage patterns (app code vs scripts), no `@module` tag.

---

### `src/components/ConsentBanner.tsx` (NEW — component, request-response)

**Analog:** `src/components/ui/ThemeToggle.tsx` (client component with `useEffect` for browser-only state, hydration-safe initialization with empty-string sentinel).

**Hydration-safe useState pattern from `ThemeToggle.tsx`** (lines 27-50):
```typescript
"use client";
import { useEffect, useState, useTransition } from "react";

export function ThemeToggle({ userId = PLACEHOLDER_USER_ID }: ThemeToggleProps = {}) {
  const [pref, setPref] = useState<ThemePref>("system");

  // Read cookie on mount (avoids SSR/CSR mismatch — server didn't see this state).
  useEffect(() => {
    setPref(readCookie());
  }, []);
  // ...
}
```

**ConsentBanner pattern** — initialize `status` as `''` (empty string sentinel, not `'pending'`) to prevent SSR flash. The `useEffect` sets real status from `posthog.get_explicit_consent_status()`. Render nothing when `status === ''` (SSR and first frame):

```typescript
'use client'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

/**
 * GDPR consent banner — renders only on first visit (status 'pending').
 *
 * Hydration safety: status initializes as '' (empty, not 'pending') so SSR
 * and the first client frame render nothing. The useEffect sets real status
 * after hydration. This prevents flash-of-banner on returning users.
 *
 * Phase 15 — UK PECR compliance: analytics opt-in required before PostHog captures.
 */
export function ConsentBanner() {
  const [status, setStatus] = useState('')

  useEffect(() => {
    setStatus(posthog.get_explicit_consent_status())
  }, [])

  if (status !== 'pending') return null

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] p-4"
    >
      <p id="consent-title" className="mb-3 text-sm text-[var(--color-text)]">
        We use analytics to improve KitsuBeat. No ads, no third parties.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => { posthog.opt_in_capturing(); setStatus('granted') }}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium [color:white] hover:opacity-90"
        >
          Accept
        </button>
        <button
          onClick={() => { posthog.opt_out_capturing(); setStatus('denied') }}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:opacity-80"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
```

**Styling convention:** Use CSS custom properties (`var(--color-*)`, `var(--radius-*)`) — matches the established token system used in `error.tsx` (lines 39-57) and throughout `layout.tsx`. Do NOT use raw Tailwind color values like `bg-gray-800`.

---

### `src/app/layout.tsx` (MODIFY — config, request-response)

**Analog:** `src/app/layout.tsx` itself.

**Existing provider wrapping pattern** (lines 77-186): `<ClerkProvider>` wraps `<html>`. The precedent for adding a new provider/component is to place it inside `<body>` before `<main>`.

**Modification:** Add `<ConsentBanner />` import and render it inside `<body>` before `<main>`. Do NOT add a PostHogProvider wrapper — RESEARCH.md confirms `instrumentation-client.ts` replaces the provider pattern in Next.js 15.

**Insertion point** (after line 100, inside `<body>`):
```typescript
import { ConsentBanner } from "@/components/ConsentBanner";

// Inside <body>:
<ConsentBanner />
<main>{children}</main>
```

**Import path convention:** `@/components/ConsentBanner` (note: `src/components/`, not `src/app/components/`) — matches existing `@/components/ui/ThemeToggle` import on line 10.

---

### `src/app/error.tsx` (MODIFY — component, request-response)

**Analog:** `src/app/error.tsx` itself (MODIFY — preserve all existing logic).

**Existing useEffect pattern** (lines 11-31): Single `useEffect` with `[error]` dependency array fires on each new error. The `fetch("/api/client-errors", ...)` call is belt-and-suspenders logging that MUST be kept.

**Modification:** Add `Sentry.captureException(error)` BEFORE the existing fetch call inside the same `useEffect`. Import goes at top of file.

```typescript
// Add import at top:
import * as Sentry from '@sentry/nextjs'

// Inside useEffect, BEFORE existing fetch:
useEffect(() => {
  Sentry.captureException(error)  // ADD THIS LINE
  try {
    void fetch("/api/client-errors", {
      // ... existing code unchanged
    });
  } catch (err) {
    console.error("[error-boundary] telemetry post failed", err);
  }
}, [error]);
```

---

### `src/app/global-error.tsx` (MODIFY — component, request-response)

**Analog:** `src/app/global-error.tsx` itself (MODIFY — identical pattern to error.tsx above).

**CRITICAL PITFALL (from RESEARCH.md Pitfall 6):** Do NOT let the Sentry wizard overwrite this file. It has a custom styled UI (inline styles, not Tailwind — lines 37-79) and the existing `/api/client-errors` POST. Manually add `Sentry.captureException(error)` at the top of the existing `useEffect` body.

```typescript
// Add import at top:
import * as Sentry from '@sentry/nextjs'

// Inside useEffect, BEFORE existing fetch:
useEffect(() => {
  Sentry.captureException(error)  // ADD THIS LINE
  try {
    void fetch("/api/client-errors", {
      // ... existing code unchanged, including scope: "global"
    });
  } catch (err) {
    console.error("[error-boundary] telemetry post failed", err);
  }
}, [error]);
```

---

### `next.config.ts` (MODIFY — config, batch/build)

**Analog:** `next.config.ts` itself (existing `enableAnalyzer(nextConfig)` wrap pattern, lines 16-20).

**Existing wrap pattern** (lines 16-20):
```typescript
const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default enableAnalyzer(nextConfig);
```

**Modification:** Wrap `enableAnalyzer(nextConfig)` with `withSentryConfig(...)`. The outer-most wrapper becomes `withSentryConfig`. Keep `withBundleAnalyzer` as the inner wrapper.

```typescript
import { withSentryConfig } from '@sentry/nextjs'
// ... existing imports ...

const enableAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withSentryConfig(enableAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/sentry-tunnel',
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  silent: !process.env.CI,
})
```

**Comment convention:** Add a Phase 15 comment explaining the wrap (matches existing Phase 13 D-09 comment on line 14).

---

### `.env.example` (MODIFY — config)

**Analog:** `.env.example` itself (append a new block following existing section format).

**Existing format** (lines 1-20): Each section starts with a `# Phase X.Y:` comment block, then `KEY=value` lines with inline comments explaining where to get the value.

**Append block following existing style:**
```bash
# Phase 15: PostHog analytics (product analytics + GDPR consent)
# Create a free account at https://app.posthog.com → Project Settings → Project API Key
NEXT_PUBLIC_POSTHOG_TOKEN=
# Use https://us.i.posthog.com (US) or https://eu.i.posthog.com (EU) — see Phase 17 review
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Phase 15: Sentry error monitoring (client + server + edge)
# Create a free account at https://sentry.io → Project Settings → Client Keys → DSN
NEXT_PUBLIC_SENTRY_DSN=
# Sentry org slug (Sentry dashboard → Settings → Organization → slug field)
SENTRY_ORG=
# Sentry project slug (Sentry dashboard → Projects → click project → Settings → slug)
SENTRY_PROJECT=
# SENTRY_AUTH_TOKEN: build-time ONLY — do NOT prefix with NEXT_PUBLIC_ (would leak to browser)
# Create at https://sentry.io → Settings → Auth Tokens → New Token (scope: project:releases + org:read)
# For Vercel: add under Build Environment Variables, not Runtime Variables
# For local builds: copy to .env.sentry-build-plugin (auto-gitignored by Sentry wizard)
SENTRY_AUTH_TOKEN=
```

---

## Shared Patterns

### Client-only Browser Guard
**Source:** `src/lib/sfx.ts` (lines 19-22), `src/lib/tts.ts` (lines 16-17)
**Apply to:** `instrumentation-client.ts`, `src/components/ConsentBanner.tsx`
```typescript
if (typeof window === "undefined") return;
```
All PostHog client-side calls and consent state reads must be behind this guard or inside `useEffect`.

### Hydration-safe useState Initialization
**Source:** `src/components/ui/ThemeToggle.tsx` (lines 131-137)
**Apply to:** `src/components/ConsentBanner.tsx`
```typescript
// Initialize as empty sentinel, not real state
const [status, setStatus] = useState('');

// Set real value only after client mounts
useEffect(() => {
  setStatus(posthog.get_explicit_consent_status());
}, []);

// Render nothing until hydration completes
if (status !== 'pending') return null;
```
Pattern prevents SSR flash: `''` renders nothing; `'pending'` shows banner; `'granted'`/`'denied'` hides it.

### Error Boundary Pattern (useEffect + fetch)
**Source:** `src/app/error.tsx` (lines 12-31), `src/app/global-error.tsx` (lines 12-30)
**Apply to:** Both error files (MODIFY)
```typescript
useEffect(() => {
  // NEW: Sentry first (richer context: stack frames, source maps, breadcrumbs)
  Sentry.captureException(error)
  // KEEP: belt-and-suspenders Vercel logs
  try {
    void fetch("/api/client-errors", { ... keepalive: true });
  } catch (err) {
    console.error("[error-boundary] telemetry post failed", err);
  }
}, [error]);
```

### CSS Token Convention
**Source:** `src/app/error.tsx` (lines 39-57), `src/components/ui/ThemeToggle.tsx` (line 166)
**Apply to:** `src/components/ConsentBanner.tsx`
All styling uses `var(--color-*)` and `var(--radius-*)` CSS custom properties, not raw Tailwind color names. `global-error.tsx` is the exception (uses inline styles — it renders before CSS loads).

### Singleton Module Pattern
**Source:** `src/lib/db/index.ts` (lines 23-26, 117-136)
**Apply to:** `src/lib/posthog-server.ts`
```typescript
let _client: Type | null = null;

export function getClient(): Type {
  if (_client) return _client;
  const key = process.env.REQUIRED_KEY;
  if (!key) throw new Error("KEY is not set. ...");
  _client = new Client(key, options);
  return _client;
}
```
Non-fatal analytics errors must be caught and swallowed — analytics must never throw into the gamification write path.

### Non-Fatal Analytics Wrapper
**Source:** `src/app/api/client-errors/route.ts` (lines 11-36 — catch + console.error pattern)
**Apply to:** `src/lib/analytics.ts` (replacement body), `src/lib/posthog-server.ts`
```typescript
try {
  // analytics call
} catch {
  // Non-fatal: analytics must never propagate into business logic
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `instrumentation-client.ts` | config | init | Next.js 15 instrumentation-client pattern is new; no existing file in codebase uses this entry point |
| `instrumentation.ts` | config | init | Same — Next.js instrumentation API not yet used in project |

Both files have complete reference implementations in RESEARCH.md "Code Examples" section.

---

## Key Observations for Planner

1. **`trackGamification()` is called from server action context only** (`session-integration.ts`, `gamification.ts`). The replacement must use `posthog-node` (`getPostHogServer()`), not `posthog-js`. The RESEARCH.md Pattern 7 incorrectly shows `posthog-js` as the replacement — use `posthog-node` instead.

2. **`instrumentation.ts` may not exist yet.** Glob search returned only node_modules entries. Create it fresh following the RESEARCH.md pattern.

3. **`withSentryConfig` wraps OVER `withBundleAnalyzer`** in `next.config.ts`. The existing `enableAnalyzer(nextConfig)` becomes the inner expression.

4. **ConsentBanner goes in `src/components/`** (not `src/app/components/`) — it is a shared UI primitive, following the pattern of `src/components/ui/ThemeToggle.tsx`. Import path: `@/components/ConsentBanner`.

5. **`NEXT_PUBLIC_SENTRY_DSN` vs `SENTRY_DSN`:** client config uses `NEXT_PUBLIC_SENTRY_DSN` (exposed to browser for error reporting); server/edge configs use `SENTRY_DSN` (server-only). Both need to be in `.env.example`.

---

## Metadata

**Analog search scope:** `src/`, project root config files, `.env.example`
**Files scanned:** 14 source files read
**Pattern extraction date:** 2026-05-08
