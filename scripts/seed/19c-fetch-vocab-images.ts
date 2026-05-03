/**
 * 19c-fetch-vocab-images.ts — Idempotent Unsplash API auto-search fetcher for the
 * full imageable vocabulary catalog (noun / verb / i_adjective / na_adjective).
 *
 * Closes Plan 11.6-02 v2 Tasks 2-3 (the never-shipped tooling). The actual
 * overnight batch run is Plan 11.6-13 (operator-driven).
 *
 * Idempotency:
 *   - Skip gate: `WHERE image_url IS NULL` — already-populated rows are skipped at
 *     query time. Re-running on a fully-populated catalog produces 0 API calls.
 *   - In-process dedup by `meaning_en`: when two rows share the same English
 *     meaning, the second row is filled from the in-process Map (no API call).
 *   - Per-row commit (NO transaction wrapper): partial progress survives Ctrl-C,
 *     network drops, and power loss. Mirrors 19b-load-vocab-images.ts:69-73.
 *
 * Rate-limit handling:
 *   - On HTTP 429 the script reads `X-Ratelimit-Reset` (Unix seconds) and sleeps
 *     until reset + 5s buffer, then retries the same row. Up to 3 attempts.
 *   - If the header is missing or already past, defaults to a 60s sleep.
 *
 * Safety:
 *   - `&content_filter=high` query param applied to every API call (Unsplash's
 *     family-safe filter, T-11.6-12-03 NSFW mitigation).
 *   - Returned URLs are validated against URL_PATTERN (imported from
 *     19-curate-vocab-images.ts — single source of truth) before being written.
 *
 * Usage:
 *   tsx --tsconfig tsconfig.scripts.json scripts/seed/19c-fetch-vocab-images.ts
 *   tsx --tsconfig tsconfig.scripts.json scripts/seed/19c-fetch-vocab-images.ts --verify
 *
 * Requires UNSPLASH_ACCESS_KEY in .env.local. The script fails fast with a
 * runbook message if the key is missing — see getAccessKey() below.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { vocabularyItems } from "../../src/lib/db/schema.js";
import { getDb } from "../../src/lib/db/index.js";
import { localize, type Localizable } from "../../src/lib/types/lesson.js";
import { URL_PATTERN } from "./19-curate-vocab-images.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unwrap<T = unknown>(r: unknown): T[] {
  return Array.isArray(r) ? (r as T[]) : ((r as { rows?: T[] }).rows ?? []);
}

function getAccessKey(): string {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      `UNSPLASH_ACCESS_KEY is not set. Register a free app at https://unsplash.com/developers, copy the Access Key from the app dashboard, and add it to .env.local as UNSPLASH_ACCESS_KEY=...`
    );
  }
  return key;
}

interface SearchResult {
  url: string | null;
  retryAfterMs: number | null;
}

// Demo tier resets hourly. Default to 60 min when the rate-limit-reset header
// is absent — anything shorter (e.g. 60s) just bounces straight back into 403.
const RATE_LIMIT_DEFAULT_SLEEP_MS = 60 * 60 * 1000;

// Log the body of the first 403 response so future troubleshooters can see
// Unsplash's exact rate-limit format. Earlier attempt to parse JSON `{errors:
// ["Rate Limit Exceeded"]}` failed silently (text body? clone() quirk?), so we
// now trust the status code and capture the body for visibility only.
let loggedFirst403Body = false;

async function searchUnsplash(query: string, accessKey: string): Promise<SearchResult> {
  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query
  )}&orientation=squarish&per_page=1&content_filter=high`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  });

  // 429 = production-tier rate limit. 403 from /search/photos with a valid
  // Client-ID can only mean demo-tier rate limit (no permission scopes apply
  // to public search). 401 would be invalid-key, NOT 403.
  if (response.status === 429 || response.status === 403) {
    if (response.status === 403 && !loggedFirst403Body) {
      loggedFirst403Body = true;
      try {
        const sample = await response.clone().text();
        console.log(
          `[debug] first 403 body sample: ${sample.slice(0, 300).replace(/\n/g, " ")}`
        );
      } catch (e) {
        console.log(
          `[debug] first 403 body read failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    const resetHeader = response.headers.get("x-ratelimit-reset");
    let sleepMs = RATE_LIMIT_DEFAULT_SLEEP_MS;
    if (resetHeader) {
      const resetSec = parseInt(resetHeader, 10);
      if (!Number.isNaN(resetSec)) {
        const computed = resetSec * 1000 - Date.now() + 5000;
        if (computed > 0) {
          sleepMs = computed;
        }
      }
    }
    return { url: null, retryAfterMs: sleepMs };
  }

  if (!response.ok) {
    console.warn(`[error] HTTP ${response.status} for query "${query}"`);
    return { url: null, retryAfterMs: null };
  }

  const data = (await response.json()) as {
    results?: Array<{ urls?: { regular?: string } }>;
  };

  const url = data.results?.[0]?.urls?.regular;
  if (!url) {
    return { url: null, retryAfterMs: null };
  }

  if (!URL_PATTERN.test(url)) {
    console.warn(`[invalid] returned URL did not match Unsplash CDN regex: ${url}`);
    return { url: null, retryAfterMs: null };
  }

  return { url, retryAfterMs: null };
}

// ---------------------------------------------------------------------------
// runFetch — main batch loop
// ---------------------------------------------------------------------------

interface FetchResult {
  loaded: number;
  skipped: number;
  cached: number;
  rate_limited: number;
  errors: number;
  total: number;
}

interface VocabRow {
  id: string;
  dictionary_form: string;
  meaning: unknown;
  part_of_speech: string;
}

export async function runFetch(): Promise<FetchResult> {
  const db = getDb();
  const accessKey = getAccessKey();

  // Beginner-impact ordering: easier JLPT levels first (N5 → N4 → N3 → N2 → N1
  // → unlisted), within each bucket the words appearing in the most songs first.
  // Given demo-tier 50 req/hr × ~70 hours of runtime, this guarantees the most
  // visible/frequent beginner vocab gets images on day 1, and the long tail of
  // rare advanced vocab fills in over the following days.
  const rawRows = await db.execute(sql`
    SELECT vi.id, vi.dictionary_form, vi.meaning, vi.part_of_speech
    FROM vocabulary_items vi
    LEFT JOIN (
      SELECT vocab_item_id, count(*)::int AS song_count
      FROM vocab_global
      GROUP BY vocab_item_id
    ) freq ON freq.vocab_item_id = vi.id
    WHERE vi.part_of_speech IN ('noun', 'verb', 'i_adjective', 'na_adjective')
      AND vi.image_url IS NULL
    ORDER BY
      CASE vi.jlpt_level
        WHEN 'N5' THEN 1
        WHEN 'N4' THEN 2
        WHEN 'N3' THEN 3
        WHEN 'N2' THEN 4
        WHEN 'N1' THEN 5
        ELSE 6
      END ASC,
      COALESCE(freq.song_count, 0) DESC,
      vi.dictionary_form ASC
  `);
  const rows = unwrap<VocabRow>(rawRows);

  console.log(`[fetch] worklist size: ${rows.length} imageable rows missing image_url`);

  let loaded = 0;
  let skipped = 0;
  let cached = 0;
  let rate_limited = 0;
  let errors = 0;

  // In-process dedup: a single English meaning shared across multiple Japanese
  // entries (e.g. multiple readings of the same noun) only triggers one API call.
  const meaningEnCache = new Map<string, string>();

  for (const row of rows) {
    const meaningEn = localize(row.meaning as Localizable, "en");
    const hint = row.part_of_speech === "verb" ? "action" : "object";
    const query = `${meaningEn} (${hint})`;

    if (meaningEnCache.has(meaningEn)) {
      const cachedUrl = meaningEnCache.get(meaningEn)!;
      await db
        .update(vocabularyItems)
        .set({ image_url: cachedUrl })
        .where(eq(vocabularyItems.id, row.id));
      cached++;
      console.log(`[cached] ${row.dictionary_form} → reused URL for "${meaningEn}"`);
      continue;
    }

    let attempt = 0;
    let resolved = false;
    while (attempt < 3) {
      const result = await searchUnsplash(query, accessKey);
      if (result.retryAfterMs !== null) {
        rate_limited++;
        console.log(
          `[429] sleeping ${Math.round(result.retryAfterMs / 1000)}s for "${query}"`
        );
        await new Promise((r) => setTimeout(r, result.retryAfterMs!));
        attempt++;
        continue;
      }
      if (result.url === null) {
        skipped++;
        console.log(`[skipped] no result for "${query}" (${row.dictionary_form})`);
        resolved = true;
        break;
      }
      // Per-row commit — partial progress survives crashes (mirrors 19b-load-vocab-images.ts:69-73).
      await db
        .update(vocabularyItems)
        .set({ image_url: result.url })
        .where(eq(vocabularyItems.id, row.id));
      meaningEnCache.set(meaningEn, result.url);
      loaded++;
      console.log(`[loaded] ${row.dictionary_form} → ${result.url.slice(0, 60)}...`);
      resolved = true;
      break;
    }
    if (!resolved && attempt >= 3) {
      errors++;
      console.warn(`[error] gave up after 3 retries for "${query}"`);
    }
  }

  console.log(
    `[done] loaded=${loaded} cached=${cached} skipped=${skipped} rate_limited=${rate_limited} errors=${errors} total=${rows.length}`
  );
  return { loaded, skipped, cached, rate_limited, errors, total: rows.length };
}

// ---------------------------------------------------------------------------
// runVerify — read-only catalog state report
// ---------------------------------------------------------------------------

interface VerifyResult {
  ok: boolean;
  missing: number;
  invalid: number;
  populated: number;
}

export async function runVerify(): Promise<VerifyResult> {
  const db = getDb();

  const missingResult = await db.execute(sql`
    SELECT count(*)::int AS n FROM vocabulary_items
    WHERE part_of_speech IN ('noun','verb','i_adjective','na_adjective')
      AND image_url IS NULL
  `);
  const invalidResult = await db.execute(sql`
    SELECT count(*)::int AS n FROM vocabulary_items
    WHERE image_url IS NOT NULL
      AND image_url !~ '^https://images\.unsplash\.com/.+'
  `);
  const populatedResult = await db.execute(sql`
    SELECT count(*)::int AS n FROM vocabulary_items
    WHERE part_of_speech IN ('noun','verb','i_adjective','na_adjective')
      AND image_url IS NOT NULL
  `);

  const missing = unwrap<{ n: number }>(missingResult)[0]?.n ?? 0;
  const invalid = unwrap<{ n: number }>(invalidResult)[0]?.n ?? 0;
  const populated = unwrap<{ n: number }>(populatedResult)[0]?.n ?? 0;
  const ok = missing === 0 && invalid === 0;

  console.log(
    `[verify] populated=${populated} missing=${missing} invalid=${invalid} ok=${ok}`
  );
  return { ok, missing, invalid, populated };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  if (process.argv.includes("--verify")) {
    const result = await runVerify();
    process.exit(result.ok ? 0 : 1);
  } else {
    await runFetch();
  }
}

// Conditional-main pattern: lets the file be imported in tests (where runFetch()
// is called directly) without auto-running main(). Cross-platform path handling
// matters on Windows — process.argv[1] may use backslashes; the endsWith fallback covers it.
if (
  import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, "/") ||
  process.argv[1]?.endsWith("19c-fetch-vocab-images.ts")
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
