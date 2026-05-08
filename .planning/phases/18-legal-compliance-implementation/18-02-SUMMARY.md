---
phase: 18-legal-compliance-implementation
plan: "02"
subsystem: server-actions
tags: [legal, compliance, consent, age-gate, dsar, cron, server-actions, zustand]
dependency_graph:
  requires:
    - drizzle/0019_legal_compliance.sql (Plan 01 — schema migration)
    - cookieConsentRecord drizzle table (Plan 01)
    - sarLog drizzle table (Plan 01)
    - users.date_of_birth + legal columns (Plan 01)
  provides:
    - src/lib/legal/versions.ts (CURRENT_TERMS_VERSION + 3 other version constants)
    - src/lib/consent/store.ts (useConsentStore Zustand store)
    - src/app/actions/consent.ts (recordConsent() server action)
    - src/app/actions/onboarding.ts (completeOnboarding() server action)
    - src/app/api/user/data-export/route.ts (DSAR GET endpoint)
    - src/app/api/cron/birthday-transitions/route.ts (birthday cron)
    - src/lib/emails/birthdayTransition.ts (birthday transition email template)
  affects:
    - vercel.json (added birthday-transitions cron entry)
    - src/app/actions/__tests__/consent.test.ts (stubs implemented)
    - src/app/actions/__tests__/onboarding.test.ts (stubs implemented)
tech_stack:
  added:
    - Node crypto.createHash (SHA-256 IP hashing — built-in, no new dep)
  patterns:
    - Zustand create() without persist middleware (consent state)
    - Server action with dynamic import for next/headers (jsdom safety)
    - SHA-256 IP hash for GDPR data minimisation
    - Atomic db.insert().onConflictDoUpdate() for minor defaults
    - Clerk publicMetadata cache for 0ms middleware terms check
    - db.select().from().where() (not db.query.X — schema generic not wired)
    - assertCronSecret + isDryRun guard (Phase 14.4 cron pattern)
    - Promise.all 5-table parallel DSAR query
key_files:
  created:
    - src/lib/legal/versions.ts
    - src/lib/consent/store.ts
    - src/app/actions/consent.ts
    - src/app/actions/onboarding.ts
    - src/app/api/user/data-export/route.ts
    - src/app/api/cron/birthday-transitions/route.ts
    - src/lib/emails/birthdayTransition.ts
  modified:
    - vercel.json (added birthday-transitions cron)
    - src/app/actions/__tests__/consent.test.ts (3 stubs implemented)
    - src/app/actions/__tests__/onboarding.test.ts (4 stubs implemented)
decisions:
  - Used db.select().from().where() in DSAR endpoint instead of db.query.X because NeonHttpDatabase lacks schema generic — relational query builder not available
  - Created src/lib/emails/birthdayTransition.ts template (not in plan) because sendEmail() requires to/subject/html/text fields — birthday cron needs a template to function
  - SHA-256 uses CRON_SECRET as salt (or "kitsubeat-salt" fallback) consistent with RESEARCH.md pattern — separates IP hashes across environments
  - Clerk publicMetadata updated in completeOnboarding() for 0ms middleware latency (RESEARCH Open Question 2 resolved)
metrics:
  duration: "7 minutes"
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_changed: 10
---

# Phase 18 Plan 02: Server-Side Infrastructure — Summary

Version constants, Zustand consent store, recordConsent() with SHA-256 IP hashing, completeOnboarding() with atomic minor defaults, DSAR data export endpoint, and birthday transition cron — all 6 business-logic files implemented with Wave 0 test stubs filled in (7 passing tests, 0 todos).

## Objective

Build all server-side infrastructure that UI layers in Waves 2-4 wire into. Completing this wave first means all server actions are testable in isolation before any UI exists.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | versions.ts + consent store + recordConsent() | a05388e | src/lib/legal/versions.ts, src/lib/consent/store.ts, src/app/actions/consent.ts, consent.test.ts |
| 2 | completeOnboarding() + DSAR + birthday cron + vercel.json | 01b2261 | src/app/actions/onboarding.ts, src/app/api/user/data-export/route.ts, src/app/api/cron/birthday-transitions/route.ts, src/lib/emails/birthdayTransition.ts, vercel.json, onboarding.test.ts |

## Decisions Made

- **DSAR uses db.select() not db.query**: `NeonHttpDatabase` is typed without a schema generic, so `db.query.users` would be a Drizzle type error. Used `db.select().from(users).where(eq(users.id, userId))` throughout — identical semantics, correct types.
- **birthdayTransition.ts email template created (Rule 2 deviation)**: The birthday cron must call `sendEmail({ to, subject, html, text })` but no birthday email template existed. Created minimal template to make the cron functional — required for correct operation.
- **SHA-256 salt = CRON_SECRET**: Consistent with RESEARCH.md §Security Domain pattern; separates environment IP hashes; "kitsubeat-salt" fallback for dev/test environments.
- **Clerk publicMetadata caching**: `completeOnboarding()` writes `terms_version` to Clerk JWT claims so middleware can check re-acceptance at 0ms without a DB query per request.

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Missing Functionality] Created birthdayTransition.ts email template**
- **Found during:** Task 2
- **Issue:** Birthday cron calls `sendEmail()` which requires `to`, `subject`, `html`, `text` fields. No birthday transition email template existed, making the cron non-functional at runtime.
- **Fix:** Created `src/lib/emails/birthdayTransition.ts` with subject/html/text render function following the existing dailyReminder.ts pattern. Template text complies with REQ-MINORS-GATE-12 (does NOT promise settings changes — tells user they CAN update settings themselves).
- **Files modified:** `src/lib/emails/birthdayTransition.ts` (new file)
- **Commit:** 01b2261

**2. [Rule 1 - Bug] Used db.select() instead of db.query.X in DSAR endpoint**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `db.query.users` requires a schema generic on `NeonHttpDatabase` that is not configured in `src/lib/db/index.ts`. Using `db.query.X` would compile to a Drizzle type error.
- **Fix:** Replaced all 5 `db.query.X.findMany()` calls with `db.select().from(X).where(eq(X.user_id, userId))` — identical runtime semantics, correct TypeScript.
- **Files modified:** `src/app/api/user/data-export/route.ts`
- **Commit:** 01b2261

## Verification Results

1. `npx tsc --noEmit` — zero new errors (one pre-existing error in KanaCheckpointNode.test.tsx unrelated to Phase 18)
2. `npm run test:unit` — 73 files pass, 657 tests pass, 0 failures, 0 new todos
3. `grep "social_activity_enabled\|marketing_email_opt_in" src/app/api/cron/birthday-transitions/route.ts` — only in comments, not in `.set({})` (Pitfall 5 confirmed)
4. `grep "createHash" src/app/actions/consent.ts` — SHA-256 IP hash confirmed (REQ-PRIV-COOKIE-05)
5. `grep "birthday-transitions" vercel.json` — cron entry at `0 2 * * *` confirmed

## Must-Haves Verification

| Truth | Status |
|-------|--------|
| CURRENT_TERMS_VERSION is a single exported constant shared by all layers | PASS — `src/lib/legal/versions.ts` exports 4 named constants |
| recordConsent() writes to cookie_consent_record with SHA-256 hashed IP | PASS — `createHash("sha256")` before insert; never raw IP |
| completeOnboarding() rejects DOB < 13 years with error 'under_13' | PASS — unit test confirms; server re-validates regardless of client |
| completeOnboarding() applies minor defaults atomically in ONE db.insert().onConflictDoUpdate() | PASS — unit test verifies `social_activity_enabled=false` in same `.values()` call |
| DSAR GET /api/user/data-export returns JSON bundle for authenticated user only; inserts sar_log row | PASS — 401 if !userId; Promise.all over 5 tables; sarLog insert; Content-Disposition + Cache-Control |
| Birthday cron ONLY sets is_minor=false — does NOT modify social_activity_enabled or any other settings column | PASS — `.set({ is_minor: false })` is the only set call; verified by grep |
| vercel.json has birthday-transitions cron at 02:00 UTC | PASS — `"schedule": "0 2 * * *"` confirmed |

## Known Stubs

None — all files implement complete business logic. The birthdayTransition email template is minimal but functional. No placeholder text flows to UI rendering in this wave (server-side only).

## Threat Flags

No new security surface beyond the plan's threat model:
- All STRIDE threats (T-18-02-01 through T-18-02-06) are mitigated in implementation
- DSAR: auth().userId gate in place (T-18-02-02)
- recordConsent: SHA-256 IP hash (T-18-02-03)
- completeOnboarding: server-side DOB re-validation (T-18-02-01)
- Birthday cron: assertCronSecret guard (T-18-02-05)
- Only is_minor set in birthday cron (T-18-02-06)

## Self-Check: PASSED

- src/lib/legal/versions.ts: EXISTS
- src/lib/consent/store.ts: EXISTS
- src/app/actions/consent.ts: EXISTS (createHash confirmed)
- src/app/actions/onboarding.ts: EXISTS
- src/app/api/user/data-export/route.ts: EXISTS
- src/app/api/cron/birthday-transitions/route.ts: EXISTS
- src/lib/emails/birthdayTransition.ts: EXISTS
- vercel.json: birthday-transitions entry CONFIRMED
- Commit a05388e: FOUND
- Commit 01b2261: FOUND
