"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStarterSong } from "@/app/actions/gamification";
import type { StarterSongRow } from "@/lib/gamification/starter-songs";

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
 */
export function StarterPick({ candidates, userId }: StarterPickProps) {
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

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
      className="rounded-2xl border border-gray-700 bg-gray-900 p-6 text-center"
      role="dialog"
      aria-label="Pick your starting song"
      data-testid="starter-pick-modal"
    >
      <div className="mb-2 text-3xl" aria-hidden="true">
        {"\uD83E\uDD8A"}
      </div>
      <h2 className="mb-1 text-xl font-bold text-white">
        Welcome to your Learning Path!
      </h2>
      <p className="mb-6 text-sm text-gray-400">
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
              className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-opacity ${
                isDisabled
                  ? "border-gray-700 opacity-50"
                  : "border-gray-600 bg-gray-800 hover:border-orange-500"
              } sm:flex-1 sm:max-w-[200px]`}
            >
              {/* Thumbnail */}
              {song.thumbnail_url ? (
                <img
                  src={song.thumbnail_url}
                  alt={`${song.title} thumbnail`}
                  className="w-full aspect-video rounded-lg object-cover"
                />
              ) : (
                <div className="w-full aspect-video rounded-lg bg-gray-700" />
              )}

              <div className="flex-1">
                <p className="font-semibold text-white text-sm leading-snug">
                  {song.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{song.anime}</p>
                {song.jlpt_level && (
                  <p className="mt-1 text-xs text-blue-400 font-medium">
                    {song.jlpt_level.toUpperCase()}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 italic">{vibe}</p>
              </div>

              <button
                type="button"
                onClick={() => void handleSelect(song.slug)}
                disabled={isDisabled || isSelecting}
                className="mt-auto w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid={`starter-pick-${song.slug}`}
              >
                {isSelecting ? "Setting up…" : "Start here"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
