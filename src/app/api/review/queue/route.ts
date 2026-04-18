/**
 * GET /api/review/queue
 *
 * Returns the review queue for the current user.
 * Premium-gated: returns 403 with {error: "premium_required"} for free users.
 *
 * Response shape:
 * {
 *   items: ReviewQueueItem[],
 *   vocabData: Record<string, VocabRow>,  // keyed by vocab_item_id
 *   due_count: number,
 *   new_count: number,
 *   budget_remaining: number,
 * }
 *
 * vocabData is included in the response so ReviewSession can construct
 * renderable questions without a separate fetch per card.
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
import { sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { vocabularyItems } from "@/lib/db/schema";
import { isPremium } from "@/app/actions/userPrefs";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import { getDueReviewQueue } from "@/lib/db/queries";
import { buildReviewQueue } from "@/lib/review/queue-builder";

/** Minimal vocab data needed to render questions in ReviewSession */
export interface VocabRow {
  id: string;
  dictionary_form: string;
  reading: string;
  romaji: string;
  part_of_speech: string;
  jlpt_level: string | null;
  meaning: unknown; // Localizable JSON
  mnemonic: unknown | null;
  kanji_breakdown: unknown | null;
}

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

  // Fetch vocab data for all items in the queue so ReviewSession can construct
  // renderable questions without a per-card roundtrip.
  let vocabData: Record<string, VocabRow> = {};
  if (items.length > 0) {
    const vocabIds = items.map((i) => i.vocab_item_id);
    const rows = await db
      .select({
        id: vocabularyItems.id,
        dictionary_form: vocabularyItems.dictionary_form,
        reading: vocabularyItems.reading,
        romaji: vocabularyItems.romaji,
        part_of_speech: vocabularyItems.part_of_speech,
        jlpt_level: vocabularyItems.jlpt_level,
        meaning: vocabularyItems.meaning,
        mnemonic: vocabularyItems.mnemonic,
        kanji_breakdown: vocabularyItems.kanji_breakdown,
      })
      .from(vocabularyItems)
      .where(inArray(vocabularyItems.id, vocabIds));

    for (const row of rows) {
      vocabData[row.id] = row as VocabRow;
    }
  }

  return NextResponse.json(
    {
      items,
      vocabData,
      due_count: dueCount,
      new_count: newCount,
      budget_remaining: budgetRemaining,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
