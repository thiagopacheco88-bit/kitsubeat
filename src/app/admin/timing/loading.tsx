export default function AdminTimingLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <div className="h-3 w-12 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-44 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-[var(--color-card-2)]" />
      </div>

      {/* Song list rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-card-2)]" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/5 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-1/4 rounded bg-[var(--color-card-2)]" />
              </div>
              <div className="h-6 w-20 shrink-0 rounded-full bg-[var(--color-card-2)]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
