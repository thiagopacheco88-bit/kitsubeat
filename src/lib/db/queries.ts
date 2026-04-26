import { cache } from "react";
import { eq, sql, asc, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  songs,
  songVersions,
  vocabGlobal,
  userSongProgress,
  users,
  userCosmetics,
  rewardSlotDefinitions,
  deriveStars,
  type SongVersion,
} from "./schema";
import { REVIEW_NEW_DAILY_CAP } from "@/lib/user-prefs";

// ---------------------------------------------------------------------------
// Song detail page
// ---------------------------------------------------------------------------

/**
 * Get a single song by slug, including all its versions (tv, full).
 * Wrapped in React cache() so generateMetadata + the page body share one query per request.
 */
export const getSongBySlug = cache(async (slug: string) => {
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
});

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
      // Phase 13 — grammar session accuracy (new Star 3 gate for songs with
      // grammar). Same subquery shape as the Ex5-7 columns; NULL for users who
      // haven't finished a grammar session yet.
      grammar_best_accuracy: sql<number | null>`(
        SELECT p.grammar_best_accuracy FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Phase 13 — true if ANY of this song's versions has at least one entry
      // in song_version_grammar_rules. Drives the deriveStars(songHasGrammar)
      // branch so Star 3 checks grammar_best_accuracy on grammar songs and
      // ex6_best_accuracy on vocab-only songs.
      has_grammar: sql<boolean>`EXISTS (
        SELECT 1 FROM song_version_grammar_rules svgr
        INNER JOIN song_versions sv ON sv.id = svgr.song_version_id
        WHERE sv.song_id = songs.id
      )`,
      completion_pct: sql<number | null>`(
        SELECT p.completion_pct FROM user_song_progress p
        INNER JOIN song_versions sv ON sv.id = p.song_version_id
        WHERE sv.song_id = songs.id AND p.user_id = ${userIdParam}
        ORDER BY CASE sv.version_type WHEN 'tv' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
      // Learner count: distinct (user_id OR session_key) across all versions
      // of this song. COALESCE lets anonymous plays (user_id NULL) contribute
      // as distinct by session_key — each tab/mount counts once, matching the
      // "social proof" intent (how many humans have listened) without letting
      // a single replaying user inflate the number.
      learner_count: sql<number>`(
        SELECT COUNT(DISTINCT COALESCE(sp.user_id, sp.session_key))::int
        FROM song_plays sp
        INNER JOIN song_versions sv ON sv.id = sp.song_version_id
        WHERE sv.song_id = songs.id
      )`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'`)
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
    ) AND ${songs.language} = 'ja'`)
    .orderBy(asc(songs.popularity_rank))
    .limit(limit);
}

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
      banner_image: sql<string | null>`(array_agg(
        (SELECT am.banner_image FROM anime_metadata am
         WHERE am.anime = songs.anime LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM anime_metadata am
        WHERE am.anime = songs.anime AND am.banner_image IS NOT NULL
      )))[1]`,
      cover_image: sql<string | null>`(array_agg(
        (SELECT am.cover_image FROM anime_metadata am
         WHERE am.anime = songs.anime LIMIT 1)
        ORDER BY songs.popularity_rank ASC NULLS LAST
      ) FILTER (WHERE EXISTS (
        SELECT 1 FROM anime_metadata am
        WHERE am.anime = songs.anime AND am.cover_image IS NOT NULL
      )))[1]`,
    })
    .from(songs)
    .where(sql`EXISTS (
      SELECT 1 FROM song_versions sv
      WHERE sv.song_id = ${songs.id} AND sv.lesson IS NOT NULL
    ) AND ${songs.language} = 'ja'`)
    .groupBy(sql`regexp_replace(
      ${songs.anime},
      '( Season\\s.*| Final Season.*|:\\s.*|\\sII$|\\sIII$|\\sIV$| the Movie.*| Alternative.*| Extra.*)',
      '',
      'i'
    )`)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

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
    ) AND ${songs.language} = 'ja'`)
    .groupBy(songs.artist)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

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
    ) AND ${songs.jlpt_level} IN ('N5', 'N4') AND ${songs.language} = 'ja'`)
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
    ) AND ${songs.language} = 'ja'`)
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

  // Phase 13 — resolve songHasGrammar for this specific version so Star 3
  // uses the grammar_best_accuracy gate when grammar exists.
  const [{ n: ruleCount } = { n: 0 }] = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n
    FROM song_version_grammar_rules
    WHERE song_version_id = ${songVersionId}::uuid
  `).then((r) => (Array.isArray(r) ? r : (r.rows ?? [])));
  const songHasGrammar = Number(ruleCount ?? 0) > 0;

  return {
    ...row,
    stars: deriveStars(
      {
        ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
        ex4_best_accuracy: row.ex4_best_accuracy,
        ex6_best_accuracy: row.ex6_best_accuracy,
        grammar_best_accuracy: row.grammar_best_accuracy,
      },
      songHasGrammar
    ),
  };
}

export type UserSongProgressWithStars = NonNullable<
  Awaited<ReturnType<typeof getUserSongProgress>>
>;

/**
 * Get a user's progress for a batch of song versions.
 * Returns a Map<songVersionId, progress> using a single IN query.
 * Prevents N+1 queries on the browse page.
 *
 * TODO: wire into the browse page once Clerk auth lands — currently unused.
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

  // Phase 13 — one round-trip to learn which song versions have grammar rules.
  const grammarRows = await db.execute<{ song_version_id: string }>(sql`
    SELECT DISTINCT song_version_id
    FROM song_version_grammar_rules
    WHERE song_version_id = ANY(${sql.raw(`ARRAY[${songVersionIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
  `);
  const grammarRowsArr = Array.isArray(grammarRows)
    ? grammarRows
    : (grammarRows.rows ?? []);
  const grammarVersionSet = new Set<string>(
    grammarRowsArr.map((r) => r.song_version_id)
  );

  const result = new Map<string, UserSongProgressWithStars>();
  for (const row of rows) {
    const songHasGrammar = grammarVersionSet.has(row.song_version_id);
    result.set(row.song_version_id, {
      ...row,
      stars: deriveStars(
        {
          ex1_2_3_best_accuracy: row.ex1_2_3_best_accuracy,
          ex4_best_accuracy: row.ex4_best_accuracy,
          ex6_best_accuracy: row.ex6_best_accuracy,
          grammar_best_accuracy: row.grammar_best_accuracy,
        },
        songHasGrammar
      ),
    });
  }
  return result;
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

// ---------------------------------------------------------------------------
// Daily new-card budget
// ---------------------------------------------------------------------------

/**
 * Read the user's remaining daily new-card budget without modifying it.
 *
 * If the stored date is not today (UTC), the counter has rolled over and the
 * full REVIEW_NEW_DAILY_CAP is available.
 */
export async function getNewCardBudget(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const rows = await db.execute<{
    review_new_today: number;
    review_new_today_date: string | null;
  }>(sql`
    SELECT review_new_today, review_new_today_date::text AS review_new_today_date
    FROM users WHERE id = ${userId}
  `);
  const raw = Array.isArray(rows) ? rows : (rows.rows ?? []);
  const row = raw[0];
  if (!row || row.review_new_today_date !== today) return REVIEW_NEW_DAILY_CAP;
  return Math.max(0, REVIEW_NEW_DAILY_CAP - Number(row.review_new_today));
}

// =============================================================================
// Phase 12 Plan 05: JLPT Gap + Gamification State
// =============================================================================

/**
 * Shape of one JLPT tier row returned by getJlptGapSummary.
 * total_count    — all vocabulary_items rows with this jlpt_level
 * mastered_count — rows where user_vocab_mastery.state = 2 for this user
 * known_count    — rows where state IN (1, 2, 3) for this user
 */
export interface JlptGapRow {
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  total_count: number;
  mastered_count: number;
  known_count: number;
}

/**
 * Returns per-JLPT-tier mastery aggregates for the vocabulary gap panel.
 *
 * Ordered N5 → N1. If a tier has no vocabulary_items seeded it is omitted;
 * JlptGapSummary.tsx will render a "catalog data not yet seeded" row for any
 * missing tier.
 *
 * Live-derived: reads user_vocab_mastery JOIN vocabulary_items — NO new table.
 * Parallel taxonomy preserved: jlpt_level on vocabulary_items is untouched.
 */
export async function getJlptGapSummary(userId: string): Promise<JlptGapRow[]> {
  // Ensure the users row exists so LEFT JOINs work correctly for brand-new users.
  await db
    .insert(users)
    .values({ id: userId })
    .onConflictDoNothing({ target: users.id });

  const r = await db.execute<{
    jlpt_level: string;
    total_count: number;
    mastered_count: number;
    known_count: number;
  }>(sql`
    SELECT
      vi.jlpt_level::text                                              AS jlpt_level,
      COUNT(*)::int                                                    AS total_count,
      COUNT(*) FILTER (WHERE m.state = 2)::int                        AS mastered_count,
      COUNT(*) FILTER (WHERE m.state IN (1, 2, 3))::int               AS known_count
    FROM vocabulary_items vi
    LEFT JOIN user_vocab_mastery m
      ON m.vocab_item_id = vi.id AND m.user_id = ${userId}
    WHERE vi.jlpt_level IS NOT NULL
    GROUP BY vi.jlpt_level
    ORDER BY CASE vi.jlpt_level::text
      WHEN 'N5' THEN 1
      WHEN 'N4' THEN 2
      WHEN 'N3' THEN 3
      WHEN 'N2' THEN 4
      WHEN 'N1' THEN 5
    END ASC
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);
  return (rows as Array<{
    jlpt_level: string;
    total_count: number;
    mastered_count: number;
    known_count: number;
  }>).map((row) => ({
    jlpt_level: row.jlpt_level as JlptGapRow['jlpt_level'],
    total_count: Number(row.total_count),
    mastered_count: Number(row.mastered_count),
    known_count: Number(row.known_count),
  }));
}

/**
 * Full gamification state for the ProfileHud component.
 *
 * Fetches the user row (upsert-seeding defaults if missing) + LEFT JOINs to
 * user_cosmetics + reward_slot_definitions for equipped border + theme.
 *
 * equipped_border / equipped_theme are nullable — if the user has no
 * equipped cosmetic of that type, null is returned and the HUD renders the
 * default ring-2 ring-muted fallback.
 */
export interface GamificationState {
  xp_total: number;
  level: number;
  streak_current: number;
  streak_best: number;
  last_streak_date: string | null;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  current_path_node_slug: string | null;
  equipped_border: { css_class: string; label: string } | null;
  equipped_theme: { css_vars: Record<string, string>; label: string } | null;
}

/**
 * Returns the user's full gamification state for HUD rendering.
 *
 * Cosmetic aggregation: fetches all equipped rows and partitions them by
 * slot_type in JS — avoids two separate subqueries and handles the case where
 * a user has no cosmetics at all (LEFT JOIN → null columns).
 */
export async function getUserGamificationState(userId: string): Promise<GamificationState> {
  // Ensure row exists (upsert-seed pattern used throughout the app).
  await db
    .insert(users)
    .values({ id: userId })
    .onConflictDoNothing({ target: users.id });

  // Fetch user row + all equipped cosmetic rows in one query.
  const r = await db.execute<{
    xp_total: number;
    level: number;
    streak_current: number;
    streak_best: number;
    last_streak_date: string | null;
    sound_enabled: boolean;
    haptics_enabled: boolean;
    current_path_node_slug: string | null;
    slot_type: string | null;
    slot_content: unknown;
  }>(sql`
    SELECT
      u.xp_total,
      u.level,
      u.streak_current,
      u.streak_best,
      u.last_streak_date::text AS last_streak_date,
      u.sound_enabled,
      u.haptics_enabled,
      u.current_path_node_slug,
      rsd.slot_type,
      rsd.content AS slot_content
    FROM users u
    LEFT JOIN user_cosmetics uc ON uc.user_id = u.id AND uc.equipped = true
    LEFT JOIN reward_slot_definitions rsd ON rsd.id = uc.slot_id AND rsd.active = true
    WHERE u.id = ${userId}
  `);

  const rows = Array.isArray(r) ? r : (r.rows ?? []);

  // All rows share the same user columns — use the first row as the base.
  const base = rows[0] as {
    xp_total: number;
    level: number;
    streak_current: number;
    streak_best: number;
    last_streak_date: string | null;
    sound_enabled: boolean;
    haptics_enabled: boolean;
    current_path_node_slug: string | null;
    slot_type: string | null;
    slot_content: unknown;
  } | undefined;

  // Defensive: should never happen after the upsert, but guard anyway.
  if (!base) {
    return {
      xp_total: 0,
      level: 1,
      streak_current: 0,
      streak_best: 0,
      last_streak_date: null,
      sound_enabled: true,
      haptics_enabled: true,
      current_path_node_slug: null,
      equipped_border: null,
      equipped_theme: null,
    };
  }

  // Partition equipped cosmetics by slot_type.
  let equipped_border: GamificationState['equipped_border'] = null;
  let equipped_theme: GamificationState['equipped_theme'] = null;

  for (const row of rows) {
    const typedRow = row as typeof base;
    if (!typedRow.slot_type || !typedRow.slot_content) continue;

    const content = typedRow.slot_content as Record<string, unknown>;
    if (typedRow.slot_type === 'avatar_border' && typeof content.css_class === 'string') {
      equipped_border = {
        css_class: content.css_class,
        label: typeof content.label === 'string' ? content.label : '',
      };
    } else if (typedRow.slot_type === 'color_theme' && content.css_vars && typeof content.css_vars === 'object') {
      equipped_theme = {
        css_vars: content.css_vars as Record<string, string>,
        label: typeof content.label === 'string' ? content.label : '',
      };
    }
  }

  return {
    xp_total: Number(base.xp_total),
    level: Number(base.level),
    streak_current: Number(base.streak_current),
    streak_best: Number(base.streak_best),
    last_streak_date: base.last_streak_date ?? null,
    sound_enabled: Boolean(base.sound_enabled),
    haptics_enabled: Boolean(base.haptics_enabled),
    current_path_node_slug: base.current_path_node_slug ?? null,
    equipped_border,
    equipped_theme,
  };
}
