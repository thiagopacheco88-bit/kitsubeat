"use server";

import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import {
  deriveBonusBadge,
  deriveStars,
  grammarExercises,
  grammarRules,
  songVersionGrammarRules,
  userGrammarExerciseLog,
  userGrammarRuleMastery,
  userSongProgress,
} from "@/lib/db/schema";
import type { GrammarExercise, GrammarLevel, GrammarSessionQuestion } from "@/lib/types/lesson";
import type { Localizable } from "@/lib/types/lesson";
import { scheduleReview } from "@/lib/fsrs/scheduler";
import type { MasteryRow } from "@/lib/fsrs/scheduler";
import type { FSRSRating } from "@/lib/fsrs/rating";
import { generateOneGrammarExercise } from "@/lib/exercises/grammar-ai";
import {
  appendRecentGrade,
  promoteIfEligible,
  PROMOTION_RECENT_WINDOW,
} from "@/lib/exercises/grammar-fsrs";
import { applyGamificationUpdate, type GamificationResult } from "@/lib/gamification/session-integration";

const DEFAULT_QUESTION_COUNT = 10;

interface RuleRow {
  id: string;
  name: string;
  jlpt_reference: string;
  explanation: Localizable;
}

/**
 * List the normalized grammar rules attached to this song version plus the
 * user's current level for each. Used by the UI to hide the Grammar Session
 * card when the song has zero rules and to show per-rule level badges before
 * the session starts.
 */
export async function getGrammarSessionRules(
  userId: string,
  songVersionId: string
): Promise<Array<{ rule: RuleRow; level: GrammarLevel }>> {
  if (!userId || !songVersionId) return [];

  const rows = await db
    .select({
      id: grammarRules.id,
      name: grammarRules.name,
      jlpt_reference: grammarRules.jlpt_reference,
      explanation: grammarRules.explanation,
      display_order: songVersionGrammarRules.display_order,
    })
    .from(songVersionGrammarRules)
    .innerJoin(grammarRules, eq(songVersionGrammarRules.grammar_rule_id, grammarRules.id))
    .where(eq(songVersionGrammarRules.song_version_id, songVersionId))
    .orderBy(asc(songVersionGrammarRules.display_order));

  if (rows.length === 0) return [];

  const ruleIds = rows.map((r) => r.id);
  const mastery = await db
    .select({
      grammar_rule_id: userGrammarRuleMastery.grammar_rule_id,
      current_level: userGrammarRuleMastery.current_level,
    })
    .from(userGrammarRuleMastery)
    .where(
      and(
        eq(userGrammarRuleMastery.user_id, userId),
        inArray(userGrammarRuleMastery.grammar_rule_id, ruleIds)
      )
    );

  const levelByRule = new Map<string, GrammarLevel>();
  for (const m of mastery) {
    levelByRule.set(m.grammar_rule_id, m.current_level as GrammarLevel);
  }

  return rows.map((r) => ({
    rule: {
      id: r.id,
      name: r.name,
      jlpt_reference: r.jlpt_reference,
      explanation: r.explanation as Localizable,
    },
    level: levelByRule.get(r.id) ?? "beginner",
  }));
}

function serializeExercise(
  row: typeof grammarExercises.$inferSelect
): GrammarExercise {
  return {
    id: row.id,
    grammar_rule_id: row.grammar_rule_id,
    level: row.level as GrammarLevel,
    exercise_type: row.exercise_type as GrammarExercise["exercise_type"],
    prompt_jp_furigana: row.prompt_jp_furigana,
    prompt_romaji: row.prompt_romaji,
    prompt_translation: row.prompt_translation as Localizable,
    blank_token_index: row.blank_token_index,
    correct_answer: row.correct_answer,
    distractors: (row.distractors as string[] | null) ?? null,
    hint: row.hint,
  };
}

/**
 * Build the question list for a Grammar Session. Round-robins one question
 * per rule until we reach `limit`, preferring exercises the user has never
 * seen at their current level. Generates on-demand via grammar-ai.ts if the
 * bank has nothing new to offer.
 */
export async function startGrammarSession(
  userId: string,
  songVersionId: string,
  limit: number = DEFAULT_QUESTION_COUNT
): Promise<GrammarSessionQuestion[]> {
  const rulesForSong = await getGrammarSessionRules(userId, songVersionId);
  if (rulesForSong.length === 0) return [];

  // Seen-exercise lookup scoped to (user, level). An exercise counts as "seen"
  // only at the level where the user last attempted it — a relearning pass at
  // a higher level draws fresh material.
  const seenByRule = new Map<string, Set<string>>();
  for (const { rule, level } of rulesForSong) {
    const seen = await db
      .select({ id: userGrammarExerciseLog.grammar_exercise_id })
      .from(userGrammarExerciseLog)
      .where(
        and(
          eq(userGrammarExerciseLog.user_id, userId),
          eq(userGrammarExerciseLog.grammar_rule_id, rule.id),
          eq(userGrammarExerciseLog.level_at_attempt, level)
        )
      );
    seenByRule.set(rule.id, new Set(seen.map((s) => s.id)));
  }

  const questions: GrammarSessionQuestion[] = [];
  const perRuleTarget = Math.max(1, Math.ceil(limit / rulesForSong.length));

  for (const { rule, level } of rulesForSong) {
    const seen = seenByRule.get(rule.id) ?? new Set<string>();

    // Unseen exercises first, ordered by insertion to keep deterministic behavior.
    const unseenWhere = seen.size
      ? and(
          eq(grammarExercises.grammar_rule_id, rule.id),
          eq(grammarExercises.level, level),
          notInArray(grammarExercises.id, Array.from(seen))
        )
      : and(
          eq(grammarExercises.grammar_rule_id, rule.id),
          eq(grammarExercises.level, level)
        );
    const unseenRows = await db
      .select()
      .from(grammarExercises)
      .where(unseenWhere)
      .orderBy(asc(grammarExercises.created_at))
      .limit(perRuleTarget);

    let pickedForRule = 0;
    for (const row of unseenRows) {
      questions.push({
        rule: {
          id: rule.id,
          name: rule.name,
          jlpt_reference: rule.jlpt_reference,
          explanation: rule.explanation,
        },
        level,
        exercise: serializeExercise(row),
      });
      pickedForRule++;
      if (questions.length >= limit) break;
    }
    if (questions.length >= limit) break;

    // If the bank had nothing unseen, generate one on demand. Cap at 1 extra
    // call per rule per session — if the cap is already hit, we reuse the
    // oldest-seen exercise as a cold fallback (review replay).
    if (pickedForRule < perRuleTarget) {
      try {
        const fresh = await generateOneGrammarExercise(rule.id, level);
        if (fresh) {
          questions.push({
            rule: {
              id: rule.id,
              name: rule.name,
              jlpt_reference: rule.jlpt_reference,
              explanation: rule.explanation,
            },
            level,
            exercise: serializeExercise(fresh),
          });
          pickedForRule++;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `[startGrammarSession] on-demand generation failed for rule=${rule.id} level=${level}:`,
          err
        );
      }
    }

    // Fallback: replay oldest seen if we still need material for this rule.
    if (pickedForRule < perRuleTarget && seen.size > 0) {
      const replayRows = await db
        .select()
        .from(grammarExercises)
        .where(
          and(
            eq(grammarExercises.grammar_rule_id, rule.id),
            eq(grammarExercises.level, level),
            inArray(grammarExercises.id, Array.from(seen))
          )
        )
        .orderBy(asc(grammarExercises.created_at))
        .limit(perRuleTarget - pickedForRule);
      for (const row of replayRows) {
        questions.push({
          rule: {
            id: rule.id,
            name: rule.name,
            jlpt_reference: rule.jlpt_reference,
            explanation: rule.explanation,
          },
          level,
          exercise: serializeExercise(row),
        });
        if (questions.length >= limit) break;
      }
    }
    if (questions.length >= limit) break;
  }

  return questions.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export interface GrammarAnswerRecord {
  exerciseId: string;
  ruleId: string;
  level: GrammarLevel;
  correct: boolean;
  rating: FSRSRating;
  timeMs: number;
}

export interface SaveGrammarSessionInput {
  userId: string;
  songVersionId: string;
  songSlug: string;
  answers: GrammarAnswerRecord[];
  durationMs: number;
  tz?: string;
}

export interface SaveGrammarSessionResult {
  accuracy: number;
  grammarBestAccuracy: number;
  stars: 0 | 1 | 2 | 3;
  previousStars: 0 | 1 | 2 | 3;
  bonusBadge: boolean;
  previousBonusBadge: boolean;
  promotions: Array<{ ruleId: string; from: GrammarLevel; to: GrammarLevel }>;
  xpGained: number;
  xpTotal: number;
  previousLevel: number;
  currentLevel: number;
  leveledUp: boolean;
  streakCurrent: number;
  streakBest: number;
  graceApplied: boolean;
  milestoneXp: number;
  rewardSlotPreview: { id: string; label: string; level_threshold: number } | null;
  pathAdvancedTo: string | null;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export async function saveGrammarSessionResults(
  input: SaveGrammarSessionInput
): Promise<SaveGrammarSessionResult> {
  const { userId, songVersionId, songSlug, answers, tz = "UTC" } = input;

  // --- 1. Accuracy ---
  const correct = answers.filter((a) => a.correct).length;
  const accuracy = answers.length === 0 ? 0 : correct / answers.length;

  // --- 2. Snapshot previous progress for star transitions ---
  const existingRows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const previousRow = existingRows[0] ?? null;

  // Does the song have grammar? By definition in this flow, yes — but the
  // helper takes the flag explicitly to stay honest.
  const songHasGrammar = true;

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

  const previousBonusBadge = previousRow
    ? deriveBonusBadge({
        ex5_best_accuracy: previousRow.ex5_best_accuracy,
        ex7_best_accuracy: previousRow.ex7_best_accuracy,
      })
    : false;

  // --- 3. Upsert grammar_best_accuracy via GREATEST (Phase 13) ---
  await db
    .insert(userSongProgress)
    .values({
      user_id: userId,
      song_version_id: songVersionId,
      completion_pct: 0,
      grammar_best_accuracy: accuracy,
      sessions_completed: 1,
    })
    .onConflictDoUpdate({
      target: [userSongProgress.user_id, userSongProgress.song_version_id],
      set: {
        grammar_best_accuracy: sql`GREATEST(COALESCE(${userSongProgress.grammar_best_accuracy}, 0), ${accuracy})`,
        sessions_completed: sql`${userSongProgress.sessions_completed} + 1`,
        updated_at: sql`NOW()`,
      },
    });

  // --- 4. Per-rule FSRS update + log + promotion ---
  const ruleGroups = new Map<string, GrammarAnswerRecord[]>();
  for (const a of answers) {
    const bucket = ruleGroups.get(a.ruleId) ?? [];
    bucket.push(a);
    ruleGroups.set(a.ruleId, bucket);
  }

  const promotions: SaveGrammarSessionResult["promotions"] = [];

  for (const [ruleId, bucket] of ruleGroups) {
    try {
      const [mastery] = await db
        .select()
        .from(userGrammarRuleMastery)
        .where(
          and(
            eq(userGrammarRuleMastery.user_id, userId),
            eq(userGrammarRuleMastery.grammar_rule_id, ruleId)
          )
        )
        .limit(1);

      // One schedule pass per answer, chained. Use the worst-rating answer as
      // the definitive signal if there are multiple answers for this rule in
      // the session — consistent with how saveSessionResults treats per-vocab
      // duplicates (best for rewards here would be lenient; worst is stricter).
      const worstRating = bucket.reduce<FSRSRating>(
        (acc, a) => (a.rating < acc ? a.rating : acc),
        4 as FSRSRating
      );

      const prev: MasteryRow | null = mastery
        ? {
            stability: mastery.stability,
            difficulty: mastery.difficulty,
            elapsed_days: mastery.elapsed_days,
            scheduled_days: mastery.scheduled_days,
            reps: mastery.reps,
            lapses: mastery.lapses,
            state: mastery.state as 0 | 1 | 2 | 3,
            due: mastery.due,
            last_review: mastery.last_review,
          }
        : null;

      const next = scheduleReview(prev, worstRating);

      const currentLevel = (mastery?.current_level as GrammarLevel | undefined) ?? "beginner";
      const recentGradesPrev = (mastery?.recent_grades as FSRSRating[] | null) ?? [];
      const recentGradesAfter = appendRecentGrade(recentGradesPrev, worstRating).slice(
        -PROMOTION_RECENT_WINDOW
      );

      const { newLevel, promoted, nextRecentGrades } = promoteIfEligible({
        currentLevel,
        stabilityAfter: next.stability,
        repsAfter: next.reps,
        recentGrades: recentGradesAfter,
      });

      await db
        .insert(userGrammarRuleMastery)
        .values({
          user_id: userId,
          grammar_rule_id: ruleId,
          current_level: newLevel,
          stability: next.stability,
          difficulty: next.difficulty,
          elapsed_days: next.elapsed_days,
          scheduled_days: next.scheduled_days,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          due: next.due,
          last_review: next.last_review,
          recent_grades: nextRecentGrades,
          updated_at: sql`NOW()`,
        })
        .onConflictDoUpdate({
          target: [userGrammarRuleMastery.user_id, userGrammarRuleMastery.grammar_rule_id],
          set: {
            current_level: newLevel,
            stability: next.stability,
            difficulty: next.difficulty,
            elapsed_days: next.elapsed_days,
            scheduled_days: next.scheduled_days,
            reps: next.reps,
            lapses: next.lapses,
            state: next.state,
            due: next.due,
            last_review: next.last_review,
            recent_grades: nextRecentGrades,
            updated_at: sql`NOW()`,
          },
        });

      // Per-answer immutable log — one row per answer in the bucket.
      for (const a of bucket) {
        await db.insert(userGrammarExerciseLog).values({
          user_id: userId,
          grammar_rule_id: ruleId,
          grammar_exercise_id: a.exerciseId,
          song_version_id: songVersionId,
          level_at_attempt: a.level,
          correct: a.correct,
          rating: a.rating,
          response_time_ms: a.timeMs,
        });
      }

      if (promoted) {
        promotions.push({ ruleId, from: currentLevel, to: newLevel });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[saveGrammarSessionResults] rule ${ruleId} update failed:`, err);
    }
  }

  // --- 5. Re-derive stars after upsert ---
  const [updated] = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const stars = updated
    ? deriveStars(
        {
          ex1_2_3_best_accuracy: updated.ex1_2_3_best_accuracy,
          ex4_best_accuracy: updated.ex4_best_accuracy,
          ex6_best_accuracy: updated.ex6_best_accuracy,
          grammar_best_accuracy: updated.grammar_best_accuracy,
        },
        songHasGrammar
      )
    : 0;

  const bonusBadge = updated
    ? deriveBonusBadge({
        ex5_best_accuracy: updated.ex5_best_accuracy,
        ex7_best_accuracy: updated.ex7_best_accuracy,
      })
    : false;

  // --- 6. Gamification ---
  let gamification: GamificationResult;
  try {
    gamification = await applyGamificationUpdate({
      userId,
      tz,
      correctAnswers: correct,
      totalAnswers: answers.length,
      sessionType: "grammar",
      newStars: stars,
      previousStars,
      songSlug,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[saveGrammarSessionResults] gamification update failed:", err);
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
    accuracy,
    grammarBestAccuracy: updated?.grammar_best_accuracy ?? accuracy,
    stars,
    previousStars,
    bonusBadge,
    previousBonusBadge,
    promotions,
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
// Mastery lookup for Ex 7 gate
// ---------------------------------------------------------------------------

/**
 * For each grammar rule attached to this song, return whether the user has
 * reached Review state (FSRS state=2) AND current_level=advanced — i.e. the
 * rule is considered fully mastered for the purposes of unlocking Ex 7
 * (Sentence Order) in Advanced Drills.
 *
 * Returns a single boolean: true only if ALL the song's rules are mastered.
 * Songs with zero rules trivially pass (Ex 7 not grammar-gated).
 */
export async function areAllGrammarRulesMasteredForSong(
  userId: string,
  songVersionId: string
): Promise<boolean> {
  if (!userId || !songVersionId) return false;

  const ruleIds = (
    await db
      .select({ id: songVersionGrammarRules.grammar_rule_id })
      .from(songVersionGrammarRules)
      .where(eq(songVersionGrammarRules.song_version_id, songVersionId))
  ).map((r) => r.id);

  if (ruleIds.length === 0) return true;

  const mastered = await db
    .select({ rule_id: userGrammarRuleMastery.grammar_rule_id })
    .from(userGrammarRuleMastery)
    .where(
      and(
        eq(userGrammarRuleMastery.user_id, userId),
        inArray(userGrammarRuleMastery.grammar_rule_id, ruleIds),
        eq(userGrammarRuleMastery.current_level, "advanced"),
        eq(userGrammarRuleMastery.state, 2)
      )
    );

  return mastered.length === ruleIds.length;
}
