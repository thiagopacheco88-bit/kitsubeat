/**
 * /admin/timing — Timing Editor song list
 *
 * Shows all songs with their timing verification status.
 * Admin clicks a song to open the waveform timing editor.
 *
 * TODO: Gate behind admin role in Phase 3.
 */

import SongList from "./components/SongList";

export const dynamic = "force-dynamic";

export default function TimingPage() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}>
          Timing Editor
        </h1>
        <p style={{ color: "#6b7280", marginTop: "6px", fontSize: "14px" }}>
          Review and correct WhisperX auto-generated word timestamps for each song.
        </p>
      </div>
      <SongList />
    </div>
  );
}
