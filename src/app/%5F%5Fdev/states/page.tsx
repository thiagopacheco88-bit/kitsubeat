import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type SurfaceState = "empty" | "loading" | "error";

interface Surface {
  name: string;
  states: SurfaceState[];
}

export default function DevStatesPage() {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") notFound();

  const surfaces: Surface[] = [
    { name: "/songs", states: ["empty", "loading", "error"] },
    { name: "/anime-list", states: ["empty", "loading", "error"] },
    { name: "/songs/[slug]", states: ["empty", "loading", "error"] },
    { name: "/path", states: ["empty", "loading", "error"] },
    { name: "/vocabulary", states: ["empty", "loading", "error"] },
    { name: "/review", states: ["empty", "loading", "error"] },
    { name: "/profile", states: ["empty", "loading", "error"] },
    { name: "/songs/[slug] Lesson", states: ["loading"] },
    { name: "/songs/[slug] Practice", states: ["loading"] },
    { name: "/songs/[slug] Drills", states: ["loading"] },
  ];

  const total = surfaces.reduce((n, s) => n + s.states.length, 0);
  if (total !== 24) {
    throw new Error(`__dev/states: expected 24 cards, got ${total}`);
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-6 text-[var(--color-text)] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
            Dev
          </p>
          <h1 className="mt-1 text-3xl font-bold">__dev / states catalog</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Phase 14 D-15: 24 state cards across 7 async surfaces. Hidden in
            production.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {surfaces.flatMap((surface) =>
            surface.states.map((state) => (
              <div
                key={`${surface.name}-${state}`}
                data-state-card={`${surface.name}-${state}`}
                className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card-ring)]"
              >
                <p className="mb-3 text-xs font-mono uppercase tracking-wide text-[var(--color-text-muted)]">
                  {surface.name} / {state}
                </p>
                {state === "loading" && <Skeleton variant="card" />}
                {state === "empty" && (
                  <EmptyState
                    heading={`Nothing in ${surface.name} yet`}
                    body="This is the empty state for this surface."
                    ctaLabel="Browse"
                    ctaHref="/"
                  />
                )}
                {state === "error" && (
                  <EmptyState
                    variant="error"
                    heading="Something went wrong"
                    body={`Failed to load ${surface.name}.`}
                    ctaLabel="Try again"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
