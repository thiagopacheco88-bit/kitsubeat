import { eq, sql, asc, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  songs,
  songVersions,
  vocabGlobal,
  userSongProgress,
  deriveStars,
  type SongVersion,
} from "./schema";

// ---------------------------------------------------------------------------
// Song detail page
// ---------------------------------------------------------------------------

/**
 * Get a single song by slug, including all its versions (tv, full).
 */
export async function getSongBySlug(slug: string) {
  const rows = await db
    .select()
    .from(songs)
    .where(eq(songs.slug, slug))
    .limit(1);

  const song = rows[0] ?? null;
  if (!song) return null;

  const versions = await db
    .select()
    .from(songVersions)
    .where(eq(songVersions.song_id, song.id));

  return { ...song, versions };
}

export type SongWithVersions = NonNullable<Awaited<ReturnType<typeof getSongBySlug>>>;

// ---------------------------------------------------------------------------
// Browse / list pages
// ---------------------------------------------------------------------------

/**
 * Get all songs with metadata for the browse page.
 * Includes the preferred youtube_id (tv > full) for thumbnails.
 *
 * Phase 10 Plan 07 — when `userId` is supplied, five per-user progress fields
 * are joined in via a single correlated SELECT against `user_song_progress`:
 * ex1_2_3 / ex4 / ex5 / ex6 / ex7 best_accuracy (all nullable). SongCard then
 * computes stars (via deriveStars, consuming ex6) and bonus badge (via
 * deriveBonusBadge, consuming ex5 + ex7) at render time.
 *
 * The subquery uses `LIMIT 1 ORDER BY tv first` on `user_song_progress` joined
 * by `song_version_id → song_versions.id` WHERE `song_id = songs.id`. That
 * matches the same version the thumbnail is sourced from, so stars surfaced on
 * the catalog card correspond to the version the user plays when they click
 * in. No N+1: a single catalog query still returns the 200 rows.
 *
 * Unauthenticated callers pass no userId — the accuracy fields return null and
 * SongCard short-circuits to the zero-star / no-bonus branch (no ribbon, no
 * badge).
 */
export async function getAllSongs(userId?: string | null) {
  const userIdParam = userId ?? null;
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      season_info: songs.season_info,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      year_launched: songs.year_launched,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
      genre_tags: songs.genre_tags,
      mood_tags: songs.mood_tags,
      // Phase 10 Plan 07 — per-user accuracy fields for the SongCard stars +
      // bonus-badge derivation. NULL for unauthenticated callers AND for
      // rows where the user has never attempted the respective exercise.
      // Scoped to the tv-preferred song_version so the stars match the
      // version the user plays when they click into the card.
      ex1_2_3_best_accuracy: sql<number | null>`(
        SELECT p.ex1_2_3_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex4_best_accuracy: sql<number | null>`(
        SELECT p.ex4_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex5_best_accuracy: sql<number | null>`(
        SELECT p.ex5_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex6_best_accuracy: sql<number | null>`(
        SELECT p.ex6_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      ex7_best_accuracy: sql<number | null>`(
        SELECT p.ex7_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      completion_pct: sql<number | null>`(
        SELECT p.completion_pct FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .orderBy(asc(songs.popularity_rank));
}

export type SongListItem = Awaited<ReturnType<typeof getAllSongs>>[number];

// ---------------------------------------------------------------------------
// Home page carousels
// ---------------------------------------------------------------------------

/**
 * Get featured songs for the home page.
 */
export async function getFeaturedSongs(limit: number = 6) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

export type FeaturedSong = Awaited<ReturnType<typeof getFeaturedSongs>>[number];

/**
 * Get anime names with song counts for the "Browse by Anime" section.
 */
export async function getTopAnime(limit: number = 8) {
  return db
    .select({
      anime: songs.anime,
      count: sql<number>`count(*)::int`,
      youtube_id: sql<string | null>`(array_agg(
        (SELECT sv.youtube_id FROM song_versions sv
         WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
         ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
      )))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .groupBy(songs.anime)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export type AnimeGroup = Awaited<ReturnType<typeof getTopAnime>>[number];

/**
 * Get anime franchises (merging seasons/movies) with song counts.
 */
export async function getTopAnimeFranchises(limit: number = 10) {
  return db
    .select({
      anime: sql<string>`regexp_replace(
        ${songs.anime},
        '( Season\\s.*| Final Season.*|:\\s.*|\\sII$|\\sIII$|\\sIV$| the Movie.*| Alternative.*| Extra.*)',
        '',
        'i'
      )`,
      count: sql<number>`count(*)::int`,
      youtube_id: sql<string | null>`(array_agg(
        (SELECT sv.youtube_id FROM song_versions sv
         WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
         ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
      )))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .groupBy(sql`regexp_replace(
      ${songs.anime},
      '( Season\\s.*| Final Season.*|:\\s.*|\\sII$|\\sIII$|\\sIV$| the Movie.*| Alternative.*| Extra.*)',
      '',
      'i'
    )`)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export type AnimeFranchise = Awaited<ReturnType<typeof getTopAnimeFranchises>>[number];

/**
 * Get top artists with song counts.
 */
export async function getTopArtists(limit: number = 10) {
  return db
    .select({
      artist: songs.artist,
      count: sql<number>`count(*)::int`,
      youtube_id: sql<string | null>`(array_agg(
        (SELECT sv.youtube_id FROM song_versions sv
         WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
         ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
         LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .groupBy(songs.artist)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export type ArtistGroup = Awaited<ReturnType<typeof getTopArtists>>[number];

// ---------------------------------------------------------------------------
// vocab_global materialized view
// ---------------------------------------------------------------------------

/**
 * Refresh the vocab_global materialized view.
 *
 * Should be called after any INSERT/UPDATE on song_versions that modifies lesson content.
 * Uses CONCURRENTLY when the view has at least one row (requires the unique index).
 * Falls back to a blocking refresh on first run (before backfill populates vocab_item_id).
 *
 * Decision: Materialized view refresh on song update (not cron) — locked in research.
 */
export async function refreshVocabGlobal(): Promise<void> {
  try {
    await db.refreshMaterializedView(vocabGlobal).concurrently();
  } catch (err) {
    // CONCURRENTLY requires at least one row and the unique index.
    // On first run (before backfill), fall back to a blocking refresh.
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("concurrently") ||
      message.includes("CONCURRENTLY") ||
      message.includes("at least one row")
    ) {
      await db.refreshMaterializedView(vocabGlobal);
    } else {
      throw err;
    }
  }
}

/**
 * Get beginner-friendly songs (JLPT N5/N4).
 */
export async function getBeginnerSongs(limit: number = 10) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.jlpt_level} IN ('N5', 'N4')`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

/**
 * Get recently added songs.
 */
export async function getRecentSongs(limit: number = 10) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    )`)
    .orderBy(sql`${songs.created_at} desc`)
    .limit(limit);
}

// ---------------------------------------------------------------------------
// User song progress
// ---------------------------------------------------------------------------

/**
 * Get a user's progress for a single song version.
 * Returns the row with derived stars, or null if no progress yet.
 */
export async function getUserSongProgress(
  userId: string,
  songVersionId: string
) {
  const rows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ${songVersionId}::uuid`
    )
    .limit(1);

  const row = rows[0] ?? null;
  if (!row) return null;

  return {
    ...row,
    stars: deriveStars({
      ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
      ex4_best_accuracy: row.ex4_best_accuracy,
      // Phase 10: Star 3 requires Ex 6 (Listening Drill) at ≥80%.
      ex6_best_accuracy: row.ex6_best_accuracy,
    }),
  };
}

export type UserSongProgressWithStars = NonNullable<
  Awaited<ReturnType<typeof getUserSongProgress>>
>;

/**
 * Get a user's progress for a batch of song versions.
 * Returns a Map<songVersionId, progress> using a single IN query.
 * Prevents N+1 queries on the browse page (Phase 8 Research Pitfall 6).
 *
 * TODO: call this when Clerk auth is integrated — fetch user progress batch when Clerk auth is integrated
 */
export async function getUserSongProgressBatch(
  userId: string,
  songVersionIds: string[]
): Promise<Map<string, UserSongProgressWithStars>> {
  if (songVersionIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(userSongProgress)
    .where(
      sql`${userSongProgress.user_id} = ${userId} AND ${userSongProgress.song_version_id} = ANY(${sql.raw(`ARRAY[${songVersionIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`
    );

  const result = new Map<string, UserSongProgressWithStars>();
  for (const row of rows) {
    result.set(row.song_version_id, {
      ...row,
      stars: deriveStars({
        ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
        ex4_best_accuracy: row.ex4_best_accuracy,
        // Phase 10: Star 3 requires Ex 6 (Listening Drill) at ≥80%.
        ex6_best_accuracy: row.ex6_best_accuracy,
      }),
    });
  }
  return result;
}

/**
 * Get classic/most popular songs.
 */
export async function getClassicSongs(limit: number = 10) {
  return db
    .select({
      id: songs.id,
      slug: songs.slug,
      title: songs.title,
      artist: songs.artist,
      anime: songs.anime,
      youtube_id: sql<string | null>`(
        SELECT sv.youtube_id FROM song_versions sv
        WHERE sv.song_id = songs.id AND sv.youtube_id IS NOT NULL
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      jlpt_level: songs.jlpt_level,
      difficulty_tier: songs.difficulty_tier,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.popularity_rank} IS NOT NULL`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

// =============================================================================
// Phase 11: Cross-Song Vocabulary — five read-only query functions
// =============================================================================

/**
 * Dashboard row shape for getVocabularyDashboard.
 *
 * Tier → state mapping (LOCKED — Path B, phase-local 3-bucket split):
 *   tierFilter 3 (Mastered)  → m.state = 2
 *   tierFilter 2 (Known)     → m.state = 3
 *   tierFilter 1 (Learning)  → m.state = 1
 *
 * DIVERGENCE NOTE: this mapping deliberately differs from src/lib/fsrs/tier.ts,
 * which collapses state=1 and state=3 into TIER_LEARNING (a 2-bucket post-new split).
 * The dashboard is the only surface where users distinguish "relearning" (state=3) from
 * "fresh learning" (state=1), so a richer 3-bucket split is warranted here.
 * tierFor() is NOT modified — the divergence is dashboard-local only.
 */
export interface DashboardRow {
  vocab_item_id: string;
  dictionary_form: string;
  reading: string;
  romaji: string;
  meaning: unknown;
  part_of_speech: string;
  jlpt_level: string | null;
  state: 0 | 1 | 2 | 3;
  due: Date;
  last_review: Date | null;
  reps: number;
  source_song_count: number;
}

/**
 * Returns known-word counts for a specific song and user.
 *
 * Services: CROSS-01 (song-page vocabulary pill)
 *
 * "Known" = state IN (1, 2, 3) — Pitfall 1 in RESEARCH.md: tier 2+ maps to states 1,2,3
 * (NOT raw state >= 2). State 0 is "New/unseen", which is NOT known.
 *
 * DISTINCT on vocab_item_id in the CTE avoids double-counting songs that have both
 * tv and full versions in vocab_global — Pitfall 2 in RESEARCH.md.
 *
 * @param userId  Clerk user_id (text PK in users table)
 * @param songId  UUID of the song (songs.id, NOT song_versions.id)
 */
export async function getKnownWordCountForSong(
  userId: string,
  songId: string
): Promise<{ total: number; known: number; mastered: number; learning: number }> {
  const r = await db.execute<{
    total: number;
    known: number;
    mastered: number;
    learning: number;
  }>(sql`
    WITH song_vocab AS (
      SELECT DISTINCT vg.vocab_item_id
      FROM vocab_global vg
      WHERE vg.song_id = ${songId}::uuid
    )
    SELECT
      COUNT(*)::int                                                        AS total,
      COUNT(*) FILTER (WHERE m.state IN (1, 2, 3))::int                   AS known,
      COUNT(*) FILTER (WHERE m.state = 2)::int                            AS mastered,
      COUNT(*) FILTER (WHERE m.state IN (1, 3))::int                      AS learning
    FROM song_vocab s
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = s.vocab_item_id
      AND m.user_id = ${userId}
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  const row = rows[0] as { total: number; known: number; mastered: number; learning: number } | undefined;
  return {
    total:    Number(row?.total    ?? 0),
    known:    Number(row?.known    ?? 0),
    mastered: Number(row?.mastered ?? 0),
    learning: Number(row?.learning ?? 0),
  };
}

/**
 * Returns the total count of vocabulary items a user has ever seen (state IN (1,2,3)).
 *
 * Services: CROSS-02 (global learned-word counter)
 *
 * No JOIN to vocab_global needed — mastery rows are already keyed by vocab_item_id.
 * "Known" = state IN (1,2,3) — Pitfall 1: NOT state >= 2.
 *
 * @param userId  Clerk user_id
 */
export async function getGlobalLearnedCount(userId: string): Promise<number> {
  const r = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM user_vocab_mastery
    WHERE user_id = ${userId}
      AND state IN (1, 2, 3)
  `);

  const raw = Array.isArray(r) ? r : (r.rows ?? []);
  return Number((raw[0] as { count: number } | undefined)?.count ?? 0);
}

/**
 * Returns all songs where a specific vocabulary item appears.
 *
 * Services: CROSS-03 (seen-in-songs for vocabulary feedback)
 *
 * DISTINCT is mandatory: vocab_global has one row per (vocab_item_id, song_id, version_type),
 * so a song with both tv+full versions would appear twice without DISTINCT — Pitfall 2.
 *
 * @param vocabItemId  UUID of the vocabulary item (vocabulary_items.id)
 */
export async function getSeenInSongsForVocab(
  vocabItemId: string
): Promise<Array<{ slug: string; title: string; anime: string }>> {
  const r = await db.execute<{ slug: string; title: string; anime: string }>(sql`
    SELECT DISTINCT s.slug, s.title, s.anime
    FROM vocab_global vg
    JOIN songs s ON s.id = vg.song_id
    WHERE vg.vocab_item_id = ${vocabItemId}::uuid
    ORDER BY s.title ASC
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return rows as Array<{ slug: string; title: string; anime: string }>;
}

/**
 * Returns the user's vocabulary dashboard rows with optional filtering.
 *
 * Services: CROSS-04 (vocabulary dashboard)
 *
 * Tier → state mapping (LOCKED — Path B, phase-local 3-bucket split):
 *   tierFilter 3 (Mastered)  → AND m.state = 2
 *   tierFilter 2 (Known)     → AND m.state = 3
 *   tierFilter 1 (Learning)  → AND m.state = 1
 *   omitted                  → no extra state clause
 *
 * DIVERGENCE: This mapping diverges from src/lib/fsrs/tier.ts, which collapses
 * state=1 and state=3 to TIER_LEARNING. The dashboard alone uses this richer split.
 * tierFor() is unchanged — divergence is intentional and dashboard-local only.
 *
 * Base WHERE excludes state=0 (New/unseen) — users should never see un-introduced
 * cards in the dashboard. This means tierFilter=0 / TIER_NEW is not representable here.
 *
 * ORDER BY: state DESC, last_review DESC NULLS LAST — surfaces mastery wins first
 * (state=3 > state=2 > state=1 descending), then recency within each tier.
 * Claude discretion per RESEARCH.md §Open Questions #1.
 *
 * source_song_count: number of distinct songs the word appears in — used for
 * the expandable "Seen in N songs" chip.
 *
 * @param userId  Clerk user_id
 * @param opts    Optional filters: tierFilter, sourceSongId, limit, sortDirection
 */
export async function getVocabularyDashboard(
  userId: string,
  opts: {
    tierFilter?: 1 | 2 | 3;
    sourceSongId?: string;
    limit?: number;
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<DashboardRow[]> {
  const orderDir = opts.sortDirection === "asc" ? sql`ASC` : sql`DESC`;

  // Phase-local tier → state mapping (Path B, 3-bucket split). See JSDoc above.
  let tierClause = sql``;
  if (opts.tierFilter === 3) tierClause = sql` AND m.state = 2`;
  else if (opts.tierFilter === 2) tierClause = sql` AND m.state = 3`;
  else if (opts.tierFilter === 1) tierClause = sql` AND m.state = 1`;

  const sourceSongClause = opts.sourceSongId
    ? sql` AND EXISTS (SELECT 1 FROM vocab_global vg2 WHERE vg2.vocab_item_id = m.vocab_item_id AND vg2.song_id = ${opts.sourceSongId}::uuid)`
    : sql``;

  const limitClause = opts.limit != null ? sql` LIMIT ${opts.limit}` : sql``;

  const r = await db.execute<{
    vocab_item_id: string;
    dictionary_form: string;
    reading: string;
    romaji: string;
    meaning: unknown;
    part_of_speech: string;
    jlpt_level: string | null;
    state: number;
    due: string;
    last_review: string | null;
    reps: number;
    source_song_count: number;
  }>(sql`
    SELECT
      m.vocab_item_id::text,
      vi.dictionary_form,
      vi.reading,
      vi.romaji,
      vi.meaning,
      vi.part_of_speech,
      vi.jlpt_level::text,
      m.state,
      m.due,
      m.last_review,
      m.reps,
      (
        SELECT COUNT(DISTINCT vg.song_id)::int
        FROM vocab_global vg
        WHERE vg.vocab_item_id = m.vocab_item_id
      ) AS source_song_count
    FROM user_vocab_mastery m
    JOIN vocabulary_items vi ON vi.id = m.vocab_item_id
    WHERE m.user_id = ${userId}
      AND m.state IN (1, 2, 3)
      ${tierClause}
      ${sourceSongClause}
    ORDER BY m.state ${orderDir}, m.last_review DESC NULLS LAST
    ${limitClause}
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return (rows as Array<{
    vocab_item_id: string;
    dictionary_form: string;
    reading: string;
    romaji: string;
    meaning: unknown;
    part_of_speech: string;
    jlpt_level: string | null;
    state: number;
    due: string;
    last_review: string | null;
    reps: number;
    source_song_count: number;
  }>).map((row) => ({
    vocab_item_id: row.vocab_item_id,
    dictionary_form: row.dictionary_form,
    reading: row.reading,
    romaji: row.romaji,
    meaning: row.meaning,
    part_of_speech: row.part_of_speech,
    jlpt_level: row.jlpt_level,
    state: row.state as 0 | 1 | 2 | 3,
    due: new Date(row.due),
    last_review: row.last_review ? new Date(row.last_review) : null,
    reps: Number(row.reps),
    source_song_count: Number(row.source_song_count),
  }));
}

/**
 * Returns the due review queue split into due cards and new cards.
 *
 * Services: CROSS-05 (/review queue)
 *
 * Two separate db.execute calls — neon-http has no callback transactions
 * (Pitfall 4 in RESEARCH.md); sequential is correct and safe for reads.
 *
 * Due query: uncapped — all cards with due <= now and state IN (1,2,3).
 * New query: bounded by newCardCap — vocab_global items with no mastery row yet.
 * "Known" guard uses state IN (1,2,3) — Pitfall 1: NOT state >= 2.
 *
 * @param userId      Clerk user_id
 * @param newCardCap  Max new cards to return (Plan 05 computes REVIEW_NEW_DAILY_CAP minus already-consumed)
 * @param now         Timestamp for due comparison (default: current time; injectable for testing)
 */
export async function getDueReviewQueue(
  userId: string,
  newCardCap: number,
  now: Date = new Date()
): Promise<{
  due: Array<{ vocab_item_id: string; state: 0 | 1 | 2 | 3; due: Date }>;
  new: Array<{ vocab_item_id: string }>;
}> {
  // Query 1: due cards (uncapped)
  const dueR = await db.execute<{ vocab_item_id: string; state: number; due: string }>(sql`
    SELECT m.vocab_item_id::text, m.state, m.due
    FROM user_vocab_mastery m
    WHERE m.user_id = ${userId}
      AND m.state IN (1, 2, 3)
      AND m.due <= ${now.toISOString()}::timestamptz
    ORDER BY m.due ASC
  `);

  const dueRows = (Array.isArray(dueR) ? dueR : (dueR.rows ?? [])) as Array<{
    vocab_item_id: string;
    state: number;
    due: string;
  }>;

  // Query 2: new cards (bounded by newCardCap)
  const newR = await db.execute<{ vocab_item_id: string }>(sql`
    SELECT DISTINCT vg.vocab_item_id::text
    FROM vocab_global vg
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_vocab_mastery m
      WHERE m.user_id = ${userId}
        AND m.vocab_item_id = vg.vocab_item_id
    )
    ORDER BY vg.vocab_item_id
    LIMIT ${newCardCap}
  `);

  const newRows = (Array.isArray(newR) ? newR : (newR.rows ?? [])) as Array<{
    vocab_item_id: string;
  }>;

  return {
    due: dueRows.map((row) => ({
      vocab_item_id: row.vocab_item_id,
      state: row.state as 0 | 1 | 2 | 3,
      due: new Date(row.due),
    })),
    new: newRows.map((row) => ({ vocab_item_id: row.vocab_item_id })),
  };
}
