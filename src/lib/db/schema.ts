import {
  pgTable,
  pgEnum,
  pgMaterializedView,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  date,
  unique,
  boolean,
  real,
  smallint,
  index,
  primaryKey,
  numeric,
  check,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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
 * Phase 11.5 enums — admin lyrics editor versioning, pipeline status, quality flags.
 */
export const lyricsVersionSourceEnum = pgEnum("lyrics_version_source",
  ["auto", "ai-assist", "human", "regen"]);
export const pipelineStatusEnum = pgEnum("pipeline_status",
  ["idle", "rerun_in_progress", "rerun_failed"]);
export const qualityStatusEnum = pgEnum("quality_status",
  ["active", "flagged_wrong_song", "flagged_unfixable"]);

/**
 * Phase 11.6 — dual FSRS cards per vocabulary item.
 * romaji_meaning: Vocab track (user knows what this word means in romaji)
 * kanji_kana: Kanji track (user can read / produce the kanji/kana form)
 */
export const cardKindEnum = pgEnum("card_kind", ["romaji_meaning", "kanji_kana"]);

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

  // ISO 639-1 code of the vocal language. "ja" for Japanese (default); other
  // values mark tracks whose lyrics are wholly non-Japanese (AoT OSTs in
  // German, English, Latin, etc.) — these are hidden from the learning UI
  // because their vocab/grammar content is empty.
  language: text("language").default("ja").notNull(),

  // JLPT and difficulty — assigned by Claude during content generation
  // Reflects the TV version when available, otherwise the full version
  jlpt_level: jlptEnum("jlpt_level"),
  difficulty_tier: difficultyEnum("difficulty_tier"),

  // Content schema versioning — increment when Lesson type changes
  content_schema_version: integer("content_schema_version").default(1).notNull(),

  // Phase 11.5: quality flagging — admin can mark songs as wrong or unfixable
  quality_status: qualityStatusEnum("quality_status").default("active").notNull(),
  quality_notes: text("quality_notes"),

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

  // Lyrics metadata — ACTIVE rendered lyrics (what the player uses).
  // The canonical / whisper sources below are the immutable per-source records;
  // these three fields are the pointer into whichever source is currently active.
  lyrics_source: text("lyrics_source"), // "lrclib" | "genius" | "whisper_transcription"
  synced_lrc: jsonb("synced_lrc"), // Array of {startMs, text} from LRCLIB

  // Offset (ms) added to every synced_lrc / verse timestamp before rendering.
  // LRCLIB timings are aligned to a reference audio that often differs from the
  // YouTube cut by a few seconds of intro silence — a positive offset delays
  // the highlight, a negative one pulls it earlier.
  lyrics_offset_ms: integer("lyrics_offset_ms").default(0).notNull(),

  // Dual-source lyrics — both providers preserved permanently so validator
  // flips never destroy data and a future review UI can show side-by-side.
  // Shape: { source, raw_lyrics, synced_lrc, fetched_at }
  canonical_lyrics: jsonb("canonical_lyrics"),
  // Shape: { model, raw_lyrics, words, kcov_against_canonical, transcribed_at }
  whisper_lyrics: jsonb("whisper_lyrics"),

  // Timing data — WhisperX word-level timestamps, corrected via timing editor
  timing_youtube_id: text("timing_youtube_id"),
  timing_data: jsonb("timing_data"),
  timing_verified: timingVerifiedEnum("timing_verified").default("auto").notNull(),

  // Phase 11.5: versioned lyrics pointer + pipeline/quality columns
  // active_lyrics_version_id FK is enforced by the DB; declared as plain uuid here
  // to avoid a Drizzle forward-reference issue (lyricsVersions defined below).
  active_lyrics_version_id: uuid("active_lyrics_version_id"),
  pipeline_status: pipelineStatusEnum("pipeline_status").default("idle").notNull(),
  pipeline_step: text("pipeline_step"),
  pipeline_started_at: timestamp("pipeline_started_at", { withTimezone: true }),

  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("song_versions_song_id_version_type_unique").on(table.song_id, table.version_type),
]);

export type Song = typeof songs.$inferSelect;
export type SongVersion = typeof songVersions.$inferSelect;

// =============================================================================
// Phase 11.5: Admin Lyrics Editor — versioned lyrics, drafts, video history
// =============================================================================

/**
 * lyrics_versions — indefinite-retention snapshot per published lyrics edit.
 *
 * source IN ('auto','ai-assist','human','regen'). The self-FK on parent_version_id
 * powers gap-analysis CTEs: for each human row find its parent ai-assist row and diff.
 *
 * IMPORTANT: parent_version_id uses the `(): AnyPgColumn =>` annotation to prevent
 * TypeScript's "referenced directly or indirectly in its own initializer" error.
 */
export const lyricsVersions = pgTable("lyrics_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  song_version_id: uuid("song_version_id").notNull()
    .references(() => songVersions.id),  // NO cascade — preserve history
  version_number: integer("version_number").notNull(),
  source: lyricsVersionSourceEnum("source").notNull(),
  editor_id: text("editor_id"),
  verses: jsonb("verses").notNull(),
  // Self-FK requires AnyPgColumn return type annotation to avoid circular initializer error
  parent_version_id: uuid("parent_version_id")
    .references((): AnyPgColumn => lyricsVersions.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("lyrics_versions_song_version_id_version_number_unique")
    .on(t.song_version_id, t.version_number),
  index("lyrics_versions_song_version_id_created_at_idx")
    .on(t.song_version_id, t.created_at.desc()),
]);

/**
 * lyrics_drafts — single in-flight draft per (song_version, editor).
 *
 * base_version_id used for stale-publish detection (D-18).
 * dirty_verse_numbers scopes Regenerate Lessons (D-07).
 */
export const lyricsDrafts = pgTable("lyrics_drafts", {
  song_version_id: uuid("song_version_id").notNull()
    .references(() => songVersions.id, { onDelete: "cascade" }),
  editor_id: text("editor_id").notNull(),
  base_version_id: uuid("base_version_id").notNull()
    .references(() => lyricsVersions.id),
  verses: jsonb("verses").notNull(),
  dirty_verse_numbers: integer("dirty_verse_numbers").array().default([]).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.song_version_id, t.editor_id] }),
]);

/**
 * song_video_history — audit log of YouTube video swaps for a song version.
 *
 * Allows admins to trace every video change and reason. ON DELETE CASCADE
 * because history is meaningless without the parent song version.
 */
export const songVideoHistory = pgTable("song_video_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  song_version_id: uuid("song_version_id").notNull()
    .references(() => songVersions.id, { onDelete: "cascade" }),
  old_youtube_id: text("old_youtube_id"),
  new_youtube_id: text("new_youtube_id").notNull(),
  changed_at: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  changed_by: text("changed_by").notNull(),
  reason: text("reason"),
});

export type LyricsVersion = typeof lyricsVersions.$inferSelect;
export type LyricsVersionInsert = typeof lyricsVersions.$inferInsert;
export type LyricsDraft = typeof lyricsDrafts.$inferSelect;
export type LyricsDraftInsert = typeof lyricsDrafts.$inferInsert;
export type SongVideoHistory = typeof songVideoHistory.$inferSelect;

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

  // Phase 11.4 enrichment field — nullable. Populated by scripts/seed/19b-load-vocab-images.ts.
  image_url: text("image_url"),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("vocabulary_items_form_reading_unique").on(table.dictionary_form, table.reading),
]);

export type VocabularyItem = typeof vocabularyItems.$inferSelect;

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

  // Phase 11.6: dual FSRS cards per word — romaji_meaning | kanji_kana
  // NOT NULL enforced at SQL layer; enum prevents invalid values.
  card_kind: cardKindEnum("card_kind").notNull(),

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
  // Phase 11.6: composite unique on (user_id, vocab_item_id, card_kind)
  // Replaces prior (user_id, vocab_item_id) unique — migration 0017 drops the old constraint.
  unique("user_vocab_mastery_user_vocab_kind_unique").on(table.user_id, table.vocab_item_id, table.card_kind),
  index("user_vocab_mastery_due_idx").on(table.due),
  index("user_vocab_mastery_user_due_idx").on(table.user_id, table.due),
]);

export type UserVocabMastery = typeof userVocabMastery.$inferSelect;

/**
 * user_verse_domination table — Phase 11.6 per-verse mastery state.
 *
 * A row is inserted when the last required item in a verse (across all applicable
 * tracks: vocab romaji_meaning, grammar, kanji_kana) is answered correctly at
 * least once. Composite PK makes inserts idempotent (ON CONFLICT DO NOTHING pattern).
 *
 * Per SPEC-REQ-13: tracks with zero applicable items in a given verse auto-pass.
 * dominated_at is set on the tipping answer and never updated (SPEC-REQ-13: idempotent).
 */
export const userVerseDomination = pgTable("user_verse_domination", {
  user_id: text("user_id").notNull(),
  song_version_id: uuid("song_version_id").notNull().references(() => songVersions.id, { onDelete: "cascade" }),
  verse_number: integer("verse_number").notNull(),
  dominated_at: timestamp("dominated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.user_id, table.song_version_id, table.verse_number] }),
  index("user_verse_domination_user_song_idx").on(table.user_id, table.song_version_id),
]);

export type UserVerseDomination = typeof userVerseDomination.$inferSelect;

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

/**
 * users table — Phase 08.4.
 * Home for user preferences. Provider-agnostic (id is a text PK matching Clerk user_id).
 * Intentionally minimal for now; grows as Phase 10+ add more prefs.
 *
 * skip_learning=false means "do NOT skip" (cards show) — default matches CONTEXT "default ON".
 * new_card_cap=10 is the locked default from research (Phase 08.4 RESEARCH Area 7).
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  skip_learning: boolean("skip_learning").default(false).notNull(),
  new_card_cap: integer("new_card_cap").default(10).notNull(),
  // Phase 11: Cross-Song Vocabulary — daily new-card introduction counter.
  // Distinct namespace from new_card_cap (per-session cap). Reset daily by upsert logic in Plan 05.
  review_new_today: integer("review_new_today").notNull().default(0),
  review_new_today_date: date("review_new_today_date"),
  // Phase 12: Gamification — XP and level
  xpTotal: integer("xp_total").notNull().default(0),
  level: integer("level").notNull().default(1),
  // Phase 12: Gamification — daily XP soft-cap tracking
  xpToday: integer("xp_today").notNull().default(0),
  xpTodayDate: date("xp_today_date"),
  // Phase 12: Gamification — streak tracking
  streakCurrent: integer("streak_current").notNull().default(0),
  streakBest: integer("streak_best").notNull().default(0),
  lastStreakDate: date("last_streak_date"),
  streakTz: text("streak_tz"),
  graceUsedThisWeek: boolean("grace_used_this_week").notNull().default(false),
  streakWeekStart: date("streak_week_start"),
  // Phase 12: Learning Path — current node position
  currentPathNodeSlug: text("current_path_node_slug"),
  // Phase 12: Audio + haptics preferences (default ON per CONTEXT)
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  hapticsEnabled: boolean("haptics_enabled").notNull().default(true),
  // Phase 14: theme preference — 'system' | 'light' | 'dark' (DB CHECK enforces enum)
  themePreference: text("theme_preference").notNull().default("system"),
  // Phase 14.4: Virality & Engagement
  social_activity_enabled: boolean("social_activity_enabled").notNull().default(false),
  streak_saver_token: integer("streak_saver_token").notNull().default(0),
  streak_saver_pending: boolean("streak_saver_pending").notNull().default(false),
  // ─── Phase 18: Legal & Compliance ────────────────────────────────────────────
  date_of_birth: date("date_of_birth"),
  is_minor: boolean("is_minor"),
  terms_accepted_at: timestamp("terms_accepted_at", { withTimezone: true }),
  terms_version: text("terms_version"),
  minor_defaults_applied: boolean("minor_defaults_applied").default(false),
  marketing_email_opt_in: boolean("marketing_email_opt_in").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;

// =============================================================================
// Phase 12: Learning Path & Gamification — cosmetic system
// =============================================================================

/**
 * user_cosmetics table — tracks unlocked + equipped cosmetic items per user.
 *
 * Each row represents a cosmetic slot (avatar_border, color_theme, badge) that the
 * user has unlocked via leveling up. equipped=true means this is the active item
 * for the slot_type. At most one equipped per (user_id, slot_type) — enforced by
 * application logic in Plan 06.
 *
 * slot_id references reward_slot_definitions.id.
 */
export const userCosmetics = pgTable("user_cosmetics", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slot_id: text("slot_id").notNull(),
  unlocked_at: timestamp("unlocked_at", { withTimezone: true }).defaultNow(),
  equipped: boolean("equipped").default(false),
}, (table) => [
  unique("user_cosmetics_user_slot_unique").on(table.user_id, table.slot_id),
  index("user_cosmetics_user_id_idx").on(table.user_id),
]);

export type UserCosmetic = typeof userCosmetics.$inferSelect;

/**
 * reward_slot_definitions table — v3.0 cosmetic catalog + v4.0 Phase 21 cultural content slots.
 *
 * Data-driven: v4.0 Phase 21 inserts new rows (anime scenes, cultural vocabulary content)
 * without code changes. Each slot is keyed by a unique text id (e.g. "avatar_border_kitsune_fire").
 *
 * slot_type: "avatar_border" | "color_theme" | "badge" | (future: "anime_scene" | "cultural_vocab")
 * level_threshold: minimum user level required to unlock this slot
 * content: typed JSONB — shape varies by slot_type (see Plan 03 for the TypeScript interface)
 * active: false = slot is disabled / retired without data loss
 *
 * Note: content is typed as plain jsonb for now — Plan 03 narrows it to RewardSlotContent.
 */
export const rewardSlotDefinitions = pgTable("reward_slot_definitions", {
  id: text("id").primaryKey(),
  slot_type: text("slot_type").notNull(),
  level_threshold: integer("level_threshold").notNull(),
  content: jsonb("content").notNull(),
  active: boolean("active").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type RewardSlotDefinition = typeof rewardSlotDefinitions.$inferSelect;

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
 *
 * Phase 10 additions (nullable, populated on first Ex5/6/7 attempt):
 * - ex5_best_accuracy: best accuracy for grammar_conjugation (bonus badge)
 * - ex6_best_accuracy: best accuracy for listening_drill (drives Star 3)
 * - ex7_best_accuracy: best accuracy for sentence_order (bonus badge)
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
  // Phase 10: advanced exercise accuracy columns
  ex5_best_accuracy: real("ex5_best_accuracy"),  // grammar_conjugation (bonus badge)
  ex6_best_accuracy: real("ex6_best_accuracy"),  // listening_drill — drives Star 3 for vocab-only songs
  ex7_best_accuracy: real("ex7_best_accuracy"),  // sentence_order (bonus badge)
  // Phase 13: grammar session accuracy — replaces ex6 in Star 3 gate for songs
  // that have at least one grammar rule. Updated by the "grammar" sessionType
  // branch in applyGamificationUpdate.
  grammar_best_accuracy: real("grammar_best_accuracy"),

  // Phase 11.6: denormalized per-track progress percentages + advanced drills unlock gate.
  // Computed server-side by recordVocabAnswer / saveSessionResults and written atomically.
  // null = track has never been attempted / computed.
  vocab_track_pct: numeric("vocab_track_pct", { precision: 5, scale: 2 }),
  grammar_track_pct: numeric("grammar_track_pct", { precision: 5, scale: 2 }),
  kanji_track_pct: numeric("kanji_track_pct", { precision: 5, scale: 2 }),
  // Set on the answer that pushes all three tracks to ≥ 80%. Per SPEC-REQ-10:
  // reverts to NULL if any track falls back below 80% (live-recompute).
  advanced_drills_unlocked_at: timestamp("advanced_drills_unlocked_at", { withTimezone: true }),

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

/**
 * user_exercise_song_counters table — Phase 10 premium quota gate.
 *
 * Tracks the set of distinct song_version_id values a user has attempted per
 * exercise_family ("listening" or "advanced_drill"). COUNT(*) WHERE
 * (user_id, exercise_family) gives "songs used" for the FREE-05 quota check.
 *
 * A row is inserted on the user's FIRST answer in an Ex5/6/7 session for a song
 * (via INSERT ... ON CONFLICT DO NOTHING — idempotent). The gate
 * `checkExerciseAccess` consults this count via `getSongCountForFamily` and
 * `userHasTouchedSong` in src/lib/exercises/counters.ts.
 *
 * QUOTA_LIMITS (src/lib/exercises/feature-flags.ts):
 *   listening       → 10 songs free
 *   advanced_drill  →  3 songs free (shared across grammar_conjugation + sentence_order)
 */
export const userExerciseSongCounters = pgTable("user_exercise_song_counters", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  exercise_family: text("exercise_family").notNull(), // "listening" | "advanced_drill"
  song_version_id: uuid("song_version_id").notNull().references(() => songVersions.id),
  first_attempt_at: timestamp("first_attempt_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("user_exercise_song_counters_user_family_version_unique").on(
    table.user_id,
    table.exercise_family,
    table.song_version_id
  ),
  index("user_exercise_song_counters_user_family_idx").on(table.user_id, table.exercise_family),
]);

export type UserExerciseSongCounter = typeof userExerciseSongCounters.$inferSelect;

/**
 * song_plays table — one row per first-play event per mount.
 *
 * Fired from YouTubeEmbed on the first YT PLAYING state transition per page
 * mount. A random session_key generated per mount plus a unique
 * (song_version_id, session_key) constraint means repeated plays of the same
 * song within one page view collapse to a single row. Reloading the page or
 * switching versions generates a fresh session_key → fresh row.
 *
 * user_id is nullable: anonymous visitors still contribute to the total play
 * count shown on SongCard. "X learners" (distinct users) should filter
 * WHERE user_id IS NOT NULL — anonymous plays count toward total volume only.
 */
export const songPlays = pgTable("song_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  song_version_id: uuid("song_version_id").notNull().references(() => songVersions.id, { onDelete: "cascade" }),
  user_id: text("user_id"),
  session_key: text("session_key").notNull(),
  played_at: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("song_plays_version_session_unique").on(table.song_version_id, table.session_key),
  index("song_plays_song_version_id_idx").on(table.song_version_id),
  index("song_plays_user_id_idx").on(table.user_id),
]);

export type SongPlay = typeof songPlays.$inferSelect;

/**
 * deriveStars — compute star rating from progress at read time.
 *
 * Stars are NEVER stored as a column — they are always derived from accuracy values.
 *
 * Phase 13: the Star 3 gate is polymorphic on whether the song has grammar rules.
 *   - Song has grammar rules → Star 3 gate uses grammar_best_accuracy
 *     (the grammar session is how you master this song).
 *   - Song has no grammar rules → Star 3 gate uses ex6_best_accuracy
 *     (listening drill, the original Phase 10 gate — preserved for instrumentals
 *     and short OPs with no grammar points).
 * The caller passes `songHasGrammar`; it is required to pick the right gate.
 *
 * Ordering invariant: higher stars require lower stars. A user cannot skip to
 * Star 3 by only passing the final gate — Ex 1-3 AND Ex 4 must also be ≥80%.
 */
export function deriveStars(
  progress: {
    ex1_2_3_best_accuracy: number | null;
    ex4_best_accuracy: number | null;
    ex6_best_accuracy?: number | null;
    grammar_best_accuracy?: number | null;
  },
  songHasGrammar: boolean = false
): 0 | 1 | 2 | 3 {
  const e123 = progress.ex1_2_3_best_accuracy ?? 0;
  const e4 = progress.ex4_best_accuracy ?? 0;
  const finalGate = songHasGrammar
    ? (progress.grammar_best_accuracy ?? 0)
    : (progress.ex6_best_accuracy ?? 0);
  if (e123 >= 0.80 && e4 >= 0.80 && finalGate >= 0.80) return 3;
  if (e123 >= 0.80 && e4 >= 0.80) return 2;
  if (e123 >= 0.80) return 1;
  return 0;
}

// ─── Phase 14.4: Virality & Engagement ───────────────────────────────────────

/**
 * activity_events table — song-mastery events for the home "Recently Mastered" ticker.
 *
 * One row per (user_id, song_id) — UNIQUE constraint prevents duplicate mastery events.
 * Emitted by applyGamificationUpdate when previousStars < 3 && newStars === 3 (D-07).
 * Only users with social_activity_enabled=true appear in the ticker (D-10).
 */
export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    event_type: text("event_type").notNull(),
    song_id: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    song_version_id: uuid("song_version_id")
      .notNull()
      .references(() => songVersions.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("activity_events_user_song_unique").on(table.user_id, table.song_id),
    index("activity_events_created_at_idx").on(table.created_at),
    index("activity_events_user_id_idx").on(table.user_id),
    check("activity_events_event_type_check", sql`event_type = 'song_mastered'`),
  ]
);

export type ActivityEvent = typeof activityEvents.$inferSelect;

/**
 * email_sent_log table — idempotency guard for all transactional emails.
 *
 * Composite PK (user_id, kind, period_key) prevents double-sending per period.
 * period_key = YYYY-MM-DD for daily_reminder; YYYY-Www for weekly_recap (D-02/D-05).
 */
export const emailSentLog = pgTable(
  "email_sent_log",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    period_key: text("period_key").notNull(),
    sent_at: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.kind, table.period_key] }),
  ]
);

export type EmailSentLog = typeof emailSentLog.$inferSelect;

/**
 * deriveBonusBadge — Phase 10 bonus mastery badge predicate.
 *
 * Returns true when BOTH Grammar Conjugation (Ex 5) and Sentence Order (Ex 7)
 * best accuracy are at >= 80%. Bonus badge is NOT gated on stars per STAR-06 —
 * it is an independent signal shown alongside stars on the song catalog card.
 *
 * Null accuracy (never attempted) counts as 0 — cannot earn the badge without
 * a qualifying pass on each exercise.
 */
export function deriveBonusBadge(
  progress: {
    ex5_best_accuracy: number | null;
    ex7_best_accuracy: number | null;
  }
): boolean {
  return (progress.ex5_best_accuracy ?? 0) >= 0.80
      && (progress.ex7_best_accuracy ?? 0) >= 0.80;
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

// =============================================================================
// Phase 13: Grammar System — normalized rules, exercise bank, per-rule FSRS
// =============================================================================

/**
 * grammar_rules table — canonical rules extracted from lesson.grammar_points.
 *
 * Identity = (name, jlpt_reference). A rule like "〜たい (want to)" at N5
 * collapses to one row regardless of which song references it, so the exercise
 * bank and FSRS mastery are shared across every song using that rule.
 */
export const grammarRules = pgTable("grammar_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  jlpt_reference: text("jlpt_reference").notNull(),
  // Localizable multilingual explanation e.g. {"en": "...", "pt-BR": "..."}
  explanation: jsonb("explanation").notNull(),
  // Optional template used to seed the exercise generator, e.g. "VERB-stem + たい"
  canonical_conjugation_template: text("canonical_conjugation_template"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("grammar_rules_name_jlpt_unique").on(table.name, table.jlpt_reference),
]);

export type GrammarRuleRow = typeof grammarRules.$inferSelect;

/**
 * grammar_exercises table — on-demand exercise bank, capped at 100 per (rule, level).
 *
 * Populated lazily by src/lib/exercises/grammar-ai.ts when a session needs more
 * exercises than the bank currently holds. The 100-item ceiling is enforced by
 * the application before each AI call, not by a DB constraint.
 *
 * level: "beginner" | "intermediate" | "advanced"
 * exercise_type:
 *   - "mcq_fill_blank" → beginner + intermediate (4 options, one blank)
 *   - "write_romaji"   → advanced (free-text romaji input, accepted with normalization)
 */
export const grammarExercises = pgTable("grammar_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  grammar_rule_id: uuid("grammar_rule_id").notNull().references(() => grammarRules.id, { onDelete: "cascade" }),
  level: text("level").notNull(),
  exercise_type: text("exercise_type").notNull(),
  prompt_jp_furigana: text("prompt_jp_furigana").notNull(),
  prompt_romaji: text("prompt_romaji"),
  prompt_translation: jsonb("prompt_translation").notNull(),
  blank_token_index: integer("blank_token_index").notNull(),
  correct_answer: text("correct_answer").notNull(),
  distractors: jsonb("distractors"),
  hint: text("hint"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("grammar_exercises_rule_level_idx").on(table.grammar_rule_id, table.level),
]);

export type GrammarExerciseRow = typeof grammarExercises.$inferSelect;

/**
 * song_version_grammar_rules — join table linking songs to normalized rules.
 *
 * Replaces the JSONB-only link in lesson.grammar_points. The JSONB entries are
 * preserved for display (name, explanation, per-song conjugation_path) but the
 * exercise bank and mastery tracking key off this table.
 */
export const songVersionGrammarRules = pgTable("song_version_grammar_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  song_version_id: uuid("song_version_id").notNull().references(() => songVersions.id, { onDelete: "cascade" }),
  grammar_rule_id: uuid("grammar_rule_id").notNull().references(() => grammarRules.id, { onDelete: "cascade" }),
  display_order: integer("display_order").default(0).notNull(),
  conjugation_path: text("conjugation_path"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("song_version_grammar_rules_version_rule_unique").on(table.song_version_id, table.grammar_rule_id),
  index("song_version_grammar_rules_version_idx").on(table.song_version_id),
]);

export type SongVersionGrammarRule = typeof songVersionGrammarRules.$inferSelect;

/**
 * user_grammar_rule_mastery — per-user FSRS state per grammar rule.
 *
 * Parallel to user_vocab_mastery (Pattern 3 scalar columns for indexed due-date
 * queries). current_level advances beginner → intermediate → advanced via
 * promoteIfEligible() in grammar-fsrs.ts when the learner is stable at the
 * current level (stability >= 21d AND reps >= 8 AND recent_grades has no lapse).
 *
 * recent_grades stores the last three FSRS grades at the current level only —
 * reset on promotion so the new level starts its own streak.
 */
export const userGrammarRuleMastery = pgTable("user_grammar_rule_mastery", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  grammar_rule_id: uuid("grammar_rule_id").notNull().references(() => grammarRules.id, { onDelete: "cascade" }),
  current_level: text("current_level").default("beginner").notNull(),

  // FSRS scalar columns — same shape as user_vocab_mastery
  stability: real("stability"),
  difficulty: real("difficulty"),
  elapsed_days: integer("elapsed_days").default(0).notNull(),
  scheduled_days: integer("scheduled_days").default(0).notNull(),
  reps: integer("reps").default(0).notNull(),
  lapses: integer("lapses").default(0).notNull(),
  state: smallint("state").default(0).notNull(),
  due: timestamp("due", { withTimezone: true }).defaultNow().notNull(),
  last_review: timestamp("last_review", { withTimezone: true }),

  recent_grades: jsonb("recent_grades").default(sql`'[]'::jsonb`).notNull(),

  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("user_grammar_rule_mastery_user_rule_unique").on(table.user_id, table.grammar_rule_id),
  index("user_grammar_rule_mastery_due_idx").on(table.due),
  index("user_grammar_rule_mastery_user_due_idx").on(table.user_id, table.due),
]);

export type UserGrammarRuleMastery = typeof userGrammarRuleMastery.$inferSelect;

/**
 * user_grammar_exercise_log — immutable per-answer log, parallel to
 * user_exercise_log for vocab. song_version_id is nullable to leave room for a
 * future cross-song grammar practice entry point (Phase 14 placeholder).
 */
export const userGrammarExerciseLog = pgTable("user_grammar_exercise_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  grammar_rule_id: uuid("grammar_rule_id").notNull().references(() => grammarRules.id),
  grammar_exercise_id: uuid("grammar_exercise_id").notNull().references(() => grammarExercises.id),
  song_version_id: uuid("song_version_id").references(() => songVersions.id),
  level_at_attempt: text("level_at_attempt").notNull(),
  correct: boolean("correct").notNull(),
  rating: smallint("rating").notNull(),
  response_time_ms: integer("response_time_ms"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("user_grammar_exercise_log_user_rule_idx").on(table.user_id, table.grammar_rule_id),
]);

export type UserGrammarExerciseLog = typeof userGrammarExerciseLog.$inferSelect;

/**
 * anime_metadata table — per-anime visuals pulled from AniList.
 *
 * Keyed on the raw `songs.anime` title so a franchise's seasons/movies each
 * get their own banner when AniList has one. Seeded by
 * scripts/seed/13-fetch-anime-metadata.ts.
 */
export const animeMetadata = pgTable("anime_metadata", {
  anime: text("anime").primaryKey(),
  anilist_id: integer("anilist_id"),
  title_english: text("title_english"),
  title_native: text("title_native"),
  banner_image: text("banner_image"),
  cover_image: text("cover_image"),
  fetched_at: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AnimeMetadata = typeof animeMetadata.$inferSelect;

// ─── Phase 18: Legal & Compliance ────────────────────────────────────────────

/**
 * cookie_consent_record table — PECR audit log for cookie consent decisions.
 *
 * One row per consent interaction. user_id is nullable so anonymous visitor
 * decisions are recorded before sign-up. decision IN ('accepted','rejected','partial').
 * categories is a JSONB object keyed by category slug (analytics, marketing, etc.)
 * with boolean values reflecting the user's per-category choice.
 */
export const cookieConsentRecord = pgTable(
  "cookie_consent_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id"),
    consent_timestamp: timestamp("consent_timestamp", { withTimezone: true }).defaultNow().notNull(),
    consent_version: text("consent_version").notNull(),
    categories: jsonb("categories").notNull(),
    decision: text("decision").notNull(),
    ip_hash: text("ip_hash"),
    user_agent: text("user_agent"),
  },
  (table) => [
    index("cookie_consent_record_user_id_idx").on(table.user_id),
    index("cookie_consent_record_timestamp_idx").on(table.consent_timestamp),
  ]
);
export type CookieConsentRecord = typeof cookieConsentRecord.$inferSelect;

/**
 * sar_log table — Subject Access Request accountability log for ICO/DPA audit trail.
 *
 * One row per SAR received. response_date and outcome are nullable until the
 * request is resolved. notes can contain handling notes for the DPO.
 * The ICO requires SAR responses within 30 days — this log tracks that SLA.
 */
export const sarLog = pgTable(
  "sar_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id_or_email: text("user_id_or_email").notNull(),
    request_date: timestamp("request_date", { withTimezone: true }).defaultNow().notNull(),
    response_date: timestamp("response_date", { withTimezone: true }),
    outcome: text("outcome"),
    notes: text("notes"),
  },
  (table) => [
    index("sar_log_user_id_idx").on(table.user_id_or_email),
  ]
);
export type SarLog = typeof sarLog.$inferSelect;
