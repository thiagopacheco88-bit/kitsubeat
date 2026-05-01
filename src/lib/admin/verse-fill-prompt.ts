/**
 * Phase 11.5 D-06: per-verse AI fill prompt.
 *
 * Mirrors scripts/lib/lesson-prompt.ts block-builder shape but scoped to ONE verse:
 * - target verse (with what the human edited as ground truth)
 * - ±2 neighbour verses as anchors (NOT to be edited; just context)
 * - fieldsToFill (only these fields appear in the response)
 * - output schema description
 *
 * File lives at src/lib/admin/ (not scripts/lib/) per ISSUE-06 revision so
 * Next.js bundling resolves cleanly when imported by the ai-fill server action.
 */

import type { Verse } from "@/lib/types/lesson";

export type FillableField =
  | "reading"
  | "romaji"
  | "tokens"
  | "translations"
  | "literal_meaning"
  | "cultural_context";

export interface VerseFillPromptInput {
  songTitle: string;
  songArtist: string | null;
  songAnime: string | null;
  target: Verse;
  neighbours: Verse[];   // typically ±2 around target, in song order
  fieldsToFill: FillableField[];
}

export function buildVerseFillPrompt(input: VerseFillPromptInput): string {
  const meta = buildMetadataBlock(input);
  const target = buildTargetBlock(input.target);
  const anchors = buildNeighboursBlock(input.neighbours);
  const fields = buildFieldsToFillBlock(input.fieldsToFill);
  const schema = buildOutputSchemaBlock(input.fieldsToFill);

  return `${meta}\n\n${target}\n\n${anchors}\n\n${fields}\n\n${schema}`;
}

function buildMetadataBlock(input: VerseFillPromptInput): string {
  const lines = [
    "## Song Metadata",
    `- **Title:** ${input.songTitle}`,
  ];
  if (input.songArtist) lines.push(`- **Artist:** ${input.songArtist}`);
  if (input.songAnime) lines.push(`- **Anime:** ${input.songAnime}`);
  return lines.join("\n");
}

function buildTargetBlock(verse: Verse): string {
  return [
    "## Target Verse (the one to fill)",
    "Edited fields below are GROUND TRUTH — do not change them.",
    "```json",
    JSON.stringify(
      {
        verse_number: verse.verse_number,
        surface: verse.tokens.map((t) => t.surface).join(""),
        tokens: verse.tokens,
        translations: verse.translations,
        literal_meaning: verse.literal_meaning,
        cultural_context: verse.cultural_context,
      },
      null,
      2
    ),
    "```",
  ].join("\n");
}

function buildNeighboursBlock(neighbours: Verse[]): string {
  if (neighbours.length === 0) {
    return "## Neighbour Verses (anchors)\n(none — target verse is at song boundary)";
  }
  return [
    "## Neighbour Verses (anchors — context only, DO NOT EDIT)",
    "```json",
    JSON.stringify(neighbours.map((v) => ({
      verse_number: v.verse_number,
      surface: v.tokens.map((t) => t.surface).join(""),
      translations: v.translations,
    })), null, 2),
    "```",
  ].join("\n");
}

function buildFieldsToFillBlock(fields: FillableField[]): string {
  return [
    "## Fields to Fill",
    "Produce values ONLY for these fields. Do not include any other fields in the response.",
    ...fields.map((f) => `- ${f}`),
  ].join("\n");
}

function buildOutputSchemaBlock(fields: FillableField[]): string {
  const lines = [
    "## Output Schema",
    "Reply with ONLY a single JSON object on stdout. No prose, no code fences",
    "(though the system tolerates ```json fences if you add them).",
    "Schema:",
    "```typescript",
    "{",
  ];
  if (fields.includes("tokens"))           lines.push('  tokens: { surface: string; reading: string; romaji: string }[],');
  if (fields.includes("translations"))     lines.push('  translations: { [locale: string]: string },');
  if (fields.includes("literal_meaning"))  lines.push('  literal_meaning: string | { [locale: string]: string },');
  if (fields.includes("cultural_context")) lines.push('  cultural_context: string | { [locale: string]: string },');
  if (fields.includes("reading"))          lines.push('  reading?: string,');
  if (fields.includes("romaji"))           lines.push('  romaji?: string,');
  lines.push("}");
  lines.push("```");
  lines.push("");
  lines.push("Constraints:");
  lines.push("- All translations must preserve the verse's meaning (anchor against neighbour-verse translations).");
  lines.push("- Romaji must be Hepburn-style.");
  lines.push("- Reading must be hiragana for kanji tokens, identity for kana-only tokens.");
  lines.push("- Do NOT change tokens that are already non-empty in the target verse — those are ground truth.");
  return lines.join("\n");
}
