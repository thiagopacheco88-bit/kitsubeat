---
phase: 16-security-review-incident-response
fixed_at: 2026-05-10T00:00:00Z
review_path: .planning/phases/16-security-review-incident-response/16-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-05-10
**Source review:** .planning/phases/16-security-review-incident-response/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: `getAdvancedDrillUnlock` accepts caller-supplied userId — IDOR

**Files modified:** `src/app/actions/exercises.ts`, `tests/integration/all-kana-song.test.ts`
**Commit:** 4c43f3c
**Applied fix:** Removed `userId: string` param from signature. Added `const { userId } = await auth(); if (!userId || !songVersionId) return false;` at the top of the function body. Updated the test caller in `all-kana-song.test.ts` (line 164) from `getAdvancedDrillUnlock(songVersionId, TEST_USER)` to `getAdvancedDrillUnlock(songVersionId)` — auth() is already mocked to return TEST_USER in `beforeEach`.

---

### CR-02: `startReviewSession` accepts caller-supplied userId — premium gate bypass

**Files modified:** `src/app/actions/review.ts`
**Commit:** f31a4ae
**Applied fix:** Removed `userId: string` param from signature. Added `const { userId } = await auth(); if (!userId) throw new Error("Unauthorized");` before the `isPremium()` call. No production call sites existed in `src/` that needed updating.

---

### CR-03: `recordAdvancedDrillAttempt` accepts caller-supplied userId — quota manipulation

**Files modified:** `src/app/actions/exercises.ts`
**Commit:** 5f62029
**Applied fix:** Removed `userId: string` as first param. Added `const { userId } = await auth(); if (!userId) return { ok: true };` (unauthenticated callers have no quota to consume) at the top of the function body. Moved the `!songVersionId` guard to a standalone check (no longer combined with `!userId`). No production callers in `src/` were passing a userId argument.

---

### CR-04: `consumeNewCardBudget` has no auth guard — writes to any userId

**Files modified:** `src/app/actions/review.ts`
**Commit:** e37ede4
**Applied fix:** Removed `userId: string` param. Added `const { userId } = await auth(); if (!userId) return { allowed: false, remaining: 0 };` at the top of the function body. Updated the internal call site in `recordReviewAnswer` (line 169) from `consumeNewCardBudget(userId)` to `consumeNewCardBudget()`.

---

### WR-01: `saveGrammarSessionResults` has no rate limit

**Files modified:** `src/app/actions/grammarSession.ts`
**Commit:** db76d20
**Applied fix:** Added `sessionRatelimit` to the import from `@/lib/rate-limit`. Added rate limit check immediately after the auth guard: `const { success: rlSuccess } = await sessionRatelimit.limit(userId); if (!rlSuccess) throw new Error("Rate limit exceeded. Please slow down.");` — mirrors the pattern in `saveSessionResults`.

---

### WR-02: `vocab-tiers` route does not validate UUID format of individual IDs

**Files modified:** `src/app/api/exercises/vocab-tiers/route.ts`
**Commit:** 9e165b4
**Applied fix:** Added `import { UUID_RE } from "@/lib/uuid";`. After the MAX_IDS cap check, added a validation block: `const invalidIds = idArray.filter((id) => !UUID_RE.test(id)); if (invalidIds.length > 0) return NextResponse.json({ error: ... }, { status: 400 });`. Returns 400 for any non-UUID strings before they reach the Drizzle query.

---

### WR-03: Stale / misleading test comments claim fixes are not yet applied

**Files modified:** `src/app/actions/__tests__/userPrefs.mutations.auth.test.ts`, `src/app/api/exercises/vocab-mastery/__tests__/route.test.ts`
**Commit:** b1b25d0
**Applied fix:** Removed two "Currently FAILS because function uses caller-supplied userId param." comments from `userPrefs.mutations.auth.test.ts` (lines 15, 22) and one "Currently FAILS because route reads userId from ?userId= query param." comment from `route.test.ts` (line 14). Tests now describe passing (correct) regression behavior.

---

_Fixed: 2026-05-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
