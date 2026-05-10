---
phase: 16-security-review-incident-response
reviewed: 2026-05-10T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - src/app/actions/exercises.ts
  - src/app/actions/grammarSession.ts
  - src/app/actions/userPrefs.ts
  - src/app/actions/review.ts
  - src/app/api/exercises/vocab-mastery/[vocabItemId]/route.ts
  - src/app/api/exercises/vocab-tiers/route.ts
  - src/lib/rate-limit.ts
  - src/components/ui/ThemeToggle.tsx
  - src/app/songs/[slug]/components/SessionSummary.tsx
  - src/app/songs/[slug]/components/ExerciseSession.tsx
  - src/app/songs/[slug]/components/QuestionCard.tsx
  - src/app/songs/[slug]/components/ConjugationCard.tsx
  - src/app/songs/[slug]/components/ListeningDrillCard.tsx
  - src/app/components/home/StreakSaverToast.tsx
  - src/app/profile/ProfileForm.tsx
  - scripts/audit/rls-audit.ts
  - docs/security/ENV-CONVENTIONS.md
  - docs/security/IR-RUNBOOK.md
  - drizzle/0020_rls_policies.sql
  - src/app/actions/__tests__/exercises.saveSessionResults.auth.test.ts
  - src/app/actions/__tests__/exercises.recordVocabAnswer.auth.test.ts
  - src/app/actions/__tests__/userPrefs.mutations.auth.test.ts
  - src/app/api/exercises/vocab-mastery/__tests__/route.test.ts
  - src/lib/__tests__/rate-limit.test.ts
findings:
  critical: 4
  warning: 3
  info: 2
  total: 9
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-05-10
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This review covers all Phase 16 security deliverables: server action auth boundaries, API route auth boundaries, rate limiting coverage, RLS migration, and supporting docs. The majority of the security work is solid — `saveSessionResults`, `recordVocabAnswer`, `updateUserPrefs`, `setThemePreference`, `clearStreakSaverPending`, `recordReviewAnswer`, and both API routes all correctly derive `userId` from `auth()` and never accept it from caller input.

Four critical issues were found: three server actions expose "caller-supplied userId" patterns that allow cross-user data access or feature bypass (`getAdvancedDrillUnlock`, `startReviewSession`, `recordAdvancedDrillAttempt`), and `consumeNewCardBudget` has no auth guard at all despite writing to user data. There are also gaps in rate limiting coverage and an input validation gap on the vocab-tiers route.

The RLS migration, ENV-CONVENTIONS doc, IR-RUNBOOK, and rls-audit script are all correct and well-structured.

---

## Critical Issues

### CR-01: `getAdvancedDrillUnlock` accepts caller-supplied userId — IDOR

**File:** `src/app/actions/exercises.ts:1147`
**Issue:** `getAdvancedDrillUnlock(songVersionId, userId)` takes `userId` directly from the caller and queries `user_song_progress` without calling `auth()`. Any authenticated user can probe whether an arbitrary other user has their advanced drills unlocked by passing a target userId. This is a textbook Insecure Direct Object Reference.
**Fix:**
```typescript
export async function getAdvancedDrillUnlock(
  songVersionId: string
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId || !songVersionId) return false;
  // ... rest unchanged
}
```
All callers must be updated to drop the `userId` argument.

---

### CR-02: `startReviewSession` accepts caller-supplied userId — premium gate bypass

**File:** `src/app/actions/review.ts:109`
**Issue:** `startReviewSession(userId)` takes `userId` from the caller and passes it directly to `isPremium(userId)` with no `auth()` call. A free user can pass any premium subscriber's Clerk user ID to receive `{ gated: false }` — bypassing the premium gate check. Clerk user IDs are not secret (they appear in JWT claims on the client).
**Fix:**
```typescript
export async function startReviewSession(): Promise<
  | { gated: true; reason: "premium_required" }
  | { gated: false }
> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const premium = await isPremium(userId);
  if (!premium) return { gated: true as const, reason: "premium_required" };
  return { gated: false as const };
}
```
Remove the `userId` parameter. Update the caller in `/review` to call `startReviewSession()` with no args.

---

### CR-03: `recordAdvancedDrillAttempt` accepts caller-supplied userId — quota manipulation

**File:** `src/app/actions/exercises.ts:1180`
**Issue:** `recordAdvancedDrillAttempt(userId, songVersionId, exerciseType)` takes `userId` from the caller with no `auth()` call. A user can pass another user's ID to burn that user's quota slots (DoS), or pass a known premium userId to skip the premium check on line 1195 (`isPremium(userId)`). This function writes to `userExerciseSongCounters` for the supplied userId.
**Fix:**
```typescript
export async function recordAdvancedDrillAttempt(
  songVersionId: string,
  exerciseType: ExerciseType
): Promise<{ ok: true } | { ok: false; reason: "quota_exhausted"; family: QuotaFamily }> {
  const { userId } = await auth();
  if (!userId) return { ok: true }; // unauthenticated — no quota to consume
  const family = QUOTA_FAMILY[exerciseType] as QuotaFamily | undefined;
  if (!family) return { ok: true };
  if (!songVersionId) return { ok: true };
  // ... rest unchanged, userId now comes from auth()
}
```
Update callers (e.g., `SentenceOrderCard`) to call `recordAdvancedDrillAttempt(songVersionId, exerciseType)`.

---

### CR-04: `consumeNewCardBudget` has no auth guard — writes to any userId

**File:** `src/app/actions/review.ts:62`
**Issue:** `consumeNewCardBudget(userId)` accepts a caller-supplied `userId` and performs an atomic upsert into the `users` table for that ID — incrementing `review_new_today` — with no call to `auth()`. This is exported and callable from any client code. A malicious actor can decrement another user's daily budget or inflate a spoofed user's counter. Even though `recordReviewAnswer` (its only current caller) now calls `auth()` first, `consumeNewCardBudget` is `export async function` and can be called independently.
**Fix:**
```typescript
export async function consumeNewCardBudget(): Promise<{ allowed: boolean; remaining: number }> {
  const { userId } = await auth();
  if (!userId) return { allowed: false, remaining: 0 };
  // ... rest unchanged, remove userId param, use auth()-derived userId
}
```
Update the call site in `recordReviewAnswer` (line 167) to `consumeNewCardBudget()`.

---

## Warnings

### WR-01: `saveGrammarSessionResults` has no rate limit

**File:** `src/app/actions/grammarSession.ts:299`
**Issue:** `saveGrammarSessionResults` calls `auth()` correctly (line 301) but has no rate-limit check before the DB writes. `startGrammarSession` is rate-limited with `llmRatelimit`, but the save path — which writes to `user_song_progress`, `user_grammar_rule_mastery`, and `user_grammar_exercise_log` — has no protection. A fast-polling client could flood the DB.
**Fix:**
```typescript
export async function saveGrammarSessionResults(...) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Rate limit: 10 session saves/min per user (mirrors saveSessionResults)
  const { success: rlSuccess } = await sessionRatelimit.limit(userId);
  if (!rlSuccess) throw new Error("Rate limit exceeded. Please slow down.");

  // ... rest unchanged
}
```
Import `sessionRatelimit` from `@/lib/rate-limit`.

---

### WR-02: `vocab-tiers` route does not validate UUID format of individual IDs

**File:** `src/app/api/exercises/vocab-tiers/route.ts:62`
**Issue:** The route splits and filters the `ids` query parameter (lines 63–65) and enforces a count cap (line 74), but does not validate that each ID is a valid UUID before passing the array to `inArray(userVocabMastery.vocab_item_id, idArray)`. Sending non-UUID strings (e.g., SQL fragments, excessively long strings) will cause Postgres to throw a type-cast error, which surfaces as an unhandled 500. Drizzle's parameterized queries prevent injection, but the 500 is unnecessary and leaks stack trace details via Vercel logging.
**Fix:**
```typescript
import { UUID_RE } from "@/lib/uuid";

// After splitting:
const validIds = idArray.filter((id) => UUID_RE.test(id));
const invalidCount = idArray.length - validIds.length;
if (invalidCount > 0) {
  return NextResponse.json(
    { error: `${invalidCount} id(s) are not valid UUIDs and were ignored` },
    { status: 400 }
  );
}
// Use validIds for the DB query
```
Or simply filter invalid IDs silently and return Tier 1 for them, consistent with the cold-start behavior for unknown IDs.

---

### WR-03: Stale / misleading test comments claim fixes are not yet applied

**File:** `src/app/actions/__tests__/userPrefs.mutations.auth.test.ts:16,22`
**File:** `src/app/api/exercises/vocab-mastery/__tests__/route.test.ts:14`
**Issue:** Both test files contain comments stating "Currently FAILS because function uses caller-supplied userId param." The actual production code has been fixed — `updateUserPrefs`, `setThemePreference`, and the vocab-mastery route all correctly call `auth()`. However the misleading comments imply these tests are expected to fail, which could cause future engineers to ignore real failures and undermines confidence in the test suite.
**Fix:** Remove the stale "Currently FAILS" comments from both test files. The tests now describe the passing (correct) behavior and should be treated as regression tests.

---

## Info

### IN-01: `getGrammarSessionRules` and `areAllGrammarRulesMasteredForSong` accept caller-supplied userId

**File:** `src/app/actions/grammarSession.ts:46,581`
**Issue:** Both functions are read-only helpers that accept a `userId` parameter. They are currently only called from `startGrammarSession` (which has already verified identity via `auth()`) and from test code. However, both are exported from a `"use server"` file, meaning they are callable from any client via RPC. An authenticated user can query another user's grammar rule levels or mastery status by passing an arbitrary userId.

This is less severe than CR-01 through CR-04 because the data exposed (grammar rule levels, mastery state) is low-sensitivity. However it is still a privacy boundary violation and inconsistent with the overall security model.
**Fix:** Add an auth guard to each, or mark them unexported (prefix with no `export`). If they must remain exported (e.g., for test callers), add:
```typescript
// In getGrammarSessionRules:
const { userId: callerUserId } = await auth();
if (!callerUserId || callerUserId !== userId) throw new Error("Unauthorized");
```
Or convert to accept no `userId` parameter and derive it from `auth()` like the mutation functions do.

---

### IN-02: `startReviewSession` is also missing a rate limit

**File:** `src/app/actions/review.ts:109`
**Issue:** Even after fixing the auth bypass (CR-02), `startReviewSession` has no rate limit. It calls `isPremium()` which hits the DB. A rapid-poll client could spam it. Low risk (read-only, no writes), but inconsistent with the pattern established by `recordReviewAnswer`.
**Fix:** Apply `exerciseRatelimit` or a dedicated `sessionRatelimit` check after the `auth()` guard, consistent with other endpoints.

---

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
