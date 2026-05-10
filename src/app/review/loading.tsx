export default function ReviewLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header card */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="h-3 w-8 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-28 rounded bg-[var(--color-card-2)]" />
        <div className="mt-3 h-4 w-72 rounded bg-[var(--color-card-2)]" />
      </div>

      {/* Stats card */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 rounded bg-[var(--color-card-2)]" />
            <div className="h-10 w-16 rounded bg-[var(--color-card-2)]" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 rounded bg-[var(--color-card-2)]" />
            <div className="h-10 w-24 rounded bg-[var(--color-card-2)]" />
          </div>
        </div>
        <div className="mt-4 h-3 w-48 rounded bg-[var(--color-card-2)]" />
      </div>

      {/* CTA */}
      <div className="animate-pulse h-12 rounded-[var(--radius-2xl)] bg-[var(--color-card-2)]" />
    </div>
  );
}
