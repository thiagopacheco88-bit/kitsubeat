"use server";

/**
 * anime-carousel.ts — server actions for anime vocabulary carousel sessions.
 *
 * Unlike saveSessionResults (exercises.ts):
 * - Does NOT upsert userSongProgress (no song-level star tracking)
 * - Does NOT increment userExerciseSongCounters (no premium quota for carousel)
 * - DOES call applyGamificationUpdate (XP + streak)
 * - DOES call sessionRatelimit (same protection as song sessions)
 */

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { sessionRatelimit } from "@/lib/rate-limit";
import { applyGamificationUpdate } from "@/lib/gamification/session-integration";

// ── Input schema ──────────────────────────────────────────────────────────────

const AnswerRecordSchema = z.object({
  vocabItemId: z.string().uuid(),
  exerciseType: z.enum(["vocab_meaning", "meaning_vocab"]),
  correct: z.boolean(),
  responseTimeMs: z.number().int().nonnegative(),
});

const SaveAnimeCarouselSessionSchema = z.object({
  animeSlug: z.string().min(1).max(100),
  answers: z.array(AnswerRecordSchema).min(1).max(100),
  tz: z.string().optional(),
});

// ── Return type ───────────────────────────────────────────────────────────────

export interface AnimeCarouselSessionResult {
  xpGained: number;
  /** currentLevel from gamification engine (undefined if unchanged) */
  newLevel: number | undefined;
  /** Streak length in days */
  streakDays: number;
  correctCount: number;
  totalCount: number;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function saveAnimeCarouselSession(
  rawInput: unknown
): Promise<AnimeCarouselSessionResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Rate limit — same as saveSessionResults
  const { success } = await sessionRatelimit.limit(userId);
  if (!success) throw new Error("Rate limit exceeded.");

  const input = SaveAnimeCarouselSessionSchema.parse(rawInput);
  const { answers, tz = "UTC" } = input;

  const correctCount = answers.filter((a) => a.correct).length;
  const totalCount = answers.length;

  // Gamification: carousel sessions are treated as "short" sessions.
  // songSlug: "" is safe — applyGamificationUpdate guards on `if (songRows[0])`
  // newStars: 0, previousStars: 0 — carousel has no star concept; no star bonus XP awarded
  const gamification = await applyGamificationUpdate({
    userId,
    tz,
    correctAnswers: correctCount,
    totalAnswers: totalCount,
    sessionType: "short",
    newStars: 0,
    previousStars: 0,
    songSlug: "",
  });

  return {
    xpGained: gamification.xpGained,
    newLevel: gamification.leveledUp ? gamification.currentLevel : undefined,
    streakDays: gamification.streakCurrent,
    correctCount,
    totalCount,
  };
}
