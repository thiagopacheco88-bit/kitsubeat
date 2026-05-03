"use client";

import { useState } from "react";
import { useAdminLyricsStore } from "@/lib/admin/lyrics-store";
import { publish } from "../actions/publish";
import StalePublishModal from "./StalePublishModal";

interface Props {
  slug: string;
}

export default function PublishButton({ slug }: Props) {
  const songVersionId = useAdminLyricsStore((s) => s.songVersionId);
  const baseVersionId = useAdminLyricsStore((s) => s.baseVersionId);
  const verses = useAdminLyricsStore((s) => s.verses);
  const dirty = useAdminLyricsStore((s) => s.dirtyVerseNumbers);
  const markPublished = useAdminLyricsStore((s) => s.markPublished);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState<{ currentActiveId: string | null } | null>(
    null
  );
  const [success, setSuccess] = useState<{ versionNumber: number } | null>(null);

  async function handlePublish() {
    if (!songVersionId || !baseVersionId) return;
    if (
      dirty.length === 0 &&
      !confirm(
        "No edits to publish. Publish anyway (creates a no-op 'human' version)?"
      )
    )
      return;

    setPublishing(true);
    setError(null);
    setStale(null);
    setSuccess(null);

    try {
      const r = await publish({
        songVersionId,
        slug,
        baseVersionId,
        verses,
        dirtyVerseNumbers: dirty,
      });
      if (r.ok) {
        markPublished({
          newVersionId: r.newVersionId,
          newVersionNumber: r.newVersionNumber,
        });
        setSuccess({ versionNumber: r.newVersionNumber });
      } else if (r.error === "stale_publish" && "currentActiveId" in r) {
        setStale({ currentActiveId: r.currentActiveId });
      } else {
        setError(r.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePublish}
        disabled={publishing || !songVersionId || !baseVersionId}
        data-testid="publish-button"
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: 600,
          border: "1px solid var(--color-accent)",
          borderRadius: "4px",
          background: publishing ? "var(--color-card-2)" : "var(--color-accent)",
          color: publishing ? "var(--color-text-muted)" : "#fff",
          cursor: publishing ? "not-allowed" : "pointer",
        }}
      >
        {publishing ? "Publishing…" : "Publish"}
      </button>
      {success && (
        <span
          data-testid="publish-success"
          style={{ marginLeft: "8px", fontSize: "12px", color: "#22c55e" }}
        >
          Published as version #{success.versionNumber}
        </span>
      )}
      {error && (
        <span
          data-testid="publish-error"
          style={{ marginLeft: "8px", fontSize: "12px", color: "#ef4444" }}
        >
          Publish failed: {error}
        </span>
      )}
      {stale && (
        <StalePublishModal
          currentActiveId={stale.currentActiveId}
          onReload={() => window.location.reload()}
          onDismiss={() => setStale(null)}
        />
      )}
    </>
  );
}
