---
phase: 16-security-review-incident-response
plan: "03"
subsystem: security
tags: [idor, clerk, auth, api-routes, server-actions, userPrefs, vocab-mastery, vocab-tiers]

# Dependency graph
requires:
  - phase: 16-security-review-incident-response
    plan: "01"
    provides: RED test stubs for userPrefs mutations auth boundary and vocab-mastery route
  - phase: 16-security-review-incident-response
    plan: "02"
    provides: IDOR fix pattern (auth() guard) applied to exercises.ts and grammarSession.ts
provides:
  - IDOR-free vocab-mastery route (userId from auth(), 401 on unauthenticated)
  - IDOR-free vocab-tiers route (userId from auth(), 401 on unauthenticated)
  - Auth-guarded updateUserPrefs (userId from auth(), throws Unauthorized if null)
  - Auth-guarded setThemePreference (userId from auth(), throws Unauthorized if null)
  - Auth-guarded clearStreakSaverPending (userId from auth(), non-fatal on null)
affects:
  - All callers of vocab-mastery and vocab-tiers endpoints
  - All callers of userPrefs mutation functions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API route auth pattern: const { userId } = await auth(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"
    - "Server action mutation pattern: const { userId } = await auth(); if (!userId) throw new Error('Unauthorized')"
    - "Signature removal pattern: remove userId param from mutations; auth() derives it internally"

key-files:
  created: []
  modified:
    - src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts
    - src/app/api/exercises/vocab-tiers/route.ts
    - src/app/actions/userPrefs.ts
    - src/components/ui/ThemeToggle.tsx
    - src/app/components/home/StreakSaverToast.tsx
    - src/app/profile/ProfileForm.tsx
    - src/app/songs/[slug]/components/ExerciseTab.tsx
    - src/app/songs/[slug]/components/MasteryDetailPopover.tsx
    - tests/integration/theme-persistence.test.ts

key-decisions:
  - "updateUserPrefs and setThemePreference signatures remove userId param entirely (not renamed to _userId) — test stubs from Plan 01 called them with single arg"
  - "clearStreakSaverPending: non-fatal on null userId (auth() returns null) — called from client on session end where user may have logged out"
  - "theme-persistence.test.ts updated with vi.mock('@clerk/nextjs/server') and userId removed from setThemePreference call sites (Rule 1 auto-fix)"
  - "ExerciseTab.tsx and MasteryDetailPopover.tsx: userId removed from fetch URLs — auth() on server provides it"

requirements-completed:
  - SC-2

# Metrics
duration: 5min
completed: 2026-05-09
---

# Phase 16 Plan 03: Auth Boundary Fix — userPrefs Mutations and API Routes Summary

**Fixed remaining IDOR vulnerabilities in userPrefs.ts server action mutations and two API routes by replacing caller-supplied userId with Clerk auth() derivation — all Wave 1 SC-2 auth tests GREEN**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-09T21:42:01Z
- **Completed:** 2026-05-09T21:46:43Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Fixed IDOR in vocab-mastery route: `const { userId } = await auth()` replaces `searchParams.get("userId")`; returns 401 when unauthenticated
- Fixed IDOR in vocab-tiers route: same pattern; updated error message from "ids, userId" to "ids"
- Fixed IDOR in userPrefs.ts: `updateUserPrefs`, `setThemePreference`, `clearStreakSaverPending` all derive userId from auth() — callers can no longer supply an arbitrary userId
- Updated 5 caller files to remove userId from call sites: ThemeToggle.tsx, StreakSaverToast.tsx, ProfileForm.tsx, ExerciseTab.tsx, MasteryDetailPopover.tsx
- Updated theme-persistence.test.ts to inject auth() mock and use single-arg call signatures
- Wave 1 SC-2 tests from Plan 01: **all GREEN** (userPrefs.mutations.auth.test.ts ×2, vocab-mastery route.test.ts ×1)

## Task Commits

1. **Task 1: Fix vocab-mastery and vocab-tiers API routes** - `61cb875` (fix)
2. **Task 2: Auth guards on userPrefs mutations + caller updates** - `80eb67b` (fix)

## Files Created/Modified

### Production files (IDOR fixes)
- `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — auth() guard at top, 401 on unauthenticated; removed ?userId= query param
- `src/app/api/exercises/vocab-tiers/route.ts` — auth() guard at top, 401 on unauthenticated; removed &userId= query param
- `src/app/actions/userPrefs.ts` — auth() added; updateUserPrefs/setThemePreference/clearStreakSaverPending signatures changed to remove userId param; security note comment added at top

### Caller files (userId removed from call sites)
- `src/components/ui/ThemeToggle.tsx` — `setThemePreference(userId, next)` → `setThemePreference(next)`
- `src/app/components/home/StreakSaverToast.tsx` — `clearStreakSaverPending(userId)` → `clearStreakSaverPending()`
- `src/app/profile/ProfileForm.tsx` — `setThemePreference(userId, next)` → `setThemePreference(next)`; `updateUserPrefs(userId, {...})` → `updateUserPrefs({...})`
- `src/app/songs/[slug]/components/ExerciseTab.tsx` — removed `&userId=...` from vocab-tiers fetch URL
- `src/app/songs/[slug]/components/MasteryDetailPopover.tsx` — removed `?userId=...` from vocab-mastery fetch URL

### Test files
- `tests/integration/theme-persistence.test.ts` — added vi.mock for @clerk/nextjs/server + auth mock in beforeEach; removed userId from setThemePreference call sites (Rule 1 auto-fix)

## Decisions Made

- `updateUserPrefs` and `setThemePreference` have userId param fully removed (not renamed to `_userId`) because the Wave 1 test stubs (Plan 01) call them without a userId arg
- `clearStreakSaverPending`: graceful return (not throw) when userId is null — consistent with its usage pattern (called from client on session end)
- `getUserPrefs`, `getEffectiveCap`, `getThemePreference`, `isPremium` retain userId param — they are read-only helpers called from already-authenticated server action contexts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] theme-persistence.test.ts calls setThemePreference with 2 args (userId, value)**
- **Found during:** Task 2 TypeScript check
- **Issue:** After changing `setThemePreference(userId, value)` to `setThemePreference(value)`, the integration test at `tests/integration/theme-persistence.test.ts` showed 3× TS2554 errors (expected 1 arg, got 2).
- **Fix:** Added `vi.mock('@clerk/nextjs/server')` + `vi.mocked(auth).mockResolvedValue({ userId: TEST_USER_ID })` in `beforeEach`; changed all `setThemePreference(TEST_USER_ID, "dark")` calls to `setThemePreference("dark")`.
- **Files modified:** `tests/integration/theme-persistence.test.ts`
- **Commit:** 80eb67b

**2. [Rule 2 - Missing caller updates] ExerciseTab.tsx and MasteryDetailPopover.tsx still passed userId in fetch URLs**
- **Found during:** Task 1 grep scan of callers
- **Issue:** Plan only listed the API routes and userPrefs.ts as files to modify, but callers that constructed URLs with `?userId=` were also passing attacker-controllable data to the now-fixed routes.
- **Fix:** Removed `&userId=${encodeURIComponent(userId)}` from vocab-tiers URL in ExerciseTab.tsx; removed `?userId=${encodeURIComponent(userId)}` from vocab-mastery URL in MasteryDetailPopover.tsx.
- **Files modified:** ExerciseTab.tsx, MasteryDetailPopover.tsx
- **Commit:** 61cb875

## Known Stubs

None — all production code paths are fully wired. No placeholders in fixed server actions or routes.

## Threat Flags

None — this plan removes trust boundaries rather than adding them. The threat surface shrinks: API routes and server action mutations no longer accept userId from untrusted callers.

## Self-Check: PASSED

Files verified:
- `src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts` — EXISTS, contains `const { userId } = await auth()`, no `searchParams.get("userId")`
- `src/app/api/exercises/vocab-tiers/route.ts` — EXISTS, contains `const { userId } = await auth()`, no `searchParams.get("userId")`
- `src/app/actions/userPrefs.ts` — EXISTS, contains 2× "Unauthorized", 1× `import { auth }`

Commits verified:
- `61cb875` — Task 1 (vocab-mastery + vocab-tiers routes + caller URL fixes)
- `80eb67b` — Task 2 (userPrefs mutations + all caller updates + test fix)

Tests GREEN:
- `src/app/actions/__tests__/userPrefs.mutations.auth.test.ts` — 2 tests PASSED
- `src/app/api/exercises/vocab-mastery/__tests__/route.test.ts` — 1 test PASSED

---
*Phase: 16-security-review-incident-response*
*Completed: 2026-05-09*
