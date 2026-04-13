import { getAllSongs } from "@/lib/db/queries";
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
  const songs = await getAllSongs();
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
