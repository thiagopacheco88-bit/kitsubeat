export default function SongsLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="h-3 w-16 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-32 rounded bg-[var(--color-card-2)]" />
        <div className="mt-3 h-4 w-96 rounded bg-[var(--color-card-2)]" />
      </div>

      {/* Filter bar */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="h-11 w-full rounded-[var(--radius-lg)] bg-[var(--color-card-2)] lg:w-72" />
          <div className="flex gap-1.5">
            {["N5","N4","N3","N2","N1"].map((l) => (
              <div key={l} className="h-11 w-12 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {[1,2,3].map((i) => (
              <div key={i} className="h-11 w-24 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
            ))}
          </div>
          <div className="lg:order-last lg:ml-auto h-11 w-36 rounded-[var(--radius-lg)] bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Song list — 8 row skeletons */}
      <div className="flex flex-col gap-3">
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
