"use client";

interface Props {
  currentActiveId: string | null;
  onReload: () => void;
  onDismiss: () => void;
}

export default function StalePublishModal({
  currentActiveId,
  onReload,
  onDismiss,
}: Props) {
  return (
    <div
      data-testid="stale-publish-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: "18px",
            fontWeight: 700,
            color: "#dc2626",
          }}
        >
          Stale draft — reload required
        </h2>
        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#374151" }}>
          Another admin published a new version of this song while you were
          editing. Your local edits are still saved in your draft, but you need
          to reload to see the new baseline before re-applying them.
        </p>
        {currentActiveId && (
          <p
            style={{ margin: "0 0 16px 0", fontSize: "11px", color: "#6b7280" }}
          >
            Current active version: <code>{currentActiveId}</code>
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onDismiss}
            data-testid="stale-modal-dismiss"
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              background: "#fff",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReload}
            data-testid="stale-modal-reload"
            style={{
              padding: "8px 16px",
              border: "1px solid #6366f1",
              borderRadius: "4px",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
