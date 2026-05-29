"use client";

import { useState, useTransition } from "react";
import { toggleSongAvailability, recheckSongAvailability } from "@/app/actions/contentStatus";

interface SongRow {
  id: string;
  slug: string;
  title: string;
  artist: string;
  anime: string;
  is_available: boolean;
  youtube_ids: string[];
}

interface Props {
  rows: SongRow[];
}

export default function ContentStatusTable({ rows: initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [recheckStatus, setRecheckStatus] = useState<Record<string, string>>({});

  function handleToggle(id: string, available: boolean) {
    startTransition(async () => {
      await toggleSongAvailability(id, available);
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_available: available } : r))
      );
    });
  }

  function handleRecheck(id: string) {
    setRecheckStatus((prev) => ({ ...prev, [id]: "checking…" }));
    startTransition(async () => {
      try {
        const result = await recheckSongAvailability(id);
        setRecheckStatus((prev) => ({
          ...prev,
          [id]: result.statuses.join(" | "),
        }));
        setRows((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, is_available: result.available } : r
          )
        );
      } catch (err) {
        setRecheckStatus((prev) => ({ ...prev, [id]: "error" }));
      }
    });
  }

  const unavailable = rows.filter((r) => !r.is_available);
  const available = rows.filter((r) => r.is_available);
  const sorted = [...unavailable, ...available];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Song</th>
            <th className="px-5 py-3">Anime</th>
            <th className="px-5 py-3">YouTube IDs</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--color-border)] last:border-0"
              style={{ background: row.is_available ? undefined : "rgba(239,68,68,0.06)" }}
            >
              <td className="px-5 py-3">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: row.is_available
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.15)",
                    color: row.is_available ? "var(--color-success, #16a34a)" : "var(--color-error, #dc2626)",
                  }}
                >
                  {row.is_available ? "✓ Available" : "✗ Blocked"}
                </span>
              </td>
              <td className="px-5 py-3">
                <a
                  href={`/songs/${row.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--color-text)] hover:underline"
                >
                  {row.title}
                </a>
                <div className="text-xs text-[var(--color-text-dim)]">{row.artist}</div>
              </td>
              <td className="px-5 py-3 text-[var(--color-text-muted)]">{row.anime}</td>
              <td className="px-5 py-3">
                {row.youtube_ids.length === 0 ? (
                  <span className="text-xs text-[var(--color-text-dim)]">none</span>
                ) : (
                  <div className="flex flex-col gap-1">
                    {row.youtube_ids.map((id) => (
                      <a
                        key={id}
                        href={`https://www.youtube.com/watch?v=${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-[var(--color-accent)] hover:underline"
                      >
                        {id}
                      </a>
                    ))}
                  </div>
                )}
                {recheckStatus[row.id] && (
                  <div className="mt-1 text-xs text-[var(--color-text-dim)]">
                    {recheckStatus[row.id]}
                  </div>
                )}
              </td>
              <td className="px-5 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRecheck(row.id)}
                    disabled={pending}
                    style={{
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      background: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      opacity: pending ? 0.5 : 1,
                    }}
                  >
                    Re-check
                  </button>
                  {row.is_available ? (
                    <button
                      onClick={() => handleToggle(row.id, false)}
                      disabled={pending}
                      style={{
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 999,
                        border: "1px solid rgba(239,68,68,0.4)",
                        background: "none",
                        color: "var(--color-error, #dc2626)",
                        cursor: "pointer",
                        opacity: pending ? 0.5 : 1,
                      }}
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggle(row.id, true)}
                      disabled={pending}
                      style={{
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 999,
                        border: "1px solid rgba(34,197,94,0.4)",
                        background: "none",
                        color: "var(--color-success, #16a34a)",
                        cursor: "pointer",
                        opacity: pending ? 0.5 : 1,
                      }}
                    >
                      Restore
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
