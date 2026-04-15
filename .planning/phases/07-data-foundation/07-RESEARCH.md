# Phase 7: Data Foundation - Research

**Researched:** 2026-04-15
**Domain:** PostgreSQL schema design, Drizzle ORM migrations, FSRS spaced repetition, Node.js backfill scripting
**Confidence:** HIGH (stack is well-understood; all critical decisions verified against official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Vocabulary deduplication**
- Identity is by **dictionary form** — conjugations share a single UUID mapped to the base/dictionary form (e.g., 食べる/食べた/食べない all map to 食べる)
- Homonyms are **separated by kanji** — 橋/はし and 箸/はし get different UUIDs; identity key is (dictionary_form_surface, reading)
- Script variants are **merged** — kanji 食べる and hiragana たべる with the same reading map to the same UUID
- Katakana loanwords: **Claude's discretion** — track them but decide whether to tag/deprioritize based on learning value

**Conjugation audit strategy**
- Unparseable entries (~20%): **skip for exercises** — mark as unstructured, exclude from conjugation drills, still display in grammar view
- Audit runs **as part of migration** — not a separate manual CLI step
- Produces a **console summary** during migration: X parseable, Y skipped, with examples of skipped entries
- Structured data stores **base + conjugated pair + conjugation type** (e.g., 食べる, 食べた, "past tense") — no transformation rule storage needed

**Migration & backfill approach**
- Use a **Node backfill script** (not pure SQL migration) — reads lesson JSONB from song_versions, extracts vocab, deduplicates, inserts into vocabulary_items
- Script is **idempotent** — safe to re-run, skips already-extracted vocab
- **Add vocabulary_item UUIDs into JSONB** — each vocab entry in lesson JSONB gets a vocab_item_id field for fast lookups without joins
- Materialized view refresh: **on song update** — trigger refresh after any song_versions insert/update to keep vocab_global always current

**FSRS tuning defaults**
- Use **standard FSRS-5 default parameters** — proven algorithm, no beginner-friendly overrides
- Standard FSRS penalty on wrong answers — no custom forgiveness logic
- Users get **3 intensity presets**: light / normal / intensive — maps to FSRS parameter presets
- Intensity setting is **global only** — one setting applies to all vocabulary, no per-song overrides

### Claude's Discretion
- Katakana loanword tracking strategy (tag/deprioritize or treat identically)
- Exact FSRS parameter values for each intensity preset (light/normal/intensive)
- Materialized view refresh mechanism (trigger vs application-level)
- Drizzle migration ordering and table creation sequence

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Grammar conjugation paths are audited and converted to structured format (parseable into question/answer pairs) for all songs with grammar data | Conjugation parsing patterns documented; structured schema designed; audit-during-migration approach confirmed feasible |
| DATA-02 | A normalized vocabulary identity table exists with UUIDs, enabling cross-song word matching by (surface, reading) composite key | vocabulary_items table design, unique constraint on (dictionary_form_surface, reading), backfill script pattern documented |
</phase_requirements>

---

## Summary

Phase 7 creates the data infrastructure layer that all downstream phases (progress tracking, exercises, subscriptions) depend on. There are four concrete deliverables: the `vocabulary_items` table, the `vocab_global` materialized view, the `user_vocab_mastery` / `user_exercise_log` / `subscriptions` tables, and a Node backfill script that normalizes existing lesson JSONB into the new vocabulary identity system.

The stack is entirely within what already exists in the project — Drizzle ORM with PostgreSQL on Neon, Node/tsx scripts, and the existing lesson JSONB shape (`VocabEntry`, `GrammarPoint`). No new runtime dependencies are needed except `ts-fsrs` for the FSRS scalar column schema design. The backfill script follows the established pattern from `scripts/seed/05-insert-db.ts` and `scripts/migrate-localize.ts`: idempotent, console summary on completion, uses `getDb()` directly.

The primary implementation risk is the conjugation audit — `GrammarPoint.conjugation_path` is a free-text optional string with no enforced format. Research confirms ~20% unparseable is a realistic estimate for AI-generated content and the skip-and-mark strategy is well-suited here. The JSONB mutation to embed `vocab_item_id` into existing lesson rows is the most structurally significant change and requires care to keep the Lesson TypeScript type in sync.

**Primary recommendation:** Create the Drizzle schema additions first, generate a single migration, then write the backfill script as a standalone `scripts/backfill-vocab-identity.ts` following the project's established Node script conventions.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.41.0 (already installed) | Schema definition, migrations, query builder | Already in project, used for all DB access |
| @neondatabase/serverless | ^0.10.4 (already installed) | Neon PostgreSQL driver | Already in project |
| ts-fsrs | ^4.x or ^5.x (NEW) | FSRS algorithm types and scheduling logic | Official TypeScript FSRS implementation by open-spaced-repetition org; ES module, CJS, UMD support |
| drizzle-kit | ^0.30.6 (already installed) | Migration generation | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | ^4.19.3 (already installed) | Run TypeScript backfill scripts | All seed/migration scripts already use it |
| zod | ^3.24.3 (already installed) | Validate lesson JSONB on read during backfill | Already used in lesson parsing |
| dotenv | ^16.5.0 (already installed) | Load .env.local in scripts | All scripts already use this pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-fsrs | femto-fsrs | femto-fsrs is 100-line zero-dep but lacks full FSRSParameters API; ts-fsrs is the official org implementation with active maintenance |
| Application-level refresh | PostgreSQL trigger for materialized view | Trigger requires raw SQL in migration; application-level is simpler and works well at current scale |
| Drizzle pgMaterializedView | Raw SQL view | pgMaterializedView gives TypeScript types and `db.refreshMaterializedView()` API |

**Installation:**
```bash
npm install ts-fsrs
```

---

## Architecture Patterns

### Recommended File Structure
```
src/lib/db/schema.ts          # Add new tables (vocabulary_items, user_vocab_mastery, etc.)
drizzle/0002_data_foundation.sql  # Generated migration
scripts/
├── backfill-vocab-identity.ts    # Extract vocab from JSONB → vocabulary_items, patch JSONB
└── lib/
    └── conjugation-audit.ts      # Conjugation path parser used during backfill
```

### Pattern 1: Drizzle Materialized View Definition
**What:** Declare `vocab_global` as a `pgMaterializedView` aggregating vocab across all song_versions.
**When to use:** Read-heavy aggregation queries; underlying data changes predictably (on song update).

```typescript
// Source: https://orm.drizzle.team/docs/views
import { pgMaterializedView } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vocabGlobal = pgMaterializedView("vocab_global", {
  vocab_item_id: uuid("vocab_item_id"),
  song_id: uuid("song_id"),
  version_type: text("version_type"),
  // ... additional projected columns
}).as(sql`
  SELECT
    vi.id AS vocab_item_id,
    sv.song_id,
    sv.version_type,
    vi.dictionary_form,
    vi.reading,
    vi.jlpt_level
  FROM song_versions sv
  JOIN vocabulary_items vi
    ON vi.dictionary_form = (elem->>'dictionary_form')
   AND vi.reading = (elem->>'reading')
  CROSS JOIN LATERAL jsonb_array_elements(sv.lesson->'vocabulary') AS elem
  WHERE sv.lesson IS NOT NULL
`);
```

Refresh after song update (application-level):
```typescript
// After song_versions insert/update:
await db.refreshMaterializedView(vocabGlobal).concurrently();
```

Note: `.concurrently()` requires a unique index on the materialized view. Define it in the migration SQL as Drizzle does not yet support index creation on materialized views via the ORM (confirmed open GitHub issue #2976).

### Pattern 2: vocabulary_items Table with Composite Unique Key
**What:** Deduplicate vocabulary by (dictionary_form_surface, reading). All conjugations of the same word share one row.

```typescript
// Source: schema design based on confirmed identity rules
import { pgTable, uuid, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { jlptEnum } from "./schema"; // reuse existing enum

export const vocabularyItems = pgTable("vocabulary_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  dictionary_form: text("dictionary_form").notNull(),
  reading: text("reading").notNull(),         // hiragana; identity key
  romaji: text("romaji").notNull(),
  part_of_speech: text("part_of_speech").notNull(),
  jlpt_level: jlptEnum("jlpt_level"),
  is_katakana_loanword: boolean("is_katakana_loanword").default(false).notNull(),
  meaning: jsonb("meaning").notNull(),         // Localizable (multilingual object)
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("vocabulary_items_form_reading_unique").on(table.dictionary_form, table.reading),
]);
```

### Pattern 3: FSRS Scalar Columns in user_vocab_mastery
**What:** Store FSRS card state as flat columns (not JSONB) for indexed due-date queries.
**When to use:** When queries filter on `due` date — critical for the exercise scheduler.

```typescript
// Source: FSRS-5 card state fields from ts-fsrs type definitions
import { real, smallint } from "drizzle-orm/pg-core";

export const userVocabMastery = pgTable("user_vocab_mastery", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),           // Clerk user ID
  vocab_item_id: uuid("vocab_item_id").notNull().references(() => vocabularyItems.id),
  // FSRS state (scalar for index performance)
  stability: real("stability"),                  // S in FSRS — days to 90% retention
  difficulty: real("difficulty"),                // D in FSRS — 0.0-1.0
  elapsed_days: integer("elapsed_days").default(0).notNull(),
  scheduled_days: integer("scheduled_days").default(0).notNull(),
  reps: integer("reps").default(0).notNull(),
  lapses: integer("lapses").default(0).notNull(),
  state: smallint("state").default(0).notNull(), // 0=New,1=Learning,2=Review,3=Relearning
  due: timestamp("due", { withTimezone: true }).defaultNow().notNull(),
  last_review: timestamp("last_review", { withTimezone: true }),
  // User preference
  intensity_preset: text("intensity_preset").default("normal").notNull(), // light|normal|intensive
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("user_vocab_mastery_user_vocab_unique").on(table.user_id, table.vocab_item_id),
  index("user_vocab_mastery_due_idx").on(table.due),
  index("user_vocab_mastery_user_due_idx").on(table.user_id, table.due),
]);
```

### Pattern 4: Idempotent Backfill Script
**What:** Follows project convention from `scripts/seed/05-insert-db.ts` and `scripts/migrate-localize.ts`.

```typescript
// scripts/backfill-vocab-identity.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../src/lib/db/index.js";
import { vocabularyItems, songVersions } from "../src/lib/db/schema.js";
import { LessonSchema } from "./types/lesson.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  let inserted = 0, skipped = 0, patched = 0;

  const rows = await db.select().from(songVersions).where(
    sql`lesson IS NOT NULL`
  );

  for (const row of rows) {
    const lesson = LessonSchema.safeParse(row.lesson);
    if (!lesson.success) { skipped++; continue; }

    for (const entry of lesson.data.vocabulary) {
      // Idempotent: ON CONFLICT DO NOTHING
      const [item] = await db
        .insert(vocabularyItems)
        .values({ dictionary_form: entry.surface, reading: entry.reading, ... })
        .onConflictDoNothing()
        .returning({ id: vocabularyItems.id });

      // Also resolve existing UUID if entry already present
      // Then patch JSONB: entry.vocab_item_id = item.id
      // ... update song_versions.lesson with patched JSONB
      inserted++;
    }
    patched++;
  }

  console.log(`  Inserted: ${inserted} vocab items`);
  console.log(`  Patched:  ${patched} song version JSONB rows`);
  console.log(`  Skipped:  ${skipped} invalid lesson rows`);
}
```

### Pattern 5: GrammarPoint Conjugation Path Parsing
**What:** Parse `GrammarPoint.conjugation_path` free-text into structured `{ base, conjugated, type }`.
**The field shape:** `"dictionary form → te-form → te-iru"` or `"〜ている"` (grammar name only).

Parsing heuristic:
1. If `conjugation_path` contains `→`, split on `→`, extract final form as conjugated type.
2. If it's a pattern like `食べる → 食べた`, extract both forms.
3. If no `→` or no identifiable verb form: mark `is_structured = false`.

```typescript
// scripts/lib/conjugation-audit.ts
export interface StructuredConjugation {
  base: string;
  conjugated: string;
  conjugation_type: string;
  is_structured: boolean;
}

export function parseConjugationPath(path: string | undefined): StructuredConjugation | null {
  if (!path) return null;
  const parts = path.split("→").map(p => p.trim());
  if (parts.length >= 2) {
    return {
      base: parts[0],
      conjugated: parts[parts.length - 1],
      conjugation_type: parts.slice(1).join(" → "),
      is_structured: true,
    };
  }
  return { base: path, conjugated: path, conjugation_type: "unstructured", is_structured: false };
}
```

### Pattern 6: FSRS Intensity Presets
**What:** Map user-facing presets to `generatorParameters()` overrides.

```typescript
// Source: FSRS-5 research — request_retention range 0.70-0.97 per official docs
import { generatorParameters } from "ts-fsrs";

export const INTENSITY_PRESETS = {
  light:     generatorParameters({ request_retention: 0.75, maximum_interval: 180 }),
  normal:    generatorParameters({ request_retention: 0.90, maximum_interval: 365 }),
  intensive: generatorParameters({ request_retention: 0.95, maximum_interval: 365 }),
} as const;

export type IntensityPreset = keyof typeof INTENSITY_PRESETS;
```

Rationale for values:
- **light (0.75)**: Casual learners; longer intervals, more forgetting tolerated; reduces daily review burden significantly
- **normal (0.90)**: FSRS-5 default `request_retention`; the algorithm's proven sweet spot for most learners
- **intensive (0.95)**: Near-exam preparation; frequent reviews, high retention maintained

### Anti-Patterns to Avoid
- **Storing FSRS state as JSONB:** JSONB cannot be indexed for `due` date queries. Always use scalar timestamp column.
- **Refreshing materialized view synchronously in the request cycle:** Use async post-response or background job. `CONCURRENTLY` requires a unique index first.
- **Identity by surface form alone:** Different readings of same kanji (同音異義語) would collide. Identity must be `(dictionary_form, reading)` composite.
- **Rebuilding unique constraint on every migration run:** Use `onConflictDoNothing()` in backfill, not `onConflictDoUpdate()` — the identity columns should never be mutated after creation.
- **Parsing conjugation paths with regex inside SQL migration:** Parsing logic belongs in the Node script, not the DB layer — keeps it testable and auditable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FSRS scheduling algorithm | Custom interval calculator | ts-fsrs | FSRS has 17 weight parameters; custom implementations always get edge cases wrong (new card bootstrapping, relearning transitions) |
| Materialized view refresh | Manual SQL in application code | `db.refreshMaterializedView().concurrently()` | Drizzle API handles lock management; concurrent refresh avoids blocking reads |
| UUID generation | `crypto.randomUUID()` or nanoid | `defaultRandom()` in Drizzle schema (uses `gen_random_uuid()` in Postgres) | Consistent with existing schema pattern; generated server-side |
| Idempotency checks | SELECT then INSERT | `onConflictDoNothing()` / `onConflictDoUpdate()` | Single round-trip; race-condition safe |

**Key insight:** The FSRS algorithm is deceptively simple-looking but has carefully tuned defaults from 100M+ reviews. Reimplementing even the interval formula creates invisible divergence from expected behavior.

---

## Common Pitfalls

### Pitfall 1: Materialized View CONCURRENTLY Requires Unique Index
**What goes wrong:** `db.refreshMaterializedView(view).concurrently()` fails at runtime with `ERROR: cannot refresh materialized view "vocab_global" concurrently` because no unique index exists.
**Why it happens:** PostgreSQL requires at least one unique index to track which rows changed during concurrent refresh.
**How to avoid:** Add `CREATE UNIQUE INDEX vocab_global_vocab_song_unique ON vocab_global(vocab_item_id, song_id, version_type)` in the migration SQL (Drizzle does not yet support this via schema definition — GitHub issue #2976).
**Warning signs:** Migration runs fine but first `CONCURRENTLY` refresh throws a Postgres error.

### Pitfall 2: JSONB Mutation Must Stay In Sync with TypeScript Types
**What goes wrong:** Backfill script adds `vocab_item_id` to each vocab entry object in the JSONB, but `VocabEntry` / `LessonSchema` in `src/lib/types/lesson.ts` and `scripts/types/lesson.ts` don't include this field, causing validation failures on next read.
**Why it happens:** Both type files use strict Zod schemas that would strip or error on unknown keys depending on parse mode.
**How to avoid:** Add `vocab_item_id: z.string().uuid().optional()` to `VocabEntrySchema` in BOTH type files before running the backfill. Validate that `safeParse` with `.passthrough()` or the optional field handles it correctly.
**Warning signs:** Lesson loads fine in app but `LessonSchema.safeParse()` starts returning errors after backfill.

### Pitfall 3: Katakana/Hiragana Script Variant Collision
**What goes wrong:** Two vocab entries for the same word — one written in kanji/hiragana (`食べる` / `たべる`) — produce different readings and fail to merge.
**Why it happens:** The identity key is `(dictionary_form, reading)`. If the backfill uses `entry.surface` directly (which may be hiragana variant), it creates a duplicate row.
**How to avoid:** Normalize `dictionary_form` before insert: prefer kanji form when available; normalize hiragana-only entries by using `reading` as `dictionary_form` when no kanji is present. The Zod `VocabEntry.reading` field is always hiragana (confirmed in schema docs).
**Warning signs:** `vocabulary_items` count is significantly higher than expected unique word count.

### Pitfall 4: Migration Ordering — Materialized View Before Index
**What goes wrong:** If the migration creates tables, then the materialized view, then tries to create the unique index on the view, the index creation may fail because the view is empty and Postgres needs at least one row.
**Why it happens:** `CREATE UNIQUE INDEX` on a materialized view works on empty views in Postgres — this is actually fine. The real risk is ordering the `CONCURRENTLY` refresh call before the index exists at runtime.
**How to avoid:** In the migration file: (1) create tables, (2) create materialized view, (3) create unique index on view. Do not call `CONCURRENTLY` refresh until migration is confirmed complete.

### Pitfall 5: Subscriptions Table Stripe/Clerk ID Column Sizing
**What goes wrong:** Stripe subscription IDs can be up to 255 characters (`sub_1234...`). Using short text columns truncates them silently in some drivers.
**Why it happens:** PostgreSQL `text` is unlimited — this is actually fine. The risk is using `varchar(50)` or similar.
**How to avoid:** Always use `text` (not `varchar(N)`) for external provider IDs (Stripe subscription ID, customer ID, Clerk user ID). The existing schema already uses `text` everywhere — maintain this pattern.

---

## Code Examples

Verified patterns from official sources:

### Defining pgMaterializedView (Drizzle ORM)
```typescript
// Source: https://orm.drizzle.team/docs/views
import { pgMaterializedView } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vocabGlobal = pgMaterializedView("vocab_global", {
  vocab_item_id: uuid("vocab_item_id"),
  song_id: uuid("song_id"),
  // ... column declarations required when using raw sql
}).as(sql`SELECT ...`);
```

### Refreshing Materialized View
```typescript
// Source: https://orm.drizzle.team/docs/views
await db.refreshMaterializedView(vocabGlobal);              // blocking
await db.refreshMaterializedView(vocabGlobal).concurrently(); // non-blocking (requires unique index)
await db.refreshMaterializedView(vocabGlobal).withNoData();   // reset without populating
```

### ts-fsrs Basic Usage
```typescript
// Source: https://github.com/open-spaced-repetition/ts-fsrs/README.md
import { createEmptyCard, fsrs, Rating, generatorParameters } from "ts-fsrs";

// Create scheduler with intensity preset
const params = generatorParameters({ request_retention: 0.90 });
const scheduler = fsrs(params);

// New card
const card = createEmptyCard();

// Preview all four outcomes (before user answers)
const preview = scheduler.repeat(card, new Date());

// Apply rating after user answers
const result = scheduler.next(card, new Date(), Rating.Good);
// result.card has updated stability, difficulty, due, state
```

### FSRS Card State Columns (maps to user_vocab_mastery)
```typescript
// FSRS Card fields that must be persisted per ts-fsrs types:
// stability: number  — S parameter (days to drop to 90% retention)
// difficulty: number — D parameter (0-10 scale)
// elapsed_days: number
// scheduled_days: number
// reps: number
// lapses: number
// state: State (0=New, 1=Learning, 2=Review, 3=Relearning)
// due: Date
// last_review: Date | undefined
```

### Neon + Drizzle Upsert with onConflictDoNothing
```typescript
// Source: drizzle-orm pattern, consistent with 05-insert-db.ts in this project
const [existing] = await db
  .insert(vocabularyItems)
  .values({ dictionary_form, reading, ... })
  .onConflictDoNothing({ target: [vocabularyItems.dictionary_form, vocabularyItems.reading] })
  .returning({ id: vocabularyItems.id });

// If onConflictDoNothing fires (duplicate), existing will be undefined — resolve separately:
const itemId = existing?.id ?? (
  await db.select({ id: vocabularyItems.id })
    .from(vocabularyItems)
    .where(and(
      eq(vocabularyItems.dictionary_form, dictionary_form),
      eq(vocabularyItems.reading, reading)
    ))
    .limit(1)
)[0].id;
```

---

## Recommended Decisions (Claude's Discretion Areas)

### Katakana Loanword Strategy
**Recommendation:** Track identically but set `is_katakana_loanword = true` flag. Do NOT deprioritize in FSRS scheduling by default. Rationale: katakana loanwords appear frequently in anime (character names, English borrowings) and are legitimate vocabulary. The flag enables future UI filtering but imposes no algorithmic penalty.

### Materialized View Refresh Mechanism
**Recommendation:** Application-level refresh (not PostgreSQL trigger). Trigger approach requires raw DDL in migration and creates implicit database coupling; application-level call in the song update API route is explicit, observable, and consistent with how the rest of the codebase handles DB interactions. Call `refreshMaterializedView(vocabGlobal).concurrently()` in the `PUT /api/admin/songs` and `PUT /api/admin/timing/:songId` route handlers after the main upsert commits.

### Migration Ordering and Table Creation Sequence
**Recommendation:**
1. New enums (if any)
2. `vocabulary_items` table
3. `user_vocab_mastery` table (references `vocabulary_items`)
4. `user_exercise_log` table (references `user_vocab_mastery`)
5. `subscriptions` table (standalone — references Clerk user ID by text)
6. `vocab_global` materialized view
7. Unique index on `vocab_global` for CONCURRENTLY refresh

All in a single migration file `0002_data_foundation.sql` generated by `drizzle-kit generate`.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| SM-2 algorithm (SuperMemo 2) | FSRS-5 (17-parameter neural model) | FSRS has ~10% fewer reviews for same retention per published benchmarks |
| Per-card JSONB state storage | Scalar columns for FSRS fields | Enables indexed due-date queries (`WHERE due <= NOW()`) |
| Manual SQL migrations | `drizzle-kit generate` diff-based | Consistent snapshot tracking; never write migration SQL by hand |

---

## Open Questions

1. **Exact backfill JSONB update strategy for large datasets**
   - What we know: Neon serverless has a 10-second connection timeout; updating JSONB row-by-row may time out for large song counts
   - What's unclear: Current song count in DB (unknown at research time); whether batch JSONB update is needed
   - Recommendation: Use batch updates in groups of 10-20 songs; add `--dry-run` flag to backfill script per project convention

2. **Subscriptions table shape — Stripe vs future payment provider**
   - What we know: Phase 7 creates the subscriptions table; Stripe integration is a later phase
   - What's unclear: Whether to pre-model Stripe-specific fields or keep generic
   - Recommendation: Keep generic in Phase 7 — `user_id`, `plan` (text), `status` (text), `expires_at`, `provider` (text), `provider_subscription_id` (text). Add Stripe-specific columns when Stripe is integrated.

3. **Index on vocab_global for CONCURRENTLY — composite key definition**
   - What we know: CONCURRENTLY requires a unique index; the view aggregates (vocab_item_id, song_id, version_type)
   - What's unclear: Whether the same vocab item can appear in multiple versions of the same song (tv + full)
   - Recommendation: Use `(vocab_item_id, song_id, version_type)` as the unique index key — this is the natural grain of the view.

---

## Sources

### Primary (HIGH confidence)
- https://orm.drizzle.team/docs/views — pgMaterializedView API, refreshMaterializedView with concurrently/withNoData
- https://github.com/open-spaced-repetition/ts-fsrs/blob/main/README.md — ts-fsrs API: createEmptyCard, fsrs(), generatorParameters, Rating enum
- https://open-spaced-repetition.github.io/ts-fsrs/ — generatorParameters usage, FSRSParameters fields
- Project source: `src/lib/db/schema.ts` — existing table structure, enum definitions
- Project source: `src/lib/types/lesson.ts`, `scripts/types/lesson.ts` — VocabEntry and GrammarPoint shapes
- Project source: `scripts/seed/05-insert-db.ts`, `scripts/migrate-localize.ts` — established Node script conventions

### Secondary (MEDIUM confidence)
- https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS — FSRS-5 default w parameters [17 values], request_retention range 0.70–0.97
- https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-optimal-retention — rationale for retention values
- https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html — CONCURRENTLY requires unique index (confirmed)
- https://github.com/drizzle-team/drizzle-orm/issues/2976 — Confirmed: Drizzle does not support index creation on materialized views via schema (must use raw SQL)

### Tertiary (LOW confidence)
- https://medium.com/@mmikram_83537/postgresql-materialized-views-refresh-on-commit-refresh-on-demand-bb0fa99ec1fa — trigger-based refresh pattern (confirmed valid but chose application-level instead)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; ts-fsrs is official org implementation
- Architecture: HIGH — Drizzle materialized view API verified from official docs; FSRS column shape verified from ts-fsrs types
- Pitfalls: HIGH — Drizzle materialized view index limitation verified against GitHub issues; JSONB sync risk confirmed by reading both type files; others are standard PostgreSQL behavior
- FSRS defaults: MEDIUM — FSRS-5 w parameters verified from fsrs4anki wiki (authoritative); ts-fsrs currently implements FSRS v6 per README but parameters are compatible

**Research date:** 2026-04-15
**Valid until:** 2026-07-15 (stable libraries; drizzle-orm releases frequently but API is stable)
