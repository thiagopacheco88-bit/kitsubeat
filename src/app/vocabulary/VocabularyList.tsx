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

function VocabRow({ row }: VocabRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3">
      {/* Left: word identity */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-semibold text-white">
            {row.dictionary_form}
          </span>
          {row.reading && row.reading !== row.dictionary_form && (
            <span className="text-sm text-gray-400">{row.reading}</span>
          )}
          {row.romaji && (
            <span className="text-xs text-gray-600">{row.romaji}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-300">{getMeaning(row.meaning)}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {row.part_of_speech && (
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {row.part_of_speech}
            </span>
          )}
          {row.jlpt_level && (
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {row.jlpt_level}
            </span>
          )}
        </div>
      </div>
      {/* Right: review metadata + seen-in */}
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="text-xs text-gray-500">
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}{" "}
        <span className="ml-1 rounded-full bg-gray-800 px-1.5 py-0.5 text-xs font-normal text-gray-400">
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
      <div className="mt-12 text-center text-gray-400">
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
