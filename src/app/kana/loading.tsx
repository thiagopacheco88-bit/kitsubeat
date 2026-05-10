export default function KanaLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <div className="h-3 w-24 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-40 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-[var(--color-card-2)]" />
      </div>

      {/* Mode toggle + start button bar */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <div className="h-11 w-28 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
            <div className="h-11 w-28 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
            <div className="h-11 w-24 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
          </div>
          <div className="h-11 w-48 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Kana grid skeleton */}
      <div className="animate-pulse flex flex-col gap-8">
        {/* Hiragana section */}
        <div>
          <div className="mb-3 h-5 w-24 rounded bg-[var(--color-card-2)]" />
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 46 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] gap-1 p-2"
              >
                <div className="h-5 w-5 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-6 rounded bg-[var(--color-card-2)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
