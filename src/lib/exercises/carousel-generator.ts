/**
 * carousel-generator.ts — builds Question[] from anime vocab for carousel sessions.
 *
 * Key differences from generator.ts:
 * - No verse references, no example_from_song context
 * - Distractor pool = other words in the SAME anime (not global JLPT pool)
 * - Exercise types: vocab_meaning + meaning_vocab only
 * - Output shape: identical to buildQuestions — downstream components unchanged
 */

import { pickDistractors, shuffle } from "./generator";
import type { ExerciseType, Question, VocabInfo } from "./generator";
import type { VocabEntry } from "@/lib/types/lesson";
import type { AnimeVocabItem } from "@/lib/db/queries";

// ── Adapter: AnimeVocabItem → VocabEntry (shape pickDistractors expects) ─────

function asVocabEntry(word: AnimeVocabItem): VocabEntry {
  return {
    vocab_item_id: word.vocab_item_id,
    surface: word.surface,
    reading: word.reading,
    romaji: word.romaji,
    meaning: word.meaning as { en: string; "pt-BR"?: string; es?: string },
    jlpt_level: word.jlpt_level as VocabEntry["jlpt_level"],
    part_of_speech: "noun",
    example_from_song: "",
    additional_examples: [],
  };
}

// ── Question builder ──────────────────────────────────────────────────────────

const CAROUSEL_EXERCISE_TYPES: ExerciseType[] = ["vocab_meaning", "meaning_vocab"];

/**
 * Builds a shuffled, capped Question[] from anime vocab words.
 *
 * @param words  - All words for the anime (or filtered subset by JLPT/category)
 * @param locale - Locale for meaning display: "en" | "pt-BR" | "es"
 * @param cap    - Maximum questions to return (default 20)
 */
export function buildAnimeCarouselQuestions(
  words: AnimeVocabItem[],
  locale: string = "en",
  cap = 20
): Question[] {
  if (words.length === 0) return [];

  const pool = words.map(asVocabEntry);
  const questions: Question[] = [];

  for (const word of words) {
    const entry = asVocabEntry(word);

    for (const type of CAROUSEL_EXERCISE_TYPES) {
      // pickDistractors: sameSongPool = whole anime pool; jlptPool = [] (no global fallback)
      const distractors = pickDistractors(entry, type, pool, []);

      let prompt: string;
      let correctAnswer: string;

      if (type === "vocab_meaning") {
        prompt = word.surface;
        correctAnswer = word.meaning[locale] ?? word.meaning["en"] ?? "";
      } else {
        // meaning_vocab
        prompt = word.meaning[locale] ?? word.meaning["en"] ?? "";
        correctAnswer = word.surface;
      }

      const vocabInfo: VocabInfo = {
        surface: word.surface,
        reading: word.reading,
        romaji: word.romaji,
        vocab_item_id: word.vocab_item_id,
      };

      const question: Question = {
        id: crypto.randomUUID(),
        vocabItemId: word.vocab_item_id,
        vocabInfo,
        type,
        prompt,
        correctAnswer,
        distractors,
        explanation:
          word.context_note ??
          `${word.surface} (${word.romaji}) means "${correctAnswer}".`,
        jlpt_level: word.jlpt_level as Question["jlpt_level"],
        meaning_en: word.meaning["en"],
      };

      questions.push(question);
    }
  }

  return shuffle(questions).slice(0, cap);
}
