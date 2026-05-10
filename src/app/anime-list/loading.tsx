export default function AnimeListLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="h-3 w-24 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-52 rounded bg-[var(--color-card-2)]" />
        <div className="mt-3 h-4 w-80 rounded bg-[var(--color-card-2)]" />
        {/* Search bar */}
        <div className="mt-4 h-10 w-full rounded-[var(--radius-lg)] bg-[var(--color-card-2)] sm:w-96" />
      </div>

      {/* Song grid — 8 card skeletons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-card-2)]" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-3/4 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--color-card-2)]" />
                <div className="flex gap-2">
                  <div className="h-4 w-10 rounded-full bg-[var(--color-card-2)]" />
                  <div className="h-4 w-14 rounded-full bg-[var(--color-card-2)]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
