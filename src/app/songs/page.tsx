import { getAllSongs } from "@/lib/db/queries";
import { getCurrentUserId } from "@/lib/user-prefs";
import SongGrid from "./components/SongGrid";

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
  const songs = await getAllSongs(userId);
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
        Songs
      </h1>
      <SongGrid songs={songs} view="all" initialSearch={params.search ?? ""} />
    </div>
  );
}
