import Link from "next/link";

const TOOLS = [
  { key: "lyrics", label: "Lyrics Editor", desc: "Edit verses, kanji, AI fill" },
  { key: "exercises", label: "Exercise Review", desc: "Images, flags, exercise types" },
  { key: "timing", label: "Timing Editor", desc: "Word-level timestamps" },
] as const;

interface Props {
  songVersionId: string;
  active: "lyrics" | "exercises" | "timing";
}

function hrefFor(key: string, songVersionId: string) {
  if (key === "timing") return `/admin/timing/${songVersionId}`;
  if (key === "lyrics") return `/admin/lyrics?songId=${songVersionId}`;
  return `/admin/exercises?songId=${songVersionId}`;
}

export default function ToolSwitcher({ songVersionId, active }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
      }}
    >
      {TOOLS.map(({ key, label, desc }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={hrefFor(key, songVersionId)}
            style={{
              display: "block",
              padding: "12px 14px",
              borderRadius: "var(--radius-xl)",
              border: `1.5px solid ${isActive ? "var(--color-accent)" : "var(--color-border)"}`,
              background: isActive ? "rgba(var(--color-accent-rgb, 239,68,68), 0.07)" : "var(--color-card-2)",
              textDecoration: "none",
              transition: "border-color 0.15s",
            }}
          >
            <div style={{
              fontSize: "13px",
              fontWeight: 700,
              color: isActive ? "var(--color-accent)" : "var(--color-text)",
            }}>
              {isActive && <span style={{ marginRight: "5px" }}>▶</span>}
              {label}
            </div>
            <div style={{
              marginTop: "2px",
              fontSize: "11px",
              color: "var(--color-text-muted)",
            }}>
              {desc}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
