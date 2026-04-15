# Phase 7: Data Foundation - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Normalize vocabulary identity with UUIDs and audit grammar conjugation paths to unblock all progress tracking and exercise generation. Creates the vocabulary_items table, vocab_global materialized view, user_vocab_mastery, user_exercise_log, and subscriptions tables with FSRS columns. This phase is data infrastructure — no user-facing UI.

</domain>

<decisions>
## Implementation Decisions

### Vocabulary deduplication
- Identity is by **dictionary form** — conjugations share a single UUID mapped to the base/dictionary form (e.g., 食べる/食べた/食べない all map to 食べる)
- Homonyms are **separated by kanji** — 橋/はし and 箸/はし get different UUIDs; identity key is (dictionary_form_surface, reading)
- Script variants are **merged** — kanji 食べる and hiragana たべる with the same reading map to the same UUID
- Katakana loanwords: **Claude's discretion** — track them but decide whether to tag/deprioritize based on learning value

### Conjugation audit strategy
- Unparseable entries (~20%): **skip for exercises** — mark as unstructured, exclude from conjugation drills, still display in grammar view
- Audit runs **as part of migration** — not a separate manual CLI step
- Produces a **console summary** during migration: X parseable, Y skipped, with examples of skipped entries
- Structured data stores **base + conjugated pair + conjugation type** (e.g., 食べる, 食べた, "past tense") — no transformation rule storage needed

### Migration & backfill approach
- Use a **Node backfill script** (not pure SQL migration) — reads lesson JSONB from song_versions, extracts vocab, deduplicates, inserts into vocabulary_items
- Script is **idempotent** — safe to re-run, skips already-extracted vocab
- **Add vocabulary_item UUIDs into JSONB** — each vocab entry in lesson JSONB gets a vocab_item_id field for fast lookups without joins
- Materialized view refresh: **on song update** — trigger refresh after any song_versions insert/update to keep vocab_global always current

### FSRS tuning defaults
- Use **standard FSRS-5 default parameters** — proven algorithm, no beginner-friendly overrides
- Standard FSRS penalty on wrong answers — no custom forgiveness logic
- Users get **3 intensity presets**: light / normal / intensive — maps to FSRS parameter presets
- Intensity setting is **global only** — one setting applies to all vocabulary, no per-song overrides

### Claude's Discretion
- Katakana loanword tracking strategy (tag/deprioritize or treat identically)
- Exact FSRS parameter values for each intensity preset (light/normal/intensive)
- Materialized view refresh mechanism (trigger vs application-level)
- Drizzle migration ordering and table creation sequence

</decisions>

<specifics>
## Specific Ideas

- Dictionary-form identity was chosen specifically to support cross-song vocabulary tracking (Phase 11) — mastering a word in one song should carry across all songs
- The backfill script adding UUIDs into JSONB enables the player to resolve vocabulary identity without extra joins at render time
- Console summary for conjugation audit gives visibility without generating files that need to be managed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-data-foundation*
*Context gathered: 2026-04-15*
