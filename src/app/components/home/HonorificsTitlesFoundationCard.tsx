import { CardLink } from "@/components/ui/Card";

export function HonorificsTitlesFoundationCard() {
  return (
    <CardLink
      href="/foundations/honorifics"
      variant="flat"
      size="sm"
      className="relative flex flex-col items-center justify-between gap-2 border-dashed p-2"
      style={{ width: "130px", height: "124px" }}
      aria-label="Honorifics and Titles — san, kun, chan, senpai and the social grammar of anime"
      data-testid="honorifics-checkpoint"
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
        礼
      </div>

      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text)] truncate">
          Honorifics
        </p>
        <span
          className="inline-block rounded-[var(--radius-pill)] px-2 py-0.5 font-semibold bg-[var(--color-card-2)] text-[var(--color-text-muted)]"
          style={{ fontSize: "10px" }}
        >
          Social Titles
        </span>
      </div>
    </CardLink>
  );
}
