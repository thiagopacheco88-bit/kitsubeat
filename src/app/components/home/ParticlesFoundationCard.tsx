import { CardLink } from "@/components/ui/Card";

export function ParticlesFoundationCard() {
  return (
    <CardLink
      href="/foundations/particles"
      variant="flat"
      size="sm"
      className="relative flex flex-col items-center justify-between gap-2 border-dashed p-2"
      style={{ width: "130px", height: "124px" }}
      aria-label="Particles — the grammar glue of every Japanese sentence"
      data-testid="particles-checkpoint"
    >
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
        は
      </div>

      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text)] truncate">
          Particles
        </p>
        <span
          className="inline-block rounded-[var(--radius-pill)] px-2 py-0.5 font-semibold bg-[var(--color-card-2)] text-[var(--color-text-muted)]"
          style={{ fontSize: "10px" }}
        >
          Grammar Glue
        </span>
      </div>
    </CardLink>
  );
}
