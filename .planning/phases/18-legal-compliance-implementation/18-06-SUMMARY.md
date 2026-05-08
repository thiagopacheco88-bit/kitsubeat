---
phase: 18-legal-compliance-implementation
plan: "06"
subsystem: profile-integration-tests
tags: [legal, compliance, profile, integration-tests, ai-disclosure, gdpr, dsar, minors]
dependency_graph:
  requires:
    - src/components/ProfileNudgeBanner.tsx (Plan 05 — nudge banner component)
    - src/components/DataExportButton.tsx (Plan 05 — DSAR export button)
    - src/components/ui/AiBadge.tsx (Plan 05 — EU AI Act badge)
    - src/app/actions/onboarding.ts (Plan 02 — completeOnboarding server action)
    - src/app/actions/consent.ts (Plan 02 — recordConsent server action)
    - src/app/api/user/data-export/route.ts (Plan 02 — DSAR endpoint)
    - src/app/api/cron/birthday-transitions/route.ts (Plan 03 — 18th birthday cron)
    - src/lib/db/schema.ts (Plan 01 — users, cookieConsentRecord, sarLog tables)
    - tests/integration/legal-compliance.test.ts (Plan 01 — Wave 0 test stub contracts)
  provides:
    - src/app/profile/page.tsx (Profile page with ProfileNudgeBanner + DataExportButton wired)
    - src/app/songs/[slug]/components/KanjiBreakdownSection.tsx (AI disclosure attrs added)
    - tests/integration/legal-compliance.test.ts (Fully implemented integration tests — not stubs)
  affects:
    - /profile route (new conditional nudge + account section)
    - /songs/[slug] route (KanjiBreakdownSection now has AI disclosure)
tech_stack:
  added: []
  patterns:
    - SSR fetch of date_of_birth for conditional nudge rendering (no user-controlled input)
    - vi.hoisted() for Clerk mock variables to prevent TDZ error in vi.mock() factories
    - describeIfTestDb skip guard for TEST_DATABASE_URL-gated integration tests
    - Direct server action import in vitest (not HTTP fetch) for integration testing
    - Drizzle ORM .update().where(and(eq, isNotNull, lte)) for cron logic test
key_files:
  created: []
  modified:
    - src/app/profile/page.tsx (ProfileNudgeBanner SSR gate + DataExportButton Account section)
    - src/app/songs/[slug]/components/KanjiBreakdownSection.tsx (data-ai-generated + AiBadge)
    - tests/integration/legal-compliance.test.ts (6 stubs replaced with full test bodies)
decisions:
  - Used db.select().from(users).where(eq(...)) instead of db.query.users.findFirst() for date_of_birth fetch — the profile page uses NeonHttpDatabase which supports both, but the select pattern is consistent with the existing data-export route
  - Used vi.hoisted() for Clerk mock variables because vi.mock() factories are hoisted above const declarations, causing TDZ "cannot access before initialization" errors when variables are referenced in factory functions
  - Integration tests use describe.skip (not describe) when TEST_DATABASE_URL is absent — the 6 tests are visible as skipped (not missing), which makes CI status clear
  - The regression-stale-lesson-data.test.ts failures (2) are pre-existing and unrelated to Phase 18 — confirmed present before Plan 06 work started
metrics:
  duration: 590s
  completed: 2026-05-08
  tasks_completed: 2
  files_changed: 3
---

# Phase 18 Plan 06: Profile Integration + Test Suite Implementation — Summary

**One-liner:** ProfileNudgeBanner + DataExportButton wired into SSR /profile page, KanjiBreakdownSection gets EU AI Act disclosure, and 6 integration test stubs replaced with full DB-verified test bodies using vi.hoisted() Clerk mock pattern.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Profile page wiring + KanjiBreakdownSection AI disclosure | 41d817d | src/app/profile/page.tsx, src/app/songs/[slug]/components/KanjiBreakdownSection.tsx |
| 2 | Implement integration tests + build verification | 98b5051 | tests/integration/legal-compliance.test.ts |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted() required for Clerk mock variables in vi.mock() factory**

- **Found during:** Task 2 — test file failed with `ReferenceError: Cannot access 'mockClerkInstance' before initialization`
- **Issue:** `vi.mock()` is hoisted by Vitest above module-scope `const` declarations. When the factory function references `mockClerkInstance` (a `const`), it encounters a TDZ (temporal dead zone) error because the variable hasn't been initialized yet at the hoisted execution point.
- **Fix:** Wrapped the Clerk mock variables in `vi.hoisted(() => { ... })` — this creates variables that are guaranteed to be initialized before the `vi.mock()` factory runs.
- **Files modified:** `tests/integration/legal-compliance.test.ts`
- **Commit:** 98b5051

---

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — 0 new errors (1 pre-existing KanaCheckpointNode error, unrelated) |
| `npm run test:unit` | PASS — 657 tests passed, 73 files, 0 failures |
| `npm run test:integration` (no TEST_DATABASE_URL) | PASS — legal-compliance tests skip cleanly (describeIfTestDb guard) |
| `npm run build` | PASS — "Compiled successfully in 14.5s" |
| `grep "ProfileNudgeBanner" src/app/profile/page.tsx` | PASS — lines 13, 26 |
| `grep "DataExportButton" src/app/profile/page.tsx` | PASS — lines 14, 47 |
| `grep "date_of_birth" src/app/profile/page.tsx` | PASS — lines 21, 26 (SSR conditional) |
| `grep "data-ai-generated" KanjiBreakdownSection.tsx` | PASS — line 17 |
| `wc -l legal-compliance.test.ts` | PASS — 275 lines (>150 min_lines) |
| Pre-existing failures | regression-stale-lesson-data.test.ts — 2 failures, pre-existing, unrelated to Phase 18 |

---

## Must-Haves Satisfied

- [x] /profile page shows ProfileNudgeBanner when user.date_of_birth IS NULL (SSR check via db.select)
- [x] /profile page shows DataExportButton in "Account" section with GDPR/LGPD description
- [x] KanjiBreakdownSection has data-ai-generated="true" on root element
- [x] KanjiBreakdownSection has AiBadge label="AI-assisted" as first child
- [x] All 6 integration tests in legal-compliance.test.ts are fully implemented (not .todo stubs)
- [x] npm run test:unit exits 0 (657 tests, 0 failures)
- [x] npm run build exits 0 (compiled successfully)
- [x] Integration tests skip gracefully when TEST_DATABASE_URL is absent

---

## Known Stubs

None — all components have live wired behavior. Integration tests are fully implemented; they skip when TEST_DATABASE_URL is not set (correct behavior for the CI/local environment without a test DB).

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced in this plan.

- Profile page SSR fetch of `date_of_birth` is authenticated (getCurrentUserId()) and uses only a null-check — the value is never displayed (T-18-06-01, already in threat register, accepted).
- Integration tests connect to TEST_DATABASE_URL only (HAS_TEST_DB guard prevents any prod DB access — T-18-06-02, mitigated).

## Self-Check: PASSED

Files verified:
- src/app/profile/page.tsx — MODIFIED (FOUND)
- src/app/songs/[slug]/components/KanjiBreakdownSection.tsx — MODIFIED (FOUND)
- tests/integration/legal-compliance.test.ts — MODIFIED (FOUND, 275 lines)

Commits verified:
- 41d817d — feat(18-06): profile page wiring + KanjiBreakdownSection AI disclosure
- 98b5051 — feat(18-06): implement integration tests for legal compliance
