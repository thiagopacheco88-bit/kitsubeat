"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SongRow {
  id: string;
  slug: string;
  title: string;
  artist: string;
  anime: string;
  timing_verified: "auto" | "manual";
  timing_youtube_id: string | null;
}

type FilterStatus = "all" | "auto" | "manual";

// ─────────────────────────────────────────────────────────────────────────────
// Badge component
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "auto" | "manual" }) {
  const styles: Record<string, string> = {
    auto: "background:#fef3c7;color:#92400e;border:1px solid #fcd34d",
    manual: "background:#dbeafe;color:#1e40af;border:1px solid #93c5fd",
  };
  const labels: Record<string, string> = {
    auto: "Needs Review",
    manual: "Reviewed",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 500,
        ...Object.fromEntries(
          styles[status].split(";").map((s) => {
            const [k, v] = s.split(":");
            return [k.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v?.trim()];
          })
        ),
      }}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SongList component
// ─────────────────────────────────────────────────────────────────────────────

export default function SongList() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    fetch("/api/admin/songs")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SongRow[]>;
      })
      .then((data) => {
        setSongs(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = songs.filter((s) => {
    if (filter === "all") return true;
    return s.timing_verified === filter;
  });

  const counts = {
    all: songs.length,
    auto: songs.filter((s) => s.timing_verified === "auto").length,
    manual: songs.filter((s) => s.timing_verified === "manual").length,
  };

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    background: active ? "#6366f1" : "#f9fafb",
    color: active ? "#fff" : "#374151",
    borderColor: active ? "#6366f1" : "#d1d5db",
  });

  if (loading) {
    return <p style={{ color: "#6b7280", padding: "24px" }}>Loading songs…</p>;
  }

  if (error) {
    return (
      <p style={{ color: "#dc2626", padding: "24px" }}>
        Error loading songs: {error}
      </p>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {(["all", "auto", "manual"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filterBtnStyle(filter === f)}
          >
            {f === "all"
              ? `All (${counts.all})`
              : f === "auto"
              ? `Needs Review (${counts.auto})`
              : `Reviewed (${counts.manual})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p style={{ color: "#6b7280", padding: "16px 0" }}>No songs found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#374151" }}>
                Title
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#374151" }}>
                Artist
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#374151" }}>
                Anime
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#374151" }}>
                Status
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#374151" }}>
                Audio
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((song, i) => (
              <tr
                key={song.id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: i % 2 === 0 ? "#fff" : "#fafafa",
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/admin/timing/${song.id}`}
                    style={{ color: "#6366f1", fontWeight: 500, textDecoration: "none" }}
                  >
                    {song.title}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>{song.artist}</td>
                <td style={{ padding: "10px 12px", color: "#6b7280" }}>{song.anime}</td>
                <td style={{ padding: "10px 12px" }}>
                  <StatusBadge status={song.timing_verified} />
                </td>
                <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "12px" }}>
                  {song.timing_youtube_id ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
