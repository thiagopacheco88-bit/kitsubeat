import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/user-prefs";
import { SongGridLoader } from "./components/SongGridLoader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Songs | KitsuBeat",
};

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const userId = await getCurrentUserId();
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Catalog
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Songs
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Browse openings, endings, and full tracks by level, difficulty, artist, or anime.
        </p>
      </header>
      <Suspense fallback={
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
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
      }>
        <SongGridLoader userId={userId} initialSearch={params.search ?? ""} view="all" />
      </Suspense>
    </div>
  );
}
