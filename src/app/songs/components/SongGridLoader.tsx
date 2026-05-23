import { getAllSongs } from "@/lib/db/queries";
import SongGrid from "./SongGrid";

interface Props {
  userId: string;
  initialSearch: string;
  view: "all" | "by-anime";
}

export async function SongGridLoader({ userId, initialSearch, view }: Props) {
  const songs = await getAllSongs(userId, "ja");
  return <SongGrid songs={songs} view={view} initialSearch={initialSearch} />;
}
