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
 *   jlptPools: Record<string, VocabRow[]>, // keyed by JLPT level (e.g. "N5")
 *   due_count: number,
 *   new_count: number,
 *   budget_remaining: number,
 * }
 *
 * vocabData is included in the response so ReviewSession can construct
 * renderable questions without a separate fetch per card.
 *
 * jlptPools is keyed by JLPT level (e.g. "N5") and contains up to 50 VocabRow
 * entries per level, used by ReviewSession to build distractors via
 * pickDistractors from @/lib/exercises/generator.
 * Vocab_item_ids already present in `items` are excluded from the pools to
 * prevent a distractor from matching a later-queued card.
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
import { sql, inArray, and, notInArray } from "drizzle-orm";
/** JLPT levels as stored in the DB enum (matches pgEnum "jlpt_level"). */
type DbJlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";
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

  // Build jlptPools: one pool per JLPT level present in vocabData, up to 50
  // rows per level, excluding vocab_item_ids already in the queue (to prevent
  // a distractor from matching a later-queued card).
  const jlptLevels = Array.from(
    new Set(
      Object.values(vocabData)
        .map((v) => v.jlpt_level)
        .filter((l): l is string => typeof l === "string" && l.length > 0)
    )
  );

  // Collect queued IDs for exclusion from distractor pools.
  const queuedIds = new Set(items.map((i) => i.vocab_item_id));

  let jlptPools: Record<string, VocabRow[]> = {};
  // Guard: only query when there are JLPT levels to look up (avoids full-table
  // scan when queue is empty or all vocab rows lack a jlpt_level).
  if (jlptLevels.length > 0) {
    const poolRows = await db
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
      .where(
        and(
          inArray(vocabularyItems.jlpt_level, jlptLevels as DbJlptLevel[]),
          notInArray(vocabularyItems.id, Array.from(queuedIds))
        )
      );

    // Group by level, cap at 50 per level.
    for (const row of poolRows) {
      if (!row.jlpt_level) continue;
      const pool = jlptPools[row.jlpt_level] ?? [];
      if (pool.length < 50) {
        pool.push(row as VocabRow);
        jlptPools[row.jlpt_level] = pool;
      }
    }
  }

  return NextResponse.json(
    {
      items,
      vocabData,
      jlptPools,
      due_count: dueCount,
      new_count: newCount,
      budget_remaining: budgetRemaining,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
