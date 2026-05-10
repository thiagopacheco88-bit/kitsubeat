export default function VocabularyLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-ring-strong)] sm:p-6">
        <div className="h-3 w-14 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-8 w-48 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 h-4 w-32 rounded bg-[var(--color-card-2)]" />
      </div>

      {/* JLPT mastery card */}
      <div className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="mb-4 h-5 w-32 rounded bg-[var(--color-card-2)]" />
        <ul className="space-y-4">
          {["N5", "N4", "N3", "N2", "N1"].map((level) => (
            <li key={level} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-10 rounded-full bg-[var(--color-card-2)]" />
                <div className="h-4 w-28 rounded bg-[var(--color-card-2)]" />
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--color-card-2)]" />
            </li>
          ))}
        </ul>
      </div>

      {/* Filter controls */}
      <div className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-card-2)] sm:w-40" />
          <div className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-card-2)] sm:w-52" />
          <div className="sm:ml-auto h-11 w-32 rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
        </div>
      </div>

      {/* Vocabulary rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-5 w-28 rounded bg-[var(--color-card-2)]" />
                <div className="h-4 w-48 rounded bg-[var(--color-card-2)]" />
                <div className="flex gap-2 mt-1">
                  <div className="h-5 w-16 rounded-full bg-[var(--color-card-2)]" />
                  <div className="h-5 w-20 rounded-full bg-[var(--color-card-2)]" />
                </div>
              </div>
              <div className="h-4 w-24 rounded bg-[var(--color-card-2)] shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
