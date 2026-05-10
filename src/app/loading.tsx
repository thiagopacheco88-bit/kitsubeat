export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Hero */}
      <div className="animate-pulse mb-8 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="aspect-video w-full bg-[var(--color-card-2)] sm:aspect-[21/9]" />
        <div className="p-5 sm:p-6 flex flex-col gap-3">
          <div className="h-3 w-20 rounded bg-[var(--color-card-2)]" />
          <div className="h-8 w-64 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-40 rounded bg-[var(--color-card-2)]" />
          <div className="mt-2 h-11 w-40 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Foundations */}
      <div className="animate-pulse mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-24 rounded bg-[var(--color-card-2)]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col gap-2">
              <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--color-card-2)]" />
              <div className="h-3 w-full rounded bg-[var(--color-card-2)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Browse by Anime carousel */}
      <div className="animate-pulse mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-40 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-24 rounded bg-[var(--color-card-2)]" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36 sm:w-44 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="aspect-square w-full bg-[var(--color-card-2)]" />
              <div className="p-3 flex flex-col gap-1.5">
                <div className="h-4 w-4/5 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--color-card-2)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Songs carousel */}
      <div className="animate-pulse pb-12">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-36 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-24 rounded bg-[var(--color-card-2)]" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36 sm:w-44 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="aspect-square w-full bg-[var(--color-card-2)]" />
              <div className="p-3 flex flex-col gap-1.5">
                <div className="h-4 w-4/5 rounded bg-[var(--color-card-2)]" />
                <div className="h-3 w-3/5 rounded bg-[var(--color-card-2)]" />
                <div className="h-4 w-10 rounded-full bg-[var(--color-card-2)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
