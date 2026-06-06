import { getAllScenes } from "@/lib/db/queries";
import SceneGrid from "./SceneGrid";

export async function SceneGridLoader({
  userId,
  initialSearch,
}: {
  userId: string;
  initialSearch: string;
}) {
  const scenes = await getAllScenes(userId);
  return <SceneGrid scenes={scenes} initialSearch={initialSearch} />;
}
