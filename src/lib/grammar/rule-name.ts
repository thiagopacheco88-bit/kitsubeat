/**
 * Parses a grammar rule name string into structured display parts.
 *
 * The locked title format (memory:project_grammar_explanation_format) is:
 *   "{romaji} ({kana}) — {english_gloss}"
 *
 * e.g. "〜sou da / 〜sou de (〜そうだ / 〜そうで) — looks like / about to"
 *
 * Falls back gracefully when the pattern doesn't match — older rules in the
 * catalog have not yet been re-authored, and we render them as a single
 * romaji-only line until the catalog rewrite job runs.
 */
export interface RuleNameParts {
  romaji: string;
  kana?: string;
  translation?: string;
}

const RULE_NAME_PATTERN = /^(.+?)\s+\((.+?)\)\s+—\s+(.+)$/;

export function parseRuleName(name: string): RuleNameParts {
  const match = name.match(RULE_NAME_PATTERN);
  if (match) {
    return {
      romaji: match[1].trim(),
      kana: match[2].trim(),
      translation: match[3].trim(),
    };
  }
  return { romaji: name.trim() };
}
