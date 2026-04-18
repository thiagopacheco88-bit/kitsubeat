"use server";

/**
 * Review Queue Server Actions
 *
 * Three exported functions for the /review cross-song SRS session:
 * - startReviewSession: premium check (thin gate before client loads the queue).
 * - recordReviewAnswer: passthrough to recordVocabAnswer with songVersionId=null,
 *   plus per-card new-card budget accounting.
 * - consumeNewCardBudget: atomic upsert with UTC midnight rollover.
 *
 * Notes:
 * - No ts-fsrs call here. recordVocabAnswer already wraps scheduleReview.
 * - No db.transaction() — neon-http has no callback transactions (Pitfall 4).
 *   Writes are linearized: consumeNewCardBudget first, then recordVocabAnswer.
 * - users.new_card_cap (per-session cap, Phase 08.4) and users.review_new_today
 *   (per-day counter, Phase 11) are independent columns with distinct semantics.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { recordVocabAnswer } from "@/app/actions/exercises";
import { isPremium } from "@/app/actions/userPrefs";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import type { ExerciseType } from "@/lib/exercises/generator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIsoDate(): string {
  // UTC date — matches the DATE column type in Postgres.
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ---------------------------------------------------------------------------
// consumeNewCardBudget
// ---------------------------------------------------------------------------

/**
 * Atomically increments the user's daily new-card counter with UTC midnight rollover.
 *
 * Implementation: single INSERT ... ON CONFLICT DO UPDATE with a CASE expression
 * so the increment, cap check, and rollover happen atomically in one round trip.
 *
 * Rollover: if `review_new_today_date` is not today (UTC), the row is treated as
 * stale and the counter resets to 1. This means the cap resets automatically at
 * the next calendar day (UTC) without a cron job or scheduled reset.
 *
 * Returns:
 * - allowed: false if the cap was already at REVIEW_NEW_DAILY_CAP before this call.
 * - remaining: how many new slots are left after this call (0 = limit reached).
 */
export async function consumeNewCardBudget(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = todayIsoDate();
  const cap = REVIEW_NEW_DAILY_CAP;

  // Atomic upsert with rollover:
  // - New row: insert counter=1.
  // - Existing row, same date, under cap: increment.
  // - Existing row, same date, at cap: no-op (leave at cap).
  // - Existing row, stale date: reset to 1 (rollover).
  const rows = await db.execute<{ review_new_today: number }>(sql`
    INSERT INTO users (id, review_new_today, review_new_today_date)
    VALUES (${userId}, 1, ${today}::date)
    ON CONFLICT (id) DO UPDATE SET
      review_new_today = CASE
        WHEN users.review_new_today_date = ${today}::date
             AND users.review_new_today >= ${cap} THEN users.review_new_today
        WHEN users.review_new_today_date = ${today}::date
          THEN users.review_new_today + 1
        ELSE 1
      END,
      review_new_today_date = ${today}::date,
      updated_at = NOW()
    RETURNING review_new_today
  `);

  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const count = Number(raw[0]?.review_new_today ?? 0);
  // allowed=false when the counter was already at cap (no increment occurred).
  return { allowed: count <= cap, remaining: Math.max(0, cap - count) };
}

// ---------------------------------------------------------------------------
// startReviewSession
// ---------------------------------------------------------------------------

/**
 * Narrow premium check called by the client before loading the queue.
 *
 * The actual queue is built by GET /api/review/queue — this action is the
 * early gate so the client can decide to show an upsell modal without making
 * a full queue request. Kept minimal — no queue work here.
 *
 * Returns { gated: true, reason: "premium_required" } for free users, or
 * { gated: false } for premium users.
 */
export async function startReviewSession(userId: string): Promise<
  | { gated: true; reason: "premium_required" }
  | { gated: false }
> {
  const premium = await isPremium(userId);
  if (!premium) return { gated: true as const, reason: "premium_required" };
  return { gated: false as const };
}

// ---------------------------------------------------------------------------
// recordReviewAnswer
// ---------------------------------------------------------------------------

/**
 * Records a single review-session answer.
 *
 * - Premium guard: throws "premium_required" for free users.
 * - New-card gate: if isNew=true, calls consumeNewCardBudget first. Throws
 *   "daily_new_card_cap_reached" if the budget is exhausted. The UI MUST catch
 *   this specific error, skip the card, prune remaining new cards from the queue,
 *   and show a non-blocking toast (ReviewSession.tsx handles this).
 * - Passes through to recordVocabAnswer with songVersionId=null, which runs FSRS
 *   scheduling and persists to user_vocab_mastery.
 *
 * Error-code contract:
 * - "premium_required": user lost premium mid-session (unlikely; defensive).
 * - "daily_new_card_cap_reached": budget exhausted; skip card, prune new cards.
 *
 * @param input.isNew  true = this card came from the new-card bucket; triggers budget accounting.
 */
export async function recordReviewAnswer(input: {
  userId: string;
  vocabItemId: string;
  exerciseType: Exclude<ExerciseType, "fill_lyric">;
  correct: boolean;
  revealedReading?: boolean;
  responseTimeMs: number;
  isNew: boolean;
}) {
  const premium = await isPremium(input.userId);
  if (!premium) throw new Error("premium_required");

  // New-card gate: consume a budget slot before recording FSRS.
  // A race-safe server-side check — the UI should stop serving new cards
  // once budget hits zero, but this is the source of truth.
  if (input.isNew) {
    const budget = await consumeNewCardBudget(input.userId);
    if (!budget.allowed) {
      throw new Error("daily_new_card_cap_reached");
    }
  }

  // Passthrough to the existing FSRS + exercise_log pipeline.
  // songVersionId=null is explicitly supported by recordVocabAnswer.
  return recordVocabAnswer({
    userId: input.userId,
    vocabItemId: input.vocabItemId,
    songVersionId: null,
    exerciseType: input.exerciseType,
    correct: input.correct,
    revealedReading: input.revealedReading,
    responseTimeMs: input.responseTimeMs,
  });
}
