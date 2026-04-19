import { getJlptGapSummary, type JlptGapRow } from "@/lib/db/queries";

const ALL_TIERS: JlptGapRow["jlpt_level"][] = ["N5", "N4", "N3", "N2", "N1"];

export async function JlptGapSummary({ userId }: { userId: string }) {
  const rows = await getJlptGapSummary(userId);

  return (
    <section
      className="rounded-xl border border-gray-700 bg-gray-900 p-4 mb-6"
      aria-labelledby="jlpt-gap-heading"
    >
      <h2 id="jlpt-gap-heading" className="text-lg font-semibold mb-3 text-white">
        JLPT Mastery
      </h2>
      <ul className="space-y-3">
        {ALL_TIERS.map((tier) => {
          const row = rows.find((r) => r.jlpt_level === tier);
          if (!row) {
            return (
              <li key={tier} className="text-sm text-gray-500">
                {tier}: catalog data not yet seeded
              </li>
            );
          }

          const pct =
            row.total_count > 0
              ? Math.round((row.mastered_count / row.total_count) * 100)
              : 0;
          const remaining = Math.max(0, row.total_count - row.mastered_count);

          return (
            <li key={tier} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">{tier}</span>
                <span className="text-gray-300">
                  {row.mastered_count} / {row.total_count} mastered
                </span>
              </div>
              <progress
                value={pct}
                max={100}
                aria-label={`${tier} mastery: ${pct}%`}
                className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-red-500 [&::-moz-progress-bar]:bg-red-500"
              />
              <p className="text-xs text-gray-400">
                {remaining > 0
                  ? `${remaining} to go to be ${tier} fluent`
                  : `${tier} fluent — all words mastered!`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
