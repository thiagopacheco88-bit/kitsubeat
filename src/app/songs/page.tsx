import { getAllSongs } from "@/lib/db/queries";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
import SongGrid from "./components/SongGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Songs | KitsuBeat",
};

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; search?: string }>;
}) {
  // Phase 10 Plan 07 — thread userId so getAllSongs joins user_song_progress
  // and returns ex1_2_3 / ex4 / ex5 / ex6 / ex7 best_accuracy fields.
  // Unauthenticated callers (userId omitted / null) get null accuracy fields
  // → SongCard renders with no ribbon, no badge, no stars.
  const songs = await getAllSongs(PLACEHOLDER_USER_ID);
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-white">Songs</h1>
      <p className="mb-6 text-sm text-gray-400">
        Browse anime OP/ED songs and learn Japanese through music.
      </p>
      <SongGrid
        songs={songs}
        initialView={params.view === "all" ? "all" : "by-anime"}
        initialSearch={params.search ?? ""}
      />
    </div>
  );
}
