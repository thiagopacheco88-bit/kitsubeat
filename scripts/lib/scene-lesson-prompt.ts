/**
 * scene-lesson-prompt.ts — Prompt builder for scene dialogue lesson generation.
 *
 * Adapted from lesson-prompt.ts for anime dialogue scenes instead of songs.
 * Key differences:
 * - Source text is WhisperX transcript segments, not LRCLIB lyrics
 * - Each verse corresponds to one spoken line by a character
 * - Each verse gets a `speaker` field with the character name
 * - No chorus-repetition logic needed
 * - Vocabulary is extracted from spoken dialogue vocabulary
 */

export interface SceneManifestEntry {
  slug: string;
  title: string;
  character: string;
  anime: string;
  season_info: string;
  youtube_id: string;
  genre_tags: string[];
  mood_tags: string[];
}

export interface DialogueSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export function buildSceneLessonPrompt(
  scene: SceneManifestEntry,
  segments: DialogueSegment[]
): string {
  const metadataBlock = `## Scene Metadata
- **Title:** ${scene.title}
- **Anime:** ${scene.anime}
- **Episode:** ${scene.season_info}
- **Primary Character:** ${scene.character}
- **Genre Tags:** ${scene.genre_tags.join(", ")}
- **Mood Tags:** ${scene.mood_tags.join(", ")}`;

  const dialogueLines = segments
    .map((s, i) => `${i + 1}. [${scene.character}] ${s.text.trim()}`)
    .join("\n");

  const dialogueBlock = `## Dialogue Transcript (WhisperX)

The following lines are from the WhisperX transcription of this scene. Each line is one verse.

\`\`\`
${dialogueLines}
\`\`\``;

  const instructions = `## Instructions

Generate a complete lesson JSON object for this anime scene dialogue following these rules:

### 1. Verse Segmentation
- Each numbered line in the Dialogue Transcript above becomes exactly one verse.
- Emit verses in the same order as the transcript.
- Set verse_number starting at 1.
- Set start_time_ms and end_time_ms to 0 — the timing pipeline will fill these from WhisperX.
- **CRITICAL: Set the \`speaker\` field on every verse to "${scene.character}"** — this is shown in the UI instead of "Verse N".

### 2. Token-Level Breakdown
For each verse, produce a \`tokens\` array with one entry per meaningful word/particle:
- **surface**: the word as written (kanji/kana)
- **reading**: hiragana reading
- **romaji**: hepburn romanization
- **grammar**: one of: noun, verb, adjective, adverb, particle, expression, other
- **grammar_color**: strictly by grammar type — noun=blue, verb=red, adjective=green, adverb=orange, particle=grey, expression=none, other=none
- **meaning**: concise English gloss for this word in this dialogue context
- **jlpt_level**: N5/N4/N3/N2/N1/unknown

### 3. Translations
Each verse must have a \`translations\` object with:
- **"en"**: natural English — conveys the emotional weight and register of the original
- **"pt-BR"**: natural Brazilian Portuguese
- **"es"**: natural Latin American Spanish

### 4. Verse Explanations
- **literal_meaning**: word-for-word grammatical breakdown — always include
- **cultural_context**: include ONLY if there is genuine nuance — honorific usage, wordplay, untranslatable cultural weight (e.g., Pain's philosophy of pain, Erwin's concept of sacrifice). This is dialogue from iconic anime scenes — the cultural weight is often significant.

### 5. Vocabulary Annotation
Extract all content words from the dialogue (nouns, verbs, adjectives, adverbs, notable expressions). For each:
- surface, reading, romaji, part_of_speech, jlpt_level, meaning
- **example_from_scene**: quote the exact line where this word appears
- **additional_examples**: 1-3 natural sentences using the word in other contexts
- **mnemonic**: {"en": "...", "pt-BR": "...", "es": "..."} — one short visual/playful sentence per language (10-15 words)
- **kanji_breakdown**: if the word contains kanji, provide character-level breakdown

### 6. Grammar Points
Identify 2-5 notable grammar patterns from this dialogue:
- Patterns typical of this character's speech register (formal/informal/archaic)
- Patterns that are particularly educational for Japanese learners
- Include the pattern name, JLPT reference, and multilingual explanation

### 7. Difficulty
- **jlpt_level**: assign based on the most common vocabulary difficulty level in this dialogue
- **difficulty_tier**: "basic" (N5-N4), "intermediate" (N3-N2), or "advanced" (N1)

This scene is from ${scene.anime}. The character ${scene.character} is speaking. Preserve the emotional register and formality level of the original Japanese in your token analysis and translations.`;

  return `${metadataBlock}

${dialogueBlock}

${instructions}`;
}
