"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { key: "lyrics", href: "/admin/lyrics", label: "Lyrics Editor" },
  { key: "exercises", href: "/admin/exercises", label: "Exercise Review" },
  { key: "timing", href: "/admin/timing", label: "Timing Editor" },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: "4px",
        padding: "8px 16px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-card)",
        overflowX: "auto",
        alignItems: "center",
      }}
    >
      <span style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--color-text-dim)",
        marginRight: "8px",
        whiteSpace: "nowrap",
      }}>
        Admin
      </span>
      {TOOLS.map(({ key, href, label }) => {
        const active = pathname.startsWith(`/admin/${key}`);
        return (
          <Link
            key={key}
            href={href}
            style={{
              padding: "5px 14px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "999px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              background: active ? "var(--color-accent)" : "none",
              color: active ? "#fff" : "var(--color-text-muted)",
              border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
