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
import { PLACEHOLDER_USER_ID, REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import { getNewCardBudget } from "@/lib/db/queries";
import ReviewLanding from "./ReviewLanding";

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

export default async function ReviewPage() {
  const userId = PLACEHOLDER_USER_ID;

  const [premium, dueCount, newBudget] = await Promise.all([
    isPremium(userId),
    countDue(userId),
    getNewCardBudget(userId),
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
