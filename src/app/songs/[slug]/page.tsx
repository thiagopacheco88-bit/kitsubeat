import { notFound } from "next/navigation";
import { getSongBySlug, getVocabularyEnrichmentForSong } from "@/lib/db/queries";
import type { Lesson, VocabEntry, Localizable, KanjiBreakdown } from "@/lib/types/lesson";
import { localize } from "@/lib/types/lesson";
import { hasKanji } from "@/lib/exercises/kanji";
import { db } from "@/lib/db/index";
import { userSongProgress } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import SongContent from "./components/SongContent";

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

  // Phase 11.5 SPEC #22 + D-13: flagged or rerunning songs return 404 on the
  // public song page. This mirrors the catalog filter in src/lib/db/queries.ts.
  // getSongBySlug fetches the full songs row (including quality_status) and all
  // song_versions rows (including pipeline_status). The check here is explicit
  // and greppable; it does NOT mutate getSongBySlug so admin/debug paths still work.
  if (song.quality_status !== "active") notFound();
  const hasIdleVersion = song.versions.some((v) => v.pipeline_status === "idle");
  if (!hasIdleVersion) notFound();

  // Collect unique vocab_item_ids from every lesson's vocabulary across all versions
  const vocabIds = new Set<string>();
  for (const v of song.versions) {
    const lesson = v.lesson as Lesson | null;
    if (!lesson) continue;
    for (const entry of lesson.vocabulary) {
      if (entry.vocab_item_id) vocabIds.add(entry.vocab_item_id);
    }
  }

  // Phase 13 CR-01 fix: enrichment SELECT is wrapped in unstable_cache and
  // tagged with `song:${slug}` so it survives across requests and is busted in
  // lockstep with the song body when revalidateSongCache(slug) is called.
  const enrichRows = await getVocabularyEnrichmentForSong(
    slug,
    Array.from(vocabIds),
  );

  // Single batch SELECT for enrichment fields — one extra DB round trip per page load
  const enrichMap = new Map<
    string,
    {
      mnemonic?: Localizable;
      kanji_breakdown?: KanjiBreakdown | null;
      image_url?: string;
    }
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
            image_url: extra.image_url ?? entry.image_url,
            meaning_en: localize(entry.meaning as Localizable, "en"),
          };
        }),
      };

      // Phase 11.6 SPEC-REQ-16: Compute whether this song version has any
      // kanji-bearing vocabulary at SSR time (RESEARCH Pitfall 7 — must NOT run
      // on every client render). Used by ExerciseTab to conditionally render the
      // Kanji track card.
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

  // Phase 11.6 SPEC-REQ-10 + SPEC-REQ-11: SSR-load per-track progress percentages
  // from user_song_progress for all versions of this song.
  //
  // Uses the same PLACEHOLDER_USER_ID as /api/review/known-count and the rest of
  // the pre-auth flows — keeps SSR ring data, the "you know N/M words" badge,
  // and recordVocabAnswer writes all keyed on the same user. Will switch to
  // Clerk auth() when it lands on song pages.
  //
  // Pitfall 6 mitigation: numeric(5,2) columns come back as strings from neon-http
  // driver — parseFloat() at this boundary before passing to client components.
  const SONG_PAGE_USER_ID = PLACEHOLDER_USER_ID;
  const versionIds = versions.map((v) => v.id);

  const progressRows = await db
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
        eq(userSongProgress.user_id, SONG_PAGE_USER_ID),
        inArray(userSongProgress.song_version_id, versionIds)
      )
    )
    .limit(versionIds.length);

  // Build per-version pct map (keyed by song_version_id)
  const progressMap = new Map(
    progressRows.map((row) => [
      row.song_version_id,
      {
        vocab: row.vocab_track_pct != null
          ? parseFloat(row.vocab_track_pct as unknown as string)
          : 0,
        grammar: row.grammar_track_pct != null
          ? parseFloat(row.grammar_track_pct as unknown as string)
          : 0,
        kanji: row.kanji_track_pct != null
          ? parseFloat(row.kanji_track_pct as unknown as string)
          : 0,
        advancedDrillsUnlocked: row.advanced_drills_unlocked_at != null,
      },
    ])
  );

  // Attach track pcts to each version
  const versionsWithPcts = versions.map((v) => {
    const progress = progressMap.get(v.id);
    // SPEC R16: all-kana songs auto-pass kanji (kanji: 100 for hasKanjiBearingVocab=false)
    const kanjiPct = progress?.kanji ?? (v.hasKanjiBearingVocab === false ? 100 : 0);
    return {
      ...v,
      trackPcts: {
        vocab: progress?.vocab ?? 0,
        grammar: progress?.grammar ?? 0,
        kanji: kanjiPct,
      },
      advancedDrillsUnlocked: progress?.advancedDrillsUnlocked ?? false,
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
      }}
      versions={versionsWithPcts}
      songId={song.id}
    />
  );
}
