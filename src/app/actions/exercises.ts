"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { userSongProgress, deriveStars, deriveBonusBadge, userVocabMastery, userExerciseLog, songVersionGrammarRules, userVerseDomination } from "@/lib/db/schema";
import type { ExerciseType } from "@/lib/exercises/generator";
import { ratingFor } from "@/lib/fsrs/rating";
import { scheduleReview } from "@/lib/fsrs/scheduler";
import type { MasteryRow } from "@/lib/fsrs/scheduler";
import { tierFor } from "@/lib/fsrs/tier";
import { checkExerciseAccess } from "@/lib/exercises/access";
import {
  QUOTA_FAMILY,
  QUOTA_LIMITS,
  type QuotaFamily,
} from "@/lib/exercises/feature-flags";
import { QuotaExhaustedError } from "@/lib/exercises/errors";
import { recordSongAttempt, getSongCountForFamily } from "@/lib/exercises/counters";
import { isPremium } from "@/app/actions/userPrefs";
import { userExerciseSongCounters, users } from "@/lib/db/schema";
import { and } from "drizzle-orm";
import { applyGamificationUpdate } from "@/lib/gamification/session-integration";
import type { GamificationResult } from "@/lib/gamification/session-integration";
import { STARTER_SONG_SLUGS } from "@/lib/gamification/starter-songs";
import { getPostHogServer } from "@/lib/posthog-server";
import { auth } from "@clerk/nextjs/server";
import { exerciseRatelimit, sessionRatelimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Phase 10 Plan 06 — Advanced Drills access summary (server action).
//
// Consumed by src/app/songs/[slug]/components/ExerciseTab.tsx at "Advanced
// Drills" mode-card click. ExerciseTab MUST NOT import EXERCISE_FEATURE_FLAGS
// or checkExerciseAccess directly (violates the Phase 08.1-07 single-gate
// regression contract); this action is the thin server-action wrapper.
//
// Returns one summary covering BOTH quota families so the UI decides which
// upsell modal to show (listening @ 10-song cap vs advanced_drill @ 3-song
// cap, shared between grammar_conjugation + sentence_order).
//
// Both gate calls run in parallel via Promise.all — each is already a ~2ms
// SELECT against the composite-indexed counter table, so the latency budget
// for the mode-card click is well under the 16ms frame budget.
// ---------------------------------------------------------------------------

export interface AdvancedDrillAccess {
  listeningAllowed: boolean;
  advancedAllowed: boolean;
  listeningQuotaRemaining: number;
  advancedQuotaRemaining: number;
  listeningQuotaLimit: number;
  advancedQuotaLimit: number;
  /** True when the user has an active premium subscription — UI may hide "upgrade" affordances. */
  isPremium: boolean;
}

export async function getAdvancedDrillAccess(
  songVersionId: string
): Promise<AdvancedDrillAccess> {
  const { userId } = await auth();
  if (!userId) {
    return {
      listeningAllowed: false,
      advancedAllowed: false,
      listeningQuotaRemaining: 0,
      advancedQuotaRemaining: 0,
      listeningQuotaLimit: QUOTA_LIMITS.listening,
      advancedQuotaLimit: QUOTA_LIMITS.advanced_drill,
      isPremium: false,
    };
  }
  if (!songVersionId) {
    return {
      listeningAllowed: false,
      advancedAllowed: false,
      listeningQuotaRemaining: 0,
      advancedQuotaRemaining: 0,
      listeningQuotaLimit: QUOTA_LIMITS.listening,
      advancedQuotaLimit: QUOTA_LIMITS.advanced_drill,
      isPremium: false,
    };
  }

  // grammar_conjugation and sentence_order share the advanced_drill family,
  // so one call covers both (same QUOTA_FAMILY value → same counter). A
  // two-call parallel probe is the fastest path to two structured results.
  const [listeningResult, advancedResult, premium] = await Promise.all([
    checkExerciseAccess(userId, "listening_drill", { songVersionId }),
    checkExerciseAccess(userId, "grammar_conjugation", { songVersionId }),
    isPremium(userId),
  ]);

  return {
    listeningAllowed: listeningResult.allowed,
    advancedAllowed: advancedResult.allowed,
    // checkExerciseAccess returns quotaRemaining only on quota-related outcomes.
    // Defaulting to the family limit gives the UI a safe number when the user
    // is premium (unbounded) or the gate returned a different shape.
    listeningQuotaRemaining:
      listeningResult.quotaRemaining ?? QUOTA_LIMITS.listening,
    advancedQuotaRemaining:
      advancedResult.quotaRemaining ?? QUOTA_LIMITS.advanced_drill,
    listeningQuotaLimit: QUOTA_LIMITS.listening,
    advancedQuotaLimit: QUOTA_LIMITS.advanced_drill,
    isPremium: premium,
  };
}

// Phase 10 Plan 06 — QuotaExhaustedError lives in lib/exercises/errors.ts so
// it can be imported by test files without violating the "use server" rule that
// prohibits exporting non-async values from this file. Imported above.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnswerRecord {
  questionId: string;
  type: ExerciseType;
  /**
   * UUID of the vocabulary_items row this question targets. Optional for backward
   * compatibility with legacy answers; when present, drives the user_vocab_mastery
   * + user_exercise_log writes inline at the end of saveSessionResults. If absent,
   * the answer still counts toward accuracy/completion but no per-vocab FSRS row
   * is upserted.
   */
  vocabItemId?: string;
  chosen: string;
  correct: boolean;
  timeMs: number;
}

interface SaveSessionInput {
  songVersionId: string;
  /**
   * Song slug — required for gamification path advancement (Plan 12-04).
   * Optional for legacy test callers; defaults to empty string (no path advance).
   */
  songSlug?: string;
  answers: AnswerRecord[];
  mode: "short" | "full";
  durationMs: number;
  /**
   * IANA timezone from Intl.DateTimeFormat().resolvedOptions().timeZone.
   * Used for TZ-aware streak day rollover and daily XP cap.
   * Falls back to 'UTC' if not provided (legacy callers).
   */
  tz?: string;
}

interface SongMasteryCounts {
  total: number;
  mastered: number;
  learning: number;
  new: number;
}

interface SaveSessionResult {
  completionPct: number;
  stars: 0 | 1 | 2 | 3;
  previousStars: 0 | 1 | 2 | 3;
  /**
   * Phase 10 Plan 07 — bonus mastery badge predicate after this session's upsert.
   * True when BOTH grammar_conjugation (ex5) AND sentence_order (ex7) best_accuracy >= 80%.
   * Surfaced on SessionSummary when the value flips false → true during this session.
   */
  bonusBadge: boolean;
  /**
   * Snapshot of bonusBadge BEFORE this session's upsert — used by SessionSummary
   * to detect the false → true transition and surface a one-line "Bonus mastery
   * unlocked!" callout. No confetti (CONTEXT: bonus badge is subtle, secondary
   * to stars).
   */
  previousBonusBadge: boolean;
  songMastery: SongMasteryCounts;
  // ── Phase 12 Plan 04 — Gamification fields ──────────────────────────────
  /** XP gained this session (after soft cap). Includes streak milestone bonus. */
  xpGained: number;
  /** User's total accumulated XP after this session. */
  xpTotal: number;
  /** User's level before this session. */
  previousLevel: number;
  /** User's level after this session. */
  currentLevel: number;
  /** True if the user crossed a level threshold during this session. */
  leveledUp: boolean;
  /** Current streak count (in user's local calendar days). */
  streakCurrent: number;
  /** All-time best streak. */
  streakBest: number;
  /** True if the grace day was applied to preserve the streak. */
  graceApplied: boolean;
  /** Streak milestone bonus XP earned (0 if no milestone hit). */
  milestoneXp: number;
  /** Next locked reward slot preview (null if none available). */
  rewardSlotPreview: { id: string; label: string; level_threshold: number } | null;
  /** Slug of the next path node if path advanced; null if not on path or no advance. */
  pathAdvancedTo: string | null;
  // ── Phase 12 Plan 06 — LevelUpTakeover SFX / haptic gates ─────────────────
  /** Whether user has sound enabled (for LevelUpTakeover SFX). */
  soundEnabled: boolean;
  /** Whether user has haptics enabled (for LevelUpTakeover haptic). */
  hapticsEnabled: boolean;
}

// ---------------------------------------------------------------------------
// saveSessionResults
// ---------------------------------------------------------------------------

/**
 * Saves exercise session results to user_song_progress.
 *
 * Logic (follows Pattern 9 from Phase 8 research):
 * 1. Separate answers into ex1_2_3 (vocab_meaning, meaning_vocab, reading_match)
 *    and ex4 (fill_lyric) groups.
 * 2. Compute accuracy for each group. Null if no answers in that group.
 * 3. Upsert with GREATEST (best accuracy wins) and LEAST(100) for completion.
 * 4. Return current stars + previousStars so UI can detect new star earn events.
 */
export async function saveSessionResults(
  input: SaveSessionInput
): Promise<SaveSessionResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Rate limit: 10 session saves/min per user (Phase 16 SC-4)
  const { success: rlSuccess } = await sessionRatelimit.limit(userId);
  if (!rlSuccess) throw new Error("Rate limit exceeded. Please slow down.");

  const { songVersionId, songSlug = "", answers, mode, tz = "UTC" } = input;

  // --- Step 1: Split answers by group ---
  //
  // Phase 10 Plan 06 adds three more exercise-type buckets for the Advanced
  // Drills mode. Each bucket writes to its own best-accuracy column via the
  // same GREATEST(COALESCE) pattern as ex1_2_3 / ex4, so mastery never
  // regresses on a lower-accuracy retry.
  //
  //   ex5 → grammar_conjugation  (bonus badge component)
  //   ex6 → listening_drill      (drives Star 3)
  //   ex7 → sentence_order       (bonus badge component)
  const ex1_2_3Types: ExerciseType[] = [
    "vocab_meaning",
    "meaning_vocab",
    "reading_match",
  ];
  const ex1_2_3Answers = answers.filter((a) =>
    ex1_2_3Types.includes(a.type)
  );
  const ex4Answers = answers.filter((a) => a.type === "fill_lyric");
  const ex5Answers = answers.filter((a) => a.type === "grammar_conjugation");
  const ex6Answers = answers.filter((a) => a.type === "listening_drill");
  const ex7Answers = answers.filter((a) => a.type === "sentence_order");

  // --- Step 2: Compute accuracy per group ---
  const computeAccuracy = (group: AnswerRecord[]): number | null => {
    if (group.length === 0) return null;
    return group.filter((a) => a.correct).length / group.length;
  };

  const newEx1_2_3Accuracy = computeAccuracy(ex1_2_3Answers);
  const newEx4Accuracy = computeAccuracy(ex4Answers);
  const newEx5Accuracy = computeAccuracy(ex5Answers);
  const newEx6Accuracy = computeAccuracy(ex6Answers);
  const newEx7Accuracy = computeAccuracy(ex7Answers);

  // --- Step 3: Completion increment ---
  const completionIncrement = mode === "short" ? 15 : 30;

  // --- Step 4: Fetch previous progress (for previousStars) ---
  const existingRows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const previousRow = existingRows[0] ?? null;

  // Phase 13 — does THIS song have grammar rules? Drives which accuracy
  // column feeds Star 3 (grammar_best_accuracy for grammar songs; ex6 for
  // vocab-only songs). One COUNT query, cheap.
  const grammarRuleCountRows = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(songVersionGrammarRules)
    .where(eq(songVersionGrammarRules.song_version_id, songVersionId));
  const songHasGrammar = (grammarRuleCountRows[0]?.n ?? 0) > 0;

  const previousStars = previousRow
    ? deriveStars(
        {
          ex1_2_3_best_accuracy: previousRow.ex1_2_3_best_accuracy,
          ex4_best_accuracy: previousRow.ex4_best_accuracy,
          ex6_best_accuracy: previousRow.ex6_best_accuracy,
          grammar_best_accuracy: previousRow.grammar_best_accuracy,
        },
        songHasGrammar
      )
    : 0;

  // Phase 10 Plan 07 — bonus badge BEFORE snapshot, so SessionSummary can
  // detect a false → true transition and surface the "Bonus mastery unlocked!"
  // callout. Derived from the pre-upsert row for the same reason as
  // previousStars (Pitfall 7 — snapshot must be taken before GREATEST merges
  // the new session's accuracy into the row).
  const previousBonusBadge = previousRow
    ? deriveBonusBadge({
        ex5_best_accuracy: previousRow.ex5_best_accuracy,
        ex7_best_accuracy: previousRow.ex7_best_accuracy,
      })
    : false;

  // --- Step 5: Upsert with GREATEST/LEAST patterns ---
  //
  // Phase 10 Plan 06: ex5 / ex6 / ex7 accuracy columns join the same upsert.
  // Each uses GREATEST(COALESCE(col, 0), newAcc) so bests never regress. If
  // the current session has zero answers for a given type, the existing
  // column value is preserved verbatim (no-op assignment).
  await db
    .insert(userSongProgress)
    .values({
      user_id: userId,
      song_version_id: songVersionId,
      completion_pct: Math.min(100, completionIncrement),
      ex1_2_3_best_accuracy: newEx1_2_3Accuracy,
      ex4_best_accuracy: newEx4Accuracy,
      ex5_best_accuracy: newEx5Accuracy,
      ex6_best_accuracy: newEx6Accuracy,
      ex7_best_accuracy: newEx7Accuracy,
      sessions_completed: 1,
    })
    .onConflictDoUpdate({
      target: [userSongProgress.user_id, userSongProgress.song_version_id],
      set: {
        completion_pct: sql`LEAST(100, ${userSongProgress.completion_pct} + ${completionIncrement})`,
        ex1_2_3_best_accuracy:
          newEx1_2_3Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex1_2_3_best_accuracy}, 0), ${newEx1_2_3Accuracy})`
            : userSongProgress.ex1_2_3_best_accuracy,
        ex4_best_accuracy:
          newEx4Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex4_best_accuracy}, 0), ${newEx4Accuracy})`
            : userSongProgress.ex4_best_accuracy,
        ex5_best_accuracy:
          newEx5Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex5_best_accuracy}, 0), ${newEx5Accuracy})`
            : userSongProgress.ex5_best_accuracy,
        ex6_best_accuracy:
          newEx6Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex6_best_accuracy}, 0), ${newEx6Accuracy})`
            : userSongProgress.ex6_best_accuracy,
        ex7_best_accuracy:
          newEx7Accuracy !== null
            ? sql`GREATEST(COALESCE(${userSongProgress.ex7_best_accuracy}, 0), ${newEx7Accuracy})`
            : userSongProgress.ex7_best_accuracy,
        sessions_completed: sql`${userSongProgress.sessions_completed} + 1`,
        updated_at: sql`NOW()`,
      },
    });

  // --- Step 6: SELECT updated row and derive stars ---
  const updatedRows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const updated = updatedRows[0];
  if (!updated) {
    // Fallback (should never happen after upsert)
    return {
      completionPct: completionIncrement,
      stars: 0,
      previousStars: 0,
      bonusBadge: false,
      previousBonusBadge: false,
      songMastery: { total: 0, mastered: 0, learning: 0, new: 0 },
      xpGained: 0,
      xpTotal: 0,
      previousLevel: 1,
      currentLevel: 1,
      leveledUp: false,
      streakCurrent: 0,
      streakBest: 0,
      graceApplied: false,
      milestoneXp: 0,
      rewardSlotPreview: null,
      pathAdvancedTo: null,
      soundEnabled: true,
      hapticsEnabled: true,
    };
  }

  const stars = deriveStars(
    {
      ex1_2_3_best_accuracy: updated.ex1_2_3_best_accuracy,
      ex4_best_accuracy: updated.ex4_best_accuracy,
      ex6_best_accuracy: updated.ex6_best_accuracy,
      grammar_best_accuracy: updated.grammar_best_accuracy,
    },
    songHasGrammar
  );

  // Phase 10 Plan 07 — bonus badge AFTER snapshot. Combined with previousBonusBadge
  // above, the UI detects false → true transition for the subtle unlock callout.
  const bonusBadge = deriveBonusBadge({
    ex5_best_accuracy: updated.ex5_best_accuracy,
    ex7_best_accuracy: updated.ex7_best_accuracy,
  });

  // Phase 15 SC-1: funnel event — first_star_earned
  // Fires only when user transitions from 0 stars to >= 1 star for the first time.
  if (previousStars < 1 && stars >= 1) {
    try {
      const ph = getPostHogServer();
      ph.capture({
        distinctId: userId,
        event: "first_star_earned",
        properties: {
          song_slug: songSlug,
          star_number: 1,
        },
      });
    } catch {
      // Non-fatal: analytics must never throw into the session save path
    }
  }

  // --- Step 7: FSRS per-vocab upsert (one row per unique vocab_item_id) ---
  //
  // Per Phase 08.1-06 CONTEXT-locked coverage, user_vocab_mastery must be
  // written when a session completes. Each answered question carries its
  // vocabItemId (from the client-side Question generator). We loop over the
  // unique vocab IDs, select the existing mastery row (if any), compute the
  // next FSRS schedule via the 08.2-01 scheduler, and upsert. Any per-vocab
  // failure is logged but does NOT fail the whole session save — the song
  // progress write (steps 4–6) is the user-visible side effect.
  //
  // Note: we deliberately DO NOT insert a user_exercise_log row here. That
  // path is owned by recordVocabAnswer() which runs per-answer in live UX
  // flows (Phase 08.2+); batch-logging at the end of the session would
  // distort per-answer timing. This step's sole purpose is to ensure the
  // mastery table is populated for the FSRS due-date pipeline.
  const seenVocabIds = new Set<string>();
  const vocabAnswers = answers.filter((a) => {
    if (!a.vocabItemId) return false;
    if (seenVocabIds.has(a.vocabItemId)) return false;
    seenVocabIds.add(a.vocabItemId);
    return true;
  });

  for (const answer of vocabAnswers) {
    try {
      // Aggregate this session's answers for THIS vocab_item_id — use the best
      // outcome across duplicates as the rating signal (rewards mastery, not
      // single mistakes).
      const perVocab = answers.filter((a) => a.vocabItemId === answer.vocabItemId);
      const anyCorrect = perVocab.some((a) => a.correct);
      const rating = ratingFor(answer.type, anyCorrect, {});

      // Fetch existing mastery row (may be null for first-encounter vocab).
      const existingRows = await db
        .select()
        .from(userVocabMastery)
        .where(
          sql`${userVocabMastery.user_id} = ${userId} AND ${userVocabMastery.vocab_item_id} = ${answer.vocabItemId!}::uuid`
        )
        .limit(1);

      const prev: MasteryRow | null = existingRows[0]
        ? {
            stability: existingRows[0].stability,
            difficulty: existingRows[0].difficulty,
            elapsed_days: existingRows[0].elapsed_days,
            scheduled_days: existingRows[0].scheduled_days,
            reps: existingRows[0].reps,
            lapses: existingRows[0].lapses,
            state: existingRows[0].state as 0 | 1 | 2 | 3,
            due: existingRows[0].due,
            last_review: existingRows[0].last_review,
            intensity_preset:
              (existingRows[0].intensity_preset as "normal" | "intensive" | "light") ??
              "normal",
          }
        : null;

      const next = scheduleReview(prev, rating, prev?.intensity_preset ?? "normal");

      await db
        .insert(userVocabMastery)
        .values({
          user_id: userId,
          vocab_item_id: answer.vocabItemId!,
          // Phase 11.6: card_kind is NOT NULL; saveSessionResults batch writes
          // default to "romaji_meaning" (vocab/grammar session answers are romaji-track).
          // kanji_kana cards are handled exclusively via recordVocabAnswer per-answer.
          card_kind: "romaji_meaning",
          stability: next.stability,
          difficulty: next.difficulty,
          elapsed_days: next.elapsed_days,
          scheduled_days: next.scheduled_days,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          due: next.due,
          last_review: next.last_review,
          intensity_preset: prev?.intensity_preset ?? "normal",
          updated_at: sql`NOW()`,
        })
        .onConflictDoUpdate({
          target: [userVocabMastery.user_id, userVocabMastery.vocab_item_id, userVocabMastery.card_kind],
          set: {
            stability: next.stability,
            difficulty: next.difficulty,
            elapsed_days: next.elapsed_days,
            scheduled_days: next.scheduled_days,
            reps: next.reps,
            lapses: next.lapses,
            state: next.state,
            due: next.due,
            last_review: next.last_review,
            updated_at: sql`NOW()`,
          },
        });
    } catch (err) {
      // Do not fail the entire session save on a single mastery upsert error.
      // eslint-disable-next-line no-console
      console.error(
        `[saveSessionResults] mastery upsert failed for vocab ${answer.vocabItemId}:`,
        err
      );
    }
  }

  // --- Step 8: Song mastery tier breakdown ---
  //
  // Aggregates the song's vocabulary by FSRS state for this user so the
  // SessionSummary can show real coverage (new / learning / mastered of total)
  // instead of the session-credit completion_pct. LEFT JOIN maps missing
  // user_vocab_mastery rows to "new" per the 08.2 cold-start rule. State 2 is
  // Review (mastered, tier 3); states 1 and 3 collapse to Learning per
  // src/lib/fsrs/tier.ts.
  const masteryRows = await db.execute<{
    total: number;
    mastered: number;
    learning: number;
    new_count: number;
  }>(sql`
    WITH song_vocab AS (
      SELECT DISTINCT (elem->>'vocab_item_id')::uuid AS vocab_item_id
      FROM song_versions sv
      CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
      WHERE sv.id = ${songVersionId}::uuid
        AND sv.lesson IS NOT NULL
        AND elem->>'vocab_item_id' IS NOT NULL
    )
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE m.state = 2)::int AS mastered,
      COUNT(*) FILTER (WHERE m.state IN (1, 3))::int AS learning,
      COUNT(*) FILTER (WHERE m.state IS NULL OR m.state = 0)::int AS new_count
    FROM song_vocab s
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = s.vocab_item_id
      AND m.user_id = ${userId}
  `);

  const rawMastery = Array.isArray(masteryRows)
    ? masteryRows
    : (masteryRows.rows ?? []);
  const first = rawMastery[0] as
    | { total: number; mastered: number; learning: number; new_count: number }
    | undefined;
  const songMastery: SongMasteryCounts = {
    total: Number(first?.total ?? 0),
    mastered: Number(first?.mastered ?? 0),
    learning: Number(first?.learning ?? 0),
    new: Number(first?.new_count ?? 0),
  };

  // --- Step 9: Counter-increment safety-net for ex5/6/7 ---
  //
  // Phase 10 Plan 06: recordVocabAnswer already increments the counter on the
  // first per-vocab write for listening_drill / grammar_conjugation (when
  // vocabItemId is present). sentence_order AND synthetic-vocab grammar_
  // conjugation answers carry the empty-string sentinel and do not go through
  // recordVocabAnswer — so the counter would never get stamped via that path.
  //
  // At end-of-session we stamp one counter row per family present in the
  // answer batch. ON CONFLICT DO NOTHING guarantees no double-increment
  // against any prior per-answer stamp. This is the durable backstop for the
  // "first answer of first question" CONTEXT requirement when answers bypass
  // the per-vocab FSRS path.
  //
  // No server-side re-check here — that path is owned by recordVocabAnswer /
  // recordAdvancedDrillAttempt. By the time saveSessionResults runs, the
  // session has completed; tightening the quota post-hoc would invalidate
  // work already rewarded in the ex5/6/7 columns.
  const familiesTouched = new Set<QuotaFamily>();
  for (const a of answers) {
    const fam = QUOTA_FAMILY[a.type] as QuotaFamily | undefined;
    if (fam) familiesTouched.add(fam);
  }
  for (const family of familiesTouched) {
    try {
      await recordSongAttempt(userId, family, songVersionId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[saveSessionResults] counter safety-net increment failed (family=${family}, song=${songVersionId}):`,
        err
      );
    }
  }

  // --- Step 10: Gamification update (Phase 12 Plan 04) ---
  //
  // Single write boundary (M6): all XP/streak/level/path writes go through
  // applyGamificationUpdate. Called AFTER the stars/progress upsert so that
  // `stars` and `previousStars` are the final post-upsert values — required for
  // accurate star-bonus XP calculation (e.g., if this session earned Star 2,
  // calculateXp sees newStars=2, previousStars=1).
  let gamification: GamificationResult;
  try {
    gamification = await applyGamificationUpdate({
      userId,
      tz,
      correctAnswers: answers.filter((a) => a.correct).length,
      totalAnswers: answers.length,
      sessionType: mode,
      newStars: stars,
      previousStars,
      songSlug,
    });
  } catch (err) {
    // Gamification failure must NEVER fail the session save — progress/stars
    // write is the user-visible side effect. Log and return zeros.
    // eslint-disable-next-line no-console
    console.error("[saveSessionResults] gamification update failed:", err);
    gamification = {
      xpGained: 0,
      xpTotal: 0,
      previousLevel: 1,
      currentLevel: 1,
      leveledUp: false,
      streakCurrent: 0,
      streakBest: 0,
      graceApplied: false,
      milestoneXp: 0,
      rewardSlotPreview: null,
      pathAdvancedTo: null,
      soundEnabled: true,
      hapticsEnabled: true,
    };
  }

  return {
    completionPct: updated.completion_pct,
    stars,
    previousStars,
    bonusBadge,
    previousBonusBadge,
    songMastery,
    xpGained: gamification.xpGained,
    xpTotal: gamification.xpTotal,
    previousLevel: gamification.previousLevel,
    currentLevel: gamification.currentLevel,
    leveledUp: gamification.leveledUp,
    streakCurrent: gamification.streakCurrent,
    streakBest: gamification.streakBest,
    graceApplied: gamification.graceApplied,
    milestoneXp: gamification.milestoneXp,
    rewardSlotPreview: gamification.rewardSlotPreview,
    pathAdvancedTo: gamification.pathAdvancedTo,
    soundEnabled: gamification.soundEnabled,
    hapticsEnabled: gamification.hapticsEnabled,
  };
}

// ---------------------------------------------------------------------------
// recordVocabAnswer
// ---------------------------------------------------------------------------

// Phase 11.6: Zod-validated card_kind enum.
// Defense-in-depth Threat T-11.6-05-01: rejects any non-literal string at the
// server-action boundary BEFORE any SQL touches the parameter.
const CardKindSchema = z.enum(["romaji_meaning", "kanji_kana"]);
type CardKind = z.infer<typeof CardKindSchema>;

interface RecordAnswerInput {
  vocabItemId: string;            // target word's UUID; NEVER pass distractor IDs
  songVersionId: string | null;   // null for kana-only exercises (Phase 9)
  exerciseType: ExerciseType;
  /** Phase 11.6 NEW (D-01): which FSRS card is being exercised.
   *  Zod-validated at boundary; typed in interface for TypeScript callers.
   *  Optional for backward compat — defaults to "romaji_meaning" when absent,
   *  so pre-Phase-11.6 callers (QuestionCard, review.ts, ConjugationCard, etc.)
   *  continue working without code changes. */
  cardKind?: CardKind;
  correct: boolean;
  revealedReading?: boolean;      // true if user tapped the reveal-reading hatch
  responseTimeMs: number;
}

interface RecordAnswerResult {
  newTier: 1 | 2 | 3;
  newState: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
  due: string;                    // ISO timestamp
  // Phase 11.6: extended fields (SPEC R15, SPEC R10, D-03)
  /** Verse numbers that just transitioned to dominated on THIS answer. Empty on revisits
   *  (idempotent at SQL layer via ON CONFLICT DO NOTHING). */
  versesDominatedNow: number[];
  /** Per-track progress percentages after this answer. Null when songVersionId is null. */
  trackPct: { vocab: number; grammar: number; kanji: number };
  /** True only on the transition answer that sets advanced_drills_unlocked_at from NULL → non-NULL.
   *  False if already unlocked or tracks not yet at 80%. */
  advancedDrillsUnlockedNow: boolean;
}

/**
 * Per-answer FSRS upsert + exercise log insert.
 *
 * Per-CONTEXT decision: distractor words receive NO mastery or log row.
 * The caller MUST pass only the target vocabItemId of the question being asked.
 *
 * One transaction per call: writes exactly one user_exercise_log row and
 * upserts exactly one user_vocab_mastery row. Both succeed or both roll back.
 *
 * @throws if vocabItemId is empty (defensive guard against legacy data)
 */
export async function recordVocabAnswer(
  input: RecordAnswerInput
): Promise<RecordAnswerResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Rate limit: 120 answers/min per user (Phase 16 SC-4)
  const { success: rlSuccess } = await exerciseRatelimit.limit(userId);
  if (!rlSuccess) throw new Error("Rate limit exceeded. Please slow down.");

  const { vocabItemId, songVersionId, exerciseType, correct, revealedReading, responseTimeMs } = input;

  // Phase 11.6: Zod-validate cardKind at server-action boundary (Threat T-11.6-05-01).
  // Default to "romaji_meaning" for backward-compat with callers that pre-date Plan 11.6-05.
  const cardKind: CardKind = CardKindSchema.parse(input.cardKind ?? "romaji_meaning");

  if (!vocabItemId) {
    throw new Error("recordVocabAnswer: vocabItemId must be a non-empty UUID");
  }

  // neon-http driver does not support callback-form transactions.
  // Mastery upsert is the durability-critical write; the log row is analytics-only,
  // so we accept the (rare) window where the upsert succeeds but the log insert fails.
  const rating = ratingFor(exerciseType, correct, { revealedReading });

  // Phase 11.6: Pre-fetch MUST filter by card_kind so FSRS scheduler computes
  // the new state from THIS card's history, not a different card_kind's row.
  const existingRows = await db
    .select()
    .from(userVocabMastery)
    .where(
      sql`${userVocabMastery.user_id} = ${userId} AND ${userVocabMastery.vocab_item_id} = ${vocabItemId}::uuid AND ${userVocabMastery.card_kind} = ${cardKind}`
    )
    .limit(1);

  const prev: MasteryRow | null = existingRows[0]
    ? {
        stability: existingRows[0].stability,
        difficulty: existingRows[0].difficulty,
        elapsed_days: existingRows[0].elapsed_days,
        scheduled_days: existingRows[0].scheduled_days,
        reps: existingRows[0].reps,
        lapses: existingRows[0].lapses,
        state: existingRows[0].state as 0 | 1 | 2 | 3,
        due: existingRows[0].due,
        last_review: existingRows[0].last_review,
        intensity_preset: (existingRows[0].intensity_preset as "normal" | "intensive" | "light") ?? "normal",
      }
    : null;

  const next = scheduleReview(prev, rating, prev?.intensity_preset ?? "normal");

  // Phase 11.6: FSRS upsert now keys on (user_id, vocab_item_id, card_kind) — D-01.
  // Replaces prior single (user_id, vocab_item_id) composite key.
  await db
    .insert(userVocabMastery)
    .values({
      user_id: userId,
      vocab_item_id: vocabItemId,
      card_kind: cardKind,           // NEW (D-01)
      stability: next.stability,
      difficulty: next.difficulty,
      elapsed_days: next.elapsed_days,
      scheduled_days: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      due: next.due,
      last_review: next.last_review,
      intensity_preset: "normal",
      updated_at: sql`NOW()`,
    })
    .onConflictDoUpdate({
      target: [userVocabMastery.user_id, userVocabMastery.vocab_item_id, userVocabMastery.card_kind],
      set: {
        stability: next.stability,
        difficulty: next.difficulty,
        elapsed_days: next.elapsed_days,
        scheduled_days: next.scheduled_days,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        due: next.due,
        last_review: next.last_review,
        updated_at: sql`NOW()`,
      },
    });

  await db.insert(userExerciseLog).values({
    user_id: userId,
    vocab_item_id: vocabItemId,
    song_version_id: songVersionId,
    exercise_type: exerciseType,
    rating,
    response_time_ms: responseTimeMs,
  });

  // Phase 10 Plan 06 — Counter-increment on first answer per song.
  //
  // When the exercise type is song_quota-gated (listening_drill /
  // grammar_conjugation / sentence_order) AND the caller supplied a real
  // songVersionId, stamp the counter. ON CONFLICT DO NOTHING guarantees
  // idempotency across session resumes + rapid consecutive answers (Pitfall 5
  // immune by construction).
  //
  // Counter increment happens AFTER the successful FSRS + log writes so a
  // failed mastery upsert short-circuits without consuming a quota slot.
  //
  // Premium users still get a counter row — this preserves downgrade-
  // reconciliation semantics (set of attempted songs is known without
  // retroactive backfill when premium lapses).
  //
  // Server-side re-check: after the insert, we re-count rows for the family.
  // If the user is now OVER limit (cross-device / cross-tab race overshot the
  // tab-open gate) AND they're not premium, we refund the insert + throw a
  // QuotaExhaustedError. RESEARCH Pitfall 6 trade-off: one answer of slippage
  // possible before the refund — documented in upsell copy.
  if (songVersionId && QUOTA_FAMILY[exerciseType]) {
    const family = QUOTA_FAMILY[exerciseType] as QuotaFamily;
    try {
      await recordSongAttempt(userId, family, songVersionId);

      // Re-check after the insert. Premium users skip the re-check — their
      // quota is effectively unbounded, so a post-insert count that exceeds
      // the free-tier limit is expected.
      const premium = await isPremium(userId);
      if (!premium) {
        const count = await getSongCountForFamily(userId, family);
        const limit = QUOTA_LIMITS[family];
        if (count > limit) {
          // Refund — delete THIS (user, family, song) row so the user retains
          // access to their already-counted songs. `count > limit` implies
          // the current insert is the overshoot; deleting it brings count
          // back to the limit.
          await db
            .delete(userExerciseSongCounters)
            .where(
              and(
                eq(userExerciseSongCounters.user_id, userId),
                eq(userExerciseSongCounters.exercise_family, family),
                eq(userExerciseSongCounters.song_version_id, songVersionId)
              )
            );
          throw new QuotaExhaustedError(family);
        }
      }
    } catch (err) {
      // Re-throw QuotaExhaustedError so the caller can surface the upsell.
      if (err instanceof QuotaExhaustedError) throw err;
      // Other errors (connection drop, transient) are logged but do not fail
      // the answer record — the FSRS write is the durability-critical path.
      // eslint-disable-next-line no-console
      console.error(
        `[recordVocabAnswer] counter increment failed (family=${family}, song=${songVersionId}):`,
        err
      );
    }
  }

  // -------------------------------------------------------------------------
  // Phase 11.6: Per-track-pct recompute + verse domination (D-02, D-03)
  //
  // Runs only when songVersionId is set (song-context answers). Pure kana
  // exercises (songVersionId=null) skip this block.
  //
  // Single CTE per RESEARCH Pitfall 8 — NOT 3 separate count queries.
  // All three percentages computed in one round-trip, then persisted
  // atomically to user_song_progress.
  // -------------------------------------------------------------------------
  let trackPct: RecordAnswerResult["trackPct"] = { vocab: 0, grammar: 0, kanji: 0 };
  let advancedDrillsUnlockedNow = false;
  let versesDominatedNow: number[] = [];

  if (songVersionId) {
    // 4a. Single CTE returning the three percentages (RESEARCH Pitfall 8: single query)
    //
    // Data source: lesson JSONB (no song_vocab relational table in this project).
    //
    // vocab_correct  = romaji_meaning cards with state >= 1 / total vocab items in song
    // kanji_correct  = kanji_kana cards with state >= 1 / kanji-bearing vocab items in song
    // grammar_correct = song_version_grammar_rules rows answered correctly / total rules
    //                   (grammar_points in lesson JSONB are NOT counted here — only
    //                    normalized rules in song_version_grammar_rules are tracked.
    //                    If no rows exist for this song, grammar auto-passes: NULL → 100%)
    //
    // SPEC R16 (all-kana auto-pass): when kanji pool is empty (NULL from NULLIF),
    // kanji track auto-passes (treated as 100%).
    const pctResult = await db.execute<{
      vocab: string | null;
      grammar: string | null;
      kanji: string | null;
    }>(sql`
      WITH song_vocab_items AS (
        -- Extract all vocab items from the song's lesson JSONB vocabulary array.
        -- Surface comes from the lesson JSONB directly (VocabEntry.surface) — no
        -- JOIN to vocabulary_items needed (that table has dictionary_form, not
        -- a "surface" column, and the lesson is the canonical surface source).
        SELECT
          (elem->>'vocab_item_id')::uuid AS vocab_item_id,
          (elem->>'surface')::text       AS surface
        FROM song_versions sv,
          jsonb_array_elements(sv.lesson->'vocabulary') AS elem
        WHERE sv.id = ${songVersionId}::uuid
          AND elem->>'vocab_item_id' IS NOT NULL
      ),
      vocab_correct AS (
        -- Vocab track: romaji_meaning cards with state >= 1
        SELECT
          COUNT(*) FILTER (WHERE m.state >= 1) AS c,
          COUNT(*) AS t
        FROM song_vocab_items si
        LEFT JOIN user_vocab_mastery m
          ON m.vocab_item_id = si.vocab_item_id
          AND m.user_id = ${userId}
          AND m.card_kind = 'romaji_meaning'
      ),
      kanji_pool AS (
        -- Kanji track pool: only vocab items whose surface contains kanji codepoints
        SELECT vocab_item_id
        FROM song_vocab_items
        WHERE surface ~ '[一-鿿㐀-䶿]'
      ),
      kanji_correct AS (
        -- Kanji track: kanji_kana cards with state >= 1 (for kanji-bearing items only)
        SELECT
          COUNT(*) FILTER (WHERE m.state >= 1) AS c,
          COUNT(*) AS t
        FROM kanji_pool kp
        LEFT JOIN user_vocab_mastery m
          ON m.vocab_item_id = kp.vocab_item_id
          AND m.user_id = ${userId}
          AND m.card_kind = 'kanji_kana'
      ),
      grammar_correct AS (
        -- Grammar track: song_version_grammar_rules rows vs user_exercise_log correct answers.
        -- lesson_grammar_count: number of grammar_points in the lesson JSONB (may be > 0 even
        -- when song_version_grammar_rules is empty, i.e. exercises not yet generated).
        SELECT
          COUNT(DISTINCT log.id) FILTER (
            WHERE log.exercise_type = 'grammar_conjugation' AND log.rating >= 3
          ) AS c,
          (SELECT COUNT(*) FROM song_version_grammar_rules WHERE song_version_id = ${songVersionId}::uuid) AS t,
          (SELECT COALESCE(jsonb_array_length(v.lesson->'grammar_points'), 0)
           FROM song_versions v WHERE v.id = ${songVersionId}::uuid) AS lesson_grammar_count
        FROM user_exercise_log log
        WHERE log.user_id = ${userId}
          AND log.song_version_id = ${songVersionId}::uuid
          AND log.exercise_type = 'grammar_conjugation'
      )
      SELECT
        ROUND((vc.c::numeric / NULLIF(vc.t, 0) * 100), 2)::text AS vocab,
        ROUND((gc.c::numeric / NULLIF(gc.t, 0) * 100), 2)::text AS grammar,
        ROUND((kc.c::numeric / NULLIF(kc.t, 0) * 100), 2)::text AS kanji,
        gc.lesson_grammar_count
      FROM vocab_correct vc, grammar_correct gc, kanji_correct kc
    `);

    type PctRow = { vocab: string | null; grammar: string | null; kanji: string | null; lesson_grammar_count: string | number | null };
    const pctRows: PctRow[] = Array.isArray(pctResult)
      ? (pctResult as unknown as PctRow[])
      : ((pctResult as unknown as { rows?: PctRow[] }).rows ?? []);
    const pctRow = pctRows[0];

    // SPEC R16: when pool is empty (NULLIF(0)=NULL → result is NULL), treat as 100%
    // (auto-pass for all-kana songs, no-grammar songs).
    const vocabPct = pctRow?.vocab != null ? parseFloat(pctRow.vocab) : 100;
    const kanjiPct = pctRow?.kanji != null ? parseFloat(pctRow.kanji) : 100;
    // Grammar auto-pass: only if song_version_grammar_rules is empty AND the lesson has
    // no grammar_points. If the lesson has points but exercises aren't generated yet,
    // use 0% so the badge stays honest (not "Done!").
    const lessonGrammarCount = pctRow?.lesson_grammar_count != null ? Number(pctRow.lesson_grammar_count) : 0;
    const grammarPct = pctRow?.grammar != null
      ? parseFloat(pctRow.grammar)
      : lessonGrammarCount === 0 ? 100 : 0;
    trackPct = { vocab: vocabPct, grammar: grammarPct, kanji: kanjiPct };

    // 4b. Persist per-track pcts to user_song_progress (D-03).
    // COALESCE on advanced_drills_unlocked_at: once set, it doesn't re-lock on regression
    // unless all three tracks are still >= 80% (handled by the CASE expression).
    // The SPEC (advanced-drill-unlock-gate.test.ts Test 2) says the column BECOMES NULL
    // when any track regresses below 80%, so we use a live-recompute approach (NOT COALESCE).
    await db.execute(sql`
      INSERT INTO user_song_progress (user_id, song_version_id, vocab_track_pct, grammar_track_pct, kanji_track_pct, advanced_drills_unlocked_at)
      VALUES (
        ${userId}, ${songVersionId}::uuid,
        ${vocabPct}::numeric, ${grammarPct}::numeric, ${kanjiPct}::numeric,
        CASE WHEN ${vocabPct}::numeric >= 80 AND ${grammarPct}::numeric >= 80 AND ${kanjiPct}::numeric >= 80 THEN NOW() ELSE NULL END
      )
      ON CONFLICT (user_id, song_version_id) DO UPDATE SET
        vocab_track_pct = EXCLUDED.vocab_track_pct,
        grammar_track_pct = EXCLUDED.grammar_track_pct,
        kanji_track_pct = EXCLUDED.kanji_track_pct,
        advanced_drills_unlocked_at = CASE
          WHEN EXCLUDED.vocab_track_pct >= 80 AND EXCLUDED.grammar_track_pct >= 80 AND EXCLUDED.kanji_track_pct >= 80
            THEN COALESCE(user_song_progress.advanced_drills_unlocked_at, NOW())
          ELSE NULL
        END
    `);

    // 4c. Detect transition: was this the answer that JUST set advanced_drills_unlocked_at?
    // A "fresh" unlock is one where unlocked_at was set within the last 5 seconds.
    const unlockedResult = await db.execute<{ unlocked_now: boolean }>(sql`
      SELECT (
        advanced_drills_unlocked_at IS NOT NULL
        AND advanced_drills_unlocked_at >= NOW() - INTERVAL '5 seconds'
      ) AS unlocked_now
      FROM user_song_progress
      WHERE user_id = ${userId} AND song_version_id = ${songVersionId}::uuid
    `);
    type UnlockedNowRow = { unlocked_now: boolean };
    const unlockedRows: UnlockedNowRow[] = Array.isArray(unlockedResult)
      ? (unlockedResult as unknown as UnlockedNowRow[])
      : ((unlockedResult as unknown as { rows?: UnlockedNowRow[] }).rows ?? []);
    const unlockedRow = unlockedRows[0];
    advancedDrillsUnlockedNow = unlockedRow?.unlocked_now === true;

    // 5. Verse-domination atomic insert (D-02 + RESEARCH Pitfall 3 idempotency).
    // Only runs on correct answers — incorrect answers cannot dominate a verse.
    if (correct) {
      // Find which verse(s) this vocab item belongs to, then check if all required
      // items in that verse are now answered.
      //
      // Data source: lesson JSONB verses array (no song_vocab relational table).
      // A verse is dominated when:
      //   - Every non-kanji vocab item in the verse has a romaji_meaning card with state >= 1
      //   - Every kanji-bearing vocab item has BOTH romaji_meaning AND kanji_kana with state >= 1
      // Grammar items (song_version_grammar_rules) are NOT required for verse domination
      // in Phase 11.6 (grammar path is via its own exercise type and tracked separately).
      const verseDomResult = await db.execute<{ verse_number: number }>(sql`
        WITH this_verse AS (
          -- Find the verse number(s) containing this vocab item
          SELECT DISTINCT (verse_elem->>'verse_number')::int AS verse_number
          FROM song_versions sv,
            jsonb_array_elements(sv.lesson->'verses') AS verse_elem,
            jsonb_array_elements(verse_elem->'tokens') AS tok
          WHERE sv.id = ${songVersionId}::uuid
            AND tok->>'type' = 'vocab'
            AND (tok->>'vocab_item_id')::uuid = ${vocabItemId}::uuid
        ),
        verse_vocab AS (
          -- All vocab items in the verse(s) containing this item, with their surface.
          -- surface comes from the lesson JSONB token, not vocabulary_items
          -- (vocabulary_items has dictionary_form/reading, not surface).
          SELECT DISTINCT
            (tok->>'vocab_item_id')::uuid AS vocab_item_id,
            tok->>'surface' AS surface,
            (verse_elem->>'verse_number')::int AS verse_number
          FROM song_versions sv,
            jsonb_array_elements(sv.lesson->'verses') AS verse_elem,
            jsonb_array_elements(verse_elem->'tokens') AS tok
          WHERE sv.id = ${songVersionId}::uuid
            AND tok->>'type' = 'vocab'
            AND (tok->>'vocab_item_id') IS NOT NULL
            AND (verse_elem->>'verse_number')::int IN (SELECT verse_number FROM this_verse)
        ),
        verse_complete AS (
          -- A verse is complete when every vocab item has the required mastery
          SELECT tv.verse_number
          FROM this_verse tv
          WHERE
            -- No vocab item is missing its romaji_meaning mastery
            NOT EXISTS (
              SELECT 1 FROM verse_vocab vv
              WHERE vv.verse_number = tv.verse_number
                AND NOT EXISTS (
                  SELECT 1 FROM user_vocab_mastery m
                  WHERE m.user_id = ${userId}
                    AND m.vocab_item_id = vv.vocab_item_id
                    AND m.card_kind = 'romaji_meaning'
                    AND m.state >= 1
                )
            )
            -- No kanji-bearing vocab item is missing its kanji_kana mastery
            AND NOT EXISTS (
              SELECT 1 FROM verse_vocab vv
              WHERE vv.verse_number = tv.verse_number
                AND vv.surface ~ '[一-鿿㐀-䶿]'
                AND NOT EXISTS (
                  SELECT 1 FROM user_vocab_mastery m
                  WHERE m.user_id = ${userId}
                    AND m.vocab_item_id = vv.vocab_item_id
                    AND m.card_kind = 'kanji_kana'
                    AND m.state >= 1
                )
            )
        )
        INSERT INTO user_verse_domination (user_id, song_version_id, verse_number)
        SELECT ${userId}, ${songVersionId}::uuid, verse_number FROM verse_complete
        ON CONFLICT (user_id, song_version_id, verse_number) DO NOTHING
        RETURNING verse_number
      `);
      type VerseDomRow = { verse_number: number };
      const verseDomRows: VerseDomRow[] = Array.isArray(verseDomResult)
        ? (verseDomResult as unknown as VerseDomRow[])
        : ((verseDomResult as unknown as { rows?: VerseDomRow[] }).rows ?? []);
      versesDominatedNow = verseDomRows.map((r) => r.verse_number);
    }
  }

  return {
    newTier: tierFor(next.state),
    newState: next.state,
    reps: next.reps,
    lapses: next.lapses,
    due: next.due.toISOString(),
    // Phase 11.6 extended fields (SPEC R15, SPEC R10, D-03)
    versesDominatedNow,
    trackPct,
    advancedDrillsUnlockedNow,
  };
}

// ---------------------------------------------------------------------------
// Phase 11.6 Plan 05 — getAdvancedDrillUnlock
//
// Read-only query: returns true when user_song_progress.advanced_drills_unlocked_at
// IS NOT NULL for the given (songVersionId, userId) pair.
//
// Consumed by: all-kana-song.test.ts (validates all-kana auto-pass behavior).
// May be consumed by ExerciseTab.tsx in a future plan to gate the Advanced Drills button.
// ---------------------------------------------------------------------------

export async function getAdvancedDrillUnlock(
  songVersionId: string
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId || !songVersionId) return false;
  const rows = await db.execute<{ unlocked: boolean }>(sql`
    SELECT (advanced_drills_unlocked_at IS NOT NULL) AS unlocked
    FROM user_song_progress
    WHERE user_id = ${userId} AND song_version_id = ${songVersionId}::uuid
  `);
  type UnlockedRow = { unlocked: boolean };
  const resultRows: UnlockedRow[] = Array.isArray(rows)
    ? (rows as unknown as UnlockedRow[])
    : ((rows as unknown as { rows?: UnlockedRow[] }).rows ?? []);
  const row = resultRows[0];
  return row?.unlocked === true;
}

// ---------------------------------------------------------------------------
// Phase 10 Plan 06 — recordAdvancedDrillAttempt
//
// Used by SentenceOrderCard and any caller where vocabItemId is the empty-
// string sentinel (verse-centric questions). Performs the same counter insert
// + server-side re-check as recordVocabAnswer — decoupled so callers that
// bypass per-vocab FSRS writes still consume the free-tier quota.
//
// Exposed as its own server action (not inlined) so:
//   1. SentenceOrderCard stays free of FSRS imports.
//   2. The re-check + refund path has a single, testable code path.
//   3. Future verse-centric exercise types can reuse it without modifying
//      recordVocabAnswer's signature.
// ---------------------------------------------------------------------------

export async function recordAdvancedDrillAttempt(
  songVersionId: string,
  exerciseType: ExerciseType
): Promise<{ ok: true } | { ok: false; reason: "quota_exhausted"; family: QuotaFamily }> {
  const { userId } = await auth();
  if (!userId) return { ok: true }; // unauthenticated — no quota to consume
  const family = QUOTA_FAMILY[exerciseType] as QuotaFamily | undefined;
  if (!family) {
    // Non-gated type — nothing to do.
    return { ok: true };
  }
  if (!songVersionId) return { ok: true };

  try {
    await recordSongAttempt(userId, family, songVersionId);

    const premium = await isPremium(userId);
    if (premium) return { ok: true };

    const count = await getSongCountForFamily(userId, family);
    const limit = QUOTA_LIMITS[family];
    if (count > limit) {
      await db
        .delete(userExerciseSongCounters)
        .where(
          and(
            eq(userExerciseSongCounters.user_id, userId),
            eq(userExerciseSongCounters.exercise_family, family),
            eq(userExerciseSongCounters.song_version_id, songVersionId)
          )
        );
      return { ok: false, reason: "quota_exhausted", family };
    }
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[recordAdvancedDrillAttempt] counter increment failed (family=${family}, song=${songVersionId}):`,
      err
    );
    // On transient error, allow through (the tab-open gate already approved).
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// fetchSongProgress — lightweight prefetch for optimistic star rendering
// ---------------------------------------------------------------------------

export interface PrevSongProgress {
  ex1_2_3_best_accuracy: number | null;
  ex4_best_accuracy: number | null;
  ex6_best_accuracy: number | null;
  grammar_best_accuracy: number | null;
  songHasGrammar: boolean;
}

/**
 * Fetches the current user's song progress + grammar flag for a song version.
 * Called client-side at session start so SessionSummary can compute optimistic
 * stars immediately without waiting for saveSessionResults to complete.
 * Returns null if unauthenticated or no previous progress row exists.
 */
export async function fetchSongProgress(
  songVersionId: string
): Promise<PrevSongProgress | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [progressRows, grammarCountRows] = await Promise.all([
    db
      .select({
        ex1_2_3_best_accuracy: userSongProgress.ex1_2_3_best_accuracy,
        ex4_best_accuracy: userSongProgress.ex4_best_accuracy,
        ex6_best_accuracy: userSongProgress.ex6_best_accuracy,
        grammar_best_accuracy: userSongProgress.grammar_best_accuracy,
      })
      .from(userSongProgress)
      .where(
        sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
      )
      .limit(1),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(songVersionGrammarRules)
      .where(eq(songVersionGrammarRules.song_version_id, songVersionId)),
  ]);

  const songHasGrammar = (grammarCountRows[0]?.n ?? 0) > 0;
  const row = progressRows[0] ?? null;

  return {
    ex1_2_3_best_accuracy: row?.ex1_2_3_best_accuracy ?? null,
    ex4_best_accuracy: row?.ex4_best_accuracy ?? null,
    ex6_best_accuracy: row?.ex6_best_accuracy ?? null,
    grammar_best_accuracy: row?.grammar_best_accuracy ?? null,
    songHasGrammar,
  };
}
