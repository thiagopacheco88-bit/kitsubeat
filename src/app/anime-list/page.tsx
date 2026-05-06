import { getAllSongs } from "@/lib/db/queries";
import { getCurrentUserId } from "@/lib/user-prefs";
import SongGrid from "../songs/components/SongGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Anime List | KitsuBeat",
};

export default async function AnimeListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const userId = await getCurrentUserId();
  const songs = await getAllSongs(userId);
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Anime index
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          Browse by Anime
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Pick a series, then jump into the songs attached to it.
        </p>
      </header>
      <SongGrid
        songs={songs}
        view="by-anime"
        initialSearch={params.search ?? ""}
      />
    </div>
  );
}
