/**
 * Phase 11.5 D-06: Zod schema for the AI fill response.
 *
 * Output is a SUBSET of a Verse — only the fields the admin asked to fill.
 * Mirrors `scripts/types/lesson.ts` LessonSchema style (Zod) but scoped per-verse.
 */

import { z } from "zod";

const TokenFillSchema = z.object({
  surface: z.string(),
  reading: z.string(),
  romaji: z.string(),
}).passthrough();  // allow additional fields from the model without breaking validation

const LocalizableSchema = z.union([
  z.string(),
  z.record(z.string(), z.string()),
]);

export const VerseFillResponseSchema = z.object({
  reading: z.string().optional(),
  romaji: z.string().optional(),
  tokens: z.array(TokenFillSchema).optional(),
  translations: z.record(z.string(), z.string()).optional(),
  literal_meaning: LocalizableSchema.optional(),
  cultural_context: LocalizableSchema.optional(),
}).strict();

export type VerseFillResponse = z.infer<typeof VerseFillResponseSchema>;
