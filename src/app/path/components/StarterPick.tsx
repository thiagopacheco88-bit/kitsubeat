"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { setStarterSong } from "@/app/actions/gamification";
import type { StarterSongRow } from "@/lib/gamification/starter-songs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

// Hardcoded vibe descriptors per slug — user-approved at Plan 03 decision checkpoint.
const VIBE_MAP: Record<string, string> = {
  "under-the-tree-sim": "Emotional & atmospheric",
  "misa-no-uta-aya-hirano": "Haunting & lyrical",
  "yume-wo-kanaete-doraemon-mao": "Upbeat & cheerful (N5 beginner-friendly)",
};

interface StarterPickProps {
  candidates: StarterSongRow[];
  userId: string;
}

/**
 * StarterPick — first-visit modal shown when current_path_node_slug IS NULL.
 *
 * Displays 3 starter song cards. Clicking "Start here" on one calls
 * setStarterSong (server action), then refreshes the page — which now
 * has current_path_node_slug set and renders PathMap instead.
 *
 * No XP/level/streak HUD here — user hasn't earned anything yet.
 * Warm onboarding tone only.
 *
 * Migration note (Phase 14-09 D-22 token-only swap): all palette utilities
 * (gray-700/-800/-900, blue-400, orange-600/-700) replaced with token vars.
 * The "Start here" CTA migrates from inline orange button to <Button
 * variant="primary"> primitive. The JLPT level pill migrates to
 * --color-jlpt-n4 token (the blue band). Card hover-border (previously the
 * orange palette utility) becomes hover:border-[var(--color-accent)] (red)
 * matching the primitive Button accent — Plan 14-07 LevelUpTakeover
 * orange-to-red precedent reused.
 */
export function StarterPick({ candidates, userId }: StarterPickProps) {
  const t = useTranslations('path');
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  // Phase 14.1 D-01 — when getStarterSongs() filtered all 3 slugs (DB drift),
  // render an EmptyState fallback rather than the empty 3-card layout.
  // Visual restyle of the populated branch is deferred per D-02; only this
  // empty-branch is added here.
  if (candidates.length === 0) {
    return (
      <EmptyState
        heading={t('moreSongsHeading')}
        body={t('moreSongsBody')}
        ctaLabel={t('exploreCatalog')}
        ctaHref="/songs"
        aria-label="No starter songs available"
        className="my-6"
      />
    );
  }

  async function handleSelect(slug: string) {
    if (selecting) return; // prevent double-tap
    setSelecting(slug);
    try {
      await setStarterSong(userId, slug);
      router.refresh();
    } catch (err) {
      console.error("[StarterPick] setStarterSong failed:", err);
      setSelecting(null);
    }
  }

  return (
    <div
      className="rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center"
      role="dialog"
      aria-label="Pick your starting song"
      data-testid="starter-pick-modal"
    >
      <div className="mb-2 text-3xl" aria-hidden="true">
        {"🦊"}
      </div>
      <h2 className="mb-1 text-xl font-bold text-[var(--color-text)]">
        Welcome to your Learning Path!
      </h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Pick a song that feels right for you. You can always come back and
        explore the rest of the catalog.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-center">
        {candidates.map((song) => {
          const vibe = VIBE_MAP[song.slug] ?? song.anime;
          const isSelecting = selecting === song.slug;
          const isDisabled = selecting !== null && !isSelecting;

          return (
            <div
              key={song.slug}
              className={`flex flex-col gap-3 rounded-[var(--radius-xl)] border p-4 text-left transition-opacity ${
                isDisabled
                  ? "border-[var(--color-border)] opacity-50"
                  : "border-[var(--color-border-strong)] bg-[var(--color-card-2)] hover:border-[var(--color-accent)]"
              } sm:flex-1 sm:max-w-[12.5rem]`}
            >
              {/* Thumbnail. Empty fallback uses card-2 token. */}
              {song.thumbnail_url ? (
                <img
                  src={song.thumbnail_url}
                  alt={`${song.title} thumbnail`}
                  className="w-full aspect-video rounded-[var(--radius-md)] object-cover"
                />
              ) : (
                <div className="w-full aspect-video rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
              )}

              <div className="flex-1">
                <p className="font-semibold text-[var(--color-text)] text-sm leading-snug">
                  {song.title}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {song.anime}
                </p>
                {song.jlpt_level && (
                  <p className="mt-1 text-xs text-[var(--color-jlpt-n4)] font-medium">
                    {song.jlpt_level.toUpperCase()}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--color-text-dim)] italic">
                  {vibe}
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void handleSelect(song.slug)}
                disabled={isDisabled || isSelecting}
                className="mt-auto w-full"
                data-testid={`starter-pick-${song.slug}`}
              >
                {isSelecting ? t('settingUp') : t('startHere')}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
