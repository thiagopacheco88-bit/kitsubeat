---
phase: 18-legal-compliance-implementation
plan: "04"
subsystem: age-gate-middleware
tags: [legal, compliance, age-gate, onboarding, middleware, clerk, accessibility]
dependency_graph:
  requires:
    - src/lib/legal/versions.ts (Plan 02 — CURRENT_TERMS_VERSION)
    - src/app/actions/onboarding.ts (Plan 02 — completeOnboarding server action)
    - src/lib/db/schema.ts (Plan 01 — users legal columns)
  provides:
    - src/app/onboarding/age-gate/page.tsx (age-gate onboarding UI page)
    - src/middleware.ts (terms version gate — redirects users with outdated/missing terms_version)
  affects:
    - All authenticated page routes (middleware terms check added)
    - Clerk JWT publicMetadata (terms_version read for 0ms middleware check)
tech_stack:
  added: []
  patterns:
    - client component with useState for multi-step form (DOB + terms + minor awareness)
    - aria-disabled on submit CTA (REQ-A11Y-28 — keyboard focusable while visually disabled)
    - role=alert aria-live=assertive always-in-DOM error region (REQ-A11Y-44)
    - tabIndex=-1 + ref.current.focus() for programmatic focus on under-13 blocker (REQ-A11Y-43)
    - middleware if-block pattern (restructured from early-return to support two gates)
    - Clerk JWT publicMetadata read in middleware (0ms DB query — RESEARCH Open Question 2)
key_files:
  created:
    - src/app/onboarding/age-gate/page.tsx
  modified:
    - src/middleware.ts
decisions:
  - Created page at src/app/onboarding/age-gate/page.tsx (not src/app/onboarding/page.tsx) — plan frontmatter listed page.tsx but must_haves and middleware redirect both target /onboarding/age-gate route; correct path is age-gate/page.tsx
  - Cast session.sessionClaims?.publicMetadata as Record<string, string> to resolve TS2339 — Clerk types publicMetadata as {} requiring explicit cast for property access
  - Restructured admin gate from if (!isAdminRoute) return to if (isAdminRoute) { ... return; } to enable terms gate after admin check without double auth() calls on admin routes
metrics:
  duration: "8 minutes"
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_changed: 2
---

# Phase 18 Plan 04: Age-Gate Onboarding Page + Middleware Terms Check — Summary

Client-side age-gate onboarding page (DOB form + minor awareness step + under-13 blocker) wired to completeOnboarding() server action, plus surgical middleware addition that redirects authenticated users with missing/outdated terms_version to /onboarding/age-gate using Clerk JWT publicMetadata (0ms DB query).

## Objective

Build the two pieces that enforce SC1 ("T&Cs accepted at signup; changes require re-acceptance"): the onboarding UI and the middleware gate. Together they close the age-gating loop started in Plan 01 (schema) and Plan 02 (server actions).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Age-gate onboarding page — DOB form, minor awareness, under-13 blocker | 1be8592 | src/app/onboarding/age-gate/page.tsx |
| 2 | Middleware terms version check addition | cff9fbb | src/middleware.ts |

## Decisions Made

- **Route path correction (Rule 1):** Plan frontmatter listed `src/app/onboarding/page.tsx`, but `must_haves`, the middleware redirect target, and the research architecture diagram all reference `/onboarding/age-gate`. Created `src/app/onboarding/age-gate/page.tsx` — the correct route. Using `src/app/onboarding/page.tsx` would have sent the middleware redirect to a 404.

- **publicMetadata TypeScript cast:** Clerk v7 types `sessionClaims.publicMetadata` as `{}` (empty object type). Accessing `.terms_version` directly produces TS2339. Cast to `Record<string, string> | undefined` — this is the Clerk-idiomatic workaround; runtime behavior is identical to the plan's intended `as string | undefined` cast.

- **Admin gate restructure:** The existing middleware used `if (!isAdminRoute(req)) return;` (early return for non-admin). To add the terms gate after the admin gate without calling `auth()` twice on admin routes, restructured to `if (isAdminRoute(req)) { ...existing logic...; return; }`. The admin email check logic is verbatim — only the guard structure changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Created page at age-gate subdirectory, not onboarding root**
- **Found during:** Task 1 — comparing `<files>` (page.tsx) vs must_haves and middleware redirect target (/onboarding/age-gate)
- **Issue:** Plan frontmatter `files_modified` listed `src/app/onboarding/page.tsx`, which maps to route `/onboarding`. But middleware redirects to `/onboarding/age-gate` and all must_haves reference `/onboarding/age-gate`. Using the frontmatter path would create a 404 on the redirect target.
- **Fix:** Created `src/app/onboarding/age-gate/page.tsx` — maps to `/onboarding/age-gate` route as required.
- **Files modified:** path choice only; content matches plan exactly.
- **Commit:** 1be8592

**2. [Rule 1 - Bug] Cast publicMetadata via Record<string, string> to resolve TS2339**
- **Found during:** Task 2 — `npx tsc --noEmit` reported TS2339 on `publicMetadata.terms_version`
- **Issue:** Clerk v7 types `sessionClaims.publicMetadata` as `{}` — property access fails TypeScript strict mode.
- **Fix:** `const publicMeta = session.sessionClaims?.publicMetadata as Record<string, string> | undefined; const termsVersion = publicMeta?.terms_version;` — same runtime semantics as plan's intended `as string | undefined`, correct TypeScript.
- **Files modified:** `src/middleware.ts`
- **Commit:** cff9fbb

## Verification Results

1. `npx tsc --noEmit` — zero new errors (one pre-existing in KanaCheckpointNode.test.tsx, unrelated to Phase 18)
2. `grep -n "CURRENT_TERMS_VERSION" src/middleware.ts` — 2 matches (import + comparison)
3. `grep -n "sessionClaims.*publicMetadata" src/middleware.ts` — match at line 71
4. `grep -n "isLegalOrOnboardingRoute" src/middleware.ts` — 2 matches (declaration + usage)
5. `grep -n "completeOnboarding" src/app/onboarding/age-gate/page.tsx` — 2 matches (import + call)
6. `grep -n "role=\"alert\"" src/app/onboarding/age-gate/page.tsx` — match at line 242
7. `npm run test:unit` — 73 files pass, 657 tests pass, 0 failures, 0 regressions

## Must-Haves Verification

| Truth | Status |
|-------|--------|
| POST to completeOnboarding() with DOB < 13 years shows under-13 blocker state — no account data written | PASS — server returns `{ error: "under_13" }`; client sets `isUnder13=true`, replaces form with blocker |
| Users 13-17 see minor awareness step with acknowledgment checkbox before submit | PASS — `showMinorStep` shown when client-side age 13–17; `minorConfirmed` required for submit |
| Submit button is aria-disabled until both DOB and terms checkbox (and minor checkbox if 13-17) are filled | PASS — `aria-disabled={isSubmitDisabled}` where `isSubmitDisabled = !dob || !termsChecked || (showMinorStep && !minorConfirmed)` |
| Error region with role='alert' announces validation errors to screen readers | PASS — `<div id="dob-error" role="alert" aria-live="assertive">` always in DOM |
| Authenticated users with terms_version !== CURRENT_TERMS_VERSION are redirected to /onboarding/age-gate | PASS — middleware terms gate added; reads JWT publicMetadata and redirects on mismatch |
| Unauthenticated visitors and /legal/* routes are NEVER redirected | PASS — `if (session.userId)` guard + `isLegalOrOnboardingRoute` exclusion |
| Middleware reads terms_version from Clerk publicMetadata — NOT a DB query | PASS — `session.sessionClaims?.publicMetadata` (JWT claim, 0ms); no DB import in middleware |

## Known Stubs

None — all functionality is fully implemented. No placeholder text flows to UI rendering.

## Threat Flags

No new security surface beyond the plan's threat model:
- T-18-04-01 (DOB tampering): server re-validates in completeOnboarding() — UI is guidance only
- T-18-04-02 (unauthenticated redirect): `if (session.userId)` guard confirmed in middleware
- T-18-04-03 (middleware DB query): JWT publicMetadata read — no DB import in middleware
- T-18-04-04 (cookie tampering): terms_version stored in Clerk publicMetadata, not browser cookie
- T-18-04-05 (minor DOB bypass): server computes ageYears from ISO date in completeOnboarding()

## Self-Check: PASSED

- src/app/onboarding/age-gate/page.tsx: EXISTS (269 lines)
- src/middleware.ts: modified — CURRENT_TERMS_VERSION import + isLegalOrOnboardingRoute + terms gate
- Commit 1be8592: FOUND
- Commit cff9fbb: FOUND
- tsc --noEmit: zero new errors
- npm run test:unit: 73 files pass, 657 tests, 0 failures
