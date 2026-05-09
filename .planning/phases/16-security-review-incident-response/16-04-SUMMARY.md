---
phase: 16-security-review-incident-response
plan: "04"
subsystem: security
tags: [rate-limit, upstash, redis, server-actions, api-routes, sc-4, exercises, grammar]

# Dependency graph
requires:
  - phase: 16-security-review-incident-response
    plan: "02"
    provides: auth() guards in exercises.ts and grammarSession.ts
  - phase: 16-security-review-incident-response
    plan: "03"
    provides: auth() guards in vocab-mastery and vocab-tiers routes
provides:
  - exerciseRatelimit singleton (120/min per userId, sliding window)
  - sessionRatelimit singleton (10/min per userId, sliding window)
  - llmRatelimit singleton (10/min per userId, sliding window)
  - HTTP 429 + Retry-After on vocab-mastery and vocab-tiers routes
  - Rate-limited recordVocabAnswer (throws on breach)
  - Rate-limited saveSessionResults (throws on breach)
  - Rate-limited startGrammarSession LLM path (throws on breach)
affects:
  - All callers of recordVocabAnswer, saveSessionResults, startGrammarSession
  - HTTP clients of vocab-mastery and vocab-tiers endpoints

# Tech tracking
tech-stack:
  added:
    - "@upstash/ratelimit@2.0.8 — sliding window rate limit via Upstash Redis"
    - "@upstash/redis@1.38.0 — HTTP-based Redis client for Vercel serverless"
  patterns:
    - "Server action rate limit pattern: const { success } = await ratelimit.limit(userId); if (!success) throw new Error('Rate limit exceeded. Please slow down.')"
    - "API route rate limit pattern: const { success, limit, remaining, reset } = await ratelimit.limit(userId); if (!success) return 429 with X-RateLimit-* + Retry-After headers"
    - "Rate limit AFTER auth() — userId must be derived first; rate key is userId not IP"

key-files:
  created:
    - src/lib/rate-limit.ts
  modified:
    - package.json
    - package-lock.json
    - src/app/actions/exercises.ts
    - src/app/actions/grammarSession.ts
    - src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts
    - src/app/api/exercises/vocab-tiers/route.ts
    - .env.example
    - src/lib/__tests__/rate-limit.test.ts

key-decisions:
  - "Rate limits keyed by authenticated userId (not IP) — more accurate for multi-device users and prevents IP-based evasion with proxies"
  - "exerciseRatelimit 120/min is generous (2 answers/sec) — prevents replay abuse without affecting normal learning pace"
  - "llmRatelimit applied at startGrammarSession entry point — before any generateOneGrammarExercise calls, protecting Anthropic API quota"
  - "Upstash Redis env vars are server-only (no NEXT_PUBLIC_ prefix) — documented in .env.example with warning comment"

requirements-completed:
  - SC-4

# Metrics
duration: 4min
completed: 2026-05-09
---

# Phase 16 Plan 04: Rate Limiting — Upstash Singletons and Endpoint Guards Summary

**Installed @upstash/ratelimit@2.0.8 + @upstash/redis@1.38.0, created rate-limit.ts with three sliding-window singletons (exercise 120/min, session 10/min, llm 10/min), and applied rate limiting to 5 endpoints with proper 429 HTTP responses and throw-on-breach for server actions**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-09T21:49:51Z
- **Completed:** 2026-05-09T21:53:23Z
- **Tasks:** 2
- **Files modified:** 8 (including 1 created)

## Accomplishments

- Installed `@upstash/ratelimit@2.0.8` and `@upstash/redis@1.38.0` via npm
- Created `src/lib/rate-limit.ts` with three named singletons: `exerciseRatelimit` (120/min), `sessionRatelimit` (10/min), `llmRatelimit` (10/min) — all using sliding window algorithm
- Applied `exerciseRatelimit.limit(userId)` to `recordVocabAnswer` server action (throws on breach)
- Applied `sessionRatelimit.limit(userId)` to `saveSessionResults` server action (throws on breach)
- Applied `exerciseRatelimit.limit(userId)` to vocab-mastery route with HTTP 429 + `X-RateLimit-*` + `Retry-After` headers
- Applied `exerciseRatelimit.limit(userId)` to vocab-tiers route with same 429 response pattern
- Applied `llmRatelimit.limit(userId)` to `startGrammarSession` (before any `generateOneGrammarExercise` calls)
- Documented `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.example` with server-only warning
- All 4 rate-limit unit tests GREEN (4/4 pass)

## Task Commits

1. **Task 1: Install dependencies and create rate-limit.ts** - `f9f5e5d` (feat)
2. **Task 2: Apply rate limits to server actions and API routes** - `fac7eab` (feat)

## Files Created/Modified

### New files
- `src/lib/rate-limit.ts` — Upstash Ratelimit singletons (exerciseRatelimit, sessionRatelimit, llmRatelimit)

### Modified production files
- `src/app/actions/exercises.ts` — added `import { exerciseRatelimit, sessionRatelimit }` + rate limit checks in recordVocabAnswer and saveSessionResults
- `src/app/actions/grammarSession.ts` — added `import { llmRatelimit }` + rate limit check in startGrammarSession
- `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — added `import { exerciseRatelimit }` + 429 response block after auth() guard
- `src/app/api/exercises/vocab-tiers/route.ts` — added `import { exerciseRatelimit }` + 429 response block after auth() guard

### Modified config/docs files
- `package.json` — @upstash/ratelimit@2.0.8, @upstash/redis@1.38.0 added
- `package-lock.json` — lockfile updated
- `.env.example` — UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN documented

### Modified test files
- `src/lib/__tests__/rate-limit.test.ts` — fixed constructor mocks (arrow fn → named function + static slidingWindow method on mock)

## Decisions Made

- Rate limiting is applied AFTER `auth()` in every endpoint — userId must be known before rate key lookup
- `exerciseRatelimit` (120/min) is shared across vocab-mastery, vocab-tiers, and recordVocabAnswer — they all represent the same class of per-answer exercise activity
- `llmRatelimit` is applied at `startGrammarSession` entry (before any DB reads or LLM calls) — catches the full cost of the session startup path
- `startGrammarSession` throws a distinct error message ("AI rate limit exceeded - try again in a moment") vs exercise rate limit error ("Rate limit exceeded. Please slow down.") so clients can distinguish

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] rate-limit.test.ts arrow function mock constructors fail in Vitest**
- **Found during:** Task 1 test run
- **Issue:** `vi.mock("@upstash/redis", () => ({ Redis: vi.fn().mockImplementation(() => ({})) }))` — arrow function `() => ({})` is not a valid constructor. Vitest throws "is not a constructor" when `new Redis({...})` is called in rate-limit.ts at import time.
- **Fix 1:** Changed `Redis` mock to use `function () { return {}; }` with Vitest `mockImplementation`.
- **Fix 2:** `Ratelimit` mock also used arrow function and was missing `slidingWindow` static method. Rewrote as a named factory function `function MockRatelimit({ limiter }) { return { limit: vi.fn(), limiter }; }` with `MockRatelimit.slidingWindow = vi.fn().mockReturnValue({ type: "slidingWindow" })`. Returned from `vi.mock()` factory.
- **Files modified:** `src/lib/__tests__/rate-limit.test.ts`
- **Commit:** f9f5e5d

## Known Stubs

None — all rate limit logic is fully wired. Production routes return real 429 responses and server actions throw on breach. Upstash Redis credentials are required at runtime (documented in .env.example).

## Threat Flags

None — this plan adds rate limiting (reduces attack surface). No new trust boundaries introduced. UPSTASH_REDIS_REST_TOKEN is server-only (enforced by no NEXT_PUBLIC_ prefix and server-only import in rate-limit.ts).

## Self-Check: PASSED

Files verified:
- `src/lib/rate-limit.ts` — EXISTS, exports exerciseRatelimit, sessionRatelimit, llmRatelimit
- `src/app/actions/exercises.ts` — EXISTS, contains exerciseRatelimit.limit and sessionRatelimit.limit
- `src/app/actions/grammarSession.ts` — EXISTS, contains llmRatelimit.limit(userId)
- `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — EXISTS, contains status: 429
- `src/app/api/exercises/vocab-tiers/route.ts` — EXISTS, contains status: 429

Commits verified:
- `f9f5e5d` — Task 1 (install deps + rate-limit.ts + test fix)
- `fac7eab` — Task 2 (apply to 5 endpoints)

Tests GREEN:
- `src/lib/__tests__/rate-limit.test.ts` — 4 tests PASSED

---
*Phase: 16-security-review-incident-response*
*Completed: 2026-05-09*
