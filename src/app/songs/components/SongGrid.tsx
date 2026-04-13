"use client";

import { useState, useMemo } from "react";
import type { SongListItem } from "@/lib/db/queries";
import SongCard from "./SongCard";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const DIFFICULTY_TIERS = ["basic", "intermediate", "advanced"] as const;

type ViewMode = "by-anime" | "all";

export default function SongGrid({
  songs,
  initialView = "by-anime",
  initialSearch = "",
}: {
  songs: SongListItem[];
  initialView?: ViewMode;
  initialSearch?: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [search, setSearch] = useState(initialSearch);
  const [jlptFilter, setJlptFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = songs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.anime.toLowerCase().includes(q)
      );
    }
    if (jlptFilter) {
      result = result.filter((s) => s.jlpt_level === jlptFilter);
    }
    if (difficultyFilter) {
      result = result.filter((s) => s.difficulty_tier === difficultyFilter);
    }
    return result;
  }, [songs, search, jlptFilter, difficultyFilter]);

  const groupedByAnime = useMemo(() => {
    const groups = new Map<string, SongListItem[]>();
    for (const song of filtered) {
      const anime = song.anime;
      if (!groups.has(anime)) groups.set(anime, []);
      groups.get(anime)!.push(song);
    }
    return Array.from(groups.entries()).sort(
      ([, a], [, b]) => b.length - a.length
    );
  }, [filtered]);

  return (
    <div>
      {/* View mode tabs */}
      <div className="mb-4 flex gap-1">
        <button
          onClick={() => setViewMode("by-anime")}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "by-anime"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          By Anime
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "all"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          All Songs
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search songs, artists, anime..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
        />
        <div className="flex gap-1">
          {JLPT_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() =>
                setJlptFilter(jlptFilter === level ? null : level)
              }
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                jlptFilter === level
                  ? "bg-white text-gray-900"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {DIFFICULTY_TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() =>
                setDifficultyFilter(difficultyFilter === tier ? null : tier)
              }
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
                difficultyFilter === tier
                  ? "bg-white text-gray-900"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        {filtered.length} song{filtered.length !== 1 ? "s" : ""}
        {viewMode === "by-anime" &&
          ` across ${groupedByAnime.length} anime`}
      </p>

      {/* By anime — horizontal carousels */}
      {viewMode === "by-anime" && (
        <div className="flex flex-col gap-8">
          {groupedByAnime.map(([anime, animeSongs]) => (
            <div key={anime}>
              <h3 className="mb-3 flex items-baseline gap-2 text-lg font-semibold text-white">
                {anime}
                <span className="text-sm font-normal text-gray-500">
                  {animeSongs.length} song{animeSongs.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin snap-x snap-mandatory">
                {animeSongs.map((song) => (
                  <div key={song.id} className="w-56 shrink-0 snap-start">
                    <SongCard song={song} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All songs flat grid */}
      {viewMode === "all" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-12 text-center text-gray-500">
          No songs match your filters.
        </p>
      )}
    </div>
  );
}
