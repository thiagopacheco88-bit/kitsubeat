---
phase: 16
slug: security-review-incident-response
date: 2026-05-09
---

# Phase 16 Validation Strategy

## Dimension Mapping

| Req ID | Behavior | Test Type | Command | File |
|--------|----------|-----------|---------|------|
| SC-1 | All public tables have RLS enabled | Integration (DB) | `npx tsx scripts/audit/rls-audit.ts` | New in Wave 0 |
| SC-2 | saveSessionResults rejects non-owner userId | Unit | `npx vitest run src/app/actions/__tests__/exercises.saveSessionResults.test.ts` | New in Wave 0 |
| SC-2 | recordVocabAnswer rejects unauthenticated | Unit | `npx vitest run src/app/actions/__tests__/exercises.recordVocabAnswer.test.ts` | New in Wave 0 |
| SC-2 | getAdvancedDrillAccess rejects unauthenticated | Unit | `npx vitest run src/app/actions/__tests__/exercises.getAdvancedDrillAccess.test.ts` | New in Wave 0 |
| SC-2 | userPrefs mutations require auth | Unit | `npx vitest run src/app/actions/__tests__/userPrefs.mutations.test.ts` | New in Wave 0 |
| SC-2 | vocab-mastery route rejects missing auth | Unit | `npx vitest run src/app/api/exercises/vocab-mastery/__tests__/route.test.ts` | New in Wave 0 |
| SC-4 | 429 returned after threshold exceeded | Unit | `npx vitest run src/lib/__tests__/rate-limit.test.ts` | New in Wave 0 |
| SC-5 | IR runbook file exists with required sections | File check | `test -f docs/security/IR-RUNBOOK.md` | New in Wave 3 |

## Wave 0 Test Stubs (RED Phase)

All of the following test stubs are created in Wave 0 and must FAIL initially:
- `src/app/actions/__tests__/exercises.saveSessionResults.test.ts`
- `src/app/actions/__tests__/exercises.recordVocabAnswer.test.ts`
- `src/app/actions/__tests__/exercises.getAdvancedDrillAccess.test.ts`
- `src/app/actions/__tests__/userPrefs.mutations.test.ts`
- `src/lib/__tests__/rate-limit.test.ts`
- `scripts/audit/rls-audit.ts` (exits 1 until RLS migration runs)

## End-State Gate

All tests GREEN + `npx tsx scripts/audit/rls-audit.ts` exits 0 + IR runbook file present.
