"use client";

import { useAdminLyricsStore } from "@/lib/admin/lyrics-store";

export default function SaveStatus() {
  const status = useAdminLyricsStore((s) => s.saveStatus);
  const error = useAdminLyricsStore((s) => s.saveError);
  const lastSavedAt = useAdminLyricsStore((s) => s.lastSavedAt);

  let label = "";
  // Theme-aware default; semantic state colors stay literal hex (verified
  // legible on both light and dark backgrounds).
  let color = "var(--color-text-muted)";
  switch (status) {
    case "idle":
      label = lastSavedAt
        ? `saved ${Math.round((Date.now() - lastSavedAt) / 1000)}s ago`
        : "no edits";
      break;
    case "saving":
      label = "saving…";
      color = "#f59e0b";
      break;
    case "saved":
      label = "saved ✓";
      color = "#22c55e";
      break;
    case "error":
      label = `save failed: ${error ?? "unknown"} (kept in localStorage)`;
      color = "#ef4444";
      break;
  }

  return (
    <span data-testid="save-status" style={{ fontSize: "12px", color }}>
      {label}
    </span>
  );
}
