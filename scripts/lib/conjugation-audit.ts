/**
 * conjugation-audit.ts — Conjugation path parser and auditor.
 *
 * Parses the free-text `conjugation_path` field from GrammarPoint entries
 * into structured base/conjugated/type triples where possible.
 *
 * Structured paths follow the pattern: "食べる → 食べた" (Japanese word → form)
 * Unstructured paths are pattern labels like "〜ている" or "dictionary form → te-form"
 *
 * Used by the vocabulary backfill script (scripts/backfill-vocab-identity.ts)
 * and at exercise generation time (Phase 10) to determine exercise eligibility.
 */

/**
 * Regex to detect Japanese characters (hiragana + katakana + CJK unified ideographs).
 */
const JAPANESE_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

/**
 * Structured conjugation triple extracted from a conjugation_path string.
 */
export interface StructuredConjugation {
  /** Dictionary form / base form (e.g., 食べる) */
  base: string;
  /** Conjugated / target form (e.g., 食べた) */
  conjugated: string;
  /** Human-readable conjugation type label (e.g., "past tense", "te-form → te-iru") */
  conjugation_type: string;
  /** true if the path was successfully parsed into structured data */
  is_structured: boolean;
}

/**
 * Parse a conjugation_path string into a StructuredConjugation.
 *
 * Returns null if path is undefined, null, or empty.
 *
 * Logic:
 * - If path contains "→":
 *   - Split on "→", trim each part
 *   - If first part contains Japanese characters → structured: base=first, conjugated=last,
 *     conjugation_type = all parts after first joined with " → "
 *   - If first part has no Japanese characters (grammar label like "dictionary form") →
 *     unstructured: is_structured=false
 * - If no "→": unstructured (pattern names like "〜ている" with no derivation shown)
 */
export function parseConjugationPath(
  path: string | undefined
): StructuredConjugation | null {
  if (!path || path.trim() === "") return null;

  const trimmed = path.trim();

  if (trimmed.includes("→")) {
    const parts = trimmed.split("→").map((p) => p.trim()).filter((p) => p.length > 0);

    if (parts.length >= 2) {
      const firstPart = parts[0];

      if (JAPANESE_CHAR_RE.test(firstPart)) {
        // Structured: first part is a Japanese word form
        return {
          base: firstPart,
          conjugated: parts[parts.length - 1],
          conjugation_type: parts.slice(1).join(" → "),
          is_structured: true,
        };
      } else {
        // First part is a grammar label (e.g., "dictionary form"), not a Japanese word
        return {
          base: trimmed,
          conjugated: trimmed,
          conjugation_type: "unstructured",
          is_structured: false,
        };
      }
    }
  }

  // No arrow present — treat as an unstructured pattern label
  return {
    base: trimmed,
    conjugated: trimmed,
    conjugation_type: "unstructured",
    is_structured: false,
  };
}

/**
 * Audit result from processing a list of grammar points.
 */
export interface ConjugationAuditResult {
  /** Successfully parsed structured conjugations */
  parsed: StructuredConjugation[];
  /** Raw path strings that could not be parsed into structured form */
  skipped: string[];
  /** Total grammar points examined (including those with no conjugation_path) */
  total: number;
}

/**
 * Audit a list of grammar points, parsing conjugation paths and aggregating results.
 *
 * Grammar points with no conjugation_path are counted in total but produce no output.
 */
export function auditConjugationPaths(
  grammarPoints: Array<{ name: string; conjugation_path?: string }>
): ConjugationAuditResult {
  const parsed: StructuredConjugation[] = [];
  const skipped: string[] = [];

  for (const point of grammarPoints) {
    const result = parseConjugationPath(point.conjugation_path);
    if (result === null) {
      // No conjugation_path — skip silently
      continue;
    }
    if (result.is_structured) {
      parsed.push(result);
    } else {
      skipped.push(point.conjugation_path ?? point.name);
    }
  }

  return {
    parsed,
    skipped,
    total: grammarPoints.length,
  };
}
