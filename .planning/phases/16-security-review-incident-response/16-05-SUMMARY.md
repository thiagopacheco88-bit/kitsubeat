---
phase: 16-security-review-incident-response
plan: "05"
subsystem: database
tags: [rls, postgres, neon, security, migration, row-level-security]

# Dependency graph
requires:
  - phase: 16-security-review-incident-response
    provides: RLS audit script (scripts/audit/rls-audit.ts) from Plan 01

provides:
  - drizzle/0020_rls_policies.sql — RLS enabled on all 27 public Neon Postgres tables
  - SC-1 defense-in-depth: non-owner direct SQL access denied on user-data tables
  - Catalog tables have public SELECT policy for non-owner reads

affects:
  - Any future plan adding new tables (must add ENABLE ROW LEVEL SECURITY to 0020 or new migration)
  - scripts/audit/rls-audit.ts — now exits 0 against live Neon DB

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS on bare Neon Postgres: use TO PUBLIC (not 'authenticated'/'anon' — Supabase-only roles)"
    - "User-data tables: ENABLE ROW LEVEL SECURITY with no policies = implicit deny for non-owner"
    - "Catalog tables: ENABLE ROW LEVEL SECURITY + CREATE POLICY ... TO PUBLIC USING (true)"
    - "Idempotent policies: DROP POLICY IF EXISTS before CREATE POLICY"

key-files:
  created:
    - drizzle/0020_rls_policies.sql
  modified: []

key-decisions:
  - "Supabase 'authenticated'/'anon' roles do not exist in bare Neon Postgres; rewrote all policies using TO PUBLIC instead of TO authenticated/anon"
  - "auth.jwt() function does not exist in bare Neon (no pgjwt extension, no auth schema); RLS policies are row-access grants, not per-user JWT claims — security posture is owner-only via Drizzle"
  - "User-data tables use implicit deny (RLS enabled, no non-owner policies); catalog tables use TO PUBLIC USING (true)"
  - "schema_migrations infrastructure table also needs RLS enabled to satisfy audit script"

patterns-established:
  - "Bare Neon RLS pattern: ENABLE + no policies = deny non-owner; no auth.jwt() or Supabase roles needed"

requirements-completed:
  - SC-1

# Metrics
duration: 15min
completed: 2026-05-09
---

# Phase 16 Plan 05: RLS Migration Summary

**ENABLE ROW LEVEL SECURITY on all 27 public Neon Postgres tables via drizzle/0020_rls_policies.sql; audit exits 0; adapted for bare Neon (no Supabase roles)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-09T22:00:00Z
- **Completed:** 2026-05-09T22:15:00Z
- **Tasks:** 1
- **Files modified:** 1 created

## Accomplishments

- Created drizzle/0020_rls_policies.sql covering all 27 public schema tables (15 user-data + 8 catalog + 3 admin + schema_migrations)
- Applied migration via `npx tsx scripts/apply-migrations.ts` — 0 errors
- `npx tsx --env-file=.env.local scripts/audit/rls-audit.ts` exits 0: "All public tables have RLS enabled."
- User-data tables: implicit deny for non-owner direct SQL access (RLS + no non-owner policies)
- Catalog/admin tables: public SELECT allowed via `TO PUBLIC USING (true)`

## Task Commits

1. **Task 1: Write and apply RLS migration SQL** - `7b137b5` (feat)

## Files Created/Modified

- `drizzle/0020_rls_policies.sql` - RLS migration: ENABLE + policies for all 27 public tables; applied to Neon

## Decisions Made

- Used `TO PUBLIC` instead of `TO authenticated` / `TO anon` because Supabase PostgREST roles don't exist in this bare Neon instance
- Used implicit deny pattern for user-data tables (RLS on + no non-owner policy = deny) rather than attempting per-user JWT claims (no auth.jwt() function available)
- Enabled RLS on `schema_migrations` (internal tracking table) because the audit script checks ALL public tables and it appeared as missing
- Updated migration SQL file post-application to document schema_migrations section (applied the ALTER TABLE manually via node script)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase roles 'authenticated'/'anon' do not exist in bare Neon Postgres**
- **Found during:** Task 1 (applying migration)
- **Issue:** Plan template used `TO authenticated` and `TO anon` roles. Neon Postgres without Supabase PostgREST has no these roles. Migration failed with "role 'authenticated' does not exist"
- **Fix:** Rewrote all policies to use `TO PUBLIC` for catalog/admin tables; user-data tables use RLS implicit deny (no non-owner policies)
- **Files modified:** drizzle/0020_rls_policies.sql (complete rewrite of policy syntax)
- **Verification:** Migration applied successfully; audit exits 0
- **Committed in:** 7b137b5

**2. [Rule 1 - Bug] auth.jwt() function does not exist in bare Neon (no pgjwt extension)**
- **Found during:** Task 1 (initial SQL design)
- **Issue:** Plan specified `auth.jwt()->>'sub'` pattern for per-user policies. No `auth` schema or `pgjwt` extension in this database (only `plpgsql` installed)
- **Fix:** Removed per-user JWT policies entirely; security model relies on Drizzle (owner, bypasses RLS) for app traffic and implicit deny for non-owner direct SQL
- **Security impact:** None — Drizzle bypasses RLS anyway (owner connection). The security posture is the same: application traffic is protected by server action auth() guards (Plans 02-03); RLS protects against non-owner direct SQL access
- **Committed in:** 7b137b5

**3. [Rule 1 - Bug] schema_migrations table missing from plan's table list, causing audit to fail**
- **Found during:** Task 1 (rls-audit.ts verification)
- **Issue:** audit script checks ALL public schema tables; schema_migrations (created by apply-migrations.ts bootstrap) was not in the plan's table list
- **Fix:** Ran ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY directly; updated 0020_rls_policies.sql to document it
- **Committed in:** 7b137b5 (file updated before commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - environment mismatch bugs)
**Impact on plan:** Core security goal achieved — all tables have RLS enabled, audit exits 0. The auth.jwt() per-user policy pattern was not achievable without Supabase; the implicit deny posture for user-data tables provides equivalent protection against direct SQL access.

## Issues Encountered

- `CREATE POLICY IF NOT EXISTS` is not valid PostgreSQL syntax (only available in some Supabase-patched Postgres variants). Replaced with `DROP POLICY IF EXISTS` + `CREATE POLICY` pattern.
- dotenv/config in rls-audit.ts loads `.env` not `.env.local`; used `npx tsx --env-file=.env.local` to pass DATABASE_URL.

## Known Stubs

None — migration file is complete SQL; no application code stubs introduced.

## Threat Flags

None — migration enables RLS (reduces attack surface); no new network endpoints, auth paths, or schema changes at trust boundaries.

## Next Phase Readiness

- SC-1 satisfied: RLS enabled on all public tables; audit script exits 0
- Future tables added to schema.ts must also have ENABLE ROW LEVEL SECURITY in a migration
- Consider adding `schema_migrations` to an exclusion comment in rls-audit.ts for documentation clarity (non-blocking)

---
*Phase: 16-security-review-incident-response*
*Completed: 2026-05-09*
