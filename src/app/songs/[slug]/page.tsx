import { notFound } from "next/navigation";
import { getSongBySlug } from "@/lib/db/queries";
import type { Lesson } from "@/lib/types/lesson";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";
import { PlayerProvider } from "./components/PlayerContext";
import YouTubeEmbed from "./components/YouTubeEmbed";
import PlayerControls from "./components/PlayerControls";
import LyricsPanel from "./components/LyricsPanel";
import VocabularySection from "./components/VocabularySection";
import GrammarSection from "./components/GrammarSection";

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
  if (!song || !song.lesson) notFound();

  const lesson = song.lesson as Lesson;

  return (
    <PlayerProvider>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">{song.title}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {song.artist} &middot; {song.anime}
            {song.season_info && (
              <span className="text-gray-500"> &middot; {song.season_info}</span>
            )}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {song.jlpt_level && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold text-white ${JLPT_COLOR_CLASS[song.jlpt_level] ?? "bg-gray-600"}`}
              >
                {song.jlpt_level}
              </span>
            )}
            {song.difficulty_tier && (
              <span className="rounded bg-gray-800 px-2 py-0.5 text-xs capitalize text-gray-400">
                {song.difficulty_tier}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4">
          <PlayerControls />
        </div>

        {/* Main content: video left + lyrics right on desktop */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Left: Video */}
          <div className="lg:w-[55%] lg:shrink-0">
            {song.youtube_id && (
              <YouTubeEmbed
                videoId={song.youtube_id}
                videoIdShort={song.youtube_id_short}
              />
            )}
          </div>

          {/* Right: Lyrics panel (scrollable on desktop) */}
          <div className="lg:w-[45%] lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">
            <h2 className="mb-3 text-lg font-semibold text-white lg:sticky lg:top-0 lg:z-10 lg:bg-gray-950 lg:pb-2">
              Lyrics
            </h2>
            <LyricsPanel
            verses={lesson.verses}
            syncedLrc={song.synced_lrc as { startMs: number; text: string }[] | null}
          />
          </div>
        </div>

        {/* Vocabulary & Grammar: full-width centered below the player */}
        <div className="mx-auto mt-8 max-w-3xl">
          <VocabularySection vocabulary={lesson.vocabulary} />
          <div className="mt-6 mb-12">
            <GrammarSection points={lesson.grammar_points} />
          </div>
        </div>
      </div>
    </PlayerProvider>
  );
}
