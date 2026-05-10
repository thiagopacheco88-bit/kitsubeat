import { getAllSongs } from "@/lib/db/queries";
import { getStarterSongs } from "@/lib/gamification/starter-songs";
import { PathMap } from "./PathMap";
import { StarterPick } from "./StarterPick";

interface Props {
  userId: string;
  currentNodeSlug: string | null;
}

export async function PathBody({ userId, currentNodeSlug }: Props) {
  const [songs, starterCandidates] = await Promise.all([
    getAllSongs(userId),
    currentNodeSlug === null ? getStarterSongs() : Promise.resolve(null),
  ]);

  if (starterCandidates !== null) {
    return <StarterPick candidates={starterCandidates} userId={userId} />;
  }
  return <PathMap songs={songs} currentNodeSlug={currentNodeSlug ?? ""} />;
}
