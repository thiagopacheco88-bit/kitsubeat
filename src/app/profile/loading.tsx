export default function ProfileLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <div className="h-3 w-16 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-28 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-[var(--color-card-2)]" />
      </div>

      {/* ProfileHud — avatar + XP bar */}
      <div className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex items-center gap-6">
        <div className="h-18 w-18 shrink-0 rounded-full bg-[var(--color-card-2)]" style={{ width: 72, height: 72 }} />
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-5 w-24 rounded bg-[var(--color-card-2)]" />
          <div className="h-2 w-full rounded-full bg-[var(--color-card-2)]" />
          <div className="h-4 w-40 rounded bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* GlobalLearnedCounter */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-[var(--color-card-2)]" />
          <div className="h-7 w-16 rounded bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Account section */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="h-6 w-24 rounded bg-[var(--color-card-2)]" />
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-36 rounded bg-[var(--color-card-2)]" />
            <div className="h-3 w-72 max-w-full rounded bg-[var(--color-card-2)]" />
          </div>
          <div className="h-9 w-28 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Learning preferences section */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="mb-5 h-6 w-48 rounded bg-[var(--color-card-2)]" />
        <div className="flex flex-col gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-40 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-56 max-w-full rounded bg-[var(--color-card-2)]" />
              </div>
              <div className="h-8 w-16 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
