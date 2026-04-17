import {
  pgTable,
  pgEnum,
  pgMaterializedView,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
  boolean,
  real,
  smallint,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
 * Version type enum — tv (anime OP/ED cut) or full (complete song).
 */
export const versionTypeEnum = pgEnum("version_type", ["tv", "full"]);

/**
 * songs table — shared metadata for anime OP/ED songs.
 *
 * Version-specific data (lesson, lyrics, timing) lives in song_versions.
 * This table holds only what's common across all versions of a song.
 */
export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),

  // Song metadata
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  anime: text("anime").notNull(),
  season_info: text("season_info"), // e.g., "Naruto Shippuden OP 16"
  year_launched: integer("year_launched"),

  // Popularity ranking (lower = more popular, null = unranked)
  popularity_rank: integer("popularity_rank"),

  // Tagging
  genre_tags: text("genre_tags").array().default([]).notNull(),
  mood_tags: text("mood_tags").array().default([]).notNull(),

  // JLPT and difficulty — assigned by Claude during content generation
  // Reflects the TV version when available, otherwise the full version
  jlpt_level: jlptEnum("jlpt_level"),
  difficulty_tier: difficultyEnum("difficulty_tier"),

  // Content schema versioning — increment when Lesson type changes
  content_schema_version: integer("content_schema_version").default(1).notNull(),

  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * song_versions table — version-specific content for each song.
 *
 * Each song can have up to two versions: "tv" (anime OP/ED cut, ~1:30) and "full".
 * Each version has its own YouTube video, lesson content, lyrics, and timing data.
 */
export const songVersions = pgTable("song_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  song_id: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  version_type: versionTypeEnum("version_type").notNull(),

  // Video
  youtube_id: text("youtube_id"),

  // Lesson content — full Lesson JSON (verses, vocabulary, grammar points)
  lesson: jsonb("lesson"),

  // Lyrics metadata
  lyrics_source: text("lyrics_source"), // "lrclib" | "genius" | "whisper_transcription"
  synced_lrc: jsonb("synced_lrc"), // Array of {startMs, text} from LRCLIB

  // Timing data — WhisperX word-level timestamps, corrected via timing editor
  timing_youtube_id: text("timing_youtube_id"),
  timing_data: jsonb("timing_data"),
  timing_verified: timingVerifiedEnum("timing_verified").default("auto").notNull(),

  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("song_versions_song_id_version_type_unique").on(table.song_id, table.version_type),
]);

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type SongVersion = typeof songVersions.$inferSelect;
export type NewSongVersion = typeof songVersions.$inferInsert;

// =============================================================================
// Phase 7: Data Foundation — vocabulary tracking and subscriptions
// =============================================================================

/**
 * vocabulary_items table — canonical vocabulary entries shared across all songs.
 *
 * Identity is defined by (dictionary_form, reading) — the same word appearing in
 * different songs maps to a single vocabulary_items row. This prevents progress
 * orphaning when content is corrected.
 */
export const vocabularyItems = pgTable("vocabulary_items", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Identity key — dictionary form (kanji/kana) + hiragana reading
  dictionary_form: text("dictionary_form").notNull(),
  reading: text("reading").notNull(),
  romaji: text("romaji").notNull(),
  part_of_speech: text("part_of_speech").notNull(),

  // JLPT level — nullable because some words (e.g. anime slang) have no JLPT assignment
  jlpt_level: jlptEnum("jlpt_level"),

  // Flag for katakana loanwords — tracked identically, flag enables future filtering
  is_katakana_loanword: boolean("is_katakana_loanword").default(false).notNull(),

  // Localizable multilingual meaning object e.g. {"en": "...", "pt-BR": "..."}
  meaning: jsonb("meaning").notNull(),

  // Phase 08.3 enrichment fields — nullable. Populated by scripts/seed/11-enrich-vocab.ts.
  mnemonic: jsonb("mnemonic"),
  kanji_breakdown: jsonb("kanji_breakdown"),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("vocabulary_items_form_reading_unique").on(table.dictionary_form, table.reading),
]);

export type VocabularyItem = typeof vocabularyItems.$inferSelect;
export type NewVocabularyItem = typeof vocabularyItems.$inferInsert;

/**
 * user_vocab_mastery table — per-user FSRS state for each vocabulary item.
 *
 * Uses Pattern 3 (scalar columns) as decided in research: individual numeric columns
 * are required for indexed due-date queries. FSRS state is stored as scalars, not JSONB.
 *
 * State values: 0=New, 1=Learning, 2=Review, 3=Relearning
 * Rating values: 1=Again, 2=Hard, 3=Good, 4=Easy
 */
export const userVocabMastery = pgTable("user_vocab_mastery", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  vocab_item_id: uuid("vocab_item_id").notNull().references(() => vocabularyItems.id),

  // FSRS scalar columns (Pattern 3 — required for indexed due-date queries)
  stability: real("stability"),       // null for new cards
  difficulty: real("difficulty"),     // null for new cards
  elapsed_days: integer("elapsed_days").default(0).notNull(),
  scheduled_days: integer("scheduled_days").default(0).notNull(),
  reps: integer("reps").default(0).notNull(),
  lapses: integer("lapses").default(0).notNull(),
  state: smallint("state").default(0).notNull(), // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: timestamp("due", { withTimezone: true }).defaultNow().notNull(),
  last_review: timestamp("last_review", { withTimezone: true }),

  // Study intensity preset — controls request_retention and maximum_interval
  intensity_preset: text("intensity_preset").default("normal").notNull(),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("user_vocab_mastery_user_vocab_unique").on(table.user_id, table.vocab_item_id),
  index("user_vocab_mastery_due_idx").on(table.due),
  index("user_vocab_mastery_user_due_idx").on(table.user_id, table.due),
]);

export type UserVocabMastery = typeof userVocabMastery.$inferSelect;
export type NewUserVocabMastery = typeof userVocabMastery.$inferInsert;

/**
 * user_exercise_log table — immutable record of every exercise attempt.
 *
 * References vocabulary_items directly (not user_vocab_mastery) so logs are
 * retained even if a mastery record is reset. song_version_id is nullable because
 * kana exercises have no associated song.
 */
export const userExerciseLog = pgTable("user_exercise_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  vocab_item_id: uuid("vocab_item_id").notNull().references(() => vocabularyItems.id),

  // nullable — kana exercises have no song
  song_version_id: uuid("song_version_id").references(() => songVersions.id),

  exercise_type: text("exercise_type").notNull(), // e.g. "mc_meaning", "kana_read"
  rating: smallint("rating").notNull(),           // FSRS Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  response_time_ms: integer("response_time_ms"),  // optional — how long the user took

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserExerciseLog = typeof userExerciseLog.$inferSelect;
export type NewUserExerciseLog = typeof userExerciseLog.$inferInsert;

/**
 * subscriptions table — generic subscription record, not tied to a specific provider.
 *
 * Designed for provider portability (Stripe, Lemon Squeezy, etc.).
 * Provider-specific fields are nullable to support the free plan with no provider.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull().unique(),

  // Plan and status
  plan: text("plan").notNull(),     // "free" | "premium_monthly" | "premium_annual"
  status: text("status").notNull(), // "active" | "canceled" | "past_due" | "trialing"

  // Provider fields — nullable for free plan
  provider: text("provider"),                           // "stripe" | "lemon_squeezy" | null
  provider_subscription_id: text("provider_subscription_id"),
  provider_customer_id: text("provider_customer_id"),

  // Billing period
  current_period_start: timestamp("current_period_start", { withTimezone: true }),
  current_period_end: timestamp("current_period_end", { withTimezone: true }),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

// =============================================================================
// Phase 8: Exercise Engine — song-level progress tracking
// =============================================================================

/**
 * user_song_progress table — per-user progress for each song version.
 *
 * Tracks completion percentage and best accuracy across exercise types.
 * Stars are ALWAYS derived at read time via deriveStars() — never stored.
 *
 * - completion_pct: 0.0–1.0 fraction of exercises completed for the song
 * - ex1_2_3_best_accuracy: best accuracy across vocab_meaning, meaning_vocab, reading_match
 * - ex4_best_accuracy: best accuracy for fill_lyric (separate — different difficulty profile)
 */
export const userSongProgress = pgTable("user_song_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  song_version_id: uuid("song_version_id").notNull().references(() => songVersions.id),

  // Progress
  completion_pct: real("completion_pct").default(0).notNull(),

  // Best accuracy per exercise group (null until attempted)
  ex1_2_3_best_accuracy: real("ex1_2_3_best_accuracy"),
  ex4_best_accuracy: real("ex4_best_accuracy"),

  // Session counter
  sessions_completed: integer("sessions_completed").default(0).notNull(),

  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("user_song_progress_user_version_unique").on(table.user_id, table.song_version_id),
  index("user_song_progress_user_id_idx").on(table.user_id),
]);

export type UserSongProgress = typeof userSongProgress.$inferSelect;
export type NewUserSongProgress = typeof userSongProgress.$inferInsert;

/**
 * deriveStars — compute star rating from progress at read time.
 *
 * Stars are NEVER stored as a column — they are always derived from accuracy values.
 * - 2 stars: both ex1_2_3 and ex4 accuracy >= 80%
 * - 1 star: ex1_2_3 accuracy >= 80% (ex4 not yet attempted or below threshold)
 * - 0 stars: below threshold or no attempts yet
 */
export function deriveStars(
  progress: { ex1_2_3_best_accuracy: number | null; ex4_best_accuracy: number | null }
): 0 | 1 | 2 {
  if ((progress.ex1_2_3_best_accuracy ?? 0) >= 0.80 && (progress.ex4_best_accuracy ?? 0) >= 0.80) return 2;
  if ((progress.ex1_2_3_best_accuracy ?? 0) >= 0.80) return 1;
  return 0;
}

/**
 * vocab_global materialized view — aggregates vocabulary items across all song versions.
 *
 * Joins song_versions with vocabulary_items via LATERAL jsonb_array_elements on the
 * lesson vocabulary array. Requires vocab_item_id to be patched into the JSONB by the
 * backfill script (Phase 7 Plan 02) before rows appear.
 *
 * The unique index on (vocab_item_id, song_id, version_type) enables CONCURRENTLY refresh.
 * Refresh is triggered on song update via refreshVocabGlobal() in queries.ts.
 */
export const vocabGlobal = pgMaterializedView("vocab_global", {
  vocab_item_id: uuid("vocab_item_id"),
  song_id: uuid("song_id"),
  version_type: text("version_type"),
  dictionary_form: text("dictionary_form"),
  reading: text("reading"),
  jlpt_level: text("jlpt_level"),
}).as(sql`
  SELECT
    vi.id AS vocab_item_id,
    sv.song_id,
    sv.version_type,
    vi.dictionary_form,
    vi.reading,
    vi.jlpt_level
  FROM song_versions sv
  CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
  JOIN vocabulary_items vi ON vi.id = (elem->>'vocab_item_id')::uuid
  WHERE sv.lesson IS NOT NULL
    AND elem->>'vocab_item_id' IS NOT NULL
`);
