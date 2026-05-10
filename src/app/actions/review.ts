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
 * - Phase 11.6: cardKind added to recordReviewAnswer; shared daily cap (SPEC R17):
 *   review_new_today increments once per isNew=true call regardless of cardKind.
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { recordVocabAnswer } from "@/app/actions/exercises";
import { isPremium } from "@/app/actions/userPrefs";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";
import type { ExerciseType } from "@/lib/exercises/generator";

// Phase 11.6: Zod-validated card_kind enum — mirrors Plan 11.6-05 defense-in-depth.
// Threat T-11.6-10-01: rejects non-literal cardKind at the server-action boundary.
const CardKindSchema = z.enum(["romaji_meaning", "kanji_kana"]);

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
export async function consumeNewCardBudget(): Promise<{ allowed: boolean; remaining: number }> {
  const { userId } = await auth();
  if (!userId) return { allowed: false, remaining: 0 };
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
export async function startReviewSession(): Promise<
  | { gated: true; reason: "premium_required" }
  | { gated: false }
> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
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
  vocabItemId: string;
  exerciseType: Exclude<ExerciseType, "fill_lyric">;
  /** Phase 11.6 NEW (SPEC R17): which FSRS card track is being answered.
   *  Zod-validated at boundary (Threat T-11.6-10-01). Defaults to "romaji_meaning"
   *  for backward compatibility with callers that pre-date Plan 11.6-10. */
  cardKind?: "romaji_meaning" | "kanji_kana";
  correct: boolean;
  revealedReading?: boolean;
  responseTimeMs: number;
  isNew: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const premium = await isPremium(userId);
  if (!premium) throw new Error("premium_required");

  // Phase 11.6: Zod-validate cardKind at server-action boundary (T-11.6-10-01).
  // Default to "romaji_meaning" for backward-compat with pre-Phase-11.6 callers.
  const cardKind = CardKindSchema.parse(input.cardKind ?? "romaji_meaning");

  // New-card gate: consume a budget slot before recording FSRS.
  // SPEC R17 shared-cap semantics: review_new_today increments ONCE per isNew=true
  // call regardless of cardKind. Introducing both kinds for same vocab burns 2 slots.
  // A race-safe server-side check — the UI should stop serving new cards
  // once budget hits zero, but this is the source of truth.
  if (input.isNew) {
    const budget = await consumeNewCardBudget();
    if (!budget.allowed) {
      throw new Error("daily_new_card_cap_reached");
    }
  }

  // Passthrough to the existing FSRS + exercise_log pipeline.
  // songVersionId=null is explicitly supported by recordVocabAnswer.
  // cardKind is threaded through to key the (user_id, vocab_item_id, card_kind) upsert.
  return recordVocabAnswer({
    vocabItemId: input.vocabItemId,
    songVersionId: null,
    exerciseType: input.exerciseType,
    cardKind,                    // Phase 11.6 NEW passthrough
    correct: input.correct,
    revealedReading: input.revealedReading,
    responseTimeMs: input.responseTimeMs,
  });
}
