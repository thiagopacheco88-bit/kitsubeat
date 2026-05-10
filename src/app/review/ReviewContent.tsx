import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isPremium } from "@/app/actions/userPrefs";
import { getNewCardBudget } from "@/lib/db/queries";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import ReviewLanding from "./ReviewLanding";

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

export async function ReviewContent({ userId }: { userId: string }) {
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
      userId={userId}
    />
  );
}
