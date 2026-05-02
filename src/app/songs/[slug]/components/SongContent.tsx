"use client";

import { useState, lazy, Suspense, useRef, useEffect } from "react";
import type { Lesson } from "@/lib/types/lesson";
import { JLPT_COLOR_CLASS } from "@/lib/types/lesson";
import { PlayerProvider, usePlayer } from "./PlayerContext";
import YouTubeEmbed from "./YouTubeEmbed";
import PlayerControls from "./PlayerControls";
import LyricsPanel from "./LyricsPanel";
import VocabularySection from "./VocabularySection";
import GrammarSection from "./GrammarSection";
import SongLayout from "./SongLayout";
import KnownWordCount from "./KnownWordCount";
import VerseStarIcon from "./VerseStarIcon";

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
  lyrics_offset_ms: number;
  /** Phase 11.6 SPEC-REQ-16: computed at SSR; hides Kanji card on all-kana songs */
  hasKanjiBearingVocab?: boolean;
  /**
   * Phase 11.6 SPEC-REQ-11: per-track progress percentages (0–100) from
   * user_song_progress. Loaded at SSR. Defaults to all-zero if not provided.
   */
  trackPcts?: { vocab: number; grammar: number; kanji: number };
  /**
   * Phase 11.6 SPEC-REQ-10: Advanced Drills unlock flag.
   * True when advanced_drills_unlocked_at IS NOT NULL in user_song_progress.
   */
  advancedDrillsUnlocked?: boolean;
  /**
   * Phase 11.6 SPEC-REQ-14: SSR-loaded list of verse numbers the current
   * user has dominated on this version. Drives the gold star next to
   * dominated verses (LyricsPanel → VerseBlock) and the header counter
   * (X/Y verses). Empty array for unauthenticated / no-progress callers.
   */
  dominatedVerseNumbers?: number[];
  /**
   * Phase 11.6 SPEC-REQ-14: total verse count for this version (denominator
   * of the X/Y counter). Sourced from lesson.verses.length at SSR.
   */
  totalVerses?: number;
}

type ContentTab = "vocabulary" | "grammar" | "practice";

interface SongContentInnerProps {
  song: SongMeta;
  versions: VersionData[];
  songId: string;
  userId: string;
  activeType: "tv" | "full";
  setActiveType: (t: "tv" | "full") => void;
  hasMultiple: boolean;
  tvVersion: VersionData | undefined;
  fullVersion: VersionData | undefined;
}

/**
 * SongContentInner — lives inside <PlayerProvider> so it can call usePlayer().
 *
 * Phase 13 D-08: `setForceMount` is consumed here to force-mount the YouTube
 * iframe when the user opens the Practice tab, keeping Listening Drill (EXER-06)
 * working without manual scroll.
 *
 * All state that was previously in SongContent and depends on `usePlayer()` (only
 * the Practice-tab trigger) is now correctly scoped inside the provider boundary.
 * activeType / setActiveType are kept lifted in SongContent so the
 * `<PlayerProvider key={activeType}>` remount resets forceMount via fresh useState.
 */
function SongContentInner({
  song,
  versions,
  songId,
  userId,
  activeType,
  setActiveType,
  hasMultiple,
  tvVersion,
  fullVersion,
}: SongContentInnerProps) {
  const { setForceMount } = usePlayer();

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
    // Phase 13 D-08: force-mount the iframe when Practice tab opens so the
    // Listening Drill (EXER-06) works without the user having to scroll to the
    // video first. setForceMount(true) short-circuits the IntersectionObserver
    // gate inside YouTubeEmbed.
    if (activeTab === "practice") {
      setForceMount(true);
    }
    tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab, setForceMount]);

  return (
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
          <KnownWordCount songId={songId} />
          {/* Phase 11.6 D-16 — verses dominated counter. Sits in the header
              row alongside JLPT badge / difficulty pill / KnownWordCount.
              Hidden when totalVerses is 0 (defensive — should not happen on
              a published song). The leading star icon visually anchors the
              counter to the lyrics-view stars (same gold icon, deeper amber
              text on the counter so the lyrics stars stay brightest). */}
          {(active.totalVerses ?? 0) > 0 && (
            <span
              className="inline-flex items-center text-amber-500 text-sm"
              data-testid="verses-counter"
            >
              <VerseStarIcon className="text-amber-500" />
              {(active.dominatedVerseNumbers?.length ?? 0)}/{active.totalVerses} verses
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
            <YouTubeEmbed
              videoId={active.youtube_id}
              songVersionId={active.id}
            />
          ) : null
        }
        lyrics={
          <LyricsPanel
            verses={active.lesson.verses}
            syncedLrc={active.synced_lrc}
            offsetMs={active.lyrics_offset_ms}
            dominatedVerseNumbers={active.dominatedVerseNumbers ?? []}
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
              userId={userId}
              hasKanjiBearingVocab={active.hasKanjiBearingVocab ?? true}
              trackPcts={active.trackPcts ?? { vocab: 0, grammar: 0, kanji: 0 }}
              advancedDrillsUnlocked={active.advancedDrillsUnlocked ?? false}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function SongContent({
  song,
  versions,
  songId,
  userId,
}: {
  song: SongMeta;
  versions: VersionData[];
  songId: string;
  /** Resolved by getCurrentUserId() in page.tsx (Clerk userId or placeholder) */
  userId: string;
}) {
  // TV version is usable if it has a lesson with verse timing — LyricsPanel
  // falls back to verse start_time_ms/end_time_ms when synced_lrc is absent.
  const fullVersion = versions.find((v) => v.type === "full");
  const tvVersionRaw = versions.find((v) => v.type === "tv");
  const tvVersion =
    tvVersionRaw && tvVersionRaw.lesson?.verses?.length > 0
      ? tvVersionRaw
      : undefined;
  const hasMultiple = versions.length > 1 && !!tvVersion;

  // activeType is lifted here (not in SongContentInner) so that
  // <PlayerProvider key={activeType}> remounts cleanly on version toggle,
  // which resets forceMount via fresh useState(false) inside the provider.
  const [activeType, setActiveType] = useState<"tv" | "full">(
    tvVersion ? "tv" : "full"
  );

  return (
    <PlayerProvider key={activeType}>
      <SongContentInner
        song={song}
        versions={versions}
        songId={songId}
        userId={userId}
        activeType={activeType}
        setActiveType={setActiveType}
        hasMultiple={hasMultiple}
        tvVersion={tvVersion}
        fullVersion={fullVersion}
      />
    </PlayerProvider>
  );
}
