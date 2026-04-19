"use client";

import { useState, lazy, Suspense, useRef, useEffect } from "react";
import type { Lesson } from "@/lib/types/lesson";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";
import { PlayerProvider } from "./PlayerContext";
import YouTubeEmbed from "./YouTubeEmbed";
import PlayerControls from "./PlayerControls";
import LyricsPanel from "./LyricsPanel";
import VocabularySection from "./VocabularySection";
import GrammarSection from "./GrammarSection";
import SongLayout from "./SongLayout";
import KnownWordCount from "./KnownWordCount";

// Lazy-load exercise tab — avoids bundling exercise code until Practice is clicked
const ExerciseTab = lazy(() => import("./ExerciseTab"));

interface SongMeta {
  title: string;
  slug: string;
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
  songId,
  initialKnown,
}: {
  song: SongMeta;
  versions: VersionData[];
  songId: string;
  initialKnown: { total: number; known: number; mastered: number; learning: number };
}) {
  // TV is only a usable version if it has synced_lrc — without it the lyrics
  // panel sits frozen because LyricsPanel.buildVerseTiming has no timeline to
  // match verses against. Every current TV row has synced_lrc=null (WhisperX
  // was only run for full cuts), so default to full and hide the toggle until
  // the TV WhisperX batch lands. When TV sync data exists, the old default
  // "TV first" behavior kicks back in automatically.
  const fullVersion = versions.find((v) => v.type === "full");
  const tvVersionRaw = versions.find((v) => v.type === "tv");
  const tvVersion =
    tvVersionRaw && tvVersionRaw.synced_lrc && tvVersionRaw.synced_lrc.length > 0
      ? tvVersionRaw
      : undefined;
  const hasMultiple = versions.length > 1 && !!tvVersion;

  const [activeType, setActiveType] = useState<"tv" | "full">(
    tvVersion ? "tv" : "full"
  );
  const [activeTab, setActiveTab] = useState<ContentTab>("vocabulary");

  const active = activeType === "tv" && tvVersion ? tvVersion : fullVersion!;

  // Scroll the tabbed section into view on tab activation (skip first render
  // so the user still lands at the top of the page).
  const tabSectionRef = useRef<HTMLDivElement>(null);
  const isFirstTabRender = useRef(true);
  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false;
      return;
    }
    tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab]);

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
            <KnownWordCount songId={songId} initial={initialKnown} />
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

        {/* Lesson heading — tells first-time users the page itself is the lesson */}
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">Lesson</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Tap any word in the lyrics for meaning. Explore Vocabulary, Grammar, and Practice below.
          </p>
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
        <div ref={tabSectionRef} className="mx-auto mt-8 max-w-3xl scroll-mt-16">
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
                songSlug={song.slug}
                userId="anonymous"
              />
            </Suspense>
          )}
        </div>
      </div>
    </PlayerProvider>
  );
}
