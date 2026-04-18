/**
 * /review — cross-song SRS review queue landing page.
 *
 * Server component: fetches due count + new-card budget + premium status
 * in parallel, then renders ReviewLanding with the data.
 *
 * Free users see the "X cards due" count but cannot start a session —
 * the Start CTA triggers UpsellModal (handled in ReviewLanding).
 *
 * Premium users see the Start button which loads the queue and begins the session.
 */

export const dynamic = "force-dynamic";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isPremium } from "@/app/actions/userPrefs";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import ReviewLanding from "./ReviewLanding";

// Placeholder — replace with Clerk auth when Phase 10 ships.
const PLACEHOLDER_USER_ID = "test-user-e2e";

/**
 * Counts how many vocabulary cards are currently due for this user.
 * "Due" = FSRS state IN (1,2,3) AND due <= NOW().
 * State 0 (New/unseen) cards are NOT counted here — they're handled via the
 * new-card budget (newBudgetRemaining).
 */
async function countDue(userId: string): Promise<number> {
  const rows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM user_vocab_mastery
    WHERE user_id = ${userId}
      AND state IN (1, 2, 3)
      AND due <= NOW()
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  return Number(raw[0]?.count ?? 0);
}

/**
 * Returns how many new-card slots remain for today (UTC).
 * If the stored date is not today, the full cap is available (midnight rollover).
 */
async function readTodayBudget(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const rows = await db.execute<{
    review_new_today: number;
    review_new_today_date: string | null;
  }>(sql`
    SELECT review_new_today, review_new_today_date::text AS review_new_today_date
    FROM users WHERE id = ${userId}
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const row = raw[0];
  if (!row) return REVIEW_NEW_DAILY_CAP;
  if (row.review_new_today_date !== today) return REVIEW_NEW_DAILY_CAP;
  return Math.max(0, REVIEW_NEW_DAILY_CAP - Number(row.review_new_today));
}

export default async function ReviewPage() {
  const userId = PLACEHOLDER_USER_ID;

  const [premium, dueCount, newBudget] = await Promise.all([
    isPremium(userId),
    countDue(userId),
    readTodayBudget(userId),
  ]);

  return (
    <ReviewLanding
      isPremium={premium}
      dueCount={dueCount}
      newBudgetRemaining={newBudget}
      dailyCap={REVIEW_NEW_DAILY_CAP}
    />
  );
}
