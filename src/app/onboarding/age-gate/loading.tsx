export default function AgeGateLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-8 w-full max-w-md flex flex-col gap-4">
        <div className="h-8 w-56 rounded bg-[var(--color-card-2)]" />
        <div className="h-4 w-full rounded bg-[var(--color-card-2)]" />
        <div className="h-4 w-4/5 rounded bg-[var(--color-card-2)]" />
        <div className="mt-2 flex flex-col gap-2">
          <div className="h-4 w-28 rounded bg-[var(--color-card-2)]" />
          <div className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="h-5 w-5 shrink-0 rounded bg-[var(--color-card-2)]" />
          <div className="h-4 w-4/5 rounded bg-[var(--color-card-2)]" />
        </div>
        <div className="mt-2 h-11 w-full rounded-[var(--radius-md)] bg-[var(--color-card-2)]" />
      </div>
    </main>
  );
}
