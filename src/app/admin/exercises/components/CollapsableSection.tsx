"use client";

import { useState } from "react";

interface Props {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsableSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      borderRadius: "var(--radius-2xl)",
      border: "1px solid var(--color-border)",
      background: "var(--color-card)",
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          borderBottom: open ? "1px solid var(--color-border)" : "none",
        }}
      >
        <span style={{
          fontSize: "15px",
          fontWeight: 700,
          color: "var(--color-text)",
          flex: 1,
        }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            padding: "2px 8px",
            borderRadius: "999px",
            background: "var(--color-card-2)",
            border: "1px solid var(--color-border)",
          }}>
            {badge}
          </span>
        )}
        <span style={{
          fontSize: "11px",
          color: "var(--color-text-dim)",
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
