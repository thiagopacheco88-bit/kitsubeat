"use client";

import { useState, lazy, Suspense } from "react";
import type { Lesson } from "@/lib/types/lesson";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";
import { PlayerProvider } from "./PlayerContext";
import YouTubeEmbed from "./YouTubeEmbed";
import PlayerControls from "./PlayerControls";
import LyricsPanel from "./LyricsPanel";
import VocabularySection from "./VocabularySection";
import GrammarSection from "./GrammarSection";
import SongLayout from "./SongLayout";

// Lazy-load exercise tab — avoids bundling exercise code until Practice is clicked
const ExerciseTab = lazy(() => import("./ExerciseTab"));

interface SongMeta {
  title: string;
  artist: string;
  anime: string;
  season_info: string | null;
  jlpt_level: string | null;
  difficulty_tier: string | null;
}

interface VersionData {
  id: string;
  type: "tv" | "full";
  youtube_id: string | null;
  lesson: Lesson;
  synced_lrc: { startMs: number; text: string }[] | null;
}

type ContentTab = "vocabulary" | "grammar" | "practice";

export default function SongContent({
  song,
  versions,
}: {
  song: SongMeta;
  versions: VersionData[];
}) {
  // Default to TV version if available, otherwise full
  const tvVersion = versions.find((v) => v.type === "tv");
  const fullVersion = versions.find((v) => v.type === "full");
  const hasMultiple = versions.length > 1;

  const [activeType, setActiveType] = useState<"tv" | "full">(
    tvVersion ? "tv" : "full"
  );
  const [activeTab, setActiveTab] = useState<ContentTab>("vocabulary");

  const active = activeType === "tv" && tvVersion ? tvVersion : fullVersion!;

  return (
    <PlayerProvider key={activeType}>
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

        {/* Version toggle + controls */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {hasMultiple && (
            <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
              <button
                onClick={() => setActiveType("tv")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeType === "tv"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Anime Version
              </button>
              <button
                onClick={() => setActiveType("full")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeType === "full"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Full Version
              </button>
            </div>
          )}
          <PlayerControls />
        </div>

        {/* Main content: video + lyrics */}
        <SongLayout
          video={
            active.youtube_id ? (
              <YouTubeEmbed videoId={active.youtube_id} />
            ) : null
          }
          lyrics={
            <LyricsPanel
              verses={active.lesson.verses}
              syncedLrc={active.synced_lrc}
            />
          }
        />

        {/* Tabbed section: Vocabulary / Grammar / Practice */}
        <div className="mx-auto mt-8 max-w-3xl">
          {/* Tab bar */}
          <div className="mb-6 flex border-b border-gray-800">
            {(["vocabulary", "grammar", "practice"] as ContentTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`mr-6 pb-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-red-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Tab content */}
          {activeTab === "vocabulary" && (
            <VocabularySection vocabulary={active.lesson.vocabulary} />
          )}

          {activeTab === "grammar" && (
            <div className="mb-12">
              <GrammarSection points={active.lesson.grammar_points} />
            </div>
          )}

          {activeTab === "practice" && (
            <Suspense
              fallback={
                <div className="flex flex-col gap-4 py-8 animate-pulse">
                  <div className="h-5 w-1/3 rounded bg-gray-800" />
                  <div className="h-24 w-full rounded-lg bg-gray-800" />
                  <div className="h-24 w-full rounded-lg bg-gray-800" />
                </div>
              }
            >
              <ExerciseTab
                lesson={active.lesson}
                songVersionId={active.id}
              />
            </Suspense>
          )}
        </div>
      </div>
    </PlayerProvider>
  );
}
