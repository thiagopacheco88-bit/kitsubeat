/**
 * vocab-extractor.ts — deterministic vocabulary candidate extraction from lyrics.
 *
 * Pipeline: lyrics text → kuromoji tokens → filter content words → collapse
 * conjugations via basic_form → dedupe by (dictionary_form, reading).
 *
 * Output is a list of candidates that the LLM should later *annotate* (JLPT,
 * meaning, examples) — it must NOT select or drop entries.
 */

import { tokenizeLyrics, type LyricsToken } from "./kuroshiro-tokenizer.js";

// Cache dict-form → {reading, romaji} so we don't re-tokenize the same lemma repeatedly
const dictFormCache = new Map<string, { reading: string; romaji: string }>();

async function dictFormReading(
  basic: string,
  fallback: { reading: string; romaji: string }
): Promise<{ reading: string; romaji: string }> {
  const cached = dictFormCache.get(basic);
  if (cached) return cached;

  const toks = await tokenizeLyrics(basic);
  // Re-tokenizing a single lemma usually yields one token; take the first.
  const head = toks[0];
  const result =
    head && head.surface === basic
      ? { reading: head.reading, romaji: head.romaji }
      : fallback;

  dictFormCache.set(basic, result);
  return result;
}

/** Allowed POS-1 tags (kuromoji Japanese tags) — only content words. */
const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "副詞"]);

/**
 * POS-2 subtypes to exclude inside content POS. These are functional / structural
 * uses that don't belong in vocabulary lists:
 *   非自立 — bound forms (する in 勉強する, いる in 食べている)
 *   代名詞 — pronouns (私, あなた)
 *   数     — bare numerals
 *   接尾  — suffixes (さん, たち)
 *   接続助詞, 終助詞 — particle subtypes (defensive; particles already excluded)
 */
const EXCLUDED_POS_2 = new Set([
  "非自立",
  "代名詞",
  "数",
  "接尾",
  "接続助詞",
  "終助詞",
]);

export interface VocabCandidate {
  /** Dictionary (lemma) form — the headword shown in the vocab list */
  dictionary_form: string;
  /** Hiragana reading of the dictionary form */
  reading: string;
  /** Hepburn romaji of the dictionary form */
  romaji: string;
  /** Normalized English POS label used by the lesson schema */
  part_of_speech: "noun" | "verb" | "adjective" | "adverb";
  /** Raw surface form(s) as they appear in the lyrics (for disambiguation) */
  surfaces_in_lyrics: string[];
  /** Line of lyrics where the word first occurs — feeds example_from_song */
  example_from_song: string;
  /** 1-based index of the line above, for stable ordering */
  first_line_index: number;
}

const POS_MAP: Record<string, VocabCandidate["part_of_speech"]> = {
  名詞: "noun",
  動詞: "verb",
  形容詞: "adjective",
  副詞: "adverb",
};

function dedupKey(dictionary_form: string, reading: string): string {
  return `${dictionary_form}|${reading}`;
}

/**
 * Extract deterministic vocabulary candidates from raw lyrics text.
 *
 * `initKuroshiro()` must have been called once before invoking this.
 */
export async function extractVocabCandidates(
  lyrics: string
): Promise<VocabCandidate[]> {
  const lines = lyrics.split(/\r?\n/);
  const map = new Map<string, VocabCandidate>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const tokens = await tokenizeLyrics(line);

    for (const tok of tokens) {
      const candidate = await candidateFromToken(tok, line, i + 1);
      if (!candidate) continue;

      const key = dedupKey(candidate.dictionary_form, candidate.reading);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, candidate);
      } else if (!existing.surfaces_in_lyrics.includes(tok.surface)) {
        existing.surfaces_in_lyrics.push(tok.surface);
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => a.first_line_index - b.first_line_index
  );
}

async function candidateFromToken(
  tok: LyricsToken,
  line: string,
  lineIndex: number
): Promise<VocabCandidate | null> {
  if (!CONTENT_POS.has(tok.pos)) return null;
  if (EXCLUDED_POS_2.has(tok.pos_detail_1)) return null;

  // Skip tokens whose basic_form has no Japanese at all (ascii/digits that slipped through)
  if (!/[\u3040-\u30FF\u4E00-\u9FFF]/.test(tok.basic_form)) return null;

  const pos = POS_MAP[tok.pos];
  if (!pos) return null;

  // Reading/romaji must come from the dictionary form, not the conjugated surface.
  // e.g. surface 戻ら → basic_form 戻る; we want もどる / modoru, not もどら / modora.
  const { reading, romaji } =
    tok.basic_form === tok.surface
      ? { reading: tok.reading, romaji: tok.romaji }
      : await dictFormReading(tok.basic_form, {
          reading: tok.reading,
          romaji: tok.romaji,
        });

  return {
    dictionary_form: tok.basic_form,
    reading,
    romaji,
    part_of_speech: pos,
    surfaces_in_lyrics: [tok.surface],
    example_from_song: line,
    first_line_index: lineIndex,
  };
}
