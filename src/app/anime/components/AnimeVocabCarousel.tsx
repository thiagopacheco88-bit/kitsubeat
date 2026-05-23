"use client";

import { useState, useMemo } from "react";
import type { AnimeVocabItem } from "@/lib/db/queries";
import type { AnimeMetadata } from "@/lib/db/schema";
import type { Question } from "@/lib/exercises/generator";
import { buildAnimeCarouselQuestions } from "@/lib/exercises/carousel-generator";
import VocabWordCard from "./VocabWordCard";
import JlptFilterBar, { type JlptFilter } from "./JlptFilterBar";
import CategoryTabBar from "./CategoryTabBar";

interface AnimeVocabCarouselProps {
  words: AnimeVocabItem[];
  animeMeta: AnimeMetadata | null;
  locale: string;
  // onStartPractice is called with the built questions when user clicks "Practice these words"
  // This prop is provided by the page; Plan 09 wires the actual session component
  onStartPractice?: (questions: Question[]) => void;
}

export default function AnimeVocabCarousel({
  words,
  animeMeta,
  locale,
  onStartPractice,
}: AnimeVocabCarouselProps) {
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Derive distinct categories from the full word set (not filtered)
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const w of words) seen.add(w.category);
    return Array.from(seen).sort();
  }, [words]);

  // Apply filters client-side
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const jlptMatch =
        jlptFilter === "All" ||
        (jlptFilter === "Anime-specific"
          ? w.jlpt_level === null
          : w.jlpt_level === jlptFilter);
      const catMatch = categoryFilter === "All" || w.category === categoryFilter;
      return jlptMatch && catMatch;
    });
  }, [words, jlptFilter, categoryFilter]);

  function handlePractice() {
    if (!onStartPractice) return;
    const questions = buildAnimeCarouselQuestions(filteredWords, locale, 20);
    onStartPractice(questions);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Anime header info */}
      {animeMeta && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[var(--color-text-muted)]">
            {filteredWords.length} of {words.length} words shown
          </p>
        </div>
      )}

      {/* JLPT filter chips */}
      <JlptFilterBar selected={jlptFilter} onChange={setJlptFilter} />

      {/* Category tabs */}
      <CategoryTabBar
        categories={categories}
        selected={categoryFilter}
        onChange={setCategoryFilter}
      />

      {/* Practice CTA */}
      {filteredWords.length > 0 && onStartPractice && (
        <button
          onClick={handlePractice}
          className="self-start rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90 transition-opacity"
        >
          Practice these words ({Math.min(filteredWords.length * 2, 20)} questions)
        </button>
      )}

      {/* Word grid */}
      {filteredWords.length === 0 ? (
        <p className="text-center text-[var(--color-text-muted)] py-12">
          No words match the current filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWords.map((word) => (
            <VocabWordCard key={word.vocab_item_id} word={word} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
