import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  songs,
  songVersions,
  lyricsVersions,
  lyricsDrafts,
  vocabularyItems,
} from "@/lib/db/schema";
import type { Verse } from "@/lib/types/lesson";
import SongSearch from "./components/SongSearch";
import VerseEditor from "./components/VerseEditor";
import ToolSwitcher from "@/app/admin/ToolSwitcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Props {
  searchParams: Promise<{ songId?: string; version?: string }>;
}

function AdminShell({
  children,
  description,
}: {
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Admin Lyrics Editor
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </header>
      {children}
    </main>
  );
}

export default async function AdminLyricsPage({ searchParams }: Props) {
  const params = await searchParams;
  const songVersionId = params.songId ?? null;
  const versionParam = params.version ?? null;

  if (!songVersionId) {
    return (
      <AdminShell description="Edit per-verse lyrics fields, swap YouTube videos, flag broken songs, and regenerate lessons. Every published edit becomes a permanent snapshot.">
        <SongSearch initialSongVersionId={null} />
        <div
          data-testid="empty-editor"
          className="rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)] px-6 py-12 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card-ring)]"
        >
          Select a song from the search above to begin editing.
        </div>
      </AdminShell>
    );
  }

  const [songVer] = await db
    .select({
      song_version_id: songVersions.id,
      version_type: songVersions.version_type,
      youtube_id: songVersions.youtube_id,
      lyrics_offset_ms: songVersions.lyrics_offset_ms,
      active_lyrics_version_id: songVersions.active_lyrics_version_id,
      pipeline_status: songVersions.pipeline_status,
      pipeline_step: songVersions.pipeline_step,
      song_id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      quality_status: songs.quality_status,
      quality_notes: songs.quality_notes,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.id, songVersionId))
    .limit(1);

  if (!songVer) notFound();

  let verses: Verse[] = [];
  let baseVersionId: string | null = null;
  let baseVersionNumber: number | null = null;

  if (songVer.active_lyrics_version_id) {
    const [lv] = await db
      .select({
        id: lyricsVersions.id,
        version_number: lyricsVersions.version_number,
        verses: lyricsVersions.verses,
      })
      .from(lyricsVersions)
      .where(eq(lyricsVersions.id, songVer.active_lyrics_version_id))
      .limit(1);
    if (lv) {
      verses = (lv.verses as Verse[]) ?? [];
      baseVersionId = lv.id;
      baseVersionNumber = lv.version_number;
    }
  }

  if (!baseVersionId) {
    return (
      <AdminShell>
        <p className="rounded-[var(--radius-2xl)] border border-[var(--color-jlpt-n1-ring)] bg-[var(--color-jlpt-n1-bg)] p-5 text-sm text-[var(--color-jlpt-n1)]">
          No active lyrics version found for song version{" "}
          <code>{songVersionId}</code>. Re-run the Plan 01 backfill migration or
          manually create a lyrics_versions row before editing.
        </p>
      </AdminShell>
    );
  }

  const user = await currentUser();
  const editorId = user?.id ?? "anonymous";

  let initialDraftFromServer: {
    verses: Verse[];
    dirtyVerseNumbers: number[];
    updatedAt: string;
  } | null = null;

  if (editorId !== "anonymous") {
    const [draft] = await db
      .select({
        verses: lyricsDrafts.verses,
        dirty_verse_numbers: lyricsDrafts.dirty_verse_numbers,
        updated_at: lyricsDrafts.updated_at,
      })
      .from(lyricsDrafts)
      .where(
        and(
          eq(lyricsDrafts.song_version_id, songVer.song_version_id),
          eq(lyricsDrafts.editor_id, editorId)
        )
      )
      .limit(1);

    if (draft) {
      initialDraftFromServer = {
        verses: draft.verses as Verse[],
        dirtyVerseNumbers: draft.dirty_verse_numbers ?? [],
        updatedAt: draft.updated_at.toISOString(),
      };
    }
  }

  const vocabMap: Record<
    string,
    {
      id: string;
      dictionary_form: string;
      reading: string;
      kanji_breakdown: unknown;
    }
  > = {};
  void vocabularyItems;

  return (
    <AdminShell>
      <SongSearch initialSongVersionId={songVersionId} />
      <ToolSwitcher songVersionId={songVersionId} active="lyrics" />

      <div data-testid="editor-mount" className="flex flex-col gap-4">
        <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            {songVer.title}
            <span className="ml-0 block text-sm font-normal text-[var(--color-text-muted)] sm:ml-3 sm:inline">
              {songVer.artist ? `${songVer.artist} · ` : ""}
              {songVer.anime ?? ""} ({songVer.version_type})
            </span>
          </h2>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Active version: #{baseVersionNumber ?? "-"} · pipeline:{" "}
            {songVer.pipeline_status} · quality: {songVer.quality_status}
            {versionParam ? (
              <>
                {" "}
                · version param: <code>{versionParam}</code>
              </>
            ) : null}
          </p>
        </section>

        <VerseEditor
          key={songVer.song_version_id}
          songVersionId={songVer.song_version_id}
          editorId={editorId}
          slug={songVer.slug}
          title={songVer.title}
          youtubeId={songVer.youtube_id}
          lyricsOffsetMs={songVer.lyrics_offset_ms}
          verses={verses}
          baseVersionId={baseVersionId}
          baseVersionNumber={baseVersionNumber}
          vocabMap={vocabMap}
          songMeta={{
            title: songVer.title,
            artist: songVer.artist,
            anime: songVer.anime,
          }}
          initialDraftFromServer={initialDraftFromServer}
          initialPipelineStatus={songVer.pipeline_status}
          initialPipelineStep={songVer.pipeline_step}
          songId={songVer.song_id}
          initialQualityStatus={songVer.quality_status}
          initialQualityNotes={songVer.quality_notes}
        />
      </div>
    </AdminShell>
  );
}
