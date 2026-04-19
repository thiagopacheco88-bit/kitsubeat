import { getAllSongs } from "@/lib/db/queries";
import { PLACEHOLDER_USER_ID } from "@/lib/user-prefs";
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
  const songs = await getAllSongs(PLACEHOLDER_USER_ID);
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Anime List</h1>
      <SongGrid
        songs={songs}
        view="by-anime"
        initialSearch={params.search ?? ""}
      />
    </div>
  );
}
