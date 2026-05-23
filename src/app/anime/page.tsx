import { Suspense } from "react";
import { getAnimeCatalog } from "@/lib/db/queries";
import AnimeIndexGrid from "./components/AnimeIndexGrid";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = {
  title: "Anime Vocabulary | KitsuBeat",
  description:
    "Study vocabulary from your favorite anime series — organized by difficulty and tracked with spaced repetition.",
};

export default async function AnimePage() {
  const animes = await getAnimeCatalog();

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          Anime Vocabulary
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Study world-building vocabulary from iconic anime series, tracked
          with the same spaced repetition as your song lessons.
        </p>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <AnimeIndexGrid animes={animes} />
      </Suspense>
    </main>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}
