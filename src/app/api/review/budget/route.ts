/**
 * GET /api/review/budget
 *
 * Returns the current user's remaining daily new-card budget for the /review queue.
 * No premium gate — the budget is a cheap read; the session UI already knows
 * whether the user is premium.
 *
 * Response shape: { budget_remaining: number }
 *
 * This endpoint is called by ReviewSession.tsx when it catches the
 * "daily_new_card_cap_reached" error mid-session to confirm the server's
 * view of the remaining budget and update the UI accordingly.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";

// Placeholder — replace with Clerk auth when Phase 10 ships.
const PLACEHOLDER_USER_ID = "test-user-e2e";

export async function GET() {
  const userId = PLACEHOLDER_USER_ID;
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

  let budgetRemaining: number;
  if (!row || row.review_new_today_date !== today) {
    // No row or stale date → full cap available (UTC midnight rollover).
    budgetRemaining = REVIEW_NEW_DAILY_CAP;
  } else {
    budgetRemaining = Math.max(0, REVIEW_NEW_DAILY_CAP - Number(row.review_new_today));
  }

  return NextResponse.json(
    { budget_remaining: budgetRemaining },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
