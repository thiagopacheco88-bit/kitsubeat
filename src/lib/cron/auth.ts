import type { NextRequest } from "next/server";

/**
 * Phase 14.4 D-06 — CRON_SECRET validation.
 *
 * Vercel automatically injects Authorization: Bearer ${CRON_SECRET} when
 * invoking cron routes (if CRON_SECRET env var is set in project settings).
 *
 * Returns a 401 Response on failure, null on success.
 * Usage: const unauthorized = assertCronSecret(request); if (unauthorized) return unauthorized;
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures
 * in "use server" route files per Phase 14 anti-pattern.
 */
export function assertCronSecret(request: NextRequest): Response | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
