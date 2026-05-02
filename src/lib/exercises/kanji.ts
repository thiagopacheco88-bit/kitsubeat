/**
 * Kanji codepoint detection — single source of truth for Phase 11.6+.
 * Originally lived in scripts/seed/03b-validate-lyrics-vs-whisper.ts; extracted here
 * so generator.ts (Plan 11.6-04) and SSR all-kana detection (Plan 11.6-06) share it.
 *
 * Unicode ranges (RESEARCH Assumption A9):
 *   - CJK Unified Ideographs:        U+4E00 - U+9FFF
 *   - CJK Unified Ideographs Ext-A:  U+3400 - U+4DBF
 *   - CJK Unified Ideographs Ext-B:  U+20000 - U+2A6DF
 *
 * Pure functions — no I/O, no side effects.
 */

/**
 * Returns true if the given single character is a CJK kanji.
 *
 * Covers:
 *   - CJK Unified Ideographs (U+4E00–U+9FFF)
 *   - CJK Unified Ideographs Extension A (U+3400–U+4DBF)
 *   - CJK Unified Ideographs Extension B (U+20000–U+2A6DF)
 *
 * Note: hiragana (U+3040–U+309F) and katakana (U+30A0–U+30FF) are
 * explicitly excluded — they fall outside all three ranges above.
 */
export function isKanji(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

/**
 * Returns the set of distinct kanji characters found in `text`.
 * Empty set if no kanji present.
 */
export function kanjiSet(text: string): Set<string> {
  const s = new Set<string>();
  for (const ch of text) if (isKanji(ch)) s.add(ch);
  return s;
}

/**
 * Returns true if `text` contains at least one kanji character.
 * Short-circuits on the first kanji found (O(1) for kanji-bearing strings).
 */
export function hasKanji(text: string): boolean {
  for (const ch of text) if (isKanji(ch)) return true;
  return false;
}
