/**
 * run-whisperx.ts — WhisperX timing types for the Kitsubeat seeding pipeline.
 *
 * Consumed by 04b-backfill-whisper-lyrics.ts (type-only import).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single word with WhisperX word-level timing data. */
export interface WordTiming {
  /** The word as transcribed (Japanese surface form) */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Alignment confidence score (0.0–1.0) */
  score: number;
  /** Present and true when score < 0.6 — flagged for timing editor review */
  low_confidence?: boolean;
}

/** Full timing result for one song as written to data/timing-cache/{slug}.json */
export interface TimingResult {
  song_slug: string;
  youtube_id: string;
  /** Word-level timestamps with confidence scores */
  words: WordTiming[];
  /** Count of words with score < 0.6 */
  low_confidence_count: number;
  /** Total number of aligned words */
  total_words: number;
  /** Mean confidence score across all words */
  avg_confidence_score: number;
}
