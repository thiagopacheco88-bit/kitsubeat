import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, songVersions, vocabularyItems } from "@/lib/db/schema";
import type { Lesson, VocabEntry, Verse } from "@/lib/types/lesson";
import { Suspense } from "react";
import { localize } from "@/lib/types/lesson";
import SongSearch from "@/app/admin/lyrics/components/SongSearch";
import ExercisesReview from "./components/ExercisesReview";
import GrammarSection from "./components/GrammarSection";
import CollapsableSection from "./components/CollapsableSection";
import ToolSwitcher from "@/app/admin/ToolSwitcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Props {
  searchParams: Promise<{ songId?: string }>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Exercise Review
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
          Inspect all exercises for a song, update vocab images, and flag issues for follow-up.
        </p>
      </header>
      {children}
    </main>
  );
}

export interface VocabAdminRow {
  vocab_item_id: string;
  surface: string;
  reading: string;
  romaji: string;
  meaning_en: string;
  jlpt_level: string;
  part_of_speech: string;
  example_from_song: string;
  image_url: string | null;
  admin_flagged: boolean;
  admin_flag_note: string | null;
  first_verse: number | null;
  exercise_types: string[];
}

/** Compute which verse number a vocab surface first appears in */
function firstVerseFor(surface: string, verses: Verse[]): number | null {
  for (const verse of verses) {
    if (verse.tokens.some((t) => t.surface === surface)) {
      return verse.verse_number;
    }
  }
  return null;
}

/** Exercise types generated for a vocab item (mirrors generator.ts TRACK_TYPES) */
function exerciseTypesFor(entry: VocabEntry): string[] {
  const types: string[] = [];
  // vocab track: always included
  types.push("vocab_meaning", "meaning_vocab");
  // kanji track: only if surface contains kanji
  const hasKanji = /[一-龯㐀-䶿]/.test(entry.surface);
  if (hasKanji) {
    types.push("reading_match", "vocab_typed");
  }
  return types;
}

export default async function AdminExercisesPage({ searchParams }: Props) {
  const params = await searchParams;
  const songVersionId = params.songId ?? null;

  if (!songVersionId) {
    return (
      <AdminShell>
        <SongSearch initialSongVersionId={null} />
        <div className="rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)] px-6 py-12 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card-ring)]">
          Select a song above to review its exercises.
        </div>
      </AdminShell>
    );
  }

  const user = await currentUser();
  if (!user) notFound();

  const [songVer] = await db
    .select({
      song_version_id: songVersions.id,
      lesson: songVersions.lesson,
      title: songs.title,
      artist: songs.artist,
      slug: songs.slug,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.id, songVersionId))
    .limit(1);

  if (!songVer) notFound();

  const lesson = songVer.lesson as Lesson | null;

  if (!lesson || !lesson.vocabulary?.length) {
    return (
      <AdminShell>
        <SongSearch initialSongVersionId={songVersionId} />
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-text-muted)]">
          No lesson data found for this song version. Run the pipeline first.
        </div>
      </AdminShell>
    );
  }

  const verses: Verse[] = lesson.verses ?? [];

  // Collect vocab items that have a DB id
  const vocabEntries = lesson.vocabulary.filter((v) => !!v.vocab_item_id);
  const vocabIds = vocabEntries.map((v) => v.vocab_item_id!);

  const dbRows = vocabIds.length
    ? await db
        .select({
          id: vocabularyItems.id,
          image_url: vocabularyItems.image_url,
          admin_flagged: vocabularyItems.admin_flagged,
          admin_flag_note: vocabularyItems.admin_flag_note,
        })
        .from(vocabularyItems)
        .where(inArray(vocabularyItems.id, vocabIds))
    : [];

  const dbMap = new Map(dbRows.map((r) => [r.id, r]));

  const rows: VocabAdminRow[] = vocabEntries.map((entry) => {
    const db = dbMap.get(entry.vocab_item_id!);
    return {
      vocab_item_id: entry.vocab_item_id!,
      surface: entry.surface,
      reading: entry.reading,
      romaji: entry.romaji,
      meaning_en: localize(entry.meaning, "en"),
      jlpt_level: entry.jlpt_level,
      part_of_speech: entry.part_of_speech,
      example_from_song: entry.example_from_song,
      image_url: db?.image_url ?? null,
      admin_flagged: db?.admin_flagged ?? false,
      admin_flag_note: db?.admin_flag_note ?? null,
      first_verse: firstVerseFor(entry.surface, verses),
      exercise_types: exerciseTypesFor(entry),
    };
  });

  // Sort by first verse appearance, then surface alphabetically for items without a verse match
  rows.sort((a, b) => {
    if (a.first_verse !== null && b.first_verse !== null) return a.first_verse - b.first_verse;
    if (a.first_verse !== null) return -1;
    if (b.first_verse !== null) return 1;
    return a.surface.localeCompare(b.surface);
  });

  const songLabel = [songVer.title, songVer.artist].filter(Boolean).join(" — ");

  // Warn when lesson has vocab but none are linked to vocabulary_items (backfill not run)
  const unlinkedCount = lesson.vocabulary.length - vocabEntries.length;

  return (
    <AdminShell>
      <SongSearch initialSongVersionId={songVersionId} />
      <ToolSwitcher songVersionId={songVersionId} active="exercises" />
      {unlinkedCount > 0 && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-xl)",
          border: "1px solid #f59e0b",
          background: "#fefce8",
          fontSize: "13px",
          color: "#92400e",
        }}>
          <strong>{unlinkedCount} vocab item{unlinkedCount !== 1 ? "s" : ""}</strong> in the lesson JSON have no <code>vocab_item_id</code> — the vocabulary backfill hasn't been run for this song version. Run <code>scripts/backfill-vocab-ids</code> to link them, then vocab exercises will appear here.
        </div>
      )}
      <CollapsableSection
        title="Vocabulary Exercises"
        badge={`${rows.length} items · ${verses.length} verses`}
      >
        <ExercisesReview
          songVersionId={songVersionId}
          songLabel={songLabel}
          rows={rows}
          totalVerses={verses.length}
        />
      </CollapsableSection>

      <Suspense fallback={
        <div style={{
          padding: "16px 18px",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--color-border)",
          background: "var(--color-card)",
          fontSize: "13px",
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          Loading grammar rules…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <GrammarSection songVersionId={songVersionId} />
      </Suspense>
    </AdminShell>
  );
}
