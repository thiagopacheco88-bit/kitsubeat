export default function Loading() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">Social Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Fetching metrics from Instagram, YouTube, and Facebook…
        </p>
      </div>
      <div
        className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-dim)", fontSize: 14 }}
      >
        Loading…
      </div>
    </main>
  );
}
