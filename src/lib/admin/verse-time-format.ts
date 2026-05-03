/**
 * Shared mm:ss.sss formatting helpers for the admin lyrics editor.
 *
 * Used by VerseRow's per-verse timing inputs AND VerseEditor's bulk-shift control,
 * so both surfaces parse the same set of admin shorthand: "1:23.456", "0:38",
 * "38055" (legacy bare-ms paste), "1.5" (treated as 1500 ms via the bare-int rule).
 */

// Renders a millisecond value as "m:ss.sss" with three-digit precision so the
// timing pipeline's millisecond resolution survives the round-trip through the
// editor textbox.
export function msToTime(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(Math.round(ms));
  const minutes = Math.floor(abs / 60_000);
  const seconds = (abs % 60_000) / 1000;
  return `${sign}${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

// Accepts "m:ss.sss", "m:ss", or a bare integer (legacy ms paste). Returns null
// on garbage so callers can revert their inputs instead of writing NaN to state.
export function timeToMs(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  const m = trimmed.match(/^(-?)(\d+):(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const minutes = Number(m[2]);
  const seconds = Number(m[3]);
  if (seconds >= 60) return null;
  return sign * Math.round(minutes * 60_000 + seconds * 1000);
}
