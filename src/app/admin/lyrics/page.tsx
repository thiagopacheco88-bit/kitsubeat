import SongSearch from "./components/SongSearch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Props {
  searchParams: Promise<{ songId?: string; version?: string }>;
}

export default async function AdminLyricsPage({ searchParams }: Props) {
  const params = await searchParams;
  const songVersionId = params.songId ?? null;
  const versionParam = params.version ?? null;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}>
          Admin Lyrics Editor
        </h1>
        <p style={{ color: "#6b7280", marginTop: "6px", fontSize: "14px" }}>
          Edit per-verse lyrics fields, swap YouTube videos, flag broken songs, regenerate lessons.
          Versioned indefinitely — every published edit becomes a permanent snapshot.
        </p>
      </div>

      <SongSearch initialSongVersionId={songVersionId} />

      {songVersionId ? (
        <div
          data-testid="editor-placeholder"
          style={{
            marginTop: "24px",
            padding: "32px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#f9fafb",
            color: "#6b7280",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px" }}>
            Selected song: <code>{songVersionId}</code>
            {versionParam ? <> (version: <code>{versionParam}</code>)</> : null}
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px" }}>
            Verse editor will mount here in plan 04 (replaces this placeholder branch IN THIS SAME
            page.tsx; no separate [songVersionId] route — query-param URL per SPEC #2).
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
