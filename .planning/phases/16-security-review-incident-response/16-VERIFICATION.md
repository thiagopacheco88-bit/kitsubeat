---
phase: 16-security-review-incident-response
verified: 2026-05-10T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
overrides_applied: 0
gaps:
  - truth: "Every authenticated endpoint confirms the caller's identity before read/write — no caller-supplied userId accepted"
    status: partial
    reason: "4 exported server-action functions still accept userId from the caller without calling auth() — identified by code review (16-REVIEW.md). The IDOR fixes in Plans 02/03 covered saveSessionResults, recordVocabAnswer, getAdvancedDrillAccess, recordReviewAnswer, recordVocabAnswer, userPrefs mutations, and both API routes. However getAdvancedDrillUnlock, recordAdvancedDrillAttempt (exercises.ts), startReviewSession, and consumeNewCardBudget (review.ts) were not in-scope for Plans 02/03 and remain vulnerable."
    artifacts:
      - path: "src/app/actions/exercises.ts"
        issue: "getAdvancedDrillUnlock(songVersionId, userId) — no auth() call; caller-supplied userId queries user_song_progress (IDOR — any authenticated user can probe another user's unlock status)"
      - path: "src/app/actions/exercises.ts"
        issue: "recordAdvancedDrillAttempt(userId, songVersionId, exerciseType) — no auth() call; caller can pass another user's ID to burn their quota or bypass premium check"
      - path: "src/app/actions/review.ts"
        issue: "startReviewSession(userId) — no auth() call; caller-supplied userId passed to isPremium() enabling premium gate bypass using any known Clerk userId"
      - path: "src/app/actions/review.ts"
        issue: "consumeNewCardBudget(userId) — no auth() call; exported function accepts any userId and writes to users table (increments review_new_today)"
    missing:
      - "Add auth() guard to getAdvancedDrillUnlock — remove userId param, derive from auth()"
      - "Add auth() guard to recordAdvancedDrillAttempt — remove userId param, derive from auth()"
      - "Add auth() guard to startReviewSession — remove userId param, derive from auth()"
      - "Add auth() guard to consumeNewCardBudget — remove userId param, derive from auth()"
      - "Update all callers of the above four functions to drop userId argument"
human_verification:
  - test: "Verify gitleaks was not run against full git history"
    expected: "gitleaks or equivalent tool has scanned full git history (not just source files) for committed secrets; all findings reviewed and addressed or documented"
    why_human: "Plan 06 used a fallback grep scan instead of gitleaks (tool unavailable). The grep scan covered source files and basic git history patterns but is less thorough than gitleaks. Human review is needed to confirm the scan scope was adequate or to run gitleaks when available."
  - test: "Confirm RLS audit script exit-0 against current live Neon Postgres"
    expected: "npx tsx --env-file=.env.local scripts/audit/rls-audit.ts exits 0 (all public tables have RLS enabled)"
    why_human: "RLS was applied to Neon Postgres in Plan 05 (verified at apply time). Verifier cannot re-run live DB queries. Thiago should confirm the audit script still exits 0 and that no new tables were added without RLS since 7b137b5."
---

# Phase 16: Security Review & Incident Response Verification Report

**Phase Goal:** Every authenticated endpoint is correctly authorized at the data layer; secrets are audited; rate limits exist on writes; a written incident response plan exists before user data arrives.
**Verified:** 2026-05-10
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every public table has RLS enabled (SC-1) | VERIFIED | drizzle/0020_rls_policies.sql: 27 tables with ENABLE ROW LEVEL SECURITY; rls-audit.ts exits 0 per Plan 05 SUMMARY |
| 2 | Every authenticated endpoint confirms caller identity before read/write (SC-2) | PARTIAL | 3 auth() guards added in exercises.ts, 1 in review.ts, 2 in grammarSession.ts, 2 API routes, 3 userPrefs mutations. But 4 exported functions remain IDOR-vulnerable: getAdvancedDrillUnlock, recordAdvancedDrillAttempt (exercises.ts), startReviewSession, consumeNewCardBudget (review.ts) — confirmed by 16-REVIEW.md critical findings CR-01 through CR-04 |
| 3 | Secrets scan passed; no secrets in git history or client bundle; .env conventions documented (SC-3) | VERIFIED | docs/security/ENV-CONVENTIONS.md exists with 16-var inventory; .gitignore updated; fallback grep scan passed clean; human checkpoint PASSED (Plan 06 SUMMARY) |
| 4 | Rate limits exist on writes and LLM endpoints (SC-4) | VERIFIED (partial gap) | src/lib/rate-limit.ts exports exerciseRatelimit (120/min), sessionRatelimit (10/min), llmRatelimit (10/min). Applied to: recordVocabAnswer, saveSessionResults, startGrammarSession (LLM path), vocab-mastery route (429+Retry-After), vocab-tiers route (429+Retry-After). Gap: saveGrammarSessionResults has auth() but no rate limit (WR-01 from code review). startReviewSession also unguarded (IN-02). Neither gap is a ROADMAP SC-4 blocker (SC-4 specifies "exercise answer submission and LLM-proxy endpoints" — saveGrammarSessionResults is the save path, not the LLM call path). |
| 5 | Written IR runbook checked in covering severity taxonomy, 72h UK-GDPR timeline, and first-response checklist (SC-5) | VERIFIED | docs/security/IR-RUNBOOK.md exists; contains 72h GDPR timeline, ICO links, P1-P4 severity taxonomy, first-response checklist, contact list for 6 services; human-approved by Thiago (Plan 07 SUMMARY) |

**Score:** 4/5 success criteria verified (SC-2 partial — 4 IDOR-vulnerable functions remain)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/actions/__tests__/exercises.saveSessionResults.auth.test.ts` | Auth boundary test for saveSessionResults | VERIFIED | File exists; tests GREEN per Plan 02 SUMMARY |
| `src/app/actions/__tests__/exercises.recordVocabAnswer.auth.test.ts` | Auth boundary test for recordVocabAnswer | VERIFIED | File exists; tests GREEN per Plan 02 SUMMARY |
| `src/app/actions/__tests__/exercises.getAdvancedDrillAccess.auth.test.ts` | Auth boundary test for getAdvancedDrillAccess | VERIFIED | File exists; tests GREEN per Plan 02 SUMMARY |
| `src/app/actions/__tests__/grammarSession.auth.test.ts` | Auth boundary test for grammarSession LLM path | VERIFIED | File exists; tests GREEN per Plan 02 SUMMARY |
| `src/app/actions/__tests__/userPrefs.mutations.auth.test.ts` | Auth boundary test for userPrefs mutations | VERIFIED | File exists; tests GREEN per Plan 03 SUMMARY |
| `src/app/api/exercises/vocab-mastery/__tests__/route.test.ts` | Auth test for vocab-mastery route | VERIFIED | File exists; tests GREEN per Plan 03 SUMMARY |
| `src/lib/__tests__/rate-limit.test.ts` | Rate-limit unit tests (4 tests) | VERIFIED | File exists; 4/4 tests GREEN per Plan 04 SUMMARY |
| `scripts/audit/rls-audit.ts` | RLS audit script — exits 1 on missing RLS | VERIFIED | File exists; queries pg_tables.rowsecurity; exits 0 against live Neon per Plan 05 |
| `src/lib/rate-limit.ts` | Upstash rate-limit singletons (exerciseRatelimit, sessionRatelimit, llmRatelimit) | VERIFIED | File exists; exports all 3 singletons with correct sliding-window configs |
| `drizzle/0020_rls_policies.sql` | RLS migration for all public tables | VERIFIED | File exists; 27 tables covered; ENABLE ROW LEVEL SECURITY present |
| `docs/security/ENV-CONVENTIONS.md` | Secrets inventory with NEXT_PUBLIC_ warning | VERIFIED | File exists; 16-var inventory; NEXT_PUBLIC_ classification documented |
| `docs/security/IR-RUNBOOK.md` | IR runbook with 72h GDPR timeline and ico.org.uk link | VERIFIED | File exists; ico.org.uk referenced 4+ times; 72h timeline section present |
| `src/app/actions/exercises.ts` | IDOR-free server actions (saveSessionResults, recordVocabAnswer, getAdvancedDrillAccess) | PARTIAL | 3 auth() guards confirmed in code. However getAdvancedDrillUnlock and recordAdvancedDrillAttempt remain caller-supplied userId (IDOR) |
| `src/app/actions/review.ts` | IDOR-free review actions | PARTIAL | recordReviewAnswer has auth() guard. But startReviewSession and consumeNewCardBudget still accept caller-supplied userId |
| `src/app/actions/grammarSession.ts` | Auth-guarded grammar session actions | VERIFIED | startGrammarSession and saveGrammarSessionResults both have auth() guards; llmRatelimit applied to startGrammarSession |
| `src/app/actions/userPrefs.ts` | Auth-guarded userPrefs mutations | VERIFIED | updateUserPrefs, setThemePreference, clearStreakSaverPending all derive userId from auth() |
| `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` | auth() guard + 401 response | VERIFIED | auth() replaces ?userId= param; returns 401 on unauthenticated; 429+Retry-After on rate limit |
| `src/app/api/exercises/vocab-tiers/route.ts` | auth() guard + 401 response | VERIFIED | auth() replaces &userId= param; returns 401 on unauthenticated; 429 on rate limit |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| exercises.ts::saveSessionResults | Clerk auth() | import { auth } from '@clerk/nextjs/server' | WIRED | auth() call confirmed at line 224 |
| exercises.ts::recordVocabAnswer | Clerk auth() | import { auth } | WIRED | auth() call confirmed at line 740 |
| exercises.ts::getAdvancedDrillAccess | Clerk auth() | import { auth } | WIRED | auth() call confirmed at line 61 |
| exercises.ts::getAdvancedDrillUnlock | Clerk auth() | — | NOT_WIRED | Function accepts userId as param; no auth() call |
| exercises.ts::recordAdvancedDrillAttempt | Clerk auth() | — | NOT_WIRED | Function accepts userId as param; no auth() call |
| review.ts::recordReviewAnswer | Clerk auth() | import { auth } | WIRED | auth() call confirmed at line 151 |
| review.ts::startReviewSession | Clerk auth() | — | NOT_WIRED | Function accepts userId as param; no auth() call |
| review.ts::consumeNewCardBudget | Clerk auth() | — | NOT_WIRED | Function accepts userId as param; no auth() call |
| grammarSession.ts::startGrammarSession | Clerk auth() | import { auth } | WIRED | auth() call confirmed |
| grammarSession.ts::saveGrammarSessionResults | Clerk auth() | import { auth } | WIRED | auth() call confirmed at line 302 |
| exercises.ts::recordVocabAnswer | rate-limit.ts::exerciseRatelimit | import { exerciseRatelimit } | WIRED | exerciseRatelimit.limit(userId) confirmed |
| exercises.ts::saveSessionResults | rate-limit.ts::sessionRatelimit | import { sessionRatelimit } | WIRED | sessionRatelimit.limit(userId) confirmed |
| grammarSession.ts::startGrammarSession | rate-limit.ts::llmRatelimit | import { llmRatelimit } | WIRED | llmRatelimit.limit(userId) confirmed |
| vocab-mastery route | rate-limit.ts::exerciseRatelimit | import { exerciseRatelimit } | WIRED | 429 + Retry-After response confirmed |
| vocab-tiers route | rate-limit.ts::exerciseRatelimit | import { exerciseRatelimit } | WIRED | 429 response confirmed |
| IR-RUNBOOK.md | ico.org.uk | links in notify section | WIRED | ico.org.uk referenced at 4 locations in runbook |
| ENV-CONVENTIONS.md | .env.example | references all env vars | WIRED | UPSTASH_REDIS_REST_URL/TOKEN present in both |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers security controls, not data-rendering components.

---

### Behavioral Spot-Checks

| Behavior | Evidence | Status |
|----------|----------|--------|
| getAdvancedDrillUnlock accepts caller-supplied userId without auth() | Confirmed: function signature `(songVersionId: string, userId: string)` at line 1147 of exercises.ts; no auth() call in function body | FAIL — IDOR confirmed |
| recordAdvancedDrillAttempt accepts caller-supplied userId without auth() | Confirmed: function signature `(userId: string, songVersionId: string, ...)` at line 1180 of exercises.ts; no auth() call | FAIL — IDOR confirmed |
| startReviewSession accepts caller-supplied userId without auth() | Confirmed: function signature `(userId: string)` at line 109 of review.ts; no auth() call | FAIL — premium bypass confirmed |
| consumeNewCardBudget accepts caller-supplied userId without auth() | Confirmed: function signature `(userId: string)` at line 62 of review.ts; no auth() call; writes to users table | FAIL — unauthorized write confirmed |
| saveSessionResults calls auth() and throws Unauthorized | Confirmed in exercises.ts at line 224-225 | PASS |
| recordVocabAnswer calls auth() and applies rate limit | Confirmed in exercises.ts at lines 740-745 | PASS |
| rate-limit.ts exports 3 singletons | Confirmed: exerciseRatelimit, sessionRatelimit, llmRatelimit all present with correct slidingWindow configs | PASS |
| 0020_rls_policies.sql covers all public tables | Confirmed: 27 tables with ENABLE ROW LEVEL SECURITY; rls-audit.ts exits 0 | PASS |
| IR-RUNBOOK.md contains 72h GDPR timeline | Confirmed: Section "UK-GDPR 72-Hour Breach Notification Timeline" with hour-by-hour actions; ico.org.uk links at lines 24, 31, 66, 86 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SC-1 | 16-05 | RLS enabled on all public tables | SATISFIED | drizzle/0020_rls_policies.sql; rls-audit.ts exits 0 |
| SC-2 | 16-02, 16-03 | Auth boundary on all server actions and routes | PARTIAL | 7+ endpoints fixed; 4 remain IDOR-vulnerable |
| SC-3 | 16-06 | Secrets scan clean; .env conventions documented | SATISFIED | ENV-CONVENTIONS.md; clean grep scan; human approved |
| SC-4 | 16-04 | Rate limits on writes and LLM endpoints | SATISFIED | 5 endpoints rate-limited; saveGrammarSessionResults gap is below SC-4 scope (WR-01 warning, not blocker) |
| SC-5 | 16-07 | IR runbook checked in and human-approved | SATISFIED | IR-RUNBOOK.md; human checkpoint PASSED |

---

### Anti-Patterns Found

| File | Function | Pattern | Severity | Impact |
|------|----------|---------|---------|--------|
| src/app/actions/exercises.ts | getAdvancedDrillUnlock | Caller-supplied userId with no auth() guard | CRITICAL | IDOR: any authenticated user can probe another user's advanced drill unlock status |
| src/app/actions/exercises.ts | recordAdvancedDrillAttempt | Caller-supplied userId with no auth() guard | CRITICAL | IDOR: caller can burn another user's quota or bypass premium gate via known premium userId |
| src/app/actions/review.ts | startReviewSession | Caller-supplied userId with no auth() guard | CRITICAL | Premium gate bypass: pass any known premium Clerk userId to receive gated=false |
| src/app/actions/review.ts | consumeNewCardBudget | Caller-supplied userId with no auth() guard; exported | CRITICAL | Unauthorized write: any caller can increment or manipulate any user's daily new-card counter |
| src/app/actions/grammarSession.ts | saveGrammarSessionResults | No rate limit applied | WARNING | Flood risk: fast-polling client can hammer DB writes; auth() guard is present so the caller must be authenticated |
| src/app/actions/__tests__/userPrefs.mutations.auth.test.ts | (test comments) | "Currently FAILS" comment still present though function is fixed | INFO | Misleading comment may cause future engineers to ignore real failures |
| src/app/api/exercises/vocab-mastery/__tests__/route.test.ts | (test comments) | Same stale "Currently FAILS" comment | INFO | Same concern as above |

---

### Human Verification Required

#### 1. Gitleaks Scan Coverage

**Test:** Run `gitleaks detect --source . --log-opts="HEAD~500..HEAD"` (or equivalent) when gitleaks becomes available on the system.
**Expected:** Zero HIGH-severity findings (secrets in git history). Findings are reviewed and either rotated (if real) or suppressed with a reason.
**Why human:** Plan 06 used a grep fallback because gitleaks and Docker were unavailable on Windows. The fallback covered specific known-dangerous patterns but is less thorough than gitleaks' ruleset. A human judgment call is required on whether the fallback scan was sufficient for launch.

#### 2. RLS Audit Re-confirmation

**Test:** Run `npx tsx --env-file=.env.local scripts/audit/rls-audit.ts` against the live Neon Postgres instance.
**Expected:** Script exits 0 with "All public tables have RLS enabled."
**Why human:** RLS was applied in Plan 05 and verified at apply time. Verifier cannot run live DB scripts. Confirm no new tables have been added without RLS since commit 7b137b5.

---

### Gaps Summary

The phase delivered substantial security hardening — 7 or more server action functions and 2 API routes now correctly derive userId from Clerk auth(), a full RLS migration covers all 27 database tables, rate limiting is applied to the 5 highest-risk endpoints, the secrets inventory is documented, and a human-approved IR runbook is committed. These represent genuine security improvements aligned with SC-1, SC-3, SC-4, and SC-5.

The gap is against SC-2 (auth boundary): the code review (16-REVIEW.md) identified 4 exported server-action functions that were not included in Plans 02/03 scope and still accept caller-supplied userId:

- `getAdvancedDrillUnlock` (IDOR read — exposes another user's unlock status)
- `recordAdvancedDrillAttempt` (IDOR write — quota manipulation and premium bypass)
- `startReviewSession` (premium gate bypass via any known Clerk userId)
- `consumeNewCardBudget` (unauthorized write to users table)

All four were flagged as CRITICAL in 16-REVIEW.md. These are active vulnerabilities in exported "use server" functions callable from any client context. SC-2 requires that "every route confirms authenticated user matches target user_id before read/write" — this cannot be considered satisfied while these four functions remain unfixed.

The four fixes share a common pattern (remove userId param, add auth() call at top, update callers) and can be addressed in a single focused plan via `/gsd-code-review-fix 16`.

---

_Verified: 2026-05-10_
_Verifier: Claude (gsd-verifier)_
