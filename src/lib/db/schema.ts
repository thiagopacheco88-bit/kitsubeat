import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * JLPT level enum — N5 (beginner) through N1 (advanced).
 * Assigned automatically by Claude during content generation.
 */
export const jlptEnum = pgEnum("jlpt_level", [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
]);

/**
 * Difficulty tier enum — maps JLPT level to a user-friendly label.
 */
export const difficultyEnum = pgEnum("difficulty_tier", [
  "basic",
  "intermediate",
  "advanced",
]);

/**
 * Timing verification status enum.
 * - "auto": WhisperX timestamps, not yet reviewed
 * - "manual": Corrected via the timing editor admin tool
 */
export const timingVerifiedEnum = pgEnum("timing_verified_status", [
  "auto",
  "manual",
]);

/**
 * songs table — core content store for the 200 anime OP/ED lessons.
 *
 * Design decisions:
 * - lesson (jsonb): stores the full Lesson object (verses, vocabulary, grammar points).
 *   This avoids deeply nested relational tables while keeping the content queryable.
 * - timing_data (jsonb): stores WhisperX word-level timestamps; updated by timing editor.
 * - genre_tags / mood_tags: stored as text arrays for efficient GIN index queries.
 * - content_schema_version: enables safe schema migrations without reprocessing all content.
 */
export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),

  // Song metadata
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  anime: text("anime").notNull(),
  season_info: text("season_info"), // e.g., "Naruto Shippuden OP 16"
  youtube_id: text("youtube_id"), // Full/long version
  youtube_id_short: text("youtube_id_short"), // TV-size OP/ED (~1:30)
  year_launched: integer("year_launched"),

  // Popularity ranking (lower = more popular, null = unranked)
  popularity_rank: integer("popularity_rank"),

  // Tagging
  genre_tags: text("genre_tags").array().default([]).notNull(),
  mood_tags: text("mood_tags").array().default([]).notNull(),

  // JLPT and difficulty — assigned by Claude during content generation
  jlpt_level: jlptEnum("jlpt_level"),
  difficulty_tier: difficultyEnum("difficulty_tier"),

  // Lesson content — full Lesson JSON (verses, vocabulary, grammar points)
  lesson: jsonb("lesson"),

  // Lyrics metadata
  lyrics_source: text("lyrics_source"), // "lrclib" | "genius" | "whisper_transcription"
  synced_lrc: jsonb("synced_lrc"), // Array of {startMs, text} from LRCLIB

  // Content schema versioning — increment when Lesson type changes
  content_schema_version: integer("content_schema_version").default(1).notNull(),

  // Timing data — WhisperX word-level timestamps, corrected via timing editor
  timing_youtube_id: text("timing_youtube_id"), // YouTube ID used for WhisperX extraction
  timing_data: jsonb("timing_data"),
  timing_verified: timingVerifiedEnum("timing_verified").default("auto").notNull(),

  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
