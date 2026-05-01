/**
 * Phase 11.5: Admin email allowlist parser + predicate.
 *
 * Used by:
 * - src/middleware.ts (redirect path: non-admin → "/")
 * - src/lib/admin/require-admin.ts (throw path: server actions)
 *
 * Allowlist source: env var CLERK_ADMIN_EMAILS (comma-separated).
 * Per D-03 (LOCKED): hardcoded lists are rejected — adding a third admin = env edit + dev restart.
 */

export function parseAdminEmails(env: string | undefined): Set<string> {
  if (!env) return new Set();
  return new Set(
    env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
}

export function isAdminEmail(
  email: string | null | undefined,
  allowlist: Set<string>,
): boolean {
  if (!email) return false;
  return allowlist.has(email.toLowerCase());
}
