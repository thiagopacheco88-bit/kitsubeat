/**
 * __dev/states catalog — Phase 14 Plan 14-04 (D-15 + D-16).
 *
 * Renders 24 state cards covering every async surface in KitsuBeat
 * × {empty, loading, error}. Hidden in production via notFound() gate.
 *
 * 7 surfaces × 3 states = 21 cards, plus 3 song-page tab loadings
 * (Lesson / Practice / Drills) = 24 total.
 *
 * Threat T-14-04-01: gate must fail closed on env-set bug. The check is
 * an EXPLICIT === comparison against 'production'. If NEXT_PUBLIC_APP_ENV
 * is unset (dev or misconfigured prod), the gate is OPEN — but the route
 * only renders harmless mock UI (no real data, no secrets, no auth bypass)
 * so the worst case is an internal-looking page is publicly visible.
 * Mitigation accepted for Phase 14; revisited in Phase 16 IR audit.
 */
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

  // 7 async surfaces × 3 states (empty/loading/error) = 21,
  // plus 3 song-page tab loadings (Lesson / Practice / Drills) = 24 total.
  const surfaces: Surface[] = [
    { name: "/songs", states: ["empty", "loading", "error"] },
    { name: "/anime-list", states: ["empty", "loading", "error"] },
    { name: "/songs/[slug]", states: ["empty", "loading", "error"] },
    { name: "/path", states: ["empty", "loading", "error"] },
    { name: "/vocabulary", states: ["empty", "loading", "error"] },
    { name: "/review", states: ["empty", "loading", "error"] },
    { name: "/profile", states: ["empty", "loading", "error"] },
    // The 3 song-page tab loadings — counted separately per D-16
    { name: "/songs/[slug] Lesson", states: ["loading"] },
    { name: "/songs/[slug] Practice", states: ["loading"] },
    { name: "/songs/[slug] Drills", states: ["loading"] },
  ];

  // Loud assertion at render — fails fast if the hand-counted list drifts from 24.
  const total = surfaces.reduce((n, s) => n + s.states.length, 0);
  if (total !== 24) {
    throw new Error(`__dev/states: expected 24 cards, got ${total}`);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8">
      <h1 className="text-3xl font-bold mb-2">__dev / states catalog</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Phase 14 D-15 — 24 state cards across 7 async surfaces. Hidden in production.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surfaces.flatMap((surface) =>
          surface.states.map((state) => (
            <div
              key={`${surface.name}-${state}`}
              data-state-card={`${surface.name}-${state}`}
              className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-4 bg-[var(--color-card)]"
            >
              <p className="text-xs font-mono uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
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
          )),
        )}
      </div>
    </div>
  );
}
