import type { VocabEntry } from "@/lib/types/lesson";
import type { VocabRow } from "@/app/api/review/queue/route";
// pickDistractors is imported from "@/lib/exercises/generator" elsewhere;
// VocabEntry itself is canonically exported from "@/lib/types/lesson".

/**
 * Adapts a VocabRow (from the /api/review/queue endpoint) to the VocabEntry
 * shape consumed by pickDistractors.
 *
 * Only distractor-relevant fields are populated; example_from_song and
 * additional_examples get safe defaults because pickDistractors does not read
 * them. Mirrors the pattern in ExerciseTab.tsx lines 134-149.
 */
export function vocabRowToVocabEntry(row: VocabRow): VocabEntry {
  return {
    surface: row.dictionary_form,
    reading: row.reading,
    romaji: row.romaji,
    part_of_speech: row.part_of_speech as VocabEntry["part_of_speech"],
    jlpt_level: (row.jlpt_level ?? "N5") as VocabEntry["jlpt_level"],
    meaning:
      typeof row.meaning === "string"
        ? { en: row.meaning }
        : (row.meaning as Record<string, string>),
    vocab_item_id: row.id,
    example_from_song: "",
    additional_examples: [],
  };
}
