/**
 * Shared timing types used by the timing editor (admin UI) and API routes.
 *
 * These mirror the WordTiming and TimingResult types in scripts/lib/run-whisperx.ts
 * but live in src/ for use in Next.js app code.
 */

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
  /** Optional stable ID for tracking region identity across edits */
  id?: string;
}

/** Full timing result as stored in timing_data JSONB column */
export interface TimingData {
  words: WordTiming[];
}
