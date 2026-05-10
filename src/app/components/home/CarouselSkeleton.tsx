/**
 * CarouselSkeleton — Suspense fallback for home page song carousels.
 * Matches the visual footprint of SectionHeader + Carousel + 6 CoverCards.
 */
export function CarouselSkeleton() {
  return (
    <div className="pb-8 animate-pulse">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-3 px-4">
        <div className="flex items-baseline gap-2">
          <div className="h-5 w-12 rounded bg-[var(--color-card-2)]" />
          <div className="h-6 w-36 rounded bg-[var(--color-card-2)]" />
        </div>
      </div>
      {/* Cards row */}
      <div className="flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
            style={{ width: 154, height: 196 }}
          >
            <div className="bg-[var(--color-card-2)]" style={{ height: 116 }} />
            <div className="p-2 flex flex-col gap-1.5">
              <div className="h-3 w-4/5 rounded bg-[var(--color-card-2)]" />
              <div className="h-3 w-3/5 rounded bg-[var(--color-card-2)]" />
              <div className="h-4 w-10 rounded-full bg-[var(--color-card-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
