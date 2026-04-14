# Pitfalls Research

**Domain:** Music-based language learning app — adding exercises, SRS, cross-song tracking, auth, and payments to existing Next.js/Neon Postgres app
**Researched:** 2026-04-13
**Confidence:** HIGH (auth/Stripe/JSONB sourced from official docs and CVE reports), MEDIUM (SRS algorithm tuning, gamification balance — well-documented patterns but app-specific tuning required)

---

## Critical Pitfalls

### Pitfall 1: Vocabulary Identity Crisis — No Canonical Key Across JSONB Lessons

**What goes wrong:**
Each `song_versions` row stores a `lesson` JSONB blob containing `vocabulary[]` and `verses[].tokens[]`. When building cross-song tracking (user learns "食べる" in Song A and Song B), there is no stable identifier to unify these tokens. The `surface` field looks like a natural key but is not: the same surface appears with different readings (verb conjugations), different contextual meanings, and even different JLPT-level assignments across songs. If progress is tracked keyed on `surface + reading`, a content correction that fixes a reading typo silently orphans every user progress row for that word with no migration path.

**Why it happens:**
The existing schema stores vocabulary purely as JSONB inside `song_versions` with no normalized vocabulary table. When adding a progress layer on top, developers reach for the most obvious string field as an identifier without thinking through content mutability.

**How to avoid:**
Create a normalized `vocabulary_items` table during the v2.0 schema migration — before writing any exercise or progress code. Each row gets a UUID primary key keyed on `(lemma, reading, part_of_speech)`. At content-import time, an extraction pass populates this table and writes the UUID back into the JSONB as `vocabulary[n].vocab_id`. Cross-song progress rows then reference `vocab_id`, never surface strings. The JSONB stays as-is for display; it just gains a stable pointer.

**Warning signs:**
- Any query using `WHERE lesson->'vocabulary'->>'surface' = $1` to look up user history
- Migration scripts joining progress rows to vocabulary on text fields from JSONB
- Progress rows accumulating for the same word under multiple surface spellings (e.g., "食べる" and "食べる" from different encoding)

**Phase to address:**
v2.0 Schema Design — the `vocabulary_items` table must exist before any exercise or progress table is created. Retrofitting after progress data exists requires an expensive migration that cannot perfectly resolve ambiguous surface-form matches.

---

### Pitfall 2: Auth Added as Middleware-Only — CVE Pattern and Defense-in-Depth Failure

**What goes wrong:**
The most common pattern when bolting auth onto an existing Next.js App Router app is to add a `middleware.ts` that checks for a session cookie and redirects unauthenticated users. This feels complete. It is not. CVE-2025-29927 (CVSS 9.1) demonstrated that the `x-middleware-subrequest` header can bypass middleware entirely on Next.js versions 11.1.4 through 15.2.2. Beyond the CVE, middleware runs at the edge and cannot query the database, so it can only check "is there a cookie?" — not "is this session still valid?" A revoked session or a cancelled subscription will pass middleware until the cookie expires.

**Why it happens:**
Middleware is the most visible auth hook in App Router. It intercepts every request in one file, which makes it feel like the auth layer. Developers treat it as complete.

**How to avoid:**
Implement a Data Access Layer (DAL): every server action and route handler that returns user-specific data calls a `requireAuth()` helper that validates the session against the database. Middleware handles only redirects as UX convenience — never as the security gate. Feature gates that check subscription plan must query the `users` table at request time, not read `session.user.plan` from the cookie (which may be stale after a Stripe webhook fires).

**Warning signs:**
- Server actions that skip session validation and rely on "middleware already checked this"
- Feature gates reading `session.user.plan` from the JWT/cookie rather than querying the users table at request time
- No `requireAuth()` wrapper being called inside any server action that writes data

**Phase to address:**
v1.0 Auth — establish the DAL pattern from the first auth commit. Every subsequent exercise and payment feature will inherit it automatically.

---

### Pitfall 3: Public-to-Auth Migration Breaks Next.js Static Cache Boundaries

**What goes wrong:**
KitsuBeat currently has zero auth, so all pages are server-rendered with no user context. Next.js 15 defaults to static rendering and aggressively caches server component output. When you add auth, pages that now conditionally render user progress, mastery stars, or "continue learning" state must be dynamically rendered per-user. If you forget to call `cookies()` or `headers()` at the component level that needs dynamic behavior, Next.js will cache one user's progress state and serve it to another user. The inverse also happens: adding `cookies()` anywhere in a layout opts the entire layout subtree out of static caching, which can degrade performance for content that was fine to cache.

**Why it happens:**
Next.js 15's caching rules require `cookies()` or `headers()` to be called at the render boundary in the tree — not inside a child component called conditionally. The boundary is determined statically at build time. Misplacing the call opts too much or too little out of the cache.

**How to avoid:**
Audit every page that will show user-specific data before building it. Call `cookies()` explicitly at the top of the server component for that page segment, even if you discard the result. Keep song content pages publicly cacheable — put user-specific state (progress overlay, mastery stars) in a separate Client Component that fetches from an authenticated API route after the page loads.

**Warning signs:**
- A logged-out incognito window shows another user's star ratings on a song page
- `fetch()` calls to internal API routes return cached responses after user actions that should have invalidated state
- Console warnings about static generation in routes that call `cookies()`

**Phase to address:**
v1.0 Auth — define the public/authenticated render boundary before adding any user-specific content to existing pages.

---

### Pitfall 4: SRS Review Queue Explosion Kills Retention

**What goes wrong:**
The cross-song vocabulary tracker means every song a user listens to can surface 10-30 new vocabulary items. If all encountered items are automatically added to the SRS review queue, a user who explores 5 songs in one session wakes up the next day with 100+ items due for review. Miss one day and it becomes 200+. SRS abandonment research consistently identifies review queue overwhelm as the primary cause of users quitting SRS-based learning apps — not difficulty, not frustration with wrong answers, but queue size becoming psychologically unmanageable.

**Why it happens:**
Cross-song tracking is designed to maximize coverage. Without an explicit queue entry strategy, "track this word" and "add this to review" become the same action by default.

**How to avoid:**
Enforce a hard daily new-item cap (default 10-15, user-configurable). Distinguish three states: `encountered` (seen in a song, logged for statistics), `learning` (in active SRS queue with short intervals), `reviewing` (passed learning phase, on standard SRS spacing). Items enter `learning` only when explicitly added by the user, or after a configurable threshold of encounters across different songs. Display the review queue size prominently before a session starts. For the kana trainer, all 92 kana should NOT enter the queue at once — unlock by row (5-10 kana per row), mastering each row before the next is available.

**Warning signs:**
- No `daily_new_items_limit` field in `user_settings` table
- All vocabulary from an encountered song is auto-inserted into the SRS table
- Review queue size is not surfaced in the UI on the dashboard or before starting a session

**Phase to address:**
v2.0 SRS Design — the daily cap and three-state item lifecycle must be schema-level decisions, not application-level patches applied after users report overwhelm.

---

### Pitfall 5: Stripe Webhook Race Condition on Checkout Return

**What goes wrong:**
When a user completes Stripe Checkout, Stripe redirects them to your `/success` page and simultaneously sends a `checkout.session.completed` webhook. These are two independent async channels. The redirect arrives first — always. The webhook arrives 1-5 seconds later. If your success page immediately queries the users table for their new plan and renders "Welcome, Pro user!", the query returns `free` because the webhook has not updated the database yet. The tempting fix — granting Pro access based on the `session_id` URL parameter — is a gating leak: the success URL is replayable by any user who sees it.

**Why it happens:**
Developers test on localhost where webhook delivery is instant via the Stripe CLI. In production, webhook delivery is async. The gap is invisible until real users hit it.

**How to avoid:**
The success page renders a "Processing payment..." holding state and polls `/api/me/plan` until it returns a non-pending plan. Store a `stripe_checkout_session_id` in the user row when checkout begins; the webhook marks it confirmed. Webhooks must be idempotent — store processed Stripe event IDs in a `processed_stripe_events(event_id, processed_at)` table and skip duplicate events. Never grant plan access from URL parameters alone.

**Warning signs:**
- Success page immediately renders "Pro" status without a database check
- No `processed_stripe_events` table or equivalent deduplication mechanism
- Webhook handler does not call `stripe.webhooks.constructEvent()` before processing — meaning the signature is unverified

**Phase to address:**
v2.0 Payments — implement the idempotent webhook handler and `pending` plan state before building any premium feature gate.

---

### Pitfall 6: Feature Gating Leaks at the Data Layer

**What goes wrong:**
A freemium app gates premium exercises in the UI with "Upgrade to Pro" prompts. But if the server action or API route that delivers exercise questions does not independently verify `user.plan`, a user who reverse-engineers the endpoint can call it directly without a Pro subscription. This is the most common freemium implementation mistake. The UI gate is cosmetic. The data gate is the real gate. Additionally, if plan status is read from the session JWT rather than the database, a user who cancels their subscription will retain Pro access until their session token expires — potentially hours or days.

**Why it happens:**
UI gating is visible and easy to verify manually. Server-side gating requires adding plan checks inside every server action, which is repetitive and easy to skip for "internal" endpoints.

**How to avoid:**
Build a `requirePlan(userId, 'pro')` helper that throws a 403 at the top of any server action gating premium content. Never derive plan status from the session token. Compose it with the auth helper: `const user = await requireAuth(); await requirePlan(user.id, 'pro')`. Test with a test user whose database plan column is `free` and verify every premium endpoint returns 403, not just a redirect.

**Warning signs:**
- Server actions that read plan from `session.user.plan` rather than a fresh DB query
- Any feature flag stored in localStorage, cookies, or URL params on the client
- Premium exercise server actions that have no plan check at all, relying solely on the UI to hide the button

**Phase to address:**
v2.0 Payments — the `requirePlan` helper must be built and unit-tested before the first premium exercise type ships.

---

### Pitfall 7: Exercise Question Quality Degraded by Same-Song Distractor Pool

**What goes wrong:**
The lesson JSONB already contains vocabulary items, tokens, and grammar points. It is tempting to auto-generate all exercise distractors (wrong-answer choices) by pulling from the current song's vocabulary array. The problem: if the lesson has only 8 vocabulary items and an exercise asks "What does 食べる mean?", with the other 3 choices drawn from that same lesson, a user who has done 2 previous questions in the session can eliminate choices by process of elimination, not by knowing the word. Worse, clustering distractors within a single song teaches users to distinguish song-level vocabulary, not the target word itself.

**Why it happens:**
The current song's JSONB is the most accessible data source. Without a normalized vocabulary corpus across songs, there is no other pool to draw from.

**How to avoid:**
Build the normalized `vocabulary_items` table (Pitfall 1) and use it as the distractor pool. Distractors for a vocabulary question should be drawn from words at the same JLPT level and same part-of-speech, from other songs. For the kana trainer, distractors should be phonetically similar kana (offering し/ち/つ as alternatives to つ). Add a minimum pool size check: if fewer than 3 plausible distractors exist, defer the question rather than showing degenerate choices.

**Warning signs:**
- Distractor generation code references only `lesson.vocabulary` from the current song version
- Questions where every wrong answer shares a theme uniquely identifiable to the current song
- No minimum distractor count validation before a question is rendered

**Phase to address:**
v2.0 Exercise Design — define the distractor pool strategy and validate pool sizes before writing the first exercise generator.

---

### Pitfall 8: Star/Mastery Score Purgatory Trap

**What goes wrong:**
The -2/+1 scoring system requires 10 consecutive correct answers to reach 10 stars from zero. One wrong answer at star 9 drops to star 7, requiring 3 more correct answers to recover. This is intentional — it prevents inflation. The trap: if the SRS scheduler surfaces a word for review before the user has consolidated it, they fail repeatedly and the star score oscillates between star 2 and star 4 indefinitely. A word the user has attempted 15 times but never mastered because review intervals are too aggressive creates a "stuck word" that never disappears from the queue. SRS research identifies this pattern as a primary frustration point.

**Why it happens:**
Standard SRS scheduling assumes the user has basic familiarity with an item before it enters the review queue. Items that enter at star 0 with short intervals fail rapidly, and the -2 penalty perpetuates the low-star cycle.

**How to avoid:**
Implement a two-phase model. In the `learning` phase (star 0-3), the item uses fixed short intervals: review again today, then tomorrow, then in 3 days. Only after reaching star 3 does the item graduate to the full SRS spacing algorithm. This mirrors how Anki/FSRS handles new cards. The star floor of 0 is correct, but add a soft rule: after 10+ reviews with max star under 4, flag the item as `needs_review` and surface it in a dedicated "struggling words" exercise rather than the main queue.

**Warning signs:**
- No distinction between `learning_phase` and `review_phase` states in the progress schema
- Items with `review_count > 10` and `stars < 4` accumulating without intervention
- Users reporting "some words never go away" in community feedback

**Phase to address:**
v2.0 SRS Design — the learning/review phase distinction must be in the database schema. Adding it after progress data exists requires backfilling phase state for all existing records.

---

### Pitfall 9: JSONB Write Amplification for Per-Answer Progress Updates

**What goes wrong:**
Neon Postgres is serverless. Storing any exercise session state in a JSONB column and updating it per-answer creates write amplification: Postgres does not support HOT (Heap-Only Tuple) updates on indexed JSONB columns. Every update copies the entire row and refreshes all indexes, even if only a deeply nested value changed. On Neon's scale-to-zero architecture, this creates write pressure during exercise sessions (which fire every 5-10 seconds per answer) and can cause checkpoint spikes during peak usage.

**Why it happens:**
JSONB feels convenient for storing flexible session state (current question index, streak count, timing). Developers store mutable per-answer state inside a JSONB blob and update it inline.

**How to avoid:**
Use scalar columns for all mutable per-item state: `stars INTEGER`, `last_reviewed_at TIMESTAMPTZ`, `review_count INTEGER`, `next_review_at TIMESTAMPTZ`. No JSONB columns for data updated during user interaction. JSONB is appropriate for append-only data (session logs after completion) or static lesson configuration. For real-time exercise session state, keep it in React state or `localStorage` and persist to the database only when the session ends — one write per session, not one write per answer.

**Warning signs:**
- `user_progress` table has a JSONB column named `session_state`, `history`, or similar that is updated on each answer
- Database writes triggered on every `onCorrect()` / `onWrong()` event during an exercise
- Neon dashboard showing high WAL generation during exercise hours

**Phase to address:**
v2.0 Schema Design — define all progress columns as scalars before any exercise code is written. The schema review checklist must include "zero JSONB columns for mutable state."

---

### Pitfall 10: Cookie/Session Writing Fails Silently in Next.js 15 RSCs

**What goes wrong:**
React Server Components cannot set cookies — they can only read them. This is a hard constraint in Next.js 15's App Router. Developers who copy auth examples from older tutorials or Client Component patterns and place `cookies().set()` inside a Server Component will get a silent no-op: the cookie is not set, no error is thrown, and the user appears to be logged in during the render but is not persisted after navigation. A related failure: Server Actions that call Better Auth's sign-in function without the `nextCookies()` plugin will complete without error but fail to write the session cookie, leaving the user in a half-authenticated state.

**Why it happens:**
The RSC/Server Action boundary is non-obvious. `cookies()` is importable and callable in RSCs, so `cookies().get()` works fine there. Developers assume `cookies().set()` works too, but it does not in that context.

**How to avoid:**
Use Better Auth's `nextCookies()` plugin, which automatically handles `Set-Cookie` headers in the response from any Server Action. For token refresh, implement it in middleware (which runs before RSC rendering and can set cookies) rather than in the RSC. Test auth flows with expired tokens specifically — not just "logged in" and "logged out" states.

**Warning signs:**
- Users report being randomly logged out without any logout action
- Sign-in Server Actions complete without error but the user is not persisted after navigating to another page
- `cookies().set()` called directly inside a Server Component (not a Server Action or Route Handler)

**Phase to address:**
v1.0 Auth — verify cookie write behavior across RSC, Server Action, and middleware layers before shipping any auth. Include an expired-token test case in the auth QA checklist.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Track vocabulary by `surface` string instead of UUID | No schema migration needed | Orphaned progress on content correction; duplicate tracking for conjugated forms | Never — add `vocab_id` before the first progress row is written |
| Store exercise session state in JSONB columns | Flexible schema during development | Write amplification per answer; vacuum pressure; scaling issues | Never for mutable state — use JSONB only for append-only session logs |
| Put all auth checks in middleware only | Single auth implementation point | CVE-2025-29927 bypass pattern; stale plan state for gating after subscription changes | Never — DAL checks are required at every data access point alongside middleware |
| Grant Pro access on Stripe redirect URL parameter | Instant UX on checkout completion | Gating leak — success URL is replayable by any user who copies it | Never — always require webhook confirmation to update the database |
| Auto-add all encountered vocabulary to SRS queue | Full vocabulary coverage from day one | Review queue explosion within a week; primary abandonment cause | Never — require explicit user opt-in or enforce daily cap |
| Use same-song vocabulary for exercise distractors | Simple implementation, no cross-song query needed | Trivially easy exercises; no real acquisition signal | Only for alpha/internal testing — not for a shipped product |
| Skip `learning_phase` / `review_phase` distinction in SRS | Simpler data model | "Purgatory trap" — struggling items never reach mastery; user frustration | Never — phase must be in the schema before first review data is written |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe webhooks | Parse `event.type` without verifying the Stripe signature | Always call `stripe.webhooks.constructEvent(rawBody, sig, secret)` before touching the payload; use raw body, not parsed JSON |
| Stripe webhooks | Handle each event type assuming exactly-once delivery | Store `stripe_event_id` in `processed_stripe_events(event_id TEXT PRIMARY KEY)`; skip if already present |
| Stripe checkout | Grant Pro access on successful redirect URL | Store `pending_checkout_session_id` on the user row; mark confirmed only after `checkout.session.completed` webhook fires |
| Better Auth + Next.js RSC | Call sign-in functions inside Server Components | Use Server Actions (not RSCs) for any auth mutation; install the `nextCookies()` plugin |
| Better Auth + Next.js RSC | Read `session.user.plan` from JWT for feature gating | Query `users` table at request time; JWT may be stale after plan change |
| Neon Postgres serverless | Create `db` connection outside request handlers (module-level singleton) | Use PgBouncer pooler connection string for long-running processes; neon-http driver is safe for stateless serverless but cannot do interactive transactions |
| Neon Postgres neon-http | Use interactive transactions (BEGIN/COMMIT across multiple queries) | Switch to `neon-websockets` driver for transaction support; neon-http is single-query only |
| Drizzle ORM JSONB | Query `lesson->'vocabulary'` at runtime for exercise distractor selection | Extract vocabulary into `vocabulary_items` at import time; never join progress to JSONB at query time |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| One database write per exercise answer | High Neon connection count; slow answer feedback; WAL growth | Buffer session results in React state; single DB write on session end | ~10 concurrent users doing exercises |
| Full table scan on `user_progress` to compute due reviews | SRS dashboard loads slowly as vocabulary grows | Composite index on `(user_id, next_review_at)` from day one | >500 vocabulary items per user |
| JSONB containment query to find words across songs (`@>`) | Cross-song vocabulary search times out; planner chooses seq scan | Normalized `vocabulary_items` table with full-text or exact-match index | >30 songs in catalog |
| Fetching entire `lesson` JSONB column to generate a single exercise question | High data transfer per exercise render | Use `jsonb_path_query` with narrow selects, or extract exercise data into a separate table at import | Fine at low scale; 3-5x slower at 50+ concurrent users |
| Subscription plan read from session JWT on every feature gate | Plan state is stale for hours after cancellation | Short-lived JWTs (15 min) with refresh, or always query DB for plan in server actions | Immediately after any subscription state change event |
| Neon cold start on first exercise answer after idle period | 300-500ms lag on the first DB write after inactivity | Neon's pooler (PgBouncer) masks cold starts for reads; for write-heavy features, keep a warm connection via scheduled keepalive | Any idle period > 5 minutes on free/hobby Neon tier |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Relying on middleware as the only auth check | Any request with crafted headers bypasses all auth and gating | `requireAuth()` call inside every server action and route handler that touches user data |
| Reading `user.plan` from session JWT in feature gates | Cancelled subscribers retain Pro access until token expires | Always query `users.plan` from the database in the server action; never trust the token for authorization decisions |
| Accepting Stripe webhooks without signature verification | Attacker can POST fake subscription upgrades to any endpoint | `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` must be called first; rawBody must be the pre-parsed buffer, not the JSON-parsed object |
| Storing Stripe `customer_id` in the session JWT | Leaks an internal Stripe ID; JWT cannot be invalidated on plan change | Store only `user_id` in JWT; look up `stripe_customer_id` from DB on demand |
| Not scoping all exercise/progress queries to the authenticated `user_id` | One user can read or corrupt another's progress by supplying a different user ID in the request body | All progress queries use `WHERE user_id = (await requireAuth()).id` — never trust a client-submitted user ID |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| All 80+ encountered vocabulary items auto-added to SRS queue | User opens app next day to 80 overdue reviews; abandons within a week | Encountered vs. Learning state separation; user opts in explicitly, or system enforces a daily cap of 10-15 new items |
| 10-star mastery shown only as a number with no trend context | At star 3, the number never seems to move; demotivating | Show short-term trend (last 5 reviews: ↑↑↓↑↑) alongside the absolute star count; celebrate "personal best streak" milestones |
| All 7+ exercise types presented on first visit | Cognitive overload; unclear where to start | Progressive unlock: 2 exercise types available initially; additional types unlock after demonstrating proficiency in the first ones |
| Kana trainer presents all 92 kana at once | Vocabulary overwhelm; beginners quit before making progress | Row-by-row unlock: 5-10 kana per group (e.g., あいうえお first); mastery of each row unlocks the next |
| "Upgrade to Pro" modal interrupts an active exercise mid-session | Interrupts flow state; creates resentment toward the paywall | Gate at session start, not mid-session; if user is on a trial that expires, let them complete the current session before showing the upgrade prompt |
| Leaderboards or "X users reviewed this word today" social counters | Competitive pressure reduces intrinsic motivation for many adult learners | Omit competitive social features in v2.0; focus on personal progress graphs and streak visualizations instead |

---

## "Looks Done But Isn't" Checklist

- [ ] **SRS queue:** Looks done when the UI shows a review count — verify `user_settings.daily_new_items_limit` is enforced at item-add time, not just a display preference
- [ ] **Exercise feature gate:** Looks done when the UI hides the premium button — verify a `free` plan user calling the server action directly receives 403, not just a redirect
- [ ] **Stripe webhook handler:** Looks done when checkout completes successfully — verify sending the same `checkout.session.completed` event twice does NOT double-upgrade the user's plan
- [ ] **Vocabulary tracking:** Looks done when stars appear on words — verify `user_progress.vocab_id` is a foreign key to `vocabulary_items.id`, never a raw `surface` text column
- [ ] **Kana mastery floor:** Looks done when star scores display — verify an item reviewed 15+ times that keeps failing does not stay at star 0 indefinitely; learning-phase logic should escalate it to `needs_review` status
- [ ] **Auth cookie refresh:** Looks done when sign-in works — verify a session whose access token expires mid-session is refreshed transparently without forcing re-login
- [ ] **Post-cancellation gating:** Looks done when the cancel flow works — verify a user who cancels their Stripe subscription cannot access Pro exercises after the `customer.subscription.deleted` webhook fires and the database is updated
- [ ] **Exercise distractors:** Looks done when exercises render — verify exercises with an insufficient distractor pool (< 3 from `vocabulary_items`) fall back gracefully rather than showing duplicate options or crashing

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vocabulary tracked by surface string, not UUID | HIGH | Write migration: create `vocabulary_items`; match existing `user_progress` rows by `surface + reading + jlpt_level`; accept ambiguity for identical surface forms; backfill `vocab_id`; flag unresolvable rows for manual review; cannot be done without a maintenance window |
| SRS queue explosion — users with 500+ overdue reviews | MEDIUM | Add admin tool to bulk-reset `next_review_at` dates; implement daily cap going forward; communicate "queue reset" as an improvement, not a bug fix |
| Stripe webhook race caused double-upgrades | MEDIUM | Query Stripe API to reconcile actual subscription state against database; write a one-time reconciliation script; add `processed_stripe_events` idempotency going forward |
| Middleware-only auth discovered post-launch | HIGH | Every server action must be audited manually — no automated tool can reliably find all gaps; add `requireAuth()` to each one individually; deploy incrementally |
| JSONB session state causing vacuum bloat | MEDIUM | Migrate session state JSONB columns to scalar columns via Drizzle migration; run `VACUUM FULL` on the affected table during low-traffic window; monitor WAL generation after |
| Star purgatory — users with many stuck words | LOW | Add `needs_review` flag and dedicated exercise mode for flagged items; run backfill script to flag existing items meeting the threshold criteria |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vocabulary identity crisis (surface string as key) | v2.0 Schema Design | `user_progress.vocab_id` is a FK to `vocabulary_items.id`; no text-based vocabulary lookup in any query |
| Middleware-only auth / CVE-2025-29927 pattern | v1.0 Auth | Every server action has `requireAuth()` call; manual test: send request with no session cookie and confirm 401 |
| Public-to-auth static cache boundary | v1.0 Auth | Incognito window test: logged-out user sees zero user-specific data on any song page |
| SRS queue explosion | v2.0 SRS Design | Create 5 songs and "encounter" all vocabulary; verify only `daily_new_items_limit` items enter the learning queue, not all |
| Stripe webhook race condition | v2.0 Payments | Send same `checkout.session.completed` event twice to staging; verify plan upgraded exactly once |
| Feature gating leaks | v2.0 Payments | Curl a premium server action as a free-plan user; must return 403 with no plan in the request |
| Exercise distractor quality | v2.0 Exercise Design | Run exercise generator for a song with only 4 vocabulary items; verify distractors come from `vocabulary_items` across other songs |
| Star score purgatory trap | v2.0 SRS Design | Simulate 20 consecutive failures on one item; verify learning-phase logic flags the item and does not loop indefinitely at star 0 |
| JSONB write amplification | v2.0 Schema Design | Schema review checklist: zero JSONB columns for any state updated during user interaction |
| Cookie/session write failure in RSC | v1.0 Auth | Let access token expire in the browser; verify transparent refresh without logout; test with Better Auth's `nextCookies()` plugin installed |
| Post-cancellation Pro access leak | v2.0 Payments | Simulate `customer.subscription.deleted` webhook; verify former Pro user receives 403 on premium server action within one request cycle |

---

## Sources

- Next.js CVE-2025-29927 (CVSS 9.1) authentication bypass via middleware: https://workos.com/blog/nextjs-app-router-authentication-guide-2026
- Next.js official authentication guide (DAL pattern): https://nextjs.org/docs/app/guides/authentication
- Better Auth Next.js integration — RSC cookie limitation and `nextCookies()` plugin: https://better-auth.com/docs/integrations/next
- Stripe webhook race condition and idempotency analysis: https://www.pedroalonso.net/blog/stripe-webhooks-solving-race-conditions/ and https://dev.to/belazy/the-race-condition-youre-probably-shipping-right-now-with-stripe-webhooks-mj4
- Stripe official idempotency documentation: https://docs.stripe.com/api/idempotent_requests
- PostgreSQL JSONB write amplification (no HOT updates on indexed JSONB): https://dev.to/mongodb/no-hot-updates-on-jsonb-13k7
- PostgreSQL JSONB performance and type-sensitivity in containment queries: https://medium.com/@rizqimulkisrc/jsonb-in-postgresql-power-performance-and-pitfalls-2534de43eb9c
- SRS review queue overflow and abandonment (seven years of classroom data): https://www.lesswrong.com/posts/F6ZTtBXn2cFLmWPdM/seven-years-of-spaced-repetition-software-in-the-classroom-1
- FSRS algorithm and SM-2 improvements (learning phase vs. review phase): https://domenic.me/fsrs/
- Gamification negative effects in language learning apps: https://www.taalhammer.com/gamification-in-language-learning-apps/
- Neon serverless connection handling and cold start mitigation: https://neon.com/docs/connect/choose-connection
- Neon serverless driver transaction support: https://neon.com/docs/serverless/serverless-driver

---
*Pitfalls research for: KitsuBeat v2.0 — exercises, SRS, cross-song tracking, auth, Stripe payments*
*Researched: 2026-04-13*
