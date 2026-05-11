/**
 * /admin/timing/[songId] - Timing editor page
 *
 * Server component that fetches song timing data and renders the TimingEditor.
 *
 * Audio URL strategy:
 *   Audio files are served from public/audio/{slug}.mp3, created by the
 *   WhisperX extraction script (04-extract-timing.py).
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, songVersions } from "@/lib/db/schema";
import type { TimingData, WordTiming } from "@/lib/timing-types";
import TimingSaveHandler from "../components/TimingSaveHandler";
import ToolSwitcher from "@/app/admin/ToolSwitcher";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ songId: string }>;
}

export default async function TimingEditorPage({ params }: PageProps) {
  const { songId } = await params;

  const [row] = await db
    .select({
      id: songVersions.id,
      version_type: songVersions.version_type,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      timing_data: songVersions.timing_data,
      timing_verified: songVersions.timing_verified,
      timing_youtube_id: songVersions.timing_youtube_id,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.id, songId))
    .limit(1);

  if (!row) notFound();

  const song = row;
  const timingData = song.timing_data as TimingData | null;
  const words: WordTiming[] = timingData?.words ?? [];
  const totalWords = words.length;
  const lowConfidenceCount = words.filter((w) => w.low_confidence).length;
  const audioUrl = `/audio/${song.slug}.mp3`;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="text-sm text-[var(--color-text-muted)]">
        <Link
          href="/admin/timing"
          className="font-semibold text-[var(--color-accent)] no-underline"
        >
          Timing Editor
        </Link>
        {" / "}
        {song.title}
      </div>

      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin timing
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          {song.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {song.artist} - <em>{song.anime}</em>
        </p>
      </header>

      <ToolSwitcher songVersionId={songId} active="timing" />

      <div className="flex flex-wrap gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card-ring)]">
        <span>
          <strong>{totalWords}</strong> words
        </span>
        <span>
          <strong
            className={
              lowConfidenceCount > 0
                ? "text-[var(--color-jlpt-n1)]"
                : "text-[var(--color-jlpt-n5)]"
            }
          >
            {lowConfidenceCount}
          </strong>{" "}
          low-confidence
        </span>
        <span>
          Status:{" "}
          <strong>
            {song.timing_verified === "auto" ? "Needs Review" : "Reviewed"}
          </strong>
        </span>
        {song.timing_youtube_id && (
          <span>
            YouTube ID:{" "}
            <code className="text-xs">{song.timing_youtube_id}</code>
          </span>
        )}
      </div>

      {words.length === 0 ? (
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-jlpt-n3-ring)] bg-[var(--color-jlpt-n3-bg)] p-5 text-sm text-[var(--color-jlpt-n3)]">
          <strong>No timing data found.</strong> Run the WhisperX extraction
          script first:
          <pre className="mt-2 overflow-x-auto text-xs">
            python scripts/seed/04-extract-timing.py {song.slug} {"{youtube_id}"}
          </pre>
        </div>
      ) : (
        <TimingSaveHandler
          songId={songId}
          timingVerified={song.timing_verified}
          audioUrl={audioUrl}
          words={words}
        />
      )}
    </main>
  );
}
