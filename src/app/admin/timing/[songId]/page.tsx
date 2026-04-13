/**
 * /admin/timing/[songId] — Timing editor page
 *
 * Server component that fetches song timing data and renders the TimingEditor.
 *
 * Audio URL strategy:
 *   Audio files are served from public/audio/{slug}.mp3 — created by the
 *   WhisperX extraction script (04-extract-timing.py) which copies the mp3
 *   to public/audio/ after yt-dlp download.
 *
 *   Production audio serving strategy will be decided in a later phase.
 *   For now the admin must run the timing extraction script before editing.
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import TimingEditor from "../components/TimingEditor";
import TimingSaveHandler from "../components/TimingSaveHandler";
import type { TimingData, WordTiming } from "@/lib/timing-types";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ songId: string }>;
}

export default async function TimingEditorPage({ params }: PageProps) {
  const { songId } = await params;

  const [song] = await db
    .select()
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (!song) {
    notFound();
  }

  // Parse timing data from JSONB
  const timingData = song.timing_data as TimingData | null;
  const words: WordTiming[] = timingData?.words ?? [];

  // Stats
  const totalWords = words.length;
  const lowConfidenceCount = words.filter((w) => w.low_confidence).length;

  // Audio URL: served from public/audio/{slug}.mp3
  // Admin must run 04-extract-timing.py first to create this file.
  const audioUrl = `/audio/${song.slug}.mp3`;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "16px", fontSize: "13px", color: "#6b7280" }}>
        <Link href="/admin/timing" style={{ color: "#6366f1", textDecoration: "none" }}>
          Timing Editor
        </Link>
        {" / "}
        {song.title}
      </div>

      {/* Song header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>
          {song.title}
        </h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
          {song.artist} — <em>{song.anime}</em>
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          marginBottom: "24px",
          padding: "12px 16px",
          background: "#f9fafb",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          fontSize: "13px",
          color: "#374151",
        }}
      >
        <span>
          <strong>{totalWords}</strong> words
        </span>
        <span>
          <strong style={{ color: lowConfidenceCount > 0 ? "#ef4444" : "#10b981" }}>
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
            YouTube ID: <code style={{ fontSize: "12px" }}>{song.timing_youtube_id}</code>
          </span>
        )}
      </div>

      {/* Timing editor — client component handles wavesurfer */}
      {words.length === 0 ? (
        <div
          style={{
            padding: "24px",
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            color: "#92400e",
            fontSize: "14px",
          }}
        >
          <strong>No timing data found.</strong> Run the WhisperX extraction script first:
          <pre style={{ marginTop: "8px", fontSize: "12px" }}>
            python scripts/seed/04-extract-timing.py {song.slug} {"{youtube_id}"}
          </pre>
        </div>
      ) : (
        <TimingSaveHandler songId={songId} timingVerified={song.timing_verified}>
          {(handleSave) => (
            <TimingEditor
              audioUrl={audioUrl}
              words={words}
              songId={songId}
              onSave={handleSave}
            />
          )}
        </TimingSaveHandler>
      )}
    </div>
  );
}
