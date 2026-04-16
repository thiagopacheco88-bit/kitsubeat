import { notFound } from "next/navigation";
import { getSongBySlug } from "@/lib/db/queries";
import type { Lesson } from "@/lib/types/lesson";
import SongContent from "./components/SongContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song Not Found | KitsuBeat" };
  return { title: `${song.title} - ${song.artist} | KitsuBeat` };
}

export default async function SongPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  // Build version data — only include versions that have a lesson
  const versions = song.versions
    .filter((v) => v.lesson)
    .map((v) => ({
      id: v.id,
      type: v.version_type as "tv" | "full",
      youtube_id: v.youtube_id,
      lesson: v.lesson as Lesson,
      synced_lrc: v.synced_lrc as { startMs: number; text: string }[] | null,
    }));

  if (versions.length === 0) notFound();

  return (
    <SongContent
      song={{
        title: song.title,
        slug: song.slug,
        artist: song.artist,
        anime: song.anime,
        season_info: song.season_info,
        jlpt_level: song.jlpt_level,
        difficulty_tier: song.difficulty_tier,
      }}
      versions={versions}
    />
  );
}
