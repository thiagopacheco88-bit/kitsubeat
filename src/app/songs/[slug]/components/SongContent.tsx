"use client";

import { useState, lazy, Suspense, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Lesson } from "@/lib/types/lesson";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

const contentTabs = [
  { id: "vocabulary", label: "Words" },
  { id: "grammar", label: "Grammar" },
  { id: "practice", label: "Practice" },
] as const;

const jlptLevels = new Set(["N5", "N4", "N3", "N2", "N1"]);

function isJlptLevel(
  level: string | null,
): level is "N5" | "N4" | "N3" | "N2" | "N1" {
  return !!level && jlptLevels.has(level);
}

interface SongMeta {
  title: string;
  slug: string;
  artist: string;
  anime: string;
  season_info: string | null;
  jlpt_level: string | null;
  difficulty_tier: string | null;
  content_type?: "song" | "scene";
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
  songId,
  userId,
  activeType,
  setActiveType,
  hasMultiple,
  tvVersion,
  fullVersion,
}: SongContentInnerProps) {
  const { setForceMount } = usePlayer();
  const prefersReduced = useReducedMotion();

  const [activeTab, setActiveTab] = useState<ContentTab>("vocabulary");

  const active = activeType === "tv" && tvVersion ? tvVersion : fullVersion!;
  const dominatedCount = active.dominatedVerseNumbers?.length ?? 0;
  const totalVerseCount = active.totalVerses ?? active.lesson.verses.length;
  const practiceButtonLabel =
    activeTab === "practice" ? "Practice is open" : "Start practice";

  const activatePractice = () => {
    setActiveTab("practice");
  };

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
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-3 py-5 sm:px-4 lg:py-6">
      <header className="flex min-w-0 flex-col gap-4 border-b border-[var(--color-border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
            {song.content_type === "scene" ? "Now watching" : "Now playing"}
          </p>
          <h1 className="mt-1 break-words text-2xl font-bold text-[var(--color-text)] sm:text-3xl">
            {song.title}
          </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {song.content_type === "scene" ? (
            <>
              {song.anime}
              {song.season_info && (
                <span className="text-[var(--color-text-dim)]"> &middot; {song.season_info}</span>
              )}
            </>
          ) : (
            <>
              {song.artist} &middot; {song.anime}
              {song.season_info && (
                <span className="text-[var(--color-text-dim)]"> &middot; {song.season_info}</span>
              )}
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isJlptLevel(song.jlpt_level) && (
            <Badge variant="jlpt" level={song.jlpt_level}>
              {song.jlpt_level}
            </Badge>
          )}
          {song.difficulty_tier && (
            <Badge variant="mono" className="capitalize">
              {song.difficulty_tier}
            </Badge>
          )}
          <KnownWordCount songId={songId} />
          {/* Phase 11.6 D-16 — verses dominated counter. Sits in the header
              row alongside JLPT badge / difficulty pill / KnownWordCount.
              Hidden when totalVerses is 0 (defensive — should not happen on
              a published song). The leading star icon visually anchors the
              counter to the lyrics-view stars (same gold icon, deeper amber
              text on the counter so the lyrics stars stay brightest). */}
          {totalVerseCount > 0 && (
            <span
                className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-2 py-0.5 text-sm font-semibold text-[var(--color-jlpt-n3)]"
              data-testid="verses-counter"
            >
                <VerseStarIcon className="text-[var(--color-jlpt-n3)]" />
              {dominatedCount}/{totalVerseCount} verses
            </span>
          )}
        </div>
        </div>

        <Button
          type="button"
          onClick={activatePractice}
          disabled={activeTab === "practice"}
          data-testid="lesson-practice-gearshift"
          className="w-full sm:w-auto"
        >
          {practiceButtonLabel}
        </Button>
      </header>

      <div className="flex min-w-0 flex-col gap-3">
        {hasMultiple && (
          <div
            className="inline-flex w-full gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 sm:w-fit"
            role="group"
            aria-label="Song version"
          >
            <button
              onClick={() => setActiveType("tv")}
              className={`min-h-11 flex-1 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                activeType === "tv"
                  ? "bg-[var(--color-accent)] [color:white] shadow-[var(--shadow-button-red)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
              }`}
            >
              Anime Version
            </button>
            <button
              onClick={() => setActiveType("full")}
              className={`min-h-11 flex-1 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                activeType === "full"
                  ? "bg-[var(--color-accent)] [color:white] shadow-[var(--shadow-button-red)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-card-2)] hover:text-[var(--color-text)]"
              }`}
            >
              Full Version
            </button>
          </div>
        )}
        <PlayerControls />
      </div>

      {/* Lesson heading — tells first-time users the page itself is the lesson */}
      <section className="flex flex-col gap-1" aria-labelledby="lesson-stage-title">
        <h2
          id="lesson-stage-title"
          className="text-lg font-semibold text-[var(--color-text)]"
        >
          Listen, read, then shift into practice
        </h2>
        <p className="text-xs text-[var(--color-text-dim)]">
          Tap words in the lyrics for meaning, then use Practice when the verse is in your ears.
        </p>
      </section>

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
      <div ref={tabSectionRef} className="mx-auto mt-3 w-full max-w-3xl scroll-mt-16">
        {/* Tab bar */}
        <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]">
          {contentTabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`min-h-11 px-1 pb-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "border-b-2 border-[var(--color-accent)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {label}
              </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "vocabulary" && (
            <motion.div
              key="vocabulary"
              initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <VocabularySection vocabulary={active.lesson.vocabulary} />
            </motion.div>
          )}

          {activeTab === "grammar" && (
            <motion.div
              key="grammar"
              initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-12">
                <GrammarSection points={active.lesson.grammar_points} />
              </div>
            </motion.div>
          )}

          {activeTab === "practice" && (
            <motion.div
              key="practice"
              initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Suspense
                fallback={
                  <div className="flex flex-col gap-4 py-8 animate-pulse">
                    <div className="h-5 w-1/3 rounded bg-[var(--color-card-2)]" />
                    <div className="h-24 w-full rounded-lg bg-[var(--color-card-2)]" />
                    <div className="h-24 w-full rounded-lg bg-[var(--color-card-2)]" />
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
            </motion.div>
          )}
        </AnimatePresence>
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
