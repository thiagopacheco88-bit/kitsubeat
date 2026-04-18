import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { getSongBySlug, getKnownWordCountForSong } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { vocabularyItems } from "@/lib/db/schema";
import type { Lesson, VocabEntry, Localizable, KanjiBreakdown } from "@/lib/types/lesson";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import SongContent from "./components/SongContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song Not Found | KitsuBeat" };
  return { title: `${song.title} - ${song.artist} | KitsuBeat` };
}

export default async function SongPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  // Collect unique vocab_item_ids from every lesson's vocabulary across all versions
  const vocabIds = new Set<string>();
  for (const v of song.versions) {
    const lesson = v.lesson as Lesson | null;
    if (!lesson) continue;
    for (const entry of lesson.vocabulary) {
      if (entry.vocab_item_id) vocabIds.add(entry.vocab_item_id);
    }
  }

  // Parallelize: enrichment batch SELECT + known-word count for the song.
  // Known-count uses a placeholder userId until Phase 10 wires Clerk auth.
  const enrichQuery =
    vocabIds.size > 0
      ? db
          .select({
            id: vocabularyItems.id,
            mnemonic: vocabularyItems.mnemonic,
            kanji_breakdown: vocabularyItems.kanji_breakdown,
          })
          .from(vocabularyItems)
          .where(inArray(vocabularyItems.id, Array.from(vocabIds)))
      : Promise.resolve([] as { id: string; mnemonic: unknown; kanji_breakdown: unknown }[]);

  const [enrichRows, initialKnown] = await Promise.all([
    enrichQuery,
    getKnownWordCountForSong(PLACEHOLDER_USER_ID, song.id),
  ]);

  // Single batch SELECT for enrichment fields — one extra DB round trip per page load
  const enrichMap = new Map<string, { mnemonic?: Localizable; kanji_breakdown?: KanjiBreakdown | null }>(
    enrichRows.map((r) => [
      r.id,
      {
        mnemonic: (r.mnemonic ?? undefined) as Localizable | undefined,
        kanji_breakdown: (r.kanji_breakdown ?? null) as KanjiBreakdown | null,
      },
    ])
  );

  // Build version data — only include versions that have a lesson, with enrichment merged
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
          };
        }),
      };
      return {
        id: v.id,
        type: v.version_type as "tv" | "full",
        youtube_id: v.youtube_id,
        lesson: enrichedLesson,
        synced_lrc: v.synced_lrc as { startMs: number; text: string }[] | null,
      };
    });

  if (versions.length === 0) notFound();

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
      }}
      versions={versions}
      songId={song.id}
      initialKnown={initialKnown}
    />
  );
}
