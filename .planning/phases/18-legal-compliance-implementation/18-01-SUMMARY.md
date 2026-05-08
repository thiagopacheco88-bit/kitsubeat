---
phase: 18-legal-compliance-implementation
plan: "01"
subsystem: schema
tags: [legal, compliance, migration, schema, drizzle, testing]
dependency_graph:
  requires: []
  provides:
    - drizzle/0019_legal_compliance.sql
    - cookieConsentRecord drizzle table
    - sarLog drizzle table
    - users.date_of_birth + 5 other legal columns
    - Wave 0 test stub contracts for all Phase 18 integration tests
  affects:
    - src/lib/db/schema.ts
    - tests/e2e/a11y.spec.ts
tech_stack:
  added: []
  patterns:
    - IF NOT EXISTS idempotent DDL
    - describeIfTestDb guard for TEST_DATABASE_URL-gated integration tests
    - .todo stubs for Wave N implementation contracts
key_files:
  created:
    - drizzle/0019_legal_compliance.sql
    - tests/integration/legal-compliance.test.ts
    - src/app/actions/__tests__/onboarding.test.ts
    - src/app/actions/__tests__/consent.test.ts
  modified:
    - src/lib/db/schema.ts
    - tests/e2e/a11y.spec.ts
decisions:
  - Used IF NOT EXISTS on all DDL for idempotency (T-18-01-01 mitigation)
  - Ran apply-migrations.ts from worktree with explicit DATABASE_URL because worktree lacks .env.local symlink
  - All new users columns are nullable — no NOT NULL constraint except boolean defaults
  - Cookie consent user_id is nullable to record anonymous visitor decisions before sign-up
metrics:
  duration: "6 minutes"
  completed_date: "2026-05-08"
  tasks_completed: 3
  files_changed: 6
---

# Phase 18 Plan 01: Schema + Test Stub Foundation — Summary

Migration 0019 adds 6 nullable legal-compliance columns to users, creates cookie_consent_record and sar_log tables, updates Drizzle schema types, and plants 3 test stub files as the Wave N implementation contract.

## Objective

Lay the schema + test-stub foundation that every subsequent wave depends on. Migration 0019 applied to live Neon DB. All test stubs discoverable by vitest (7 todos, 0 failures). a11y spec extended with 6 new Phase 18 routes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 0019 + Drizzle schema | d5a56e2 | drizzle/0019_legal_compliance.sql, src/lib/db/schema.ts |
| 2 | Wave 0 test stubs + a11y routes | 5e6ad9a | tests/integration/legal-compliance.test.ts, src/app/actions/__tests__/onboarding.test.ts, src/app/actions/__tests__/consent.test.ts, tests/e2e/a11y.spec.ts |
| 3 | [BLOCKING] DB migration push | (no file commit — live DB only) | drizzle/0019_legal_compliance.sql applied to live Neon DB |

## Decisions Made

- **Idempotent DDL**: All SQL uses `IF NOT EXISTS` throughout — re-running the migration does not corrupt existing data (T-18-01-01 mitigation).
- **Nullable user columns**: All 6 new users columns are nullable with no NOT NULL constraint (except boolean defaults) to preserve existing user rows without data loss.
- **Anonymous consent**: `cookie_consent_record.user_id` is nullable — records anonymous visitor decisions before sign-up as required by PECR.
- **Migration execution path**: Worktree lacks `.env.local` symlink; ran `apply-migrations.ts` with explicit `DATABASE_URL` env var since the script loads from `ROOT/.env.local` and ROOT resolves to worktree root (not main project root).
- **Test stubs**: All 7 new test cases use `.todo` — not `.skip` — to signal "contract agreed, not yet implemented" distinction for Wave N planners.

## Deviations from Plan

None — plan executed exactly as written.

Task 3's "commit" note: The BLOCKING migration push produced no file changes to commit (the migration was applied live to the Neon DB and recorded in `schema_migrations`). The SQL file was already committed in Task 1.

## Verification Results

1. `npx tsc --noEmit` — zero errors in modified files (one pre-existing error in `KanaCheckpointNode.test.tsx` unrelated to Phase 18 changes).
2. `npm run test:unit` — 71 files pass, 7 new todos, 0 new failures; `onboarding.test.ts` (4 todo) and `consent.test.ts` (3 todo) discovered.
3. Live DB: 5 new users columns confirmed + `cookie_consent_record` + `sar_log` tables exist.
4. `grep -n "legal/terms" tests/e2e/a11y.spec.ts` returns line 36 match.

## Live DB Verification

```json
[
  {"column_name":"date_of_birth"},
  {"column_name":"is_minor"},
  {"column_name":"marketing_email_opt_in"},
  {"column_name":"minor_defaults_applied"},
  {"column_name":"terms_version"}
]
Tables: ["cookie_consent_record", "sar_log"]
terms_accepted_at: confirmed present
```

## Known Stubs

The following test stubs are intentional placeholders — each references the Wave that will implement them:

| File | Tests | Implementing Wave |
|------|-------|-------------------|
| tests/integration/legal-compliance.test.ts | 6 .todo | Waves 1-4 (18-02 through 18-05) |
| src/app/actions/__tests__/onboarding.test.ts | 4 .todo | Wave 1 (18-02) |
| src/app/actions/__tests__/consent.test.ts | 3 .todo | Wave 1 (18-02) |

These stubs are intentional — they establish the Nyquist verification contract before implementation.

## Threat Flags

No new security surface beyond the threat model. New DB columns are nullable operator-controlled schema changes with no user input crossing the boundary.

## Self-Check: PASSED

- drizzle/0019_legal_compliance.sql: EXISTS
- src/lib/db/schema.ts: modified with date_of_birth and cookieConsentRecord/sarLog exports
- tests/integration/legal-compliance.test.ts: EXISTS (80+ lines with 6 stubs)
- src/app/actions/__tests__/onboarding.test.ts: EXISTS (40+ lines with 4 stubs)
- src/app/actions/__tests__/consent.test.ts: EXISTS (30+ lines with 3 stubs)
- Commit d5a56e2: FOUND
- Commit 5e6ad9a: FOUND
- Live DB: 5 columns + 2 tables CONFIRMED
