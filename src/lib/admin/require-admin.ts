/**
 * Phase 11.5: Server-action belt-and-braces guard.
 *
 * Middleware (src/middleware.ts) is the FIRST line of defense — it redirects on non-admin.
 * THIS file is the SECOND line — server actions throw if invoked without an admin session.
 *
 * Why both: middleware doesn't run for direct server-action invocations from RSC parents
 * (per RESEARCH Open Q #7 + PATTERNS.md "Authentication / Admin gate" Two-tier defense).
 */

import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/admin-allowlist";

export class AdminRequiredError extends Error {
  constructor() {
    super("admin_required");
    this.name = "AdminRequiredError";
  }
}

export async function requireAdminUser(): Promise<{ id: string; email: string }> {
  const user = await currentUser();
  if (!user) throw new AdminRequiredError();

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress;
  const allowlist = parseAdminEmails(process.env.CLERK_ADMIN_EMAILS);

  if (!isAdminEmail(email, allowlist)) throw new AdminRequiredError();

  return { id: user.id, email: email! };
}
