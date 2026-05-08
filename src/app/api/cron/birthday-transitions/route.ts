/**
 * Phase 18 REQ-MINORS-GATE-11 — 18th-birthday age transition cron.
 *
 * Runs daily at 02:00 UTC via Vercel Cron.
 * Secured by CRON_SECRET bearer token (T-18-02-05 mitigation).
 * Dev-safe: returns 200 + dry_run:true when RESEND_API_KEY is absent.
 *
 * CRITICAL (Pitfall 5 + REQ-MINORS-GATE-12):
 *   This cron ONLY sets is_minor = false.
 *   It does NOT touch social_activity_enabled, marketing_email_opt_in,
 *   or any other settings column — that would violate REQ-MINORS-GATE-12
 *   which says the transition UNLOCKS settings; it must NOT change them.
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build
 * failures in "use server" route files per Phase 14 anti-pattern.
 */

export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { assertCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/emails/send";
import { render as renderBirthdayTransition } from "@/lib/emails/birthdayTransition";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  // T-18-02-05: validate CRON_SECRET before any DB mutation
  const unauthorized = assertCronSecret(request);
  if (unauthorized) return unauthorized;

  const startMs = Date.now();
  const isDryRun = !process.env.RESEND_API_KEY;

  // Find users who turned 18 since the last run.
  //
  // CRITICAL (Pitfall 5): .set({ is_minor: false }) — ONLY this column.
  // No other settings columns are touched. The transition email informs
  // the user they can now update their own preferences.
  const transitioned = await db
    .update(users)
    .set({ is_minor: false })
    .where(
      and(
        eq(users.is_minor, true),
        isNotNull(users.date_of_birth),
        lte(
          sql`date_of_birth + INTERVAL '18 years'`,
          sql`NOW()`
        )
      )
    )
    .returning({ id: users.id });

  let emailsSent = 0;

  if (!isDryRun) {
    // Send birthday transition email to each newly-transitioned user
    for (const { id } of transitioned) {
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(id);
        const emailAddress = clerkUser.emailAddresses[0]?.emailAddress;
        if (!emailAddress) continue;

        const firstName = clerkUser.firstName ?? "there";
        const { subject, html, text } = renderBirthdayTransition({ firstName });

        const result = await sendEmail({
          to: emailAddress,
          subject,
          html,
          text,
          kind: "birthday_transition",
          userId: id,
        });

        if (result.sent) emailsSent++;
      } catch {
        // Non-blocking — log failure but continue processing remaining users
        // eslint-disable-next-line no-console
        console.error("[birthday-transitions] email send failed for user:", id);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    kind: "birthday_transitions",
    transitioned: transitioned.length,
    emails_sent: emailsSent,
    dry_run: isDryRun,
    duration_ms: Date.now() - startMs,
  });
}
