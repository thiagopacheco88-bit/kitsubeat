"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  // ISO timestamp of the most recent published `source='human'` lyrics_version
  // for this song_version, or null if the song has never been human-reviewed.
  last_human_revision_at: string | null;
  // Display name of the reviewer (resolved server-side via Clerk).
  last_human_reviewer: string | null;
}

// Compact relative-time formatter. Intentionally low-precision — admins only
// need to know "fresh enough" vs "needs another pass" at a glance.
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

interface Props {
  initialSongVersionId: string | null;
}

// Theme-aware palette — matches the global tokens declared in src/app/globals.css
// so the picker stays readable in both dark and light modes.
const palette = {
  heading: "var(--color-text)",
  subdued: "var(--color-text-muted)",
  body: "var(--color-text)",
  link: "var(--color-accent)",
  subtleBg: "var(--color-card-2)",
  cardBg: "var(--color-card)",
  border: "var(--color-border)",
  divider: "var(--color-border)",
  // Status badges — use translucent tints so the same hex works on both bgs
  warning: { bg: "rgba(245, 158, 11, 0.15)", fg: "#f59e0b", border: "rgba(245, 158, 11, 0.40)" },
  info: { bg: "rgba(239, 68, 68, 0.10)", fg: "var(--color-accent)", border: "rgba(239, 68, 68, 0.30)" },
  error: "#ef4444",
};

export default function SongSearch({ initialSongVersionId }: Props) {
  const router = useRouter();
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Default collapsed iff a song is already selected — admins editing a song
  // shouldn't have the picker hogging vertical space, but the no-song landing
  // view should still surface the list.
  const [collapsed, setCollapsed] = useState(initialSongVersionId != null);

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

  const selectedSong = useMemo(
    () =>
      initialSongVersionId
        ? songs.find((s) => s.song_version_id === initialSongVersionId) ?? null
        : null,
    [songs, initialSongVersionId]
  );

  const panelId = "song-search-panel";

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        data-testid="song-search-toggle"
        aria-expanded={!collapsed}
        aria-controls={panelId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "8px 12px",
          background: palette.subtleBg,
          border: `1px solid ${palette.border}`,
          borderRadius: "6px",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "13px",
          color: palette.body,
          marginBottom: collapsed ? 0 : "12px",
        }}
      >
        <span style={{ color: palette.subdued, width: "10px" }}>
          {collapsed ? "▶" : "▼"}
        </span>
        <span style={{ fontWeight: 600 }}>Search songs</span>
        {collapsed && selectedSong && (
          <span style={{ color: palette.subdued, fontWeight: 400 }}>
            · {selectedSong.title}
            {selectedSong.artist ? ` — ${selectedSong.artist}` : ""}
          </span>
        )}
        {collapsed && !selectedSong && initialSongVersionId && loading && (
          <span style={{ color: palette.subdued, fontWeight: 400 }}>
            · loading…
          </span>
        )}
      </button>

      {collapsed ? null : loading ? (
        <p style={{ color: palette.subdued, padding: "24px 0" }} id={panelId}>
          Loading songs…
        </p>
      ) : error ? (
        <p style={{ color: palette.error, padding: "24px 0" }} id={panelId}>
          Error: {error}
        </p>
      ) : (
        <div id={panelId}>
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
          background: palette.cardBg,
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
            <th style={{ padding: "8px 10px", borderBottom: `1px solid ${palette.border}` }}>
              Last reviewed
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => {
            const isSelected = s.song_version_id === initialSongVersionId;
            const href = `/admin/lyrics?songId=${s.song_version_id}&version=${s.version_type}`;
            // Open the song. Collapse immediately so the panel folds away during
            // the soft navigation (this component is preserved across the route
            // change, so the mount-time default doesn't re-fire on its own).
            const open = () => {
              setCollapsed(true);
              router.push(href);
            };
            return (
              <tr
                key={s.song_version_id}
                data-testid={`song-row-${s.song_version_id}`}
                role="link"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
                title={isSelected ? "Currently selected" : `Open ${s.title}`}
                style={{
                  background: isSelected ? palette.info.bg : "transparent",
                  borderBottom: `1px solid ${palette.divider}`,
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: "8px 10px", color: palette.body, fontWeight: isSelected ? 600 : 400 }}>{s.title}</td>
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
                <td style={{ padding: "8px 10px", fontSize: "12px", color: palette.subdued }}>
                  {s.last_human_revision_at ? (
                    <span data-testid={`reviewed-${s.song_version_id}`}>
                      <span style={{ color: palette.body }}>{relativeTime(s.last_human_revision_at)}</span>
                      {s.last_human_reviewer ? (
                        <span> · {s.last_human_reviewer}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span style={{ color: palette.subdued }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
        </div>
      )}
    </div>
  );
}
