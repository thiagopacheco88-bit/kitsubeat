/**
 * Phase-local 3-bucket split. `src/lib/fsrs/tier.ts::tierFor` collapses state=1 and
 * state=3 to a single TIER_LEARNING, because every other surface (TierText,
 * KnownWordCount pill) has only two labels past 'new'. The dashboard is the one
 * surface where users benefit from seeing 'fresh learning' (state=1) separately
 * from 'lapsed and relearning' (state=3). This component therefore reads `state`
 * directly and does NOT use `tierFor()`. Do not replace with `tierFor()` — that
 * would silently merge two sections the user explicitly sees.
 *
 * Phase 11.6 Plan 11: Each word now shows two mastery badges — one for romaji_meaning
 * (the foundational track, always visible) and one for kanji_kana (only shown when
 * the word's dictionary_form contains at least one kanji codepoint). Tier grouping
 * uses romaji_state (the foundational track per SPEC R18). The `state` field on
 * DashboardRow is a backward-compat alias for romaji_state.
 */

import type { DashboardRow } from "@/lib/db/queries";
import { localize } from "@/lib/types/lesson";
import { hasKanji } from "@/lib/exercises/kanji";
import SeenInExpander from "./SeenInExpander";

interface Props {
  rows: DashboardRow[];
}

function formatDue(due: Date | string): string {
  const d = typeof due === "string" ? new Date(due) : due;
  return d.toLocaleDateString();
}

function getMeaning(meaning: unknown): string {
  return localize(
    meaning as Parameters<typeof localize>[0],
    "en"
  );
}

// ---------------------------------------------------------------------------
// MasteryBadge — a color-coded pill showing a card_kind label + state text.
//
// Phase 14 Plan 14-09 (D-PRE-10 chrome cleanup): all palette utilities -> token
// vars. Card surface uses --color-card; rests of the type ramp uses
// --color-text/--color-text-muted/--color-text-dim per SPEC §A.2 hierarchy.
// Pills use --color-card-2 fill, matching the catalog tile recipe from Plan 14-06.
// ---------------------------------------------------------------------------

interface MasteryBadgeProps {
  state: 0 | 1 | 2 | 3 | null;
  label: string;
  testId: string;
}

function stateText(state: 0 | 1 | 2 | 3 | null): string {
  if (state === null) return "—";
  if (state === 0) return "New";
  if (state === 1) return "Learn";
  if (state === 2) return "Review";
  return "Relearn";
}

function stateColor(state: 0 | 1 | 2 | 3 | null): string {
  if (state === null) return "bg-[var(--color-card-2)] text-[var(--color-text-dim)]";
  if (state === 0) return "bg-blue-700/20 text-blue-300";
  if (state === 1) return "bg-yellow-700/20 text-yellow-300";
  if (state === 2) return "bg-emerald-700/20 text-emerald-300";
  return "bg-rose-700/20 text-rose-300";
}

function MasteryBadge({ state, label, testId }: MasteryBadgeProps) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs ${stateColor(state)}`}
    >
      <span className="text-[length:var(--text-micro)] uppercase opacity-60">
        {label}
      </span>
      {stateText(state)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// VocabRow
// ---------------------------------------------------------------------------

interface VocabRowProps {
  row: DashboardRow;
}

function VocabRow({ row }: VocabRowProps) {
  const showKanjiIndicator = hasKanji(row.dictionary_form);

  return (
    <div
      data-testid={`vocab-row-${row.vocab_item_id}`}
      className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card-ring)] sm:flex-row sm:items-start sm:justify-between"
    >
      {/* Left: word identity */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-semibold text-[var(--color-text)]">
            {row.dictionary_form}
          </span>
          {row.reading && row.reading !== row.dictionary_form && (
            <span className="text-sm text-[var(--color-text-muted)]">{row.reading}</span>
          )}
          {row.romaji && (
            <span className="text-xs text-[var(--color-text-dim)]">{row.romaji}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{getMeaning(row.meaning)}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {row.part_of_speech && (
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {row.part_of_speech}
            </span>
          )}
          {row.jlpt_level && (
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {row.jlpt_level}
            </span>
          )}
        </div>
      </div>
      {/* Right: mastery badges + review metadata + seen-in */}
      <div className="flex shrink-0 flex-col items-start gap-1.5 text-left sm:items-end sm:text-right">
        {/* Dual mastery indicators (Phase 11.6 Plan 11) */}
        <div className="flex flex-wrap justify-end gap-1">
          <MasteryBadge
            state={row.romaji_state}
            label="romaji"
            testId={`mastery-romaji-${row.vocab_item_id}`}
          />
          {showKanjiIndicator && (
            <MasteryBadge
              state={row.kanji_state}
              label="kanji"
              testId={`mastery-kanji-${row.vocab_item_id}`}
            />
          )}
        </div>
        <span className="text-xs text-[var(--color-text-dim)]">
          Due {formatDue(row.romaji_due)}
        </span>
        <SeenInExpander
          vocabItemId={row.vocab_item_id}
          initialCount={row.source_song_count}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bucket
// ---------------------------------------------------------------------------

interface BucketProps {
  title: string;
  rows: DashboardRow[];
}

function Bucket({ title, rows }: BucketProps) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-3 sm:p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
        {title}{" "}
        <span className="ml-1 rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-1.5 py-0.5 text-xs font-normal text-[var(--color-text-muted)]">
          {rows.length}
        </span>
      </h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <VocabRow key={row.vocab_item_id} row={row} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// VocabularyList
// ---------------------------------------------------------------------------

export default function VocabularyList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="mt-12 text-center text-[var(--color-text-muted)]">
        <p className="text-base">No vocabulary yet.</p>
        <p className="mt-1 text-sm">
          Complete a song&apos;s Practice tab to start tracking words.
        </p>
      </div>
    );
  }

  // Phase-local 3-bucket split (LOCKED — Path B):
  //   Mastered → romaji_state === 2  (FSRS Review)
  //   Known    → romaji_state === 3  (FSRS Relearning — previously mastered, now lapsed)
  //   Learning → romaji_state === 1  (FSRS Learning — first-pass)
  // romaji_state === 0 (New) is excluded by getVocabularyDashboard's WHERE romaji_state IN (1,2,3).
  // Tier grouping uses romaji_meaning state per SPEC R18 (the `state` alias equals romaji_state).
  const mastered = rows.filter((r) => r.state === 2);
  const known = rows.filter((r) => r.state === 3);
  const learning = rows.filter((r) => r.state === 1);

  return (
    <div className="flex flex-col gap-5">
      <Bucket title="Mastered" rows={mastered} />
      <Bucket title="Known" rows={known} />
      <Bucket title="Learning" rows={learning} />
    </div>
  );
}
