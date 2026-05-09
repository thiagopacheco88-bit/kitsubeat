/**
 * Phase 14.4 REQ-5 + REQ-8 — Sunday 18:00 UTC weekly recap.
 *
 * maxDuration 300s per CONTEXT D-04 (documented intent; explicit declaration
 * communicates the expected runtime budget).
 *
 * CRITICAL: Do NOT add `export const runtime = "nodejs"` — causes build failures
 * in "use server" route files per Phase 14 anti-pattern.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron/auth";
import { sendEmail } from "@/lib/emails/send";
import { render as renderWeeklyRecap } from "@/lib/emails/weeklyRecap";
import { getActiveOptInUsersForWeeklyRecap } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { emailSentLog, songs } from "@/lib/db/schema";
import { and, eq, count, gte, sql } from "drizzle-orm";
import { userVocabMastery, userExerciseLog } from "@/lib/db/schema";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // D-04: explicit budget declaration

// ISO 8601: week 1 is the week containing the first Thursday of the year.
// Shift to Thursday-based reckoning, then divide by 7.
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current week (ISO week starts Monday, Thursday is day 4)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const unauthorized = assertCronSecret(request);
  if (unauthorized) return unauthorized;

  const startMs = Date.now();
  const isDryRun = !process.env.RESEND_API_KEY;
  const weekKey = getISOWeekKey(new Date());
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const optInUsers = await getActiveOptInUsersForWeeklyRecap();

  let emailsSent = 0;
  let skippedAlreadySent = 0;

  for (const user of optInUsers) {
    // Idempotency check
    const existing = await db
      .select({ user_id: emailSentLog.user_id })
      .from(emailSentLog)
      .where(
        and(
          eq(emailSentLog.user_id, user.id),
          eq(emailSentLog.kind, "weekly_recap"),
          eq(emailSentLog.period_key, weekKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skippedAlreadySent++;
      continue;
    }

    // Per-user recap data (inline queries)
    const [vocabRows, songRows] = await Promise.all([
      db
        .select({ cnt: count() })
        .from(userVocabMastery)
        .where(
          and(
            eq(userVocabMastery.user_id, user.id),
            gte(userVocabMastery.last_review, sevenDaysAgo)
          )
        ),
      db.execute(sql`
        SELECT COUNT(DISTINCT song_version_id) AS cnt
        FROM user_exercise_log
        WHERE user_id = ${user.id}
          AND created_at >= ${sevenDaysAgo.toISOString()}
      `),
    ]);

    const vocabLearned = Number(vocabRows[0]?.cnt ?? 0);
    const songRows2 = Array.isArray(songRows)
      ? songRows
      : ((songRows as { rows?: unknown[] }).rows ?? []);
    const songsTouched = Number(
      (songRows2[0] as { cnt?: string } | undefined)?.cnt ?? 0
    );

    // Next-up nudge: use currentPathNodeSlug to find the next song on the path
    let nextUp: { title: string; slug: string } | null = null;
    if (user.currentPathNodeSlug) {
      const nextSongRows = await db
        .select({ title: songs.title, slug: songs.slug })
        .from(songs)
        .where(eq(songs.slug, user.currentPathNodeSlug))
        .limit(1);
      if (nextSongRows[0]) nextUp = nextSongRows[0];
    }

    // Clerk email + first-name
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(user.id);
    const emailAddress = clerkUser.emailAddresses[0]?.emailAddress;
    if (!emailAddress) continue;

    const { subject, html, text } = renderWeeklyRecap({
      firstName: clerkUser.firstName ?? "Someone",
      vocabLearned,
      songsTouched,
      streakCurrent: user.streakCurrent ?? 0,
      streakBest: user.streakBest ?? 0,
      nextUp,
    });

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
      text,
      kind: "weekly_recap",
      userId: user.id,
    });

    if (result.sent || result.dry_run) {
      if (!isDryRun) {
        await db
          .insert(emailSentLog)
          .values({ user_id: user.id, kind: "weekly_recap", period_key: weekKey })
          .onConflictDoNothing();
      }
      emailsSent++;
    }
  }

  return NextResponse.json({
    ok: true,
    kind: "weekly_recap",
    users_evaluated: optInUsers.length,
    emails_sent: emailsSent,
    skipped_already_sent: skippedAlreadySent,
    dry_run: isDryRun,
    duration_ms: Date.now() - startMs,
  });
}
