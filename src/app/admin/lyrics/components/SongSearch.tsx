"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface SongRow {
  song_version_id: string;
  song_id: string;
  slug: string;
  title: string;
  artist: string | null;
  anime: string | null;
  season_info: string | null;
  version_type: "tv" | "full" | string;
  quality_status: "active" | "flagged_wrong_song" | "flagged_unfixable";
  pipeline_status: "idle" | "rerun_in_progress" | "rerun_failed";
}

interface Props {
  initialSongVersionId: string | null;
}

const palette = {
  heading: "#111827",
  subdued: "#6b7280",
  body: "#374151",
  link: "#6366f1",
  subtleBg: "#f9fafb",
  border: "#e5e7eb",
  divider: "#f3f4f6",
  warning: { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
  info: { bg: "#dbeafe", fg: "#1e40af", border: "#93c5fd" },
  error: "#dc2626",
};

export default function SongSearch({ initialSongVersionId }: Props) {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => {
      const hay = [s.title, s.artist, s.anime, s.season_info]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [songs, query]);

  if (loading)
    return (
      <p style={{ color: palette.subdued, padding: "24px 0" }}>Loading songs…</p>
    );
  if (error)
    return (
      <p style={{ color: palette.error, padding: "24px 0" }}>Error: {error}</p>
    );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, artist, anime, or season info"
        data-testid="song-search-input"
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          border: `1px solid ${palette.border}`,
          borderRadius: "6px",
          color: palette.body,
          marginBottom: "16px",
          boxSizing: "border-box",
        }}
      />

      <div style={{ fontSize: "12px", color: palette.subdued, marginBottom: "8px" }}>
        Showing {filtered.length} of {songs.length} songs
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr
            style={{
              background: palette.subtleBg,
              color: palette.subdued,
              textAlign: "left",
            }}
          >
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}>
              Title
            </th>
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}>
              Artist
            </th>
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}>
              Anime / Position
            </th>
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}>
              Version
            </th>
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}>
              Status
            </th>
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => {
            const isSelected = s.song_version_id === initialSongVersionId;
            return (
              <tr
                key={s.song_version_id}
                data-testid={`song-row-${s.song_version_id}`}
                style={{
                  background: isSelected ? palette.info.bg : "transparent",
                  borderBottom: `1px solid ${palette.divider}`,
                }}
              >
                <td style={{ padding: "8px 10px", color: palette.body }}>{s.title}</td>
                <td style={{ padding: "8px 10px", color: palette.body }}>{s.artist ?? "—"}</td>
                <td style={{ padding: "8px 10px", color: palette.subdued }}>
                  {s.anime ?? "—"}
                  {s.season_info ? <span> · {s.season_info}</span> : null}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background:
                        s.version_type === "tv" ? palette.warning.bg : palette.info.bg,
                      color:
                        s.version_type === "tv" ? palette.warning.fg : palette.info.fg,
                      border: `1px solid ${
                        s.version_type === "tv"
                          ? palette.warning.border
                          : palette.info.border
                      }`,
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.version_type}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", fontSize: "12px" }}>
                  {s.quality_status !== "active" && (
                    <span
                      data-testid={`flag-${s.song_version_id}`}
                      style={{ color: palette.error, fontWeight: 600 }}
                    >
                      {s.quality_status.replace(/_/g, " ")}
                    </span>
                  )}
                  {s.pipeline_status !== "idle" && (
                    <span style={{ color: palette.warning.fg, marginLeft: "6px" }}>
                      {s.pipeline_status.replace(/_/g, " ")}
                    </span>
                  )}
                  {s.quality_status === "active" && s.pipeline_status === "idle" && (
                    <span style={{ color: palette.subdued }}>active</span>
                  )}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  <Link
                    href={`/admin/lyrics?songId=${s.song_version_id}&version=${s.version_type}`}
                    style={{
                      color: palette.link,
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                    data-testid={`open-${s.song_version_id}`}
                  >
                    {isSelected ? "Selected" : "Open →"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
