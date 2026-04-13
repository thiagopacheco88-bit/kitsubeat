/**
 * batch-claude.ts — Anthropic Message Batches API wrapper for lesson generation.
 *
 * Provides three lifecycle functions:
 * - buildBatchRequests: converts songs + lyrics cache into Batch API Request objects
 * - submitBatch: submits the batch and returns the batch ID
 * - pollBatch: polls every 30s until processing_status !== "in_progress"
 * - streamResults: async generator yielding { custom_id, lesson } for each success
 *
 * Uses ANTHROPIC_API_KEY from process.env.
 * Uses claude-sonnet-4-6 model with JSON schema output for structured lesson generation.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { BatchCreateParams } from "@anthropic-ai/sdk/resources/messages/batches";
import type { MessageBatch } from "@anthropic-ai/sdk/resources/messages/batches";
import { LESSON_JSON_SCHEMA, type Lesson } from "../types/lesson.js";
import { buildLessonPrompt } from "./lesson-prompt.js";
import type { SongManifestEntry } from "../types/manifest.js";
import type { LyricsToken } from "./kuroshiro-tokenizer.js";

// Exported for type usage in calling scripts
export type BatchRequest = BatchCreateParams.Request;

export interface LyricsCacheEntry {
  slug: string;
  title: string;
  artist: string;
  source: string;
  raw_lyrics: string;
  synced_lrc: string | null;
  tokens: LyricsToken[];
}

export interface BatchResult {
  custom_id: string;
  lesson: Lesson;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Load .env.local before running this script."
      );
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 3 });
  }
  return _client;
}

/**
 * Build one Batch API Request per song.
 *
 * @param songs - Songs to build requests for (already filtered to un-cached ones)
 * @param lyricsCache - Map from slug → LyricsCacheEntry
 * @returns Array of BatchCreateParams.Request ready for submitBatch()
 */
export function buildBatchRequests(
  songs: SongManifestEntry[],
  lyricsCache: Map<string, LyricsCacheEntry>
): BatchRequest[] {
  const requests: BatchRequest[] = [];

  for (const song of songs) {
    const cached = lyricsCache.get(song.slug);
    if (!cached) {
      console.warn(
        `  [WARN] No lyrics cache entry for ${song.slug} — skipping`
      );
      continue;
    }

    const prompt = buildLessonPrompt(song, cached.raw_lyrics, cached.tokens);

    requests.push({
      custom_id: song.slug,
      params: {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        output_config: {
          format: {
            type: "json_schema",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            json_schema: LESSON_JSON_SCHEMA as any,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
    });
  }

  return requests;
}

/**
 * Submit a batch to the Anthropic Batch API.
 *
 * @param requests - Array of batch requests from buildBatchRequests()
 * @returns The created MessageBatch object (use .id for polling)
 */
export async function submitBatch(requests: BatchRequest[]): Promise<MessageBatch> {
  const client = getClient();
  console.log(`  Submitting batch of ${requests.length} requests to Claude API...`);
  const batch = await client.messages.batches.create({ requests });
  console.log(`  Batch submitted. ID: ${batch.id}`);
  console.log(`  Processing status: ${batch.processing_status}`);
  return batch;
}

/**
 * Poll a batch until processing_status is no longer "in_progress".
 * Logs progress on each poll interval (30s).
 *
 * @param batchId - The batch ID from submitBatch()
 * @returns The completed MessageBatch object
 */
export async function pollBatch(batchId: string): Promise<MessageBatch> {
  const client = getClient();
  let status = await client.messages.batches.retrieve(batchId);

  console.log(`  Polling batch ${batchId}...`);

  while (status.processing_status === "in_progress") {
    const counts = status.request_counts;
    console.log(
      `  [${new Date().toISOString()}] Status: in_progress — ` +
        `processing: ${counts.processing}, succeeded: ${counts.succeeded}, ` +
        `errored: ${counts.errored}, canceled: ${counts.canceled}, expired: ${counts.expired}`
    );

    // Wait 30 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    status = await client.messages.batches.retrieve(batchId);
  }

  const counts = status.request_counts;
  console.log(
    `  Batch complete. Final status: ${status.processing_status} — ` +
      `succeeded: ${counts.succeeded}, errored: ${counts.errored}, ` +
      `canceled: ${counts.canceled}, expired: ${counts.expired}`
  );

  return status;
}

/**
 * Stream results from a completed batch.
 * Yields { custom_id, lesson } for each succeeded result.
 * Logs and skips failed, errored, canceled, or expired results.
 *
 * @param batchId - The batch ID to stream results from
 */
export async function* streamResults(
  batchId: string
): AsyncGenerator<BatchResult> {
  const client = getClient();
  const stream = await client.messages.batches.results(batchId);

  for await (const result of stream) {
    const { custom_id } = result;

    if (result.result.type !== "succeeded") {
      console.warn(
        `  [SKIP] ${custom_id} — result type: ${result.result.type}`
      );
      continue;
    }

    const content = result.result.message.content;
    if (!content || content.length === 0) {
      console.warn(`  [SKIP] ${custom_id} — empty message content`);
      continue;
    }

    const firstBlock = content[0];
    if (firstBlock.type !== "text") {
      console.warn(
        `  [SKIP] ${custom_id} — unexpected content block type: ${firstBlock.type}`
      );
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(firstBlock.text);
    } catch (err) {
      console.warn(
        `  [SKIP] ${custom_id} — JSON parse failed: ${(err as Error).message}`
      );
      continue;
    }

    yield { custom_id, lesson: parsed as Lesson };
  }
}
