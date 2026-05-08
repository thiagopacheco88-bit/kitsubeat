/**
 * Phase 14.4 REQ-4 + REQ-8 — Daily streak-at-risk reminder.
 *
 * Runs hourly via Vercel Cron (Pro required for 0 * * * * schedule).
 * Secured by CRON_SECRET bearer token (D-06).
 * Dev-safe: returns 200 + dry_run:true when RESEND_API_KEY is absent (D-05).
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures
 * in "use server" route files per Phase 14 anti-pattern.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron/auth";
import { sendEmail } from "@/lib/emails/send";
import { render as renderDailyReminder } from "@/lib/emails/dailyReminder";
import { getActiveOptInUsersForDailyReminder } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { emailSentLog } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = assertCronSecret(request);
  if (unauthorized) return unauthorized;

  const startMs = Date.now();
  const isDryRun = !process.env.RESEND_API_KEY;
  const users = await getActiveOptInUsersForDailyReminder();

  let emailsSent = 0;
  let skippedAlreadySent = 0;

  for (const user of users) {
    // period_key = YYYY-MM-DD in UTC (Pitfall: use UTC date for consistency; tz filter is in the query)
    const todayKey = new Date().toISOString().slice(0, 10);

    // Idempotency check — skip if already sent today (RESEARCH Pitfall 5: check BEFORE send)
    const existing = await db
      .select({ user_id: emailSentLog.user_id })
      .from(emailSentLog)
      .where(
        and(
          eq(emailSentLog.user_id, user.id),
          eq(emailSentLog.kind, "daily_reminder"),
          eq(emailSentLog.period_key, todayKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skippedAlreadySent++;
      continue;
    }

    // Clerk email + first-name lookup (per-send, no mirror column per SPEC constraint #7)
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(user.id);
    const emailAddress = clerkUser.emailAddresses[0]?.emailAddress;
    if (!emailAddress) continue;

    const firstName = clerkUser.firstName ?? "Someone";
    // hoursLeft: 24 - hour_in_tz; simplified (query already filtered to hour=19)
    const hoursLeft = 5; // user is in their 19:xx window; 5h until midnight in most timezones
    const { subject, html, text } = renderDailyReminder({
      firstName,
      streakCurrent: user.streak_current,
      hoursLeft,
    });

    // Send — write log AFTER confirmed send (not before; RESEARCH Pitfall 5)
    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
      text,
      kind: "daily_reminder",
      userId: user.id,
    });

    if (result.sent || result.dry_run) {
      if (!isDryRun) {
        await db
          .insert(emailSentLog)
          .values({ user_id: user.id, kind: "daily_reminder", period_key: todayKey })
          .onConflictDoNothing(); // extra safety for concurrent invocations
      }
      emailsSent++;
    }
  }

  return NextResponse.json({
    ok: true,
    kind: "daily_reminder",
    users_evaluated: users.length,
    emails_sent: emailsSent,
    skipped_already_sent: skippedAlreadySent,
    dry_run: isDryRun,
    duration_ms: Date.now() - startMs,
  });
}
