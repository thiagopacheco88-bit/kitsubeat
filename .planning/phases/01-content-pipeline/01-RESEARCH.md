# Phase 1: Content Pipeline - Research

**Researched:** 2026-04-06
**Domain:** AI content generation pipeline, Japanese NLP, lyrics sourcing, audio timing extraction, admin tooling
**Confidence:** HIGH (Claude API, Anthropic Batch API, Neon/Drizzle) / MEDIUM (lyrics APIs, WhisperX timing accuracy) / LOW (Jikan YouTube ID availability)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Song manifest & sourcing
- Song selection is **popularity-driven** — pull from ranked lists (MyAnimeList, Spotify, AniDB) to select top anime openings/endings
- Lyrics sourced via **dual strategy**: fetch from public lyric APIs first, fall back to AI-generated (Whisper transcription) only when database has no match. Search is done once per song and persisted
- Each song carries: title, artist/band/singer, anime + season info (e.g., "Naruto Shippuden OP 16"), YouTube video ID, genre & mood tags, year launched
- **JLPT difficulty assigned automatically by Claude** during content generation based on vocabulary/grammar analysis — no manual tagging pass

#### Verse timing strategy
- **AI-approximated first, manual correction second** — use speech detection (Whisper or similar) to auto-generate initial timestamps, then correct via editor
- Timing granularity is **per word** (karaoke-style) — each word gets its own start/end timestamp
- A **production-grade web-based timing editor** is part of this phase — shows waveform + lyrics, drag-to-adjust word positions. Built as a lasting admin tool for ongoing content additions, not a throwaway dev utility

#### Lesson content depth
- Grammar breakdowns are **full depth**: grammar tags (verb, particle, adjective, etc.) with color coding + one-line explanation + full conjugation path (dictionary form → te-form → combined) + JLPT grammar point reference
- Vocabulary categorized **by part of speech** with JLPT level (N5–N1) displayed small on the left of each entry
- Example sentences: **song context is primary** (highlighted), with additional example sentences shown at lower visual prominence
- Verse-by-verse explanations: **literal meaning first, then cultural/emotional context** as a secondary note

#### Translation approach
- Translation style is **natural/fluent** — reads naturally in the target language, even if word order differs from Japanese
- Portuguese is **Brazilian Portuguese (PT-BR)**
- Content schema is **extensible** for adding new languages later without regenerating existing content
- Culturally untranslatable concepts (honorifics, onomatopoeia, set phrases): **Claude's discretion per case** — sometimes translate, sometimes keep original with explanation

### Claude's Discretion
- Handling of culturally untranslatable concepts (translate vs. keep original — case by case)
- Exact AI model/service for speech-to-text timing extraction
- Additional example sentence count and difficulty spread per vocabulary word
- Content schema design for language extensibility

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | 200 anime OP/ED songs curated with metadata (title, artist, anime, JLPT level, difficulty tier) | Jikan API for popularity data; song manifest schema documented in Standard Stack |
| CONT-02 | AI-generated Japanese lyrics for all 200 songs via Claude API | LRCLIB/Musixmatch for first pass; Claude fallback via Whisper transcription pipeline |
| CONT-03 | Furigana (ruby text) pre-generated for all kanji in lyrics | kuroshiro + @sglkc/kuromoji server-side; cross-validated against Claude structured output |
| CONT-04 | Romaji transliteration pre-generated for all lyrics with user toggle | kuroshiro (hepburn mode) produces romaji from token readings; pre-generated at seed time |
| CONT-05 | Multi-language translations pre-generated (English, Portuguese, Spanish minimum) | Claude structured outputs with extensible language schema; PT-BR confirmed |
| CONT-06 | Verse-by-verse explanations pre-generated (grammar, cultural context, nuances) | Claude Sonnet 4.6 via Batch API; JSON schema enforces literal + cultural fields |
| CONT-07 | Vocabulary extracted and categorized by grammatical type | Claude structured output with required `part_of_speech` enum field; kuromoji POS tags as input |
| CONT-08 | Grammar color-coding tags pre-generated per word token | kuromoji POS tag → grammar color map; stored per token in lesson JSONB |
| CONT-09 | Verse timing data (start/end timestamps) for verse-by-verse sync with YouTube playback | WhisperX word-level timestamps (Python script); yt-dlp for audio extraction; timing editor for corrections |
| CONT-10 | JLPT level (N5-N1) and difficulty tier assigned per song | Claude assigns JLPT per song during generation; no manual pass required |
| CONT-11 | Verse Coverage Agent that checks all 200 songs have complete content and flags gaps | TypeScript validation script against Drizzle schema; runs as CLI qa command |
</phase_requirements>

---

## Summary

Phase 1 is a pure data pipeline phase — no user-facing UI except the timing editor admin tool. The goal is 200 anime songs with complete, QA-verified lesson content in Neon Postgres before any player UI is built. The pipeline has three sequential stages: (1) song manifest creation via Jikan API popularity data, (2) content generation via Claude API structured outputs using the Anthropic Batch API, and (3) timing data via WhisperX word-level alignment corrected with the waveform-based timing editor.

The biggest technical risks are: Whisper's word-level accuracy degrades on musical audio (background music causes misalignment), so the timing editor is not optional tooling — it is a required correction step for every song. The second risk is the dual lyrics sourcing strategy: LRCLIB provides free synced LRC-format lyrics but coverage for anime songs specifically is community-dependent. Musixmatch's public API limits to 30% of lyric content. The Claude Batch API reduces generation costs by 50% (Claude Sonnet 4.6 at $1.50/$7.50 per MTok batch pricing) and processes 200 songs in well under 24 hours, making it the correct mechanism for the seeding pipeline.

The content schema must be designed for language extensibility from day one. The recommended pattern stores translations as an object keyed by language code (`{ "en": "...", "pt-BR": "...", "es": "..." }`) rather than separate columns, so new languages can be added by re-running generation for just the new locale without touching existing content.

**Primary recommendation:** Use the Anthropic Message Batches API with Claude Sonnet 4.6 and JSON structured outputs for all 200 songs in a single batch, with kuroshiro providing furigana/romaji as a pre-processing step before the Claude call, and wavesurfer.js RegionsPlugin as the waveform timing editor.

---

## Standard Stack

### Core Pipeline
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.82.x | Direct Claude API access for batch seeding | Use directly (not Vercel AI SDK) for offline scripts; no streaming needed |
| claude-sonnet-4-6 | latest | Content generation model | Best cost/quality for structured output at scale; $1.50/$7.50 per MTok batch; 64k max output |
| Zod | 3.x | Schema definition + validation for lesson output | Define once, use for both `output_config.format.schema` and runtime validation |
| kuroshiro | 1.x | Japanese text → furigana, romaji, hiragana | Handles furigana modes; romaji in hepburn mode for CONT-03/04 |
| @sglkc/kuromoji | latest | Tokenizer backend for kuroshiro; modern Node 18+ fork | Drop-in replacement for vanilla `kuromoji`; same API, resolves async issues |
| drizzle-orm | 0.30.x | Database access in seeding script | JSONB support; same ORM used in app layer; `db.insert()` for seed |
| @neondatabase/serverless | latest | Neon Postgres HTTP client | Serverless driver, no persistent connections required |

### Timing Pipeline
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WhisperX | latest (Python) | Word-level timestamp extraction from audio | Adds CTC-based forced alignment on top of Whisper; exports JSON with word start/end |
| yt-dlp | latest (Python) | Audio extraction from YouTube video ID | `--extract-audio --audio-format mp3` for Whisper input; requires ffmpeg |
| faster-whisper | latest (Python) | Backend for WhisperX; GPU-accelerated Whisper | Achieves 70x realtime; WhisperX depends on it internally |

### Timing Editor (Admin Tool)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wavesurfer.js | 7.x | Waveform visualization | v7 has official React component; RegionsPlugin supports drag/resize with `update-end` events |
| @wavesurfer/react | 7.x | Official React wrapper for wavesurfer.js | Handles cleanup lifecycle; plugins must be memoized with `useMemo` |
| Next.js (App Router) | 15.x | Timing editor lives inside the main app at `/admin/timing` | Ships as an admin route in the Next.js app, gated by admin role |

### Lyrics Sourcing
| Service | Format | Coverage | API Key Required |
|---------|--------|----------|-----------------|
| LRCLIB | LRC (line-level timed, `[mm:ss.xx]` format) | ~3M tracks, community-contributed; anime coverage varies | No — fully free, no auth required |
| Musixmatch (via RapidAPI) | Plain text, 30% of lyrics only | Largest catalog; strict licensing on full lyrics | Yes — RapidAPI key; 2000 calls/day free |
| Genius API | Plain text (unsynced) | Comprehensive coverage, includes anime songs | Yes — free developer API key |

### Song Manifest Sourcing
| Service | Provides | API Access |
|---------|----------|-----------|
| Jikan API v4 (unofficial MAL) | Anime metadata + opening/ending theme strings (title + artist combined in one string, no YouTube ID) | Free, no API key; rate limited to 3 req/s |
| AniPlaylist | Anime songs on Spotify | No public API; use for manual curation reference |
| YouTube Data API v3 | Search by `"<title> <artist> official"` to get YouTube video ID | Required — 100 units per search, 10k units/day quota |

### Development Tools
| Tool | Purpose |
|------|---------|
| tsx | Run TypeScript seeding scripts directly (`npx tsx scripts/seed.ts`) without compile step |
| dotenv | Load `.env.local` in CLI scripts outside Next.js context |
| p-limit | Concurrency limiter for API calls (`p-limit(5)` to avoid Claude rate limit exhaustion) |

### Installation
```bash
# App-layer additions (timing editor)
npm install wavesurfer.js @wavesurfer/react

# Pipeline script dependencies
npm install @anthropic-ai/sdk kuroshiro @sglkc/kuromoji
npm install -D tsx dotenv

# Concurrency helper
npm install p-limit

# Python timing pipeline (separate venv)
pip install whisperx yt-dlp faster-whisper
```

### Alternatives Considered
| Recommended | Alternative | Tradeoff |
|-------------|-------------|----------|
| WhisperX | OpenAI Whisper API | Whisper API produces word timestamps but accuracy on music is lower; WhisperX adds CTC forced alignment which is more accurate |
| WhisperX | stable-ts | stable-ts is Node-compatible but has less accurate alignment than WhisperX's CTC approach |
| LRCLIB → Genius → Claude fallback | Musixmatch only | Musixmatch returns only 30% of lyrics; Genius has no sync timestamps; LRCLIB is the only free source with LRC-format timed lyrics |
| Batch API (async) | Sequential API calls | Sequential 200 calls hit rate limits and take 30-60 minutes; Batch API processes all 200 in parallel, under 1 hour, at 50% cost |
| Claude Sonnet 4.6 | Claude Opus 4.6 | Opus is better quality but $5/$25 vs $1.50/$7.50; the structured JSON schema constrains output enough that Sonnet quality is sufficient |

---

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── seed/
│   ├── 01-build-manifest.ts     # Pulls from Jikan + YouTube API; writes songs.json
│   ├── 02-fetch-lyrics.ts       # LRCLIB → Genius → Claude fallback per song
│   ├── 03-generate-content.ts   # Batch Claude API call: lesson JSON per song
│   ├── 04-extract-timing.py     # WhisperX per song: produces word timestamps JSON
│   ├── 05-insert-db.ts          # Upsert all content into Neon Postgres
│   └── 06-qa-agent.ts           # Verse Coverage Agent — reports gaps
├── types/
│   └── lesson.ts                # Shared TypeScript types for lesson schema
└── lib/
    └── batch-claude.ts          # Batch API wrapper: build requests, poll, parse

app/
├── admin/
│   └── timing/
│       └── [songId]/
│           └── page.tsx         # Timing editor — Client Component, wavesurfer.js
```

### Pattern 1: Anthropic Message Batches API for 200-Song Generation

**What:** Submit all 200 song generation requests in a single batch call. Poll until complete (typically < 1 hour). Retrieve as JSONL stream.

**When to use:** Any offline bulk generation where immediate response is not required. Reduces cost 50% and avoids sequential rate limiting.

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/batch-processing
import Anthropic from "@anthropic-ai/sdk";
import { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { Request } from "@anthropic-ai/sdk/resources/messages/batches";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Build batch requests — one per song
const requests: Request[] = songs.map((song) => ({
  custom_id: song.slug,  // used to match results back to songs
  params: {
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: buildLessonPrompt(song) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: LESSON_JSON_SCHEMA,  // Zod .toJSONSchema() output
      },
    },
  } satisfies MessageCreateParamsNonStreaming,
}));

// Submit batch
const batch = await client.messages.batches.create({ requests });

// Poll until complete
let status = batch;
while (status.processing_status === "in_progress") {
  await new Promise((r) => setTimeout(r, 30_000));  // wait 30s between polls
  status = await client.messages.batches.retrieve(batch.id);
}

// Stream results as JSONL
for await (const result of await client.messages.batches.results(batch.id)) {
  if (result.result.type === "succeeded") {
    const lesson = JSON.parse(result.result.message.content[0].text);
    await upsertLesson(result.custom_id, lesson);
  }
}
```

### Pattern 2: Claude Structured Output with JSON Schema

**What:** Use `output_config.format.type = "json_schema"` to guarantee schema-compliant lesson JSON. No beta header required (GA as of late 2025).

**When to use:** Any generation where the output structure must match a TypeScript type exactly. Eliminates retry loops for malformed JSON.

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// Define once with Zod, derive JSON schema and TypeScript type from same source
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const TokenSchema = z.object({
  surface: z.string(),          // the kanji/kana as written in lyrics
  reading: z.string(),          // hiragana reading (from kuroshiro)
  romaji: z.string(),           // hepburn romaji (from kuroshiro)
  grammar: z.enum(["noun", "verb", "adjective", "adverb", "particle", "expression", "other"]),
  grammar_color: z.enum(["blue", "red", "green", "orange", "grey", "none"]),
  meaning: z.string(),          // English gloss
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1", "unknown"]),
});

const VerseSchema = z.object({
  verse_number: z.number().int(),
  start_time_ms: z.number(),    // populated by WhisperX timing pipeline
  end_time_ms: z.number(),
  tokens: z.array(TokenSchema),
  translations: z.record(z.string(), z.string()),  // { "en": "...", "pt-BR": "...", "es": "..." }
  literal_meaning: z.string(),  // word-for-word breakdown
  cultural_context: z.string().optional(),
});

const VocabEntrySchema = z.object({
  surface: z.string(),
  reading: z.string(),
  romaji: z.string(),
  part_of_speech: z.enum(["noun", "verb", "adjective", "adverb", "particle", "expression"]),
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1", "unknown"]),
  meaning: z.string(),
  example_from_song: z.string(),  // quoted verse text where word appears
  additional_examples: z.array(z.string()).max(3),
});

const LessonSchema = z.object({
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
  difficulty_tier: z.enum(["basic", "intermediate", "advanced"]),
  verses: z.array(VerseSchema),
  vocabulary: z.array(VocabEntrySchema),
  grammar_points: z.array(z.object({
    name: z.string(),           // e.g., "〜ている (te-iru form)"
    jlpt_reference: z.string(), // e.g., "JLPT N4"
    explanation: z.string(),
    conjugation_path: z.string().optional(),  // "dictionary → te-form → combined"
  })),
});

export type Lesson = z.infer<typeof LessonSchema>;
export const LESSON_JSON_SCHEMA = zodToJsonSchema(LessonSchema, { $refStrategy: "none" });
```

### Pattern 3: Lyrics Sourcing Fallback Chain

**What:** Try LRCLIB first (free, LRC format with timestamps). If no match, try Genius (plain text). If no match, use WhisperX transcription as the source text. Persist result immediately — never re-fetch.

**When to use:** CONT-02 lyrics sourcing. The "search once, persist" constraint is locked.

```typescript
// Source: LRCLIB API docs (https://lrclib.net/docs), MEDIUM confidence
async function fetchLyrics(song: SongManifestEntry): Promise<LyricsResult> {
  // Step 1: LRCLIB — synced LRC format, no API key
  const lrcResult = await fetch(
    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(song.artist)}&track_name=${encodeURIComponent(song.title)}&album_name=${encodeURIComponent(song.anime)}`
  );
  if (lrcResult.ok) {
    const data = await lrcResult.json();
    if (data.syncedLyrics) {
      return { source: "lrclib", text: data.plainLyrics, synced_lrc: data.syncedLyrics };
    }
  }

  // Step 2: Genius — plain text only, no timestamps
  const geniusResult = await searchGenius(song.title, song.artist);
  if (geniusResult) {
    return { source: "genius", text: geniusResult.lyrics, synced_lrc: null };
  }

  // Step 3: WhisperX transcription from YouTube audio
  const transcript = await runWhisperXPipeline(song.youtube_id);
  return { source: "whisper_transcription", text: transcript.text, synced_lrc: null };
}
```

### Pattern 4: WhisperX Timing Extraction Pipeline

**What:** Download audio with yt-dlp, run WhisperX with word-level alignment, output JSON with per-word start/end times. This is a Python script called from the TypeScript pipeline via `child_process.exec`.

**When to use:** CONT-09 timing data. Run once per song. Results feed the timing editor for correction.

```python
# Source: WhisperX GitHub (https://github.com/m-bain/whisperX) — MEDIUM confidence
# scripts/seed/04-extract-timing.py

import whisperx
import json, sys, subprocess, os

song_slug = sys.argv[1]
youtube_id = sys.argv[2]
output_path = f"tmp/{song_slug}_timing.json"

# Step 1: Download audio via yt-dlp
subprocess.run([
    "yt-dlp", "--extract-audio", "--audio-format", "mp3",
    "--audio-quality", "0", "-o", f"tmp/{song_slug}.mp3",
    f"https://www.youtube.com/watch?v={youtube_id}"
], check=True)

# Step 2: WhisperX transcription with word alignment
device = "cuda" if torch.cuda.is_available() else "cpu"
model = whisperx.load_model("large-v3", device, compute_type="float16")
audio = whisperx.load_audio(f"tmp/{song_slug}.mp3")
result = model.transcribe(audio, language="ja", batch_size=16)

# Step 3: Forced alignment for word-level timestamps
align_model, metadata = whisperx.load_align_model("ja", device=device)
result = whisperx.align(result["segments"], align_model, metadata, audio, device)

# Step 4: Export word-level timestamps as JSON
words = []
for segment in result["segments"]:
    for word in segment.get("words", []):
        words.append({
            "word": word["word"],
            "start": word.get("start", 0),
            "end": word.get("end", 0),
            "score": word.get("score", 0),
        })

with open(output_path, "w") as f:
    json.dump({"song_slug": song_slug, "words": words}, f, ensure_ascii=False, indent=2)
```

### Pattern 5: Timing Editor with wavesurfer.js RegionsPlugin

**What:** Admin page at `/admin/timing/[songId]` shows audio waveform, renders one draggable region per word. `region-update-end` fires when a region is dragged/resized, updating the word's timestamps in local state. Save button persists all changes to the database.

**When to use:** Correction step for all 200 songs after WhisperX auto-generation.

```typescript
// Source: https://wavesurfer.xyz/plugins/regions — HIGH confidence
"use client";
import { useRef, useMemo, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

export function TimingEditor({ audioUrl, words }: { audioUrl: string; words: WordTiming[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [timings, setTimings] = useState(words);

  const regions = useMemo(() => RegionsPlugin.create(), []);

  useEffect(() => {
    if (!containerRef.current) return;
    wsRef.current = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      plugins: [regions],
      height: 80,
    });

    wsRef.current.on("ready", () => {
      // Render one region per word
      timings.forEach((word) => {
        regions.addRegion({
          id: word.id,
          start: word.start,
          end: word.end,
          content: word.word,
          drag: true,
          resize: true,
          color: "rgba(99,102,241,0.15)",
        });
      });
    });

    // Update state on drag/resize
    regions.on("region-update-end", (region) => {
      setTimings((prev) =>
        prev.map((w) => w.id === region.id ? { ...w, start: region.start, end: region.end } : w)
      );
    });

    return () => wsRef.current?.destroy();
  }, [audioUrl]);

  async function handleSave() {
    await fetch(`/api/admin/timing/${words[0].songId}`, {
      method: "PUT",
      body: JSON.stringify({ words: timings }),
    });
  }

  return (
    <div>
      <div ref={containerRef} />
      <button onClick={handleSave}>Save Timings</button>
    </div>
  );
}
```

### Pattern 6: Verse Coverage Agent (CONT-11)

**What:** TypeScript CLI script that queries all 200 songs from Neon and validates presence of required fields. Reports gaps as a structured JSON report and exits with code 1 if any gaps found (enables CI integration).

**When to use:** Final gate before declaring Phase 1 complete. Run ad-hoc during pipeline development to track progress.

```typescript
// scripts/seed/06-qa-agent.ts
import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";

const REQUIRED_FIELDS: Array<keyof Lesson> = ["verses", "vocabulary", "grammar_points"];
const REQUIRED_PER_VERSE = ["tokens", "translations", "literal_meaning"] as const;
const REQUIRED_PER_TOKEN = ["surface", "reading", "romaji", "grammar"] as const;

async function runCoverageAgent() {
  const allSongs = await db.select().from(songs);
  const gaps: Gap[] = [];

  for (const song of allSongs) {
    if (!song.lesson) { gaps.push({ slug: song.slug, field: "lesson", type: "missing" }); continue; }
    const lesson = song.lesson as Lesson;

    for (const field of REQUIRED_FIELDS) {
      if (!lesson[field] || (Array.isArray(lesson[field]) && lesson[field].length === 0)) {
        gaps.push({ slug: song.slug, field, type: "empty" });
      }
    }

    for (const verse of lesson.verses ?? []) {
      if (!verse.start_time_ms || verse.start_time_ms === 0) {
        gaps.push({ slug: song.slug, field: `verse_${verse.verse_number}.timing`, type: "missing" });
      }
      for (const field of REQUIRED_PER_VERSE) {
        if (!verse[field]) gaps.push({ slug: song.slug, field: `verse.${field}`, type: "missing" });
      }
      for (const token of verse.tokens ?? []) {
        for (const field of REQUIRED_PER_TOKEN) {
          if (!token[field]) gaps.push({ slug: song.slug, field: `token.${field}`, type: "missing" });
        }
      }
    }
  }

  console.log(JSON.stringify({ total: allSongs.length, gaps_count: gaps.length, gaps }, null, 2));
  process.exit(gaps.length > 0 ? 1 : 0);
}

runCoverageAgent();
```

### Pattern 7: Drizzle Schema for Extensible Content

**What:** Store the full lesson as a single `jsonb` column alongside normalized query fields. Store timing data as a separate `jsonb` column scoped to a specific YouTube video ID.

**When to use:** This schema must be finalized before any pipeline code is written. The Phase 2 player consumes it directly.

```typescript
// Source: Drizzle ORM docs (https://orm.drizzle.team/docs/get-started/neon-new) — HIGH confidence
import { pgTable, uuid, text, jsonb, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const jlptEnum = pgEnum("jlpt_level", ["N5", "N4", "N3", "N2", "N1"]);
export const difficultyEnum = pgEnum("difficulty_tier", ["basic", "intermediate", "advanced"]);

export const songs = pgTable("songs", {
  id:              uuid("id").primaryKey().defaultRandom(),
  slug:            text("slug").unique().notNull(),
  title:           text("title").notNull(),
  artist:          text("artist").notNull(),
  anime:           text("anime").notNull(),
  season_info:     text("season_info"),      // e.g. "Naruto Shippuden OP 16"
  youtube_id:      text("youtube_id").notNull(),
  year_launched:   integer("year_launched"),
  genre_tags:      text("genre_tags").array(),
  mood_tags:       text("mood_tags").array(),
  jlpt_level:      jlptEnum("jlpt_level"),
  difficulty_tier: difficultyEnum("difficulty_tier"),
  lesson:          jsonb("lesson"),          // full generated lesson blob
  lyrics_source:   text("lyrics_source"),   // "lrclib" | "genius" | "whisper_transcription"
  content_schema_version: integer("content_schema_version").default(1),
  timing_youtube_id: text("timing_youtube_id"),  // which video ID timing was calibrated against
  timing_data:     jsonb("timing_data"),     // word-level timestamps, scoped to timing_youtube_id
  timing_verified: text("timing_verified").default("auto"),  // "auto" | "reviewed" | "approved"
  created_at:      timestamp("created_at").defaultNow(),
  updated_at:      timestamp("updated_at").defaultNow(),
});
```

### Anti-Patterns to Avoid

- **Generating all 200 lessons sequentially with a for-loop:** Saturates rate limits; takes 30-60+ minutes. Use the Batch API — all 200 in one call, parallel processing, under 1 hour.
- **Trusting WhisperX timestamps without human review:** WhisperX accuracy degrades significantly on musical audio with background instrumentation. Every song requires at least a spot-check review in the timing editor before being marked `timing_verified = "approved"`.
- **Storing timing as part of the lesson JSONB:** Timing is calibrated against a specific YouTube video ID. Store it separately with `timing_youtube_id` reference so the lesson is reusable if the video changes.
- **Running kuroshiro with the vanilla kuromoji package on Node 18+:** Causes async dictionary loading failures. Use `@sglkc/kuromoji` as the analyzer.
- **Calling furigana generation inside the Claude prompt:** Claude's furigana accuracy is lower than kuroshiro on predictable dictionary words. Run kuroshiro first, pass pre-computed readings to Claude as context, let Claude only handle ambiguous cases.
- **Using the full Musixmatch lyrics on the free tier:** Free tier returns only 30% of any lyric. Treat Musixmatch as a last resort or use the Genius API for full text coverage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waveform visualization and region drag | Custom Canvas waveform with mouse event tracking | wavesurfer.js v7 RegionsPlugin | 10k+ LOC of audio rendering + interaction handled; RegionsPlugin fires `region-update-end` with precise start/end |
| Japanese tokenization + furigana | Custom parser for Japanese reading extraction | kuroshiro + @sglkc/kuromoji | Japanese morphological analysis requires ~30MB dictionary and complex segmentation rules; battle-tested library |
| Batch API polling loop | Custom retry/poll logic | @anthropic-ai/sdk batches API methods | SDK handles polling, JSONL streaming, and error result handling natively |
| JSON schema validation on Claude output | Manual field presence checks | Zod + `output_config.format.json_schema` | Structured outputs guarantee schema compliance at generation time; Zod validates runtime-deserialized result |
| Audio download for Whisper | Custom YouTube audio fetch | yt-dlp CLI tool | yt-dlp handles YouTube's anti-bot measures, format selection, and ffmpeg post-processing; any custom implementation will break on YouTube's next update |
| Word-level forced alignment | Implement DTW + CTC alignment | WhisperX | WhisperX implements phoneme-level forced alignment using wav2vec2; reimplementing this is months of ML work |

**Key insight:** Every problem in this pipeline has an existing tool. The value here is in the orchestration (manifest → lyrics → generation → timing → QA), not in reimplementing NLP, waveform rendering, or audio alignment.

---

## Common Pitfalls

### Pitfall 1: WhisperX Timestamp Drift on Music
**What goes wrong:** WhisperX alignment degrades when there is concurrent background instrumentation. Word timestamps can be 0.5–3 seconds off on anime songs with heavy orchestration. The timing editor exists to fix this, but 200 songs with heavy drift means significant editor time.
**Why it happens:** CTC forced alignment models are trained primarily on speech data, not singing-over-music. The interference from instruments confuses the phoneme detector.
**How to avoid:** Run WhisperX on the isolated vocal track if possible (use `demucs` for source separation before alignment). Alternatively, use the verse-level segment timestamps from WhisperX (more accurate) for initial sync, then do word-level corrections only in the editor for songs marked as high-confidence.
**Warning signs:** WhisperX outputs `score < 0.6` on most words — flag the song for full editor review.

### Pitfall 2: LRCLIB Anime Coverage Gaps
**What goes wrong:** LRCLIB is community-contributed. Niche anime songs (especially older or less popular ones) may not be in the database. The fallback to Genius returns unsynced plain text, and the Claude fallback from Whisper transcription introduces transcription errors that poison furigana generation downstream.
**Why it happens:** LRCLIB's ~3M tracks are globally crowdsourced — anime-specific content depends on contributor activity.
**How to avoid:** During manifest creation, pre-check LRCLIB coverage for all 200 songs. Flag any with no LRCLIB match before starting generation. For plain-text sources (Genius/Whisper), run an extra Claude validation pass that checks lyric Japanese orthographic consistency before inserting.
**Warning signs:** More than 30% of songs falling back to Genius or Whisper — reconsider song selection toward more popular titles.

### Pitfall 3: Claude JLPT Auto-Assignment Inconsistency
**What goes wrong:** Without a consistent prompt, Claude assigns JLPT levels based on slightly different criteria across songs. A N3 song might be labeled N4 in one batch and N2 in another if the prompt is vague.
**Why it happens:** "JLPT level" is an ambiguous instruction — it could mean the hardest word, the average word, the most frequent grammar pattern, etc.
**How to avoid:** The structured prompt must specify the exact JLPT assignment algorithm: "Assign JLPT level based on the highest JLPT level required to understand 80% of the vocabulary without context, cross-referenced with the most complex grammar pattern present." Include 3-5 calibration examples in the system prompt.
**Warning signs:** Songs by the same artist in the same difficulty range being assigned 2+ JLPT levels apart.

### Pitfall 4: Jikan API Gives Theme Strings, Not YouTube IDs
**What goes wrong:** Jikan v4's `/anime/{id}/themes` endpoint returns theme info as a single string like `"1: \"NARUTO\" by The Wallflowers (eps 1-25)"` — not structured title/artist fields and definitely not YouTube video IDs. Building a manifest from Jikan requires a second step: parse the string, then search YouTube Data API for the video ID.
**Why it happens:** Jikan scrapes MyAnimeList which stores themes as formatted strings.
**How to avoid:** Write a parser for the Jikan theme string format. Then use YouTube Data API `search.list` with `q = "<title> <artist> official"` to get the video ID. Cache results immediately — 200 searches × 100 units = 20,000 YouTube quota units (exactly the daily limit). Run manifest building on day 1, cache to JSON, never re-fetch.
**Warning signs:** YouTube quota exhausted mid-manifest build — run the build script with checkpoint saves so it resumes from the last successful entry.

### Pitfall 5: Schema Versioning Neglect
**What goes wrong:** The lesson schema evolves during generation (e.g., adding `cultural_context` to verses). Without a `content_schema_version` field, there is no way to distinguish songs generated with the old schema from songs that need regeneration.
**Why it happens:** "We'll worry about migrations later" — but 200 songs at partial coverage means mixed schemas in the DB.
**How to avoid:** Start with `content_schema_version = 1` on all records. When the schema changes, increment the version and run the QA agent to flag all songs at the old version. The QA agent's coverage check should include a version check.
**Warning signs:** The QA agent reports some songs as complete but the player shows missing fields — version mismatch is the likely cause.

### Pitfall 6: Concurrent Claude Batch Requests and Spend Limits
**What goes wrong:** Anthropic's Batch API may slightly exceed workspace spend limits under high throughput. Additionally, Tier 1 accounts have very low rate limits (20k input TPM / 4k output TPM) which cap batch throughput.
**Why it happens:** Batch API processing is concurrent and does not strictly respect spend limits per-batch.
**How to avoid:** Set a workspace spend limit in the Anthropic console before starting the batch. For 200 songs at ~3k tokens input / ~4k tokens output per song with Claude Sonnet 4.6 batch pricing: ~600k input + 800k output = ~$0.90 + ~$6.00 = ~$6.90 total. Very affordable, but verify your tier's throughput capacity first. Move to Tier 2 (requires $40 minimum spend) if Tier 1 causes slowdowns.
**Warning signs:** Batch taking more than 2 hours — check if throughput is being throttled due to tier limits.

---

## Code Examples

### Complete Lesson Prompt Template
```typescript
// Source: synthesized from Anthropic structured outputs docs + CONTEXT.md decisions
function buildLessonPrompt(song: SongManifest, lyrics: string, tokens: KuromojiToken[]): string {
  return `You are a Japanese language education specialist. Generate a complete lesson for the anime song below.

Song: "${song.title}" by ${song.artist}
From: ${song.anime} (${song.season_info})
Year: ${song.year_launched}

Pre-analyzed tokens (kuroshiro output):
${JSON.stringify(tokens, null, 2)}

Lyrics:
${lyrics}

INSTRUCTIONS:
1. Split lyrics into verses (natural phrase/sentence groups, 1-4 lines each)
2. For each token, use the pre-analyzed reading/romaji but verify and correct if wrong
3. Assign grammar tag per token: noun, verb, adjective, adverb, particle, expression, or other
4. Assign grammar_color: noun→blue, verb→red, adjective→green, adverb→orange, particle→grey, expression→none
5. For translations, provide natural/fluent translations (not word-for-word). Portuguese = Brazilian PT-BR.
6. For verse explanations: literal_meaning first (word-by-word), cultural_context only if there is genuine cultural nuance
7. For vocabulary: use song context as primary example. Add up to 2 additional examples of increasing difficulty.
8. For grammar_points: name the specific JLPT grammar pattern, provide conjugation path if applicable
9. For culturally untranslatable terms (honorifics, onomatopoeia): exercise judgment — translate when a natural equivalent exists, keep original with explanation when translation loses meaning
10. JLPT assignment algorithm: assign based on the highest JLPT level required to understand 80% of vocabulary, cross-referenced with the most complex grammar pattern. Examples: "夢" alone = N4; "夢を見る" with ている = N4; "叶えられない" (potential negative) = N3.

Return the lesson as valid JSON matching the required schema exactly.`;
}
```

### kuroshiro Pre-Processing Before Claude
```typescript
// Source: kuroshiro docs (https://kuroshiro.org) — MEDIUM confidence
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "@sglkc/kuromoji";

const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "node_modules/@sglkc/kuromoji/dict" }));

export async function tokenizeLyrics(lyrics: string): Promise<KuromojiToken[]> {
  // Get tokenized output with readings
  const tokens = await kuroshiro._analyzer.tokenize(lyrics);

  return tokens
    .filter(t => t.surface_form.trim() !== "")
    .map(token => ({
      surface: token.surface_form,
      reading: token.reading ?? token.surface_form,  // hiragana reading
      romaji: await kuroshiro.convert(token.surface_form, { to: "romaji", mode: "okurigana", romajiSystem: "hepburn" }),
      pos: token.pos,  // part of speech from kuromoji
    }));
}
```

### LRCLIB Fetch with Fallback
```typescript
// Source: LRCLIB API (https://lrclib.net/docs) + WebSearch — MEDIUM confidence
const LRCLIB_BASE = "https://lrclib.net/api";

export async function fetchFromLrclib(title: string, artist: string, anime: string) {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
    album_name: anime,
  });
  const res = await fetch(`${LRCLIB_BASE}/get?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  // syncedLyrics is LRC format: "[00:27.93] 夢を見ていた\n..."
  // plainLyrics is unsynced plain text
  return data.syncedLyrics ? { synced: data.syncedLyrics, plain: data.plainLyrics } : null;
}

// Parse LRC format into line-level timed array
export function parseLrc(lrc: string): Array<{ startMs: number; text: string }> {
  const lines = lrc.split("\n");
  return lines
    .map(line => {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/);
      if (!match) return null;
      const [, mm, ss, cs, text] = match;
      const startMs = (parseInt(mm) * 60 + parseInt(ss)) * 1000 + parseInt(cs.padEnd(3, "0"));
      return { startMs, text };
    })
    .filter(Boolean) as Array<{ startMs: number; text: string }>;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential Claude API calls with retry logic | Message Batches API — single call, async, 50% cost discount | 2024 (GA 2025) | 200 songs in 1 batch call vs 200 sequential calls; 50% cost reduction |
| `output_format` beta header for JSON | `output_config.format.json_schema` (GA, no beta header) | November 2025 → GA 2026 | No beta header needed; constrained decoding guarantees schema compliance |
| `kuromoji` vanilla npm package | `@sglkc/kuromoji` fork | 2024 | Resolves Node 18+ async dictionary loading failures |
| Manual lyric timing via LRC file editors | WhisperX auto-alignment + web-based correction editor | 2023-2025 | Reduces manual timing effort from ~30 min/song to ~5 min/song for corrections |
| Claude Sonnet 3.5 for content generation | Claude Sonnet 4.6 (latest alias, 64k output) | 2025-2026 | Better Japanese understanding; longer output for complex songs |

**Deprecated/outdated:**
- `kuromoji` (vanilla): Potential Node 18+ async issues; replaced by `@sglkc/kuromoji`
- `output_format` beta header (`structured-outputs-2025-11-13`): Works but deprecated; migrate to `output_config.format`
- Whisper (base local model): WhisperX's `large-v3` has better accuracy; WhisperX wrapper preferred over raw Whisper for timing tasks

---

## Open Questions

1. **WhisperX forced alignment accuracy on anime songs**
   - What we know: WhisperX achieves 88-93% word accuracy on clean speech; one GitHub issue confirms "totally out-of-sync on some periods" with background music
   - What's unclear: Whether a vocal isolation step (demucs) before WhisperX materially improves accuracy enough to be worth the extra pipeline complexity
   - Recommendation: Time 5 pilot songs first, both with and without demucs. If 60%+ of word timestamps have > 500ms drift, add demucs as a mandatory pre-processing step

2. **LRCLIB coverage rate for anime songs**
   - What we know: LRCLIB has ~3M tracks total, community-contributed, free
   - What's unclear: What percentage of top-200 anime OPs/EDs are actually in LRCLIB
   - Recommendation: Run a coverage check script against the final 200-song manifest before building the full pipeline. If < 60% hit rate, reconsider relying on LRCLIB as primary and promote Genius to primary.

3. **YouTube quota for 200-song manifest build**
   - What we know: YouTube Data API `search.list` costs 100 units; default daily quota is 10,000 units; 200 songs = exactly 20,000 units needed
   - What's unclear: Whether you can get approved for increased quota before starting manifest build, or need to split across two days
   - Recommendation: Apply for YouTube Data API quota increase immediately. Build the manifest in batches of 90 searches/day if no increase is granted. Cache all results to `songs-manifest.json` immediately — never re-search.

4. **Jikan API theme string parser edge cases**
   - What we know: Format is roughly `"1: \"TITLE\" by ARTIST (eps X-Y)"` but has many variants (multiple artists, cover artists, seasonal variations)
   - What's unclear: How many format variants exist and whether a regex covers 95%+
   - Recommendation: Manually curate the final manifest JSON after Jikan-assisted discovery. The Jikan data is a starting point for popularity ranking, not a reliable structured source for title/artist.

5. **Content schema version migration strategy**
   - What we know: The schema will evolve as more songs reveal edge cases (compound verbs, set phrases, multiple readings)
   - What's unclear: Whether to add `content_schema_version` with an integer or a string semver
   - Recommendation: Use an integer version starting at 1. Increment for breaking changes. Track which songs need regeneration via the QA agent's version check.

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Claude Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — Claude Sonnet 4.6 model ID, pricing, max output
- [Anthropic Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing) — batch limits (100k requests / 256MB), 50% cost discount, polling pattern, 24-hour expiry
- [Anthropic Structured Outputs (GA)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `output_config.format.json_schema` syntax, GA models (Sonnet 4.6, Opus 4.6, Haiku 4.5), TypeScript example
- [wavesurfer.js Regions Plugin](https://wavesurfer.xyz/plugins/regions) — drag/resize, `region-update-end` event, React integration via `@wavesurfer/react`
- [Drizzle ORM + Neon docs](https://orm.drizzle.team/docs/get-started/neon-new) — JSONB column type, seeding pattern
- Prior project research: `.planning/research/STACK.md` — kuroshiro/@sglkc/kuromoji pattern, @anthropic-ai/sdk vs Vercel AI SDK guidance
- Prior project research: `.planning/research/ARCHITECTURE.md` — JSONB lesson blob schema, content generation pipeline pattern
- Prior project research: `.planning/research/PITFALLS.md` — AI grammar hallucinations, YouTube quota exhaustion

### Secondary (MEDIUM confidence)
- [LRCLIB API overview](https://lrclib.net/docs) — free synced lyrics, LRC format, no API key required, ~3M tracks; anime coverage not verified
- [WhisperX GitHub](https://github.com/m-bain/whisperX) — word-level timestamps via CTC forced alignment; accuracy note: "totally out-of-sync on some periods" with music confirmed in issue #1247
- [Jikan API v4](https://jikan.moe/) — free unofficial MAL API, themes endpoint returns string format (not structured), no YouTube IDs
- [kuroshiro npm](https://www.npmjs.com/package/kuroshiro) — furigana + romaji generation; `@sglkc/kuromoji` as Node 18+ compatible analyzer
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp) — `--extract-audio --audio-format mp3` for YouTube audio download; requires ffmpeg
- WebSearch: "WhisperX word-level timestamps accuracy music songs 2025" — accuracy 88-93% on clean speech, degrades on music; MEDIUM confidence

### Tertiary (LOW confidence)
- WebSearch: "LRCLIB API synced lyrics format github 2025" — LRC `[mm:ss.xx]` format confirmed, community coverage varies; LOW confidence on anime-specific hit rate
- WebSearch: "Jikan API MyAnimeList anime theme songs 2025" — confirms string-format themes, no YouTube IDs; verified by direct API call
- WebSearch: "WhisperX vs competitors accuracy benchmark 2026" — large-v3 preferred model; LOW confidence on music-specific benchmarks

---

## Metadata

**Confidence breakdown:**
- Claude Batch API + Structured Outputs: HIGH — verified against official Anthropic docs with exact TypeScript syntax
- Drizzle/Neon schema patterns: HIGH — verified against official Drizzle docs
- wavesurfer.js RegionsPlugin: HIGH — verified against official plugin docs
- WhisperX timing accuracy on music: MEDIUM — confirmed word-level support, accuracy degradation on music mentioned in GitHub issues but no hard benchmark
- LRCLIB anime coverage: MEDIUM — free and free of auth confirmed; anime-specific coverage rate unknown until runtime
- Jikan theme string format: MEDIUM — confirmed no YouTube IDs; string format confirmed via live API call

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days — stable libraries; Anthropic model aliases may update)
