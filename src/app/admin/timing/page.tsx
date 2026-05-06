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
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Timing Editor
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Review and correct WhisperX auto-generated word timestamps for each song.
        </p>
      </header>
      <SongList />
    </main>
  );
}
