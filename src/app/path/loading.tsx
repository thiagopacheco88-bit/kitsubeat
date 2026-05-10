export default function PathLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Hero progress card */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-16 rounded bg-[var(--color-card-2)]" />
            <div className="h-7 w-40 rounded bg-[var(--color-card-2)]" />
          </div>
          <div className="h-12 w-12 rounded-full bg-[var(--color-card-2)]" />
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-[var(--color-card-2)]" />
        <div className="mt-2 flex justify-between">
          <div className="h-3 w-24 rounded bg-[var(--color-card-2)]" />
          <div className="h-3 w-16 rounded bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Path nodes column */}
      <div className="flex flex-col items-center gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse w-full max-w-sm rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-full bg-[var(--color-card-2)]" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-3/4 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--color-card-2)]" />
                <div className="h-2 w-full rounded-full bg-[var(--color-card-2)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
