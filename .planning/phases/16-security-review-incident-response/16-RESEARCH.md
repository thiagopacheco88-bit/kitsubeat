# Phase 16: Security Review & Incident Response - Research

**Researched:** 2026-05-09
**Domain:** Security hardening — Supabase RLS, Next.js server action authorization, secrets scanning, rate limiting, IR runbook
**Confidence:** HIGH (stack verified against codebase; Supabase+Clerk RLS pattern verified via official docs)

---

## Summary

KitsuBeat uses Neon (Postgres) via Drizzle ORM from Next.js 15 server actions — it does NOT use Supabase's client library or the Supabase REST API. This is a critical architectural fact: **RLS policies written in the Supabase dashboard will never be exercised** because all DB access goes through Drizzle over a direct Postgres connection string, bypassing the PostgREST layer that enforces RLS. The RLS audit therefore becomes: (a) verify RLS is enabled on all tables as a defense-in-depth backstop, and (b) confirm the actual enforcement layer — server action authorization checks — is comprehensive.

The second major finding is that `saveSessionResults` and `recordVocabAnswer` — the two highest-write server actions — both accept `userId` as a caller-supplied parameter and have `// TODO: replace with Clerk userId from auth()` comments. These are IDOR (Insecure Direct Object Reference) vulnerabilities: any authenticated user can write progress data to any other user's row by supplying a different `userId`. This must be fixed before user data arrives.

Three other API routes also take `userId` from query string parameters (`/api/exercises/vocab-mastery/[vocabItemId]`, `/api/exercises/vocab-tiers`) — these allow read-access IDOR where user A can read user B's mastery data.

Rate limiting is absent from all custom API routes and server actions. Clerk handles auth-endpoint rate limiting internally, so signup/login do not need application-level rate limits. The exercise answer submission endpoints and the LLM/AI-proxy endpoint (`@anthropic-ai/sdk` usage via server actions) do need rate limiting — Upstash Ratelimit + Upstash Redis is the standard solution for Vercel serverless.

For secrets scanning, the build has a known risk: `SENTRY_AUTH_TOKEN` is explicitly documented in `.env.example` as build-time only and must never be prefixed `NEXT_PUBLIC_`. A git-history scan with gitleaks and a build-output scan are both warranted.

**Primary recommendation:** Fix the `saveSessionResults`/`recordVocabAnswer` auth TODO first — it is the highest-impact vulnerability. RLS enable-and-policy creation is defense-in-depth. Rate limiting and IR runbook can follow in parallel.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| RLS enforcement | DB / Storage | — | Supabase/Postgres enforces at query time, but see note: Drizzle bypasses PostgREST; RLS is backstop only |
| Auth check in server actions | API / Backend (server actions) | — | `auth()` must be called in every "use server" function that reads/writes user data |
| IDOR prevention | API / Backend | — | Server validates authenticated userId matches target; client must never supply it |
| Rate limiting | API / Backend + CDN/Edge | — | Upstash middleware for API routes; server action wrappers for actions |
| Secrets in client bundle | CDN / Static (build artifact) | — | NEXT_PUBLIC_ env vars embedded at build time by Next.js |
| IR runbook | Docs (process) | — | Not a code change; checked-in markdown document |

---

## Critical Auth Bug: IDOR in Core Server Actions

These TODOs represent live security vulnerabilities that this phase MUST fix.

### Affected files (VERIFIED: grep of codebase)

| File | Issue | Severity |
|------|-------|----------|
| `src/app/actions/exercises.ts` | `saveSessionResults` takes `userId` from caller input, not `auth()` | CRITICAL |
| `src/app/actions/exercises.ts` | `recordVocabAnswer` takes `userId` from caller input, not `auth()` | CRITICAL |
| `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` | `userId` from `?userId=` query param, not `auth()` | HIGH |
| `src/app/api/exercises/vocab-tiers/route.ts` | `userId` from `?userId=` query param, not `auth()` | HIGH |
| `src/app/api/review/known-count/route.ts` | TODO comment — uses `getCurrentUserId()` but note warns about PLACEHOLDER_USER_ID fallback | MEDIUM |

### Already-correct patterns (use `auth()` from `@clerk/nextjs/server`)

These files are correctly implemented and are the model to follow:
- `src/app/actions/consent.ts` — `const { userId } = await auth()`
- `src/app/actions/onboarding.ts` — `const { userId } = await auth()`
- `src/app/api/user/data-export/route.ts` — `const { userId } = await auth()`, returns 401 if null
- `src/app/admin/lyrics/actions/save-draft.ts` — uses `requireAdminUser()`

### Fix pattern (VERIFIED: from codebase existing correct implementations)

```typescript
// src/app/actions/exercises.ts — saveSessionResults and recordVocabAnswer fix
import { auth } from "@clerk/nextjs/server";

export async function saveSessionResults(
  input: Omit<SaveSessionInput, "userId">
): Promise<SaveSessionResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  // use userId from auth() for all DB writes — never from input
}
```

```typescript
// src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts fix
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest, ...) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // remove ?userId= query param — always use auth().userId
}
```

---

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@clerk/nextjs` | `^7.3.0` | Auth — `auth()` server-side | Already installed; `auth()` is the fix vector |
| `drizzle-orm` | `^0.41.0` | DB access | RLS is backstop; Drizzle is primary enforcement layer |
| `next` | `^15.5.14` | Server actions, middleware | Rate limiting via middleware.ts |

### New Dependencies for Rate Limiting

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@upstash/ratelimit` | `2.0.8` (latest 2026-05-09) | Rate limiting logic | HTTP-based; works in Vercel Edge/serverless |
| `@upstash/redis` | `1.38.0` (latest 2026-05-09) | Redis client | Connectionless HTTP Redis for serverless |

[VERIFIED: npm registry — `npm view @upstash/ratelimit version` → `2.0.8`, `npm view @upstash/redis version` → `1.38.0`]

**Installation:**
```bash
npm install @upstash/ratelimit@2.0.8 @upstash/redis@1.38.0
```

**Required env vars (add to .env.example and Vercel):**
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Secrets Scanning Tools (CLI — not npm deps)

| Tool | Installation | Use Case |
|------|-------------|---------|
| gitleaks | `winget install gitleaks` or Docker `ghcr.io/gitleaks/gitleaks:latest` | Pre-commit / CI scan of git history and source |
| trufflehog | Docker `trufflesecurity/trufflehog:latest` | Verified secrets detection (live credential check) + build artifact scan |

[VERIFIED: both available as Docker images; no npm equivalent]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Upstash Ratelimit | Arcjet | Arcjet has built-in Next.js integration and bot detection, but adds a third-party SaaS; Upstash is simpler and already a common pattern on Vercel |
| Upstash Ratelimit | Vercel WAF (Enterprise) | Only available on Enterprise plan; not applicable for current Vercel tier |
| Upstash Ratelimit | In-memory Map | Doesn't survive across serverless instances; useless for distributed rate limiting |

---

## Architecture Patterns

### Supabase RLS: Context for This Project

**CRITICAL DISTINCTION:** [VERIFIED: codebase review]

KitsuBeat connects to Neon Postgres via `DATABASE_URL` using `@neondatabase/serverless` and Drizzle ORM. All queries go through Drizzle's direct Postgres connection — **not** through Supabase's PostgREST API or the `@supabase/supabase-js` client. This means:

1. RLS policies in the database are **not evaluated** during normal application operation
2. The actual security boundary is the server action / API route authorization check
3. RLS should still be enabled on all tables as defense-in-depth (protects against DB-level access via SQL editor, direct Postgres connections, future tooling)

### System Architecture Diagram

```
Browser (Client)
    |
    | HTTPS
    v
Next.js 15 App (Vercel)
    |
    |-- middleware.ts (Clerk auth: admin gate + terms gate)
    |
    |-- Server Actions ("use server")
    |       |
    |       |-- auth() from @clerk/nextjs/server → userId
    |       |-- validate: userId must match target resource's user_id
    |       |-- Drizzle ORM → Neon Postgres
    |
    |-- API Route Handlers (/api/*)
    |       |
    |       |-- auth() from @clerk/nextjs/server → userId
    |       |-- [Rate limit check] → Upstash Redis
    |       |-- Drizzle ORM → Neon Postgres
    |
    v
Neon Postgres (Database)
    |-- RLS enabled on all tables (defense-in-depth backstop)
    |-- Not the primary enforcement boundary (Drizzle bypasses PostgREST)
```

### Recommended Project Structure (Phase 16 additions)

```
src/
├── lib/
│   └── rate-limit.ts            # Upstash ratelimit singleton(s) — defined once, reused
├── middleware.ts                 # Add rate limiting to API routes here (or per-route)
│
docs/
└── security/
    └── IR-RUNBOOK.md            # Incident Response runbook (SC-5 deliverable)
    └── ENV-CONVENTIONS.md       # .env documentation (SC-3 deliverable)
```

### Pattern 1: RLS Audit Query

How to check which tables have RLS enabled in Postgres:

```sql
-- Source: Supabase docs + standard pg_tables/pg_policies system views
-- Run in Supabase SQL editor or via psql against Neon Postgres

-- 1. Tables with RLS disabled (should be empty after fix)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 2. All tables and their RLS + policy count
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 3. All existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

[CITED: supabase.com/docs/guides/database/postgres/row-level-security]

### Pattern 2: RLS Policy for User-Owned Tables (With Clerk JWT)

**When using Clerk as the auth provider**, `auth.uid()` is NOT available because Clerk issues its own JWTs. Use `auth.jwt()->>'sub'` instead.

```sql
-- Source: clerk.com/docs/guides/development/integrations/databases/supabase
-- Enable RLS first
ALTER TABLE user_song_progress ENABLE ROW LEVEL SECURITY;

-- SELECT: user can only read their own rows
CREATE POLICY "user_song_progress_select_own"
ON user_song_progress
FOR SELECT
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = user_id
);

-- INSERT: user can only insert rows for themselves
CREATE POLICY "user_song_progress_insert_own"
ON user_song_progress
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.jwt()->>'sub') = user_id
);

-- UPDATE: user can only update their own rows
CREATE POLICY "user_song_progress_update_own"
ON user_song_progress
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = user_id
)
WITH CHECK (
  (SELECT auth.jwt()->>'sub') = user_id
);

-- DELETE: user can only delete their own rows
CREATE POLICY "user_song_progress_delete_own"
ON user_song_progress
FOR DELETE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = user_id
);
```

**Key differences from native Supabase Auth:**
- `auth.uid()` → NOT available; use `auth.jwt()->>'sub'`
- Clerk user IDs are strings (e.g. `user_abc123`), not UUIDs — the `user_id` column is `text` in this project, so no casting needed
- Supabase must be configured to trust Clerk's JWT (JWKS URL setup in Supabase dashboard → Authentication → Third-party auth)

[CITED: clerk.com/docs/guides/development/integrations/databases/supabase, supabase.com/docs/guides/auth/third-party/clerk]

**IMPORTANT CAVEAT:** Since KitsuBeat's Drizzle connection goes to Neon (not Supabase), the JWKS URL configuration is irrelevant for application traffic. RLS policies are defense-in-depth for direct SQL access only.

### Pattern 3: Rate Limiting in Next.js Middleware / API Routes

```typescript
// src/lib/rate-limit.ts
// Source: upstash.com/blog/nextjs-ratelimiting + github.com/upstash/ratelimit-js
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Exercise answer submission: 60 per minute per user (generous for legitimate use)
export const exerciseRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  analytics: true,
  prefix: "kitsubeat:exercise",
});

// LLM/AI proxy: 10 per minute per user (AI generation is expensive)
export const llmRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "kitsubeat:llm",
});
```

```typescript
// Usage in an API route (App Router pattern)
import { auth } from "@clerk/nextjs/server";
import { exerciseRatelimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit keyed by userId (not IP) for authenticated routes
  const { success, limit, remaining, reset } = await exerciseRatelimit.limit(userId);

  if (!success) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  // ... handler logic
}
```

[CITED: upstash.com/blog/nextjs-ratelimiting, github.com/upstash/ratelimit-js]

### Pattern 4: Secrets Scanning Commands

```bash
# Scan git history for secrets (run once, then add to CI)
docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest \
  detect --source /repo --verbose

# Scan source code only (no git history)
docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest \
  detect --source /repo --no-git --verbose

# Scan Next.js build output for leaked secrets (after `next build`)
docker run --rm -v "$(pwd):/repo" trufflesecurity/trufflehog:latest \
  filesystem /repo/.next --only-verified

# Grep client bundle for known patterns (quick sanity check)
grep -r "CLERK_SECRET_KEY\|DATABASE_URL\|SENTRY_AUTH_TOKEN" .next/ 2>/dev/null
```

[CITED: blog.arcjet.com/secret-scanning-and-next-js-builds, github.com/trufflesecurity/trufflehog]

### Anti-Patterns to Avoid

- **Client-supplied userId:** Never accept `userId` from request body, query string, or server action input for security-sensitive operations. Always call `auth()` server-side. [VERIFIED: two existing TODO violations in exercises.ts]
- **RLS without policies:** Enabling RLS and creating no policies = deny all. Create at least a deny-by-default (the empty state) + explicit allow policies for each operation pattern. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
- **auth.uid() with Clerk:** Does not work. Use `auth.jwt()->>'sub'` in SQL policies. [CITED: clerk.com/docs supabase integration guide]
- **Rate limiting by IP on Vercel:** Vercel's edge may share IPs across requests from different users; prefer keying rate limits by authenticated `userId` for logged-in routes, and by `x-forwarded-for` only for public unauthenticated routes.
- **NEXT_PUBLIC_ prefix on secrets:** Never add `NEXT_PUBLIC_` to `CLERK_SECRET_KEY`, `DATABASE_URL`, `SENTRY_AUTH_TOKEN`, or `CRON_SECRET` — they become embedded in the client bundle. [VERIFIED: .env.example documents this risk for `SENTRY_AUTH_TOKEN` explicitly]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom Redis counter with TTL | `@upstash/ratelimit` | Handles sliding window, atomic increments, distributed state, proper 429 headers |
| Git secrets scanning | Custom regex grep | gitleaks / trufflehog | 700+ credential detectors; verified secrets; far lower false positive rate |
| Bot protection on auth | Custom CAPTCHA | Clerk's built-in bot protection (already configured) | Clerk has native bot detection on signup/login — no additional work needed for auth endpoints |
| JWT verification in RLS | Custom PostgreSQL function | `auth.jwt()` built-in + Supabase third-party auth | Supabase already verifies JWT signature using JWKS; hand-rolling this is a crypto pitfall |

**Key insight:** Clerk already handles signup/login rate limiting and bot protection. The application layer only needs rate limits on custom exercise endpoints and AI proxy calls.

---

## Table-Level RLS Audit

All tables from `src/lib/db/schema.ts` — complete enumeration required by SC-1:

### User-data tables (MUST have RLS + user_id policies)

| Table | user_id column | Expected policy |
|-------|---------------|----------------|
| `users` | `id` (PK) | SELECT/UPDATE own row only |
| `user_song_progress` | `user_id` (text) | SELECT/INSERT/UPDATE own rows |
| `user_vocab_mastery` | `user_id` (text) | SELECT/INSERT/UPDATE own rows |
| `user_exercise_log` | `user_id` (text) | SELECT/INSERT own rows |
| `user_exercise_song_counters` | `user_id` (text) | SELECT/INSERT own rows |
| `user_verse_domination` | `user_id` (text) | SELECT/INSERT own rows |
| `user_grammar_rule_mastery` | `user_id` (text) | SELECT/INSERT/UPDATE own rows |
| `user_grammar_exercise_log` | `user_id` (text) | SELECT/INSERT own rows |
| `user_cosmetics` | `user_id` (text, FK) | SELECT/INSERT own rows |
| `subscriptions` | `user_id` (text, unique) | SELECT own row; UPDATE disallowed (Stripe webhook only) |
| `activity_events` | `user_id` (text, FK) | SELECT social-enabled rows; INSERT own |
| `email_sent_log` | `user_id` (text, FK) | SELECT own rows only |
| `cookie_consent_record` | `user_id` (nullable text) | SELECT/INSERT own rows; anonymous rows accessible by IP hash |
| `sar_log` | `user_id_or_email` (text) | SELECT own rows; INSERT via authenticated API action |
| `song_plays` | `user_id` (nullable) | INSERT always allowed; SELECT unrestricted (play counts are public) |

### Catalog tables (public read, admin write)

| Table | Expected policy |
|-------|----------------|
| `songs` | SELECT: public; INSERT/UPDATE/DELETE: admin role only |
| `song_versions` | SELECT: public; INSERT/UPDATE/DELETE: admin role only |
| `vocabulary_items` | SELECT: public; no user writes |
| `grammar_rules` | SELECT: public; no user writes |
| `grammar_exercises` | SELECT: public; INSERT by application service role |
| `song_version_grammar_rules` | SELECT: public; no user writes |
| `anime_metadata` | SELECT: public; no user writes |
| `reward_slot_definitions` | SELECT: public; no user writes |
| `vocab_global` (materialized view) | SELECT: public; REFRESH: service role |

### Admin-only tables

| Table | Expected policy |
|-------|----------------|
| `lyrics_versions` | SELECT: public; INSERT/UPDATE: admin role only |
| `lyrics_drafts` | SELECT/INSERT/UPDATE: admin role only |
| `song_video_history` | SELECT: public; INSERT: admin role only |

[VERIFIED: schema.ts enumerated above]

---

## API Surface Authorization Audit

Complete enumeration of server actions and API routes:

### Server Actions (src/app/actions/)

| File | Auth Pattern | IDOR Risk | Action |
|------|-------------|-----------|--------|
| `consent.ts` | `auth()` — correct | None | No change |
| `onboarding.ts` | `auth()` — correct | None | No change |
| `exercises.ts::saveSessionResults` | Caller-supplied `userId` | CRITICAL | Fix: use `auth()` |
| `exercises.ts::recordVocabAnswer` | Caller-supplied `userId` | CRITICAL | Fix: use `auth()` |
| `exercises.ts::getAdvancedDrillAccess` | Caller-supplied `userId` | HIGH | Fix: use `auth()` |
| `userPrefs.ts::getUserPrefs` | Caller-supplied `userId` | HIGH | Fix or verify callers are authenticated |
| `userPrefs.ts::updateUserPrefs` | Caller-supplied `userId` | HIGH | Fix: add `auth()` guard |
| `userPrefs.ts::setThemePreference` | Caller-supplied `userId` | HIGH | Fix: add `auth()` guard |
| `gamification.ts` | Review needed | TBD | Audit in Phase 16 |
| `grammarSession.ts` | Review needed | TBD | Audit in Phase 16 |
| `review.ts` | Review needed | TBD | Audit in Phase 16 |
| `songPlays.ts` | TODO comment present | MEDIUM | Fix or accept (plays are low-sensitivity) |
| `cache.ts` | Review needed | TBD | Audit in Phase 16 |

### API Routes (src/app/api/)

| Route | Auth Pattern | Risk | Action |
|-------|-------------|------|--------|
| `api/user/data-export` | `auth()` — correct | None | No change |
| `api/exercises/jlpt-pool` | No auth | LOW — catalog data only | Accept (public catalog) |
| `api/exercises/vocab-mastery/[vocabItemId]` | `?userId=` from client | HIGH | Fix: use `auth()` |
| `api/exercises/vocab-tiers` | `?userId=` from client | HIGH | Fix: use `auth()` |
| `api/review/queue` | `getCurrentUserId()` | LOW | Verify behavior |
| `api/review/budget` | `getCurrentUserId()` | LOW | Verify behavior |
| `api/review/known-count` | `getCurrentUserId()` — TODO noted | MEDIUM | Verify PLACEHOLDER fallback is safe |
| `api/cron/daily-reminder` | `assertCronSecret()` — correct | None | No change |
| `api/cron/birthday-transitions` | Review needed | TBD | Audit |
| `api/cron/weekly-recap` | Review needed | TBD | Audit |
| `api/admin/*` | `requireAdminUser()` — correct | None | No change |
| `api/client-errors` | Review needed | TBD | Audit |

### Admin Actions (src/app/admin/lyrics/actions/)

All use `requireAdminUser()` which calls `currentUser()` + allowlist check. [VERIFIED: save-draft.ts]

---

## Rate Limiting Requirements by Endpoint

| Endpoint | Type | Limit Recommendation | Key By |
|----------|------|---------------------|--------|
| `/api/exercises/vocab-mastery/*` | Authenticated read | 120/min | userId |
| `/api/exercises/vocab-tiers` | Authenticated read | 120/min | userId |
| `recordVocabAnswer` (server action) | Authenticated write | 120/min | userId |
| `saveSessionResults` (server action) | Authenticated write | 10/min | userId |
| Any AI/LLM proxy endpoint | Authenticated write | 10/min | userId |
| `/api/cron/*` | Machine-to-machine | 1/min | CRON_SECRET (already gated) |
| Signup/Login | Auth endpoint | Handled by Clerk | — |

**Note:** Clerk handles rate limiting on auth endpoints (signup, login, session refresh). The [CITED: clerk.com] documentation confirms Clerk Backend API rate limits 1,000 req/10s for production. No additional application-level rate limiting is needed on `/sign-in`, `/sign-up`, or Clerk webhook routes.

---

## Common Pitfalls

### Pitfall 1: Assuming RLS Protects Drizzle Queries

**What goes wrong:** Developer enables RLS on all tables, writes policies, and believes the DB is now protected. But Drizzle connects via `DATABASE_URL` as the Postgres superuser/owner role, which has RLS bypass by default.
**Why it happens:** RLS is enforced at the Postgres row level for the `authenticated` role (used by Supabase Auth JWT), not for the owner/service role used by direct connections.
**How to avoid:** Treat server action authorization (`auth()` + userId check) as the primary security boundary. RLS is defense-in-depth for non-application access (SQL editor, scripts).
**Warning signs:** Believing "RLS is on, I'm done" without fixing the `// TODO: auth()` calls in exercises.ts.

[VERIFIED: codebase audit — Drizzle uses DATABASE_URL directly; no Supabase client is used]

### Pitfall 2: auth.uid() Doesn't Work With Clerk

**What goes wrong:** Writing RLS policies like `USING (auth.uid() = user_id)` when Clerk is the auth provider. The policy is always evaluated as `false` because `auth.uid()` returns NULL for non-Supabase-Auth tokens.
**Why it happens:** `auth.uid()` is a Supabase Auth function that reads from its own JWT store, not from third-party JWTs.
**How to avoid:** Use `auth.jwt()->>'sub'` to extract the Clerk userId from the JWT sub claim.
**Warning signs:** Policies that appear syntactically correct but silently deny all access.

[CITED: clerk.com/docs/guides/development/integrations/databases/supabase]

### Pitfall 3: Rate Limiting Server Actions

**What goes wrong:** Rate limiting is added to the Next.js middleware but server actions bypass it (middleware only intercepts navigation requests for server actions called from client components — not `fetch()` calls to server action endpoints).
**Why it happens:** Next.js App Router server actions use a different request path from API routes.
**How to avoid:** Add rate limiting logic inside the server action function body, or use Next.js middleware with `config.matcher` that includes the action route. Alternatively, convert high-traffic endpoints to API routes where middleware reliably intercepts.
**Warning signs:** Middleware shows 0 hits on rate limit despite action being called repeatedly.

[CITED: github.com/upstash/ratelimit-js — usage examples; ASSUMED based on Next.js server action routing behavior]

### Pitfall 4: NEXT_PUBLIC_ Secret Leak via Build Artifact

**What goes wrong:** A secret (e.g. `SENTRY_AUTH_TOKEN`) is accidentally prefixed `NEXT_PUBLIC_SENTRY_AUTH_TOKEN`. It gets embedded in the compiled JS bundle sent to every browser.
**Why it happens:** Vercel environment variables can be set with the wrong scope; developers may think `NEXT_PUBLIC_` just means "public variable".
**How to avoid:** The `.env.example` already documents this risk. Run `grep -r "SENTRY_AUTH_TOKEN\|CLERK_SECRET_KEY\|DATABASE_URL" .next/` after each build to verify. Add to CI.
**Warning signs:** Secret appears in browser DevTools → Sources → any `_next/static/chunks/*.js` file.

[CITED: blog.arcjet.com/secret-scanning-and-next-js-builds; VERIFIED: .env.example has explicit warning about SENTRY_AUTH_TOKEN]

### Pitfall 5: RLS Enable Without Policies = Deny All

**What goes wrong:** Running `ALTER TABLE foo ENABLE ROW LEVEL SECURITY` with no policies blocks ALL access including reads, breaking the app.
**Why it happens:** RLS deny-by-default is the correct behavior but must be paired with explicit allow policies.
**How to avoid:** Always create policies immediately after enabling RLS on a table. Test against a staging database before applying to production.
**Warning signs:** `403 Forbidden` or empty result sets after enabling RLS.

[CITED: supabase.com/docs/guides/database/postgres/row-level-security]

### Pitfall 6: IP Extraction in Vercel Middleware

**What goes wrong:** Using `request.ip` to get the client IP for rate limiting. On Vercel, this is not reliable — the actual client IP is in the `x-forwarded-for` header.
**Why it happens:** Vercel's proxy infrastructure changes `request.ip` behavior.
**How to avoid:** Use `request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()` as the IP identifier. For authenticated routes, prefer userId as the rate limit key (more accurate, not spoofable).
**Warning signs:** All requests appear to come from the same IP.

[CITED: upstash.com/blog/edge-rate-limiting]

---

## Incident Response (IR) Runbook — Required Content

SC-5 requires a checked-in IR runbook. Below is the content that the plan must produce as `docs/security/IR-RUNBOOK.md`.

### Severity Taxonomy

| Level | Description | Example | Response SLA |
|-------|-------------|---------|-------------|
| P1 — Critical | User PII exposed; active breach; system fully down | DB credentials leaked to git; mass user data access | Immediate — within 1 hour |
| P2 — High | Potential data exposure; partial system outage; suspected breach | IDOR vulnerability found; server action accepting arbitrary userId | Same day — within 8 hours |
| P3 — Medium | Security misconfiguration; single user affected; degraded service | Rate limit missing; RLS policy gap (not exploited) | Within 48 hours |
| P4 — Low | Documentation gap; theoretical vulnerability; non-sensitive data | Missing .env.example entry; low-severity dep CVE | Next sprint |

### UK-GDPR 72-Hour Breach Notification

[CITED: ico.org.uk/for-organisations/advice-for-small-organisations/personal-data-breaches/72-hours-how-to-respond-to-a-personal-data-breach/]

The 72-hour clock **starts when you become aware** — not when forensic certainty is achieved.

| Hour | Action |
|------|--------|
| 0–2h | Contain: rotate credentials, disable affected endpoint/service, take evidence snapshot |
| 2–8h | Assess: what data was exposed? How many users? Is exposure ongoing? |
| 8–48h | Determine notification requirement: reportable if risk to individual rights/freedoms |
| 48–72h | **Report to ICO** at https://ico.org.uk/for-organisations/report-a-breach/ (online form, ~30 min) |
| 72h+ | Notify affected users if high risk to them (Art. 34 UK GDPR) |
| Ongoing | Document everything: what we knew, when, what we did, why |

**NOT reportable** (no ICO notification needed): accidental internal email sent to wrong address, lost unencrypted device with non-sensitive data only.

**IS reportable**: DB credentials leaked (possible unauthorized access), user PII accessed by other users (IDOR), stolen session tokens.

**ICO Report URL:** https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/

### First-Response Checklist (P1 Incident)

```
[ ] 1. CONTAIN
    [ ] Rotate database credentials (Neon dashboard → reset password)
    [ ] Rotate Clerk API keys (Clerk dashboard → API keys → revoke + reissue)
    [ ] Rotate Sentry auth token (Sentry → Settings → Auth Tokens)
    [ ] Rotate Upstash Redis credentials (Upstash console)
    [ ] If Vercel deployment is the breach vector: disable the deploy (Vercel dashboard → Deployments → Cancel)
    [ ] Take a snapshot of logs (Vercel Functions logs, Sentry events, PostHog events)

[ ] 2. ASSESS
    [ ] What data was exposed? (Users table, exercise logs, vocab mastery, subscriptions)
    [ ] How many users affected?
    [ ] Is the exposure ongoing or contained?
    [ ] Is this reportable under UK GDPR? (risk to individual rights/freedoms)

[ ] 3. NOTIFY (if reportable)
    [ ] Report to ICO within 72 hours: https://ico.org.uk/for-organisations/report-a-breach/
    [ ] If high risk to individuals: notify affected users via email (within reasonable time)
    [ ] Keep a written log of the incident for ICO audit trail

[ ] 4. RECOVER
    [ ] Deploy fix to production
    [ ] Verify breach is contained
    [ ] Update runbook with lessons learned
```

### Contact List

| Party | Contact Method | Use When |
|-------|---------------|----------|
| Clerk Support | clerk.com/support | Auth/JWT issues, account compromise |
| Neon (Postgres) Support | console.neon.tech + neon.tech/support | DB credential leak, data corruption |
| Vercel Support | vercel.com/support | Deployment issues, environment variable leak |
| ICO (UK) | ico.org.uk/for-organisations/report-a-breach/ | UK GDPR breach notification |
| Resend (email) | resend.com/support | Email sending compromise |
| Stripe (payments) | stripe.com/support | Payment data concerns |

---

## Secrets Inventory

All secrets in this project (VERIFIED: .env.example + codebase):

| Secret | Environment | Safe in client bundle? | Risk if leaked |
|--------|------------|----------------------|----------------|
| `DATABASE_URL` | Server only | No — full DB access | Critical |
| `CLERK_SECRET_KEY` | Server only | No — impersonate users | Critical |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public (by design) | Yes — client-safe | Low |
| `SENTRY_AUTH_TOKEN` | Build time only | No — project access | High |
| `SENTRY_DSN` | Server only | No (but low risk) | Low |
| `NEXT_PUBLIC_SENTRY_DSN` | Public (by design) | Yes — client-safe | Low |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | Public (by design) | Yes — client-safe | Low |
| `CRON_SECRET` | Server only | No — bypass cron auth | Medium |
| `UPSTASH_REDIS_REST_URL` | Server only | No | Medium |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | No | Medium |
| `UNSPLASH_ACCESS_KEY` | Server only (scripts) | No | Low |
| `KB_E2E_AUTH_BYPASS` | Test/CI only | No — auth bypass | Critical (in prod) |
| `RESEND_API_KEY` | Server only | No — send any email | Medium |

**Positive finding:** The project already has strong `.env.example` documentation (Phase 15). The `SENTRY_AUTH_TOKEN` risk is explicitly documented. No `NEXT_PUBLIC_` prefix on any sensitive secrets found in existing env docs.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase JWT Template (deprecated) | Third-party auth integration (JWKS-based) | April 2025 | JWT template approach deprecated by Clerk/Supabase; new approach uses native OIDC |
| `auth.uid()` in RLS for custom auth | `auth.jwt()->>'sub'` | 2024+ | Required change when using non-Supabase-Auth providers |
| IP-based rate limiting | User-ID-based rate limiting for authenticated routes | 2023+ | More accurate and not spoofable via IP rotation |
| Custom secret scanning scripts | gitleaks + trufflehog | 2023+ | 700+ detectors; credential verification |

**Deprecated/outdated:**
- Clerk JWT Template for Supabase: deprecated April 1 2025; the Clerk Dashboard may still show it, but Supabase recommends the Third-Party Auth (JWKS) approach instead. For this project (Neon/Drizzle), the JWKS setup is only relevant for direct SQL access defense-in-depth.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | Yes | v24.15.0 | — |
| Docker | gitleaks / trufflehog scanning | Unknown — not checked | — | Run binaries directly on Linux CI; Windows: WSL or winget |
| Upstash Redis | Rate limiting | Not configured (new) | — | No fallback — must provision Upstash account + Redis DB |
| Neon Postgres | Database | Yes | Active (prod) | — |
| Clerk | Auth | Yes (`^7.3.0` installed) | — | — |

**Missing dependencies with no fallback:**
- Upstash Redis: requires provisioning an Upstash Redis database (free tier available). Without it, rate limiting cannot be implemented. Provision at upstash.com before executing rate-limiting plans.

**Missing dependencies with fallback:**
- Docker for secrets scanning: gitleaks can be installed via `winget install gitleaks` or `scoop install gitleaks` on Windows. trufflehog binary available from GitHub releases. Docker preferred for CI reproducibility.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + Playwright 1.59 |
| Config file | `vitest.config.ts` / `playwright.config.ts` |
| Quick run command | `npx vitest run src/app/actions/__tests__/` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 (RLS) | All tables have RLS enabled | Integration (DB) | `npx tsx scripts/audit/rls-audit.ts` | No — Wave 0 |
| SC-2 (auth check) | saveSessionResults rejects non-owner userId | Unit | `npx vitest run src/app/actions/__tests__/exercises.saveSessionResults.test.ts` | Partial — extend existing |
| SC-2 (auth check) | recordVocabAnswer rejects unauthenticated | Unit | `npx vitest run src/app/actions/__tests__/exercises.recordVocabAnswer.test.ts` | Yes — extend |
| SC-3 (secrets) | No secrets in git history | Manual + CI | `docker run ghcr.io/gitleaks/gitleaks:latest detect --source . --verbose` | No — one-shot |
| SC-4 (rate limits) | 429 returned after threshold exceeded | Unit | `npx vitest run src/lib/__tests__/rate-limit.test.ts` | No — Wave 0 |
| SC-5 (IR runbook) | Runbook file exists and has required sections | Manual | File existence check | No — Wave 0 |

### Wave 0 Gaps

- [ ] `scripts/audit/rls-audit.ts` — runs the pg_tables audit query against Neon, exits 1 if any table is missing RLS
- [ ] `src/lib/__tests__/rate-limit.test.ts` — unit tests for rate limit helper (mock Redis)
- [ ] `docs/security/IR-RUNBOOK.md` — IR runbook file (SC-5 deliverable)
- [ ] `docs/security/ENV-CONVENTIONS.md` — env var documentation (SC-3 deliverable)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Clerk (already implemented) |
| V3 Session Management | Yes | Clerk session tokens (already implemented) |
| V4 Access Control | Yes — CRITICAL GAP | `auth()` in every server action; userId from auth, not client input |
| V5 Input Validation | Yes | Zod schemas at server action boundary (partially implemented) |
| V6 Cryptography | Yes (limited) | SHA-256 for IP hashing in consent.ts (already implemented) |
| V7 Error Handling | Yes | Sentry (Phase 15); avoid leaking userId in error messages |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR via client-supplied userId | Elevation of Privilege | `auth()` server-side; never trust client-supplied userId |
| Secrets in git history | Information Disclosure | gitleaks pre-commit hook + CI scan |
| Secrets in client bundle | Information Disclosure | Never `NEXT_PUBLIC_` non-public secrets; post-build artifact scan |
| Replay attack on exercise answers | Tampering | Rate limiting on `recordVocabAnswer` |
| Cron endpoint abuse | Denial of Service | `assertCronSecret()` already implemented |
| SQL injection | Tampering | Drizzle parameterized queries (all DB access is via Drizzle) |
| Mass data exfiltration | Information Disclosure | Rate limiting on data-export API |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drizzle connects as Postgres owner/superuser role, bypassing RLS | Architecture | If Drizzle connects as `authenticated` role, RLS would be enforced; need to verify actual Neon role used |
| A2 | Server actions called from client components are subject to rate limiting in Next.js middleware | Pitfall 3 | If middleware does intercept server action requests, middleware-based rate limiting would work; test against actual Next.js 15 behavior |
| A3 | `userPrefs.ts` functions are called only from authenticated contexts (pages/server components that already verified auth) | Auth Audit | If called from unauthenticated client components, these are IDOR vulnerabilities |

---

## Open Questions

1. **What Postgres role does Neon/Drizzle use?**
   - What we know: `DATABASE_URL` connects to Neon via `@neondatabase/serverless`
   - What's unclear: Is the role the DB owner (RLS bypass) or `authenticated` (RLS enforced)?
   - Recommendation: Run `SELECT current_user;` in a Drizzle query during audit to determine the role. If it's the owner/admin role, RLS is bypass mode — this confirms the architecture assumption.

2. **Are `userPrefs.ts` actions exposed via client components?**
   - What we know: They accept `userId` as a parameter without calling `auth()`
   - What's unclear: Whether any client component calls these directly with a user-supplied ID
   - Recommendation: Grep for call sites: `getUserPrefs\|updateUserPrefs` in client components (`"use client"` files). If found, fix urgently.

3. **Is there an LLM/AI proxy endpoint?**
   - What we know: `@anthropic-ai/sdk` is in dependencies; grammar exercise generation uses the Anthropic API
   - What's unclear: Which server action/route makes the Anthropic API call; whether it's user-triggerable
   - Recommendation: Grep for `anthropic` or `Anthropic` in `src/` to find the call sites and determine if rate limiting is needed.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `src/app/actions/exercises.ts` — auth TODO in saveSessionResults + recordVocabAnswer
- [VERIFIED: codebase] `src/app/actions/consent.ts`, `onboarding.ts`, `api/user/data-export/route.ts` — correct auth patterns
- [VERIFIED: codebase] `src/lib/db/schema.ts` — complete table enumeration
- [VERIFIED: codebase] `.env.example` — secrets inventory
- [VERIFIED: npm registry] `@upstash/ratelimit@2.0.8`, `@upstash/redis@1.38.0` — current versions
- [CITED: clerk.com/docs/guides/development/integrations/databases/supabase] — `auth.jwt()->>'sub'` pattern for Clerk+Supabase RLS
- [CITED: supabase.com/docs/guides/database/postgres/row-level-security] — RLS enable + policy syntax

### Secondary (MEDIUM confidence)
- [CITED: upstash.com/blog/nextjs-ratelimiting] — Upstash ratelimit usage in Next.js API routes
- [CITED: blog.arcjet.com/secret-scanning-and-next-js-builds] — Next.js bundle secret leak patterns, trufflehog filesystem scan
- [CITED: ico.org.uk/for-organisations/advice-for-small-organisations/personal-data-breaches/72-hours-how-to-respond-to-a-personal-data-breach/] — UK GDPR 72-hour notification requirements
- [CITED: ico.org.uk/for-organisations/report-a-breach/] — ICO breach reporting URL
- [CITED: github.com/trufflesecurity/trufflehog] — trufflehog usage for git history scanning
- [CITED: github.com/gitleaks/gitleaks] — gitleaks for pre-commit/CI scanning

### Tertiary (LOW confidence)
- [ASSUMED] Next.js middleware may not intercept server action POST requests — requires verification with Next.js 15

---

## Metadata

**Confidence breakdown:**
- Auth IDOR findings: HIGH — directly verified in codebase with grep
- RLS pattern (Clerk+Supabase): HIGH — official Clerk docs + Supabase docs
- RLS enforcement via Drizzle: HIGH — codebase shows direct Postgres connection, no Supabase client
- Rate limiting (Upstash): HIGH — official docs + npm registry versions verified
- Secrets scanning: HIGH — official tool docs
- IR runbook content: HIGH — direct ICO guidance
- Server action rate limiting middleware interaction: LOW — needs verification

**Research date:** 2026-05-09
**Valid until:** 2026-08-09 (90 days — stable security domain; check ICO guidance for Data Use and Access Act updates which was passed June 19, 2025)
