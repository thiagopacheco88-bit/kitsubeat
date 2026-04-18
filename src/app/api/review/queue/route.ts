/**
 * GET /api/review/queue
 *
 * Returns the review queue for the current user.
 * Premium-gated: returns 403 with {error: "premium_required"} for free users.
 *
 * Response shape:
 * {
 *   items: ReviewQueueItem[],
 *   due_count: number,
 *   new_count: number,
 *   budget_remaining: number,
 * }
 *
 * The queue is built at request time from:
 * 1. Due cards (state IN 1,2,3, due <= now) — uncapped.
 * 2. New cards (state=0, never-seen) — capped by the user's daily new-card budget.
 *
 * NOTE: consumeNewCardBudget is NOT called here. Budget is consumed per-card in
 * the recordReviewAnswer server action, so a user who loads the queue without
 * answering does not burn their daily allocation.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isPremium } from "@/app/actions/userPrefs";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import { getDueReviewQueue } from "@/lib/db/queries";
import { buildReviewQueue } from "@/lib/review/queue-builder";

// Placeholder — replace with Clerk auth when Phase 10 ships.
const PLACEHOLDER_USER_ID = "test-user-e2e";

/**
 * Reads the user's current daily new-card counter without modifying it.
 * If the stored date is not today (UTC), the counter has rolled over and the
 * full cap is available.
 */
async function readRemainingBudget(userId: string): Promise<number> {
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

export async function GET() {
  const userId = PLACEHOLDER_USER_ID;

  // Premium gate — free users cannot access the review queue.
  const premium = await isPremium(userId);
  if (!premium) {
    return NextResponse.json(
      { error: "premium_required" },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  // Read-only budget check — does not consume the budget.
  const budgetRemaining = await readRemainingBudget(userId);

  // Fetch due + new card pools from DB.
  const { due, new: newCards } = await getDueReviewQueue(
    userId,
    budgetRemaining,
    new Date()
  );

  // Build the ordered session queue.
  const items = buildReviewQueue(due, newCards, budgetRemaining);

  const dueCount = due.length;
  const newCount = items.filter((i) => i.isNew).length;

  return NextResponse.json(
    {
      items,
      due_count: dueCount,
      new_count: newCount,
      budget_remaining: budgetRemaining,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
