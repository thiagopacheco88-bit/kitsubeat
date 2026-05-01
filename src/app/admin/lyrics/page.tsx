import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { songs, songVersions, lyricsVersions, vocabularyItems } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import SongSearch from "./components/SongSearch";
import VerseEditor from "./components/VerseEditor";
import type { Verse } from "@/lib/types/lesson";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Props {
  searchParams: Promise<{ songId?: string; version?: string }>;
}

export default async function AdminLyricsPage({ searchParams }: Props) {
  const params = await searchParams;
  const songVersionId = params.songId ?? null;
  const versionParam = params.version ?? null;

  // No songId -> render Plan 03 empty shell (search + empty-editor placeholder).
  if (!songVersionId) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Admin Lyrics Editor
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginTop: "6px",
              fontSize: "14px",
            }}
          >
            Edit per-verse lyrics fields, swap YouTube videos, flag broken songs, regenerate lessons.
            Versioned indefinitely — every published edit becomes a permanent snapshot.
          </p>
        </div>
        <SongSearch initialSongVersionId={null} />
        <div
          data-testid="empty-editor"
          style={{
            marginTop: "24px",
            padding: "48px 32px",
            border: "1px dashed #e5e7eb",
            borderRadius: "8px",
            background: "#fafafa",
            color: "#6b7280",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          Select a song from the search above to begin editing.
        </div>
      </div>
    );
  }

  // Step 1: load song_version + song
  const [songVer] = await db
    .select({
      song_version_id: songVersions.id,
      version_type: songVersions.version_type,
      youtube_id: songVersions.youtube_id,
      lyrics_offset_ms: songVersions.lyrics_offset_ms,
      active_lyrics_version_id: songVersions.active_lyrics_version_id,
      pipeline_status: songVersions.pipeline_status,
      song_id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      quality_status: songs.quality_status,
    })
    .from(songVersions)
    .innerJoin(songs, eq(songs.id, songVersions.song_id))
    .where(eq(songVersions.id, songVersionId))
    .limit(1);

  if (!songVer) notFound();

  // Step 2: load active lyrics_versions row (verses snapshot)
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

  // Step 3: collect vocab_item_ids from VocabEntry list in lesson (not Token, which lacks this field)
  // For now, vocabMap is empty — Token type in lesson.ts doesn't carry vocab_item_id yet.
  // Plan 05/06 will extend the Token type and populate this map.
  const vocabMap: Record<
    string,
    {
      id: string;
      dictionary_form: string;
      reading: string;
      kanji_breakdown: unknown;
    }
  > = {};

  // If vocabulary_items are needed in the future, the query template is:
  // const vocabIds = new Set<string>(); ... db.select from vocabularyItems where id IN (...)
  // Suppress unused import warning for vocabularyItems — kept for plan 05 extension.
  void vocabularyItems;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}
        >
          Admin Lyrics Editor
        </h1>
      </div>

      <SongSearch initialSongVersionId={songVersionId} />

      <div data-testid="editor-mount" style={{ marginTop: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            {songVer.title}
            <span
              style={{
                fontSize: "14px",
                color: "#6b7280",
                marginLeft: "12px",
                fontWeight: 400,
              }}
            >
              {songVer.artist ? `${songVer.artist} · ` : ""}
              {songVer.anime ?? ""} ({songVer.version_type})
            </span>
          </h2>
          <p
            style={{
              color: "#6b7280",
              marginTop: "6px",
              fontSize: "12px",
            }}
          >
            Active version: #{baseVersionNumber ?? "—"} &middot; pipeline:{" "}
            {songVer.pipeline_status} &middot; quality: {songVer.quality_status}
            {versionParam ? (
              <>
                {" "}
                &middot; version param: <code>{versionParam}</code>
              </>
            ) : null}
          </p>
        </div>

        <VerseEditor
          songVersionId={songVer.song_version_id}
          slug={songVer.slug}
          title={songVer.title}
          youtubeId={songVer.youtube_id}
          lyricsOffsetMs={songVer.lyrics_offset_ms}
          verses={verses}
          baseVersionId={baseVersionId}
          baseVersionNumber={baseVersionNumber}
          vocabMap={vocabMap}
        />
      </div>
    </div>
  );
}
