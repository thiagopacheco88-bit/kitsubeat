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
import { getNewCardBudget } from "@/lib/db/queries";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";

export async function GET() {
  const userId = PLACEHOLDER_USER_ID;
  const budgetRemaining = await getNewCardBudget(userId);

  return NextResponse.json(
    { budget_remaining: budgetRemaining },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
