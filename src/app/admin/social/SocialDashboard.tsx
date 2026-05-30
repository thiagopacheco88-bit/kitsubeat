"use client";

import { useState } from "react";
import type { PostedRow, ScheduledRow } from "./page";

const PLATFORMS = ["all", "instagram", "youtube", "facebook", "tiktok"] as const;
type PlatformFilter = (typeof PLATFORMS)[number];

const LABELS: Record<PlatformFilter, string> = {
  all: "All",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const COLORS: Record<string, string> = {
  instagram: "#e1306c",
  youtube: "#ff0000",
  facebook: "#1877f2",
  tiktok: "#111111",
};

function fmt(n?: number): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getRows(posted: PostedRow[], platform: PlatformFilter, showAll: boolean): PostedRow[] {
  const filtered = platform === "all" ? posted : posted.filter((r) => r.platform === platform);
  if (platform !== "all" || showAll) return filtered;
  const counts: Record<string, number> = {};
  const result: PostedRow[] = [];
  for (const row of filtered) {
    if ((counts[row.platform] ?? 0) < 5) {
      result.push(row);
      counts[row.platform] = (counts[row.platform] ?? 0) + 1;
    }
  }
  return result;
}

export default function SocialDashboard({
  posted,
  scheduled,
}: {
  posted: PostedRow[];
  scheduled: ScheduledRow[];
}) {
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const rows = getRows(posted, platform, showAll);
  const totalFiltered = platform === "all" ? posted.length : posted.filter((r) => r.platform === platform).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Platform filter tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => { setPlatform(p); setShowAll(false); }}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 999,
              cursor: "pointer",
              border: `1px solid ${platform === p ? "var(--color-accent)" : "var(--color-border)"}`,
              background: platform === p ? "var(--color-accent)" : "none",
              color: platform === p ? "#fff" : "var(--color-text-muted)",
            }}
          >
            {LABELS[p]}
          </button>
        ))}
      </div>

      {/* Posted table */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card-ring)]">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
            Posted &middot; {rows.length} shown
            {platform === "all" && !showAll && " (last 5 per platform)"}
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            style={{
              fontSize: 12,
              color: "var(--color-accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {showAll ? "Show last 5" : `Show all ${totalFiltered}`}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                {platform === "all" && <Th>Platform</Th>}
                <Th>Video</Th>
                <Th>Date</Th>
                <Th>Days ago</Th>
                <Th>Views</Th>
                <Th>Likes</Th>
                <Th>Comments</Th>
                <Th>Shares</Th>
                <Th>Saved</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "24px 16px",
                      textAlign: "center",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    No posted videos found.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    {platform === "all" && (
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: COLORS[row.platform] + "22",
                            color: COLORS[row.platform],
                          }}
                        >
                          {row.platform}
                        </span>
                      </td>
                    )}
                    <td
                      style={{
                        padding: "10px 16px",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.link ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "none" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.textDecoration = "underline")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.textDecoration = "none")
                          }
                        >
                          {row.label} #{row.part}
                        </a>
                      ) : (
                        `${row.label} #${row.part}`
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.date}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.daysAgo}d
                    </td>
                    <Metric>{fmt(row.metrics.views)}</Metric>
                    <Metric>{fmt(row.metrics.likes)}</Metric>
                    <Metric>{fmt(row.metrics.comments)}</Metric>
                    <Metric>{fmt(row.metrics.shares)}</Metric>
                    <Metric>{fmt(row.metrics.saves)}</Metric>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming scheduled — only in All view */}
      {platform === "all" && scheduled.length > 0 && (
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card-ring)]">
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
              Upcoming &middot; {scheduled.length} posts
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                  <Th>#</Th>
                  <Th>Series</Th>
                  <Th>Scheduled date</Th>
                  <Th>In</Th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td
                      style={{
                        padding: "10px 16px",
                        color: "var(--color-text-dim)",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {row.post}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.label} #{row.part}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.date}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.daysUntil <= 0 ? "today" : `${row.daysUntil}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "10px 16px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--color-text-dim)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Metric({ children }: { children: string }) {
  return (
    <td
      style={{
        padding: "10px 16px",
        fontFamily: "monospace",
        fontSize: 12,
        color: "var(--color-text)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
