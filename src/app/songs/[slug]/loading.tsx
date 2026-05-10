export default function SongLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Song hero header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 rounded bg-[var(--color-card-2)]" />
            <div className="h-8 w-64 rounded bg-[var(--color-card-2)]" />
            <div className="h-4 w-40 rounded bg-[var(--color-card-2)]" />
            <div className="mt-1 flex gap-2">
              <div className="h-5 w-12 rounded-full bg-[var(--color-card-2)]" />
              <div className="h-5 w-16 rounded-full bg-[var(--color-card-2)]" />
            </div>
          </div>
          {/* YouTube embed placeholder */}
          <div className="h-40 w-full rounded-[var(--radius-xl)] bg-[var(--color-card-2)] sm:w-72" />
        </div>
      </div>

      {/* Version tabs */}
      <div className="mt-4 animate-pulse flex gap-2">
        <div className="h-9 w-20 rounded-full bg-[var(--color-card-2)]" />
        <div className="h-9 w-20 rounded-full bg-[var(--color-card-2)]" />
      </div>

      {/* Exercise track cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5"
          >
            <div className="h-4 w-16 rounded bg-[var(--color-card-2)]" />
            <div className="mt-2 h-6 w-32 rounded bg-[var(--color-card-2)]" />
            <div className="mt-3 h-2 w-full rounded-full bg-[var(--color-card-2)]" />
            <div className="mt-4 h-9 w-full rounded-[var(--radius-lg)] bg-[var(--color-card-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
