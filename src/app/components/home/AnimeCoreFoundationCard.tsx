/**
 * AnimeCoreFoundationCard — Foundations section tile for the Anime Core vocab module.
 *
 * Mirrors the visual style of CounterCheckpointNode (130×124px dashed-border card)
 * but has no progress tracking — it is a simple gateway to /anime/anime-core.
 * Rendered as a plain server component alongside KanaCheckpointNode and CounterCheckpointNode.
 */
import { CardLink } from "@/components/ui/Card";

export function AnimeCoreFoundationCard() {
  return (
    <CardLink
      href="/anime/anime-core"
      variant="flat"
      size="sm"
      className="relative flex flex-col items-center justify-between gap-2 border-dashed p-2"
      style={{ width: "130px", height: "124px" }}
      aria-label="Anime Core vocabulary — words that appear across every anime"
      data-testid="anime-core-checkpoint"
    >
      {/* Glyph badge — 語 (word / language) */}
      <div
        className="flex-shrink-0 rounded-full bg-[var(--color-card-2)] flex items-center justify-center font-bold text-[var(--color-text)]"
        style={{
          fontFamily: "var(--font-jp)",
          fontSize: "22px",
          fontWeight: 900,
          width: "42px",
          height: "42px",
        }}
        aria-hidden="true"
      >
        語
      </div>

      {/* Label + pill */}
      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text)] truncate">
          Anime Core
        </p>
        <span
          className="inline-block rounded-[var(--radius-pill)] px-2 py-0.5 font-semibold bg-[var(--color-card-2)] text-[var(--color-text-muted)]"
          style={{ fontSize: "10px" }}
        >
          Core Vocab
        </span>
      </div>
    </CardLink>
  );
}
