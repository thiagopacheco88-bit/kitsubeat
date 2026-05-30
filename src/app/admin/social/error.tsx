"use client";

export default function SocialError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">Admin</p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text)]">Social Dashboard</h1>
        <p className="mt-4 text-sm font-semibold text-red-500">Page error — details below</p>
        <pre className="mt-2 overflow-x-auto rounded bg-[var(--color-surface)] p-4 text-xs text-red-400">
          {error.message}
          {"\n"}
          {error.stack}
        </pre>
        {error.digest && (
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">Digest: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
