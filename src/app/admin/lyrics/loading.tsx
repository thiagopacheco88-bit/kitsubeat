export default function AdminLyricsLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <div className="h-3 w-12 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-56 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-4 w-[480px] max-w-full rounded bg-[var(--color-card-2)]" />
      </div>

      {/* Song search bar */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <div className="h-11 w-full rounded-[var(--radius-lg)] bg-[var(--color-card-2)]" />
      </div>

      {/* Empty editor placeholder */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)] px-6 py-12 flex items-center justify-center">
        <div className="h-4 w-64 rounded bg-[var(--color-card-2)]" />
      </div>
    </main>
  );
}
