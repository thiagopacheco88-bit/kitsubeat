/**
 * Phase-local 3-bucket split. `src/lib/fsrs/tier.ts::tierFor` collapses state=1 and
 * state=3 to a single TIER_LEARNING, because every other surface (TierText,
 * KnownWordCount pill) has only two labels past 'new'. The dashboard is the one
 * surface where users benefit from seeing 'fresh learning' (state=1) separately
 * from 'lapsed and relearning' (state=3). This component therefore reads `state`
 * directly and does NOT use `tierFor()`. Do not replace with `tierFor()` — that
 * would silently merge two sections the user explicitly sees.
 */

import type { DashboardRow } from "@/lib/db/queries";
import { localize } from "@/lib/types/lesson";
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

interface VocabRowProps {
  row: DashboardRow;
}

// Phase 14 Plan 14-09 (D-PRE-10 chrome cleanup): all palette utilities -> token
// vars. Card surface uses --color-card; rests of the type ramp uses
// --color-text/--color-text-muted/--color-text-dim per SPEC §A.2 hierarchy.
// Pills (POS + JLPT) use --color-card-2 fill, matching the catalog tile recipe
// from Plan 14-06. The card-fill alpha (`/50` opacity modifier) is replaced
// with a flat --color-card so the row reads against both light + dark themes
// equivalently — the alpha was a dark-only effect that didn't translate.
function VocabRow({ row }: VocabRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
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
      {/* Right: review metadata + seen-in */}
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="text-xs text-[var(--color-text-dim)]">
          Due {formatDue(row.due)}
        </span>
        <SeenInExpander
          vocabItemId={row.vocab_item_id}
          initialCount={row.source_song_count}
        />
      </div>
    </div>
  );
}

interface BucketProps {
  title: string;
  rows: DashboardRow[];
}

function Bucket({ title, rows }: BucketProps) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-8">
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
  //   Mastered → state === 2  (FSRS Review)
  //   Known    → state === 3  (FSRS Relearning — previously mastered, now lapsed)
  //   Learning → state === 1  (FSRS Learning — first-pass)
  // state === 0 (New) is excluded by getVocabularyDashboard's WHERE state IN (1,2,3).
  const mastered = rows.filter((r) => r.state === 2);
  const known = rows.filter((r) => r.state === 3);
  const learning = rows.filter((r) => r.state === 1);

  return (
    <div>
      <Bucket title="Mastered" rows={mastered} />
      <Bucket title="Known" rows={known} />
      <Bucket title="Learning" rows={learning} />
    </div>
  );
}
