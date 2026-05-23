// TEMPORARY placeholder — Plan 09 replaces this with the full session-capable wrapper.
// This thin client component satisfies TypeScript and renders the carousel until
// AnimeCarouselExerciseSession is wired in Plan 09.
"use client";

import AnimeVocabCarousel from "./AnimeVocabCarousel";
import type { AnimeVocabItem } from "@/lib/db/queries";
import type { AnimeMetadata } from "@/lib/db/schema";

export default function AnimeVocabCarouselWrapper({
  words,
  animeMeta,
  locale,
}: {
  words: AnimeVocabItem[];
  animeMeta: AnimeMetadata | null;
  animeSlug: string;
  locale: string;
  userId: string | null;
}) {
  return <AnimeVocabCarousel words={words} animeMeta={animeMeta} locale={locale} />;
}
