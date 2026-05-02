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
  searchParams: Promise<{ search?: string }>;
}) {
  const songs = await getAllSongs(PLACEHOLDER_USER_ID);
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
