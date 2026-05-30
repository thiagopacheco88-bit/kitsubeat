import { getJlptGapSummary, type JlptGapRow } from "@/lib/db/queries";
import { Badge } from "@/components/ui/Badge";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";

const ALL_TIERS: JlptGapRow["jlpt_level"][] = ["N5", "N4", "N3", "N2", "N1"];

export async function JlptGapSummary({ userId }: { userId: string }) {
  const rows = await getJlptGapSummary(userId);

  return (
    <section
      className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 mb-6"
      aria-labelledby="jlpt-gap-heading"
    >
      <h2
        id="jlpt-gap-heading"
        className="text-lg font-semibold mb-3 text-[var(--color-text)]"
      >
        JLPT Mastery
      </h2>
      <ul className="space-y-3">
        {ALL_TIERS.map((tier) => {
          const row = rows.find((r) => r.jlpt_level === tier);
          if (!row) {
            return (
              <li
                key={tier}
                className="flex items-center gap-2 text-sm text-[var(--color-text-dim)]"
              >
                <Badge variant="jlpt" level={tier} />
                <span>catalog data not yet seeded</span>
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
                <Badge variant="jlpt" level={tier} />
                <span className="text-[var(--color-text-muted)]">
                  {row.mastered_count} / {row.total_count} mastered
                </span>
              </div>
              <AnimatedProgressBar
                value={pct}
                max={100}
                ariaLabel={`${tier} mastery: ${pct}%`}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
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
