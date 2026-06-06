import { notFound } from "next/navigation";
import {
  getSongBySlug,
  getVocabularyEnrichmentForSong,
  getDominatedVerses,
} from "@/lib/db/queries";
import type { Lesson, VocabEntry, Localizable, KanjiBreakdown } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { hasKanji } from "@/lib/exercises/kanji";
import { db } from "@/lib/db/index";
import { userSongProgress, songVersionGrammarRules, userExerciseLog } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getPostHogServer } from "@/lib/posthog-server";
import SongContent from "@/app/songs/[slug]/components/SongContent";

export async function ScenePlayerLoader({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  if (song.quality_status !== "active") notFound();
  if (song.content_type !== "scene") notFound();
  const hasIdleVersion = song.versions.some((v) => v.pipeline_status === "idle");
  if (!hasIdleVersion) notFound();

  try {
    const ph = getPostHogServer();
    ph.capture({
      distinctId: userId,
      event: "scene_opened",
      properties: {
        scene_slug: song.slug,
        anime: song.anime,
        jlpt_level: song.jlpt_level ?? "unknown",
      },
    });
  } catch {
    // intentional no-op
  }

  const vocabIds = new Set<string>();
  for (const v of song.versions) {
    const lesson = v.lesson as Lesson | null;
    if (!lesson) continue;
    for (const entry of lesson.vocabulary) {
      if (entry.vocab_item_id) vocabIds.add(entry.vocab_item_id);
    }
  }

  const enrichRows = await getVocabularyEnrichmentForSong(slug, Array.from(vocabIds));

  const enrichMap = new Map<
    string,
    { mnemonic?: Localizable; kanji_breakdown?: KanjiBreakdown | null; image_url?: string }
  >(
    enrichRows.map((r) => [
      r.id,
      {
        mnemonic: (r.mnemonic ?? undefined) as Localizable | undefined,
        kanji_breakdown: (r.kanji_breakdown ?? null) as KanjiBreakdown | null,
        image_url: r.image_url ?? undefined,
      },
    ])
  );

  const versions = song.versions
    .filter((v) => v.lesson)
    .map((v) => {
      const lesson = v.lesson as Lesson;
      const enrichedLesson: Lesson = {
        ...lesson,
        vocabulary: lesson.vocabulary.map((entry): VocabEntry => {
          if (!entry.vocab_item_id) return entry;
          const extra = enrichMap.get(entry.vocab_item_id);
          if (!extra) return entry;
          return {
            ...entry,
            mnemonic: extra.mnemonic ?? entry.mnemonic,
            kanji_breakdown: extra.kanji_breakdown ?? entry.kanji_breakdown,
            image_url: extra.image_url ?? entry.image_url,
            meaning_en: localize(entry.meaning as Localizable, "en"),
          };
        }),
      };
      const hasKanjiBearingVocab = enrichedLesson.vocabulary.some(
        (entry) => hasKanji(entry.surface)
      );
      return {
        id: v.id,
        type: v.version_type as "tv" | "full",
        youtube_id: v.youtube_id,
        lesson: enrichedLesson,
        synced_lrc: v.synced_lrc as { startMs: number; text: string }[] | null,
        lyrics_offset_ms: v.lyrics_offset_ms,
        hasKanjiBearingVocab,
      };
    });

  if (versions.length === 0) notFound();

  const versionIds = versions.map((v) => v.id);

  const [progressRows, grammarRuleCounts, grammarLogCounts, dominatedByVersion] = await Promise.all([
    db
      .select({
        song_version_id: userSongProgress.song_version_id,
        vocab_track_pct: userSongProgress.vocab_track_pct,
        grammar_track_pct: userSongProgress.grammar_track_pct,
        kanji_track_pct: userSongProgress.kanji_track_pct,
        advanced_drills_unlocked_at: userSongProgress.advanced_drills_unlocked_at,
      })
      .from(userSongProgress)
      .where(
        and(
          eq(userSongProgress.user_id, userId),
          inArray(userSongProgress.song_version_id, versionIds)
        )
      )
      .limit(versionIds.length),
    db
      .select({
        song_version_id: songVersionGrammarRules.song_version_id,
        rule_count: sql<number>`count(*)`.as("rule_count"),
      })
      .from(songVersionGrammarRules)
      .where(inArray(songVersionGrammarRules.song_version_id, versionIds))
      .groupBy(songVersionGrammarRules.song_version_id),
    db
      .select({
        song_version_id: userExerciseLog.song_version_id,
        attempt_count: sql<number>`count(*)`.as("attempt_count"),
      })
      .from(userExerciseLog)
      .where(
        and(
          eq(userExerciseLog.user_id, userId),
          inArray(userExerciseLog.song_version_id, versionIds),
          eq(userExerciseLog.exercise_type, "grammar_conjugation")
        )
      )
      .groupBy(userExerciseLog.song_version_id),
    Promise.all(
      versionIds.map(async (vid) => {
        const arr = await getDominatedVerses(userId, vid);
        return [vid, arr] as [string, number[]];
      })
    ).then((entries) => new Map<string, number[]>(entries)),
  ]);

  const grammarRuleCountMap = new Map(
    grammarRuleCounts.map((row) => [row.song_version_id, Number(row.rule_count)])
  );
  const grammarLogCountMap = new Map(
    grammarLogCounts.map((row) => [row.song_version_id, Number(row.attempt_count)])
  );

  const progressMap = new Map(
    progressRows.map((row) => [
      row.song_version_id,
      {
        vocab: row.vocab_track_pct != null ? parseFloat(row.vocab_track_pct as unknown as string) : 0,
        grammar: row.grammar_track_pct != null ? parseFloat(row.grammar_track_pct as unknown as string) : 0,
        kanji: row.kanji_track_pct != null ? parseFloat(row.kanji_track_pct as unknown as string) : 0,
        advancedDrillsUnlocked: row.advanced_drills_unlocked_at != null,
      },
    ])
  );

  const versionsWithPcts = versions.map((v) => {
    const progress = progressMap.get(v.id);
    const kanjiPct = progress?.kanji ?? (v.hasKanjiBearingVocab === false ? 100 : 0);
    const lessonGrammarCount = v.lesson.grammar_points?.length ?? 0;
    const grammarExercisesCount = grammarRuleCountMap.get(v.id) ?? 0;
    const grammarLogCount = grammarLogCountMap.get(v.id) ?? 0;
    const rawGrammarPct = progress?.grammar ?? 0;
    const grammarPct =
      rawGrammarPct >= 100 && lessonGrammarCount > 0 && grammarLogCount === 0
        ? 0
        : rawGrammarPct >= 100 && lessonGrammarCount > 0 && grammarExercisesCount === 0
        ? 0
        : rawGrammarPct;
    return {
      ...v,
      trackPcts: {
        vocab: progress?.vocab ?? 0,
        grammar: grammarPct,
        kanji: kanjiPct,
      },
      advancedDrillsUnlocked: progress?.advancedDrillsUnlocked ?? false,
      dominatedVerseNumbers: dominatedByVersion.get(v.id) ?? [],
      totalVerses: v.lesson.verses.length,
    };
  });

  return (
    <SongContent
      song={{
        title: song.title,
        slug: song.slug,
        artist: song.artist,
        anime: song.anime,
        season_info: song.season_info,
        jlpt_level: song.jlpt_level,
        difficulty_tier: song.difficulty_tier,
        content_type: "scene",
      }}
      versions={versionsWithPcts}
      songId={song.id}
      userId={userId}
    />
  );
}
