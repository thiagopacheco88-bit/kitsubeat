"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  initial: { tier?: string; song?: string; sort?: string };
  sources: Array<{ id: string; title: string }>;
}

export default function FilterControls({ initial, sources }: Props) {
  const router = useRouter();
  const currentParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(currentParams.toString());
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
      router.push(`/vocabulary?${params.toString()}`);
    },
    [router, currentParams]
  );

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card-ring)] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={initial.tier ?? ""}
          onChange={(e) => updateParam("tier", e.target.value || undefined)}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 text-sm text-[var(--color-text)] sm:w-auto"
          aria-label="Filter by tier"
        >
          <option value="">All tiers</option>
          <option value="3">Mastered</option>
          <option value="2">Known</option>
          <option value="1">Learning</option>
        </select>
        <select
          value={initial.song ?? ""}
          onChange={(e) => updateParam("song", e.target.value || undefined)}
          className="min-h-11 min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 text-sm text-[var(--color-text)] sm:max-w-xs"
          aria-label="Filter by source song"
        >
          <option value="">All songs</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            updateParam("sort", initial.sort === "asc" ? undefined : "asc")
          }
          className="min-h-11"
        >
          Sort:{" "}
          {initial.sort === "asc"
            ? "Least mastered first"
            : "Most mastered first"}
        </Button>
      </div>
    </div>
  );
}
