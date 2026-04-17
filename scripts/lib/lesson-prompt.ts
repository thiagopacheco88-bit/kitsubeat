/**
 * lesson-prompt.ts — Prompt template builder for Claude Batch API lesson generation.
 *
 * Produces a structured prompt per song that instructs Claude to generate a complete
 * lesson JSON object matching LessonSchema: verses with token breakdowns, vocabulary,
 * grammar points, translations (en, pt-BR, es), and JLPT/difficulty assignment.
 *
 * All locked decisions from RESEARCH.md are encoded in the prompt instructions:
 * - Grammar color coding: noun=blue, verb=red, adjective=green, adverb=orange, particle=grey, expression=none
 * - Translation style: natural/fluent, Portuguese = Brazilian PT-BR
 * - Verse explanations: literal_meaning first, cultural_context only if genuine nuance exists
 * - JLPT assignment algorithm with calibration examples
 * - Culturally untranslatable terms: Claude's discretion per case
 */

import type { SongManifestEntry } from "../types/manifest.js";
import type { LyricsToken } from "./kuroshiro-tokenizer.js";

/**
 * Build the full prompt string for a single song lesson generation request.
 *
 * @param song - Song manifest entry with metadata
 * @param lyrics - Raw lyrics text (from lyrics-cache)
 * @param tokens - Pre-analyzed kuroshiro tokens for the full lyrics
 * @returns Prompt string for Claude Batch API request
 */
export function buildLessonPrompt(
  song: SongManifestEntry,
  lyrics: string,
  tokens: LyricsToken[]
): string {
  const metadataBlock = buildMetadataBlock(song);
  const tokenContextBlock = buildTokenContextBlock(tokens);
  const lyricsBlock = buildLyricsBlock(lyrics);
  const instructionsBlock = buildInstructionsBlock();

  return `${metadataBlock}

${tokenContextBlock}

${lyricsBlock}

${instructionsBlock}`;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function buildMetadataBlock(song: SongManifestEntry): string {
  const lines = [
    "## Song Metadata",
    `- **Title:** ${song.title}`,
    `- **Artist:** ${song.artist}`,
    `- **Anime:** ${song.anime}`,
  ];

  if (song.season_info) {
    lines.push(`- **Season/Position:** ${song.season_info}`);
  }

  if (song.year_launched) {
    lines.push(`- **Year:** ${song.year_launched}`);
  }

  if (song.genre_tags?.length > 0) {
    lines.push(`- **Genre Tags:** ${song.genre_tags.join(", ")}`);
  }

  if (song.mood_tags?.length > 0) {
    lines.push(`- **Mood Tags:** ${song.mood_tags.join(", ")}`);
  }

  return lines.join("\n");
}

function buildTokenContextBlock(tokens: LyricsToken[]): string {
  // Limit token context to first 500 tokens to avoid exceeding max_tokens for large lyrics
  const sample = tokens.slice(0, 500);
  const tokenJson = JSON.stringify(sample, null, 2);

  return `## Pre-Analyzed Tokens (from kuroshiro/kuromoji)

These tokens are pre-computed from the lyrics using the kuroshiro tokenizer with @sglkc/kuromoji.
Use these as the base for furigana readings and romaji in your verse token arrays.
The \`pos\` field uses Japanese POS tags (名詞=noun, 助詞=particle, 動詞=verb, 形容詞=adjective, 副詞=adverb, 感動詞/接続詞=expression).

\`\`\`json
${tokenJson}
\`\`\``;
}

function buildLyricsBlock(lyrics: string): string {
  return `## Raw Lyrics

\`\`\`
${lyrics}
\`\`\``;
}

function buildInstructionsBlock(): string {
  return `## Instructions

Generate a complete lesson JSON object for this anime song following these rules exactly:

### 1. Verse Segmentation
- Split the lyrics into logical verses. Each chorus counts as one verse even if it repeats.
- Number verses starting at 1 (verse_number field).
- Set start_time_ms and end_time_ms to 0 for now — these will be populated by the WhisperX timing pipeline in a separate step.

### 2. Token-Level Breakdown
For each verse, produce a \`tokens\` array with one entry per meaningful word/particle:
- **surface**: the word as written in the lyrics (kanji/kana)
- **reading**: hiragana reading (use the pre-analyzed tokens above as your primary source)
- **romaji**: hepburn romanization (use the pre-analyzed tokens above as your primary source)
- **grammar**: one of: noun, verb, adjective, adverb, particle, expression, other
- **grammar_color**: assign color STRICTLY by grammar type:
  - noun → "blue"
  - verb → "red"
  - adjective → "green"
  - adverb → "orange"
  - particle → "grey"
  - expression → "none"
  - other → "none"
- **meaning**: a concise English gloss for this word in context
- **jlpt_level**: the JLPT level required to know this specific word (N5/N4/N3/N2/N1/unknown)

### 3. Translations
Each verse must have a \`translations\` object with exactly these three keys:
- **"en"**: natural, fluent English — reads naturally even if word order differs from Japanese
- **"pt-BR"**: Brazilian Portuguese — natural and idiomatic, NOT European Portuguese
- **"es"**: Spanish — natural and idiomatic Latin American Spanish preferred

Translation style: prioritize readability and natural flow in the target language over word-for-word fidelity.

### 4. Verse Explanations
- **literal_meaning**: a word-for-word breakdown showing the grammatical structure — always include this
- **cultural_context**: only include if there is genuine cultural nuance, wordplay, honorific usage, or untranslatable meaning. Omit if the verse is straightforward. This field is optional.

### 5. Culturally Untranslatable Terms
Use your discretion per case:
- Sometimes translate with an explanation (e.g., "nakama (comrades/bonds)")
- Sometimes keep the original with a brief note
- Sometimes a natural translation captures the meaning without needing explanation
Prioritize what helps the learner understand the intended feeling.

### 6. Vocabulary Extraction
Extract the most educationally valuable vocabulary from the song (typically 10-20 words):
- Focus on words that are: frequently useful in Japanese (not just song-specific), representative of the song's JLPT level, or culturally significant
- Include readings, romaji, part_of_speech, jlpt_level, and meaning
- **example_from_song**: quote the specific verse or phrase where this word appears
- **additional_examples**: 1-3 natural example sentences using the word in different contexts, ordered from simpler to more complex
- **mnemonic**: \`{ "en": "...", "pt-BR": "...", "es": "..." }\` — ONE short sentence per language (10-15 words). Tone: playful + visual. Use wordplay, vivid imagery, or sound-alikes to the Japanese reading. NOT etymology. NOT anime references. Example EN for 王様 (OO-SAM-A): "Picture a KING on a GOLDEN throne — that's royalty in Japan."
- **kanji_breakdown**: IF the surface contains kanji, emit:
  \`\`\`json
  {
    "characters": [
      {
        "char": "<single kanji>",
        "meaning": { "en": "...", "pt-BR": "...", "es": "..." },
        "on_yomi": "<kana, empty string if none>",
        "kun_yomi": "<kana, empty string if none>",
        "jlpt_level": "N5" | "N4" | "N3" | "N2" | "N1" | null,
        "radical_hint": { "en": "<short like 'fire + person'>", "pt-BR": "...", "es": "..." }
      }
    ],
    "compound_note": { "en": "...", "pt-BR": "...", "es": "..." }
  }
  \`\`\`
  One entry per kanji character in surface. Include \`compound_note\` ONLY if surface has 2+ kanji — bridge per-character meanings to the compound word. IF the surface is kana-only (no kanji), emit: \`"kanji_breakdown": null\`

### 7. Grammar Points
Identify 3-8 notable grammar patterns in the song:
- **name**: format as "〜pattern (English name)" e.g., "〜ている (te-iru continuous form)"
- **jlpt_reference**: e.g., "JLPT N4"
- **explanation**: 1-2 sentences explaining the grammar point in plain English
- **conjugation_path**: when applicable, show the full path e.g., "食べる (eat) → 食べて → 食べている"

### 8. JLPT Level Assignment Algorithm
Assign the overall JLPT level using this algorithm:
1. Find the highest JLPT level required to understand 80% of the vocabulary
2. Cross-reference with the most complex grammar pattern in the song
3. Take the higher of the two results

**Calibration examples:**
- A song using mostly N5/N4 vocabulary with て-form and は/が particles → N4
- A song with N3 vocabulary but N2 grammar (e.g., ものだから, にもかかわらず) → N2
- A song mixing N2/N1 vocabulary but basic grammar → N2
- Most anime OP/ED songs fall in the N4-N3 range

### 9. Difficulty Tier Assignment
Map JLPT level to difficulty tier:
- N5 or N4 → "basic"
- N3 → "intermediate"
- N2 or N1 → "advanced"

### 10. Output Format
Return a valid JSON object matching the Lesson schema. The JSON must be complete and valid — no truncation, no trailing comments.

The schema structure is:
\`\`\`
{
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1",
  difficulty_tier: "basic" | "intermediate" | "advanced",
  verses: [{ verse_number, start_time_ms, end_time_ms, tokens, translations, literal_meaning, cultural_context? }],
  vocabulary: [{ surface, reading, romaji, part_of_speech, jlpt_level, meaning, example_from_song, additional_examples, mnemonic, kanji_breakdown }],
  grammar_points: [{ name, jlpt_reference, explanation, conjugation_path? }]
}
\`\`\``;
}
