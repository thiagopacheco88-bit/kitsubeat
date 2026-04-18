"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Tier filter — labels map to Path B 3-bucket split (NOT tierFor()):
          value="3" → Mastered (state=2), value="2" → Known (state=3), value="1" → Learning (state=1) */}
      <select
        value={initial.tier ?? ""}
        onChange={(e) => updateParam("tier", e.target.value || undefined)}
        className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white"
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
        className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white"
        aria-label="Filter by source song"
      >
        <option value="">All songs</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      {/* Binary toggle — button not dropdown, two states only */}
      <button
        type="button"
        onClick={() =>
          updateParam("sort", initial.sort === "asc" ? undefined : "asc")
        }
        className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
      >
        Sort: {initial.sort === "asc" ? "Least mastered first" : "Most mastered first"}
      </button>
    </div>
  );
}
