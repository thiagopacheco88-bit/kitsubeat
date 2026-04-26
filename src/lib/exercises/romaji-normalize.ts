/**
 * romaji-normalize.ts — Phase 13 tolerance rules for advanced grammar drills.
 *
 * The write_romaji exercise accepts free-text input and must treat the three
 * common Hepburn long-vowel spellings as equivalent:
 *   ō  ≡ ou ≡ oo
 *   ū  ≡ uu
 *   ā  ≡ aa   (rare, but shows up in "kāa" etc.)
 *   ē  ≡ ee   (rare)
 *
 * Also trims, lowercases, and collapses internal whitespace so a sloppy
 * "  tabe ru " still matches "taberu".
 *
 * NOT handled (deliberately):
 *   - macron-less variants like "oo" for 大 — correct answer itself is what the
 *     AI generator chose; we only rewrite the user's side to match the bank's
 *     chosen spelling.
 *   - tsu gemination / small tsu — exact-match required. Too forgiving here
 *     lets sloppy spelling slip through.
 */

const MACRON_MAP: Record<string, string> = {
  ā: "aa",
  ī: "ii",
  ū: "uu",
  ē: "ee",
  ō: "ou",
};

function stripMacrons(input: string): string {
  return input.replace(/[āīūēō]/g, (c) => MACRON_MAP[c] ?? c);
}

export function normalizeRomaji(input: string): string {
  const lowered = stripMacrons(input.trim().toLowerCase());
  const collapsedWs = lowered.replace(/\s+/g, "");
  // Hepburn "ou" and "oo" are dialectal variants of ō; normalize both to "ou".
  // "uu" is already canonical for ū. "ei" / "ee" stays as typed.
  return collapsedWs.replace(/oo/g, "ou");
}

export function romajiEquals(a: string, b: string): boolean {
  return normalizeRomaji(a) === normalizeRomaji(b);
}
