"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SongListItem } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import SongCard from "./SongCard";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const DIFFICULTY_TIERS = ["basic", "intermediate", "advanced"] as const;
const LANGUAGE_OPTIONS = [
  { value: "ja", label: "JA" },
  { value: "en", label: "EN" },
  { value: "pt", label: "PT" },
  { value: "es", label: "ES" },
] as const;

type ViewMode = "by-anime" | "all";

export default function SongGrid({
  songs,
  view,
  initialSearch = "",
}: {
  songs: SongListItem[];
  view: ViewMode;
  initialSearch?: string;
}) {
  const t = useTranslations("songs");
  const [search, setSearch] = useState(initialSearch);
  const [jlptFilter, setJlptFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const hasFilters =
    search !== "" || jlptFilter !== null || difficultyFilter !== null || languageFilter !== null;

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
    if (languageFilter) {
      result = result.filter((s) => s.language === languageFilter);
    }
    return result;
  }, [songs, search, jlptFilter, difficultyFilter, languageFilter]);

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
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-1 lg:order-last lg:ml-auto lg:w-auto">
            <Link
              href="/anime-list"
              className={`flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-colors lg:flex-none ${
                view === "by-anime"
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
              }`}
            >
              {t('view.anime')}
            </Link>
            <Link
              href="/songs"
              className={`flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-colors lg:flex-none ${
                view === "all"
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
              }`}
            >
              {t('view.songs')}
            </Link>
          </div>

          <input
            type="text"
            placeholder={t('filter.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-border-strong)] lg:w-72"
            suppressHydrationWarning
          />

          <div className="flex min-w-0 flex-wrap gap-1.5">
            {JLPT_LEVELS.map((level) => (
              <button
                suppressHydrationWarning
                key={level}
                onClick={() =>
                  setJlptFilter(jlptFilter === level ? null : level)
                }
                className={`min-h-11 rounded-[var(--radius-md)] px-3 text-xs font-semibold transition-colors ${
                  jlptFilter === level
                    ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                    : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-wrap gap-1.5">
            {DIFFICULTY_TIERS.map((tier) => (
              <button
                suppressHydrationWarning
                key={tier}
                onClick={() =>
                  setDifficultyFilter(difficultyFilter === tier ? null : tier)
                }
                className={`min-h-11 rounded-[var(--radius-md)] px-3 text-xs font-semibold transition-colors ${
                  difficultyFilter === tier
                    ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                    : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
                }`}
              >
                {t(`difficulty.${tier}`)}
              </button>
            ))}
          </div>

          {/* Language filter chips — identical pattern to JLPT/difficulty chips */}
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                suppressHydrationWarning
                key={option.value}
                onClick={() =>
                  setLanguageFilter(languageFilter === option.value ? null : option.value)
                }
                aria-pressed={languageFilter === option.value}
                className={`min-h-11 rounded-[var(--radius-md)] px-3 text-xs font-semibold transition-colors ${
                  languageFilter === option.value
                    ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                    : "bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setJlptFilter(null);
                setDifficultyFilter(null);
                setLanguageFilter(null);
              }}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              {t('filter.clear')}
            </button>
          )}
        </div>
      </div>

      <p className="px-1 text-sm text-[var(--color-text-dim)]">
        {filtered.length === 1 ? t('count.song', { n: filtered.length }) : t('count.songs', { n: filtered.length })}
        {view === "by-anime" && ` ${t('count.acrossAnime', { n: groupedByAnime.length })}`}
      </p>

      {view === "by-anime" && (
        <div className="flex min-w-0 flex-col gap-8">
          {groupedByAnime.map(([anime, animeSongs]) => (
            <section key={anime} className="min-w-0">
              <h3 className="mb-3 flex min-w-0 items-baseline gap-2 px-1 text-lg font-semibold text-[var(--color-text)]">
                <span className="truncate">{anime}</span>
                <span className="shrink-0 text-sm font-normal text-[var(--color-text-dim)]">
                  {animeSongs.length === 1 ? t('count.song', { n: animeSongs.length }) : t('count.songs', { n: animeSongs.length })}
                </span>
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin snap-x snap-mandatory">
                {animeSongs.map((song) => (
                  <div key={song.id} className="w-56 shrink-0 snap-start">
                    <SongCard song={song} difficultyLabel={song.difficulty_tier ? t(`difficulty.${song.difficulty_tier as 'basic' | 'intermediate' | 'advanced'}`) : undefined} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === "all" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} difficultyLabel={song.difficulty_tier ? t(`difficulty.${song.difficulty_tier as 'basic' | 'intermediate' | 'advanced'}`) : undefined} />
          ))}
        </div>
      )}

      {/* Language filter empty-state: shown when language filter active but no results (D-07) */}
      {languageFilter !== null && filtered.length === 0 && !search && !jlptFilter && !difficultyFilter && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[var(--color-text)] font-semibold">
            {t("empty.noLanguage.heading")}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("empty.noLanguage.body")}
          </p>
          <button
            onClick={() => setLanguageFilter(null)}
            className="min-h-11 rounded-[var(--radius-md)] px-4 text-sm font-semibold bg-[var(--color-card-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)] transition-colors"
          >
            {t("empty.noLanguage.cta")}
          </button>
        </div>
      )}

      {filtered.length === 0 && !(languageFilter !== null && !search && !jlptFilter && !difficultyFilter) && (
        <EmptyState
          heading={t('empty.noFilters.heading')}
          body={t('empty.noFilters.body')}
          className="my-12"
        />
      )}
    </div>
  );
}
