export default function TimingEditorLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <div className="animate-pulse h-4 w-48 rounded bg-[var(--color-card-2)]" />

      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <div className="h-3 w-24 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-72 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-4 w-48 rounded bg-[var(--color-card-2)]" />
      </div>

      {/* Stats bar */}
      <div className="animate-pulse flex flex-wrap gap-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-28 rounded bg-[var(--color-card-2)]" />
        ))}
      </div>

      {/* Timing editor — waveform + word list */}
      <div className="animate-pulse flex flex-col gap-4">
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-40" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 flex items-center gap-4">
              <div className="h-4 w-16 rounded bg-[var(--color-card-2)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-card-2)]" />
              <div className="h-4 w-20 rounded bg-[var(--color-card-2)]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
