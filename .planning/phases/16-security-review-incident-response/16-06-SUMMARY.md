---
phase: 16-security-review-incident-response
plan: "06"
subsystem: infra
tags: [security, secrets, env-conventions, gitleaks, gitignore, sentry]

# Dependency graph
requires:
  - phase: 16-01
    provides: Wave 1 test stubs and RLS audit script
  - phase: 16-04
    provides: Upstash Redis rate-limiting env vars (UPSTASH_REDIS_REST_URL / TOKEN) that were documented in ENV-CONVENTIONS.md
provides:
  - docs/security/ENV-CONVENTIONS.md with complete 16-var secrets inventory, 5 security rules, and NEXT_PUBLIC_ danger guide
  - .env.sentry-build-plugin and .env.sentry-build-plugin.txt added to .gitignore (both patterns)
  - Fallback grep secrets scan executed — no secrets found in source or git history
  - Human checkpoint PASSED: user confirmed "approved — clean scan"
affects: [16-07, phase-19-beta-launch, REQUIREMENTS.md SC-3]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-only vs NEXT_PUBLIC_ classification documented; inventory table is the canonical reference"
    - "Build-time vs Runtime env var distinction documented for Vercel deployment"
    - "Post-build grep sanity check pattern for .next/static/ documented"

key-files:
  created:
    - docs/security/ENV-CONVENTIONS.md
  modified:
    - .gitignore

key-decisions:
  - "No secret rotation required — SENTRY_AUTH_TOKEN was never committed to git; .gitignore already covered .env.sentry-build-plugin (the non-.txt variant); .env.sentry-build-plugin.txt (with .txt suffix) was the untracked file and was added as a second pattern"
  - "gitleaks not installed on Windows and Docker unavailable; fallback grep scan executed instead — user accepted this approach (approved clean scan)"
  - "16 env vars documented in inventory (all current project variables at Phase 16)"

patterns-established:
  - "ENV-CONVENTIONS.md is the canonical secrets classification document; update when new env vars are added"
  - "Post-build grep check: grep -r CLERK_SECRET_KEY|DATABASE_URL|SENTRY_AUTH_TOKEN .next/static/ to verify no secrets in bundle"

requirements-completed:
  - SC-3

# Metrics
duration: ~15min (Tasks 1-2 in prior session + finalization in continuation)
completed: 2026-05-10
---

# Phase 16 Plan 06: Secrets Audit + ENV Conventions Summary

**Secrets audit passed clean — SENTRY_AUTH_TOKEN confirmed never committed; .gitignore fixed for .env.sentry-build-plugin.txt; docs/security/ENV-CONVENTIONS.md created with 16-var inventory and 5 NEXT_PUBLIC_ rules.**

## Performance

- **Duration:** ~15 min (Tasks 1-2 executed in prior session; checkpoint approved; continuation finalized)
- **Started:** 2026-05-09T (prior session)
- **Completed:** 2026-05-10
- **Tasks:** 2 auto + 1 human-verify checkpoint
- **Files modified:** 2 (docs/security/ENV-CONVENTIONS.md created, .gitignore modified)

## Accomplishments

- Created `docs/security/ENV-CONVENTIONS.md` with complete 16-var secrets inventory, 5 security rules (NEXT_PUBLIC_ danger, Build vs Runtime distinction, .env hierarchy, post-build grep check, rotation checklist)
- Added `.env.sentry-build-plugin.txt` to `.gitignore` (the auto-generated Sentry token file with `.txt` suffix was untracked and not previously covered by the existing `.env.sentry-build-plugin` pattern)
- Ran fallback grep scan (gitleaks unavailable on Windows without Docker) — confirmed no secrets in source or git history; human checkpoint PASSED with user response "approved — clean scan"

## Human Checkpoint

**Status: PASSED**
**User response:** "approved — clean scan"
**Decision:** No rotation required. The SENTRY_AUTH_TOKEN lives in `.env.sentry-build-plugin.txt` which was never committed to git. The `.gitignore` already had the base `.env.sentry-build-plugin` pattern but was missing the `.txt` variant — fixed in Task 2.

## Task Commits

1. **Task 1: Create ENV-CONVENTIONS.md and verify .env.example** - `eb8bb78` (docs)
2. **Task 2: Run secrets scan + fix .gitignore** - `53a85ee` (chore)

## Files Created/Modified

- `docs/security/ENV-CONVENTIONS.md` - Complete secrets inventory (16 vars), 5 security rules, NEXT_PUBLIC_ danger guide, post-build verification command, rotation checklist
- `.gitignore` - Added `.env.sentry-build-plugin` (base pattern) and `.env.sentry-build-plugin.txt` (exact match for the untracked file seen in git status)

## Decisions Made

1. **No rotation** — SENTRY_AUTH_TOKEN confirmed never in git history; user accepted this decision after reviewing fallback scan output.
2. **Fallback grep instead of gitleaks** — gitleaks not installed and Docker not available on Windows. Fallback covered three scan surfaces: .env files in git history, secret patterns in source (`CLERK_SECRET_KEY`, `sk_live_`, `postgres://.*:.*@`, `sk_test_`), and dangerous `NEXT_PUBLIC_` prefixes on server secrets.
3. **Both .gitignore patterns needed** — `.env.sentry-build-plugin` (no extension, auto-created by Sentry CLI) and `.env.sentry-build-plugin.txt` (`.txt` variant from the Sentry build plugin wizard) are different filenames; both are now covered.

## Deviations from Plan

None - plan executed exactly as written. The gitleaks fallback (Option D) was explicitly provided in the plan as the path when gitleaks was unavailable.

## Issues Encountered

- gitleaks not installed on Windows (winget not available in the executor shell); Docker also unavailable. Used Option D (manual grep fallback) as specified in the plan. Scan results were sufficient for the human checkpoint.

## Known Stubs

None — this plan delivers documentation and .gitignore config only; no UI or data surfaces.

## Threat Flags

No new threat surface introduced. All four threats from the plan's `<threat_model>` are addressed:

| Threat | Resolution |
|--------|-----------|
| T-16-06-01: Secrets in git history | Fallback grep scan found no committed secrets; confirmed clean |
| T-16-06-02: Secrets in Next.js client bundle | ENV-CONVENTIONS.md Rule 1 + Rule 4 (post-build grep) document prevention |
| T-16-06-03: .env.sentry-build-plugin.txt untracked | Added to .gitignore in Task 2 |
| T-16-06-04: KB_E2E_AUTH_BYPASS in production Vercel | Documented as "Critical in prod" in ENV-CONVENTIONS.md inventory table |

## Next Phase Readiness

- SC-3 requirement complete — ready for Plan 16-07 (IR Runbook)
- `docs/security/ENV-CONVENTIONS.md` is the canonical reference for all future env var additions
- Rotation procedure documented in ENV-CONVENTIONS.md Rule 5 — links to IR-RUNBOOK.md (created in Plan 16-07)

---

## Self-Check

**Files exist:**
- `docs/security/ENV-CONVENTIONS.md` — FOUND (verified pre-summary)
- `.gitignore` contains `.env.sentry-build-plugin.txt` — FOUND (verified pre-summary)

**Commits exist:**
- `eb8bb78` — FOUND (git log confirmed)
- `53a85ee` — FOUND (git log confirmed)

## Self-Check: PASSED

---
*Phase: 16-security-review-incident-response*
*Completed: 2026-05-10*
