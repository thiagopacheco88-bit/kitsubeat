"use client";

import { useState } from "react";
import { updateUserPrefs } from "@/app/actions/userPrefs";

interface ProfileFormProps {
  userId: string;
  initialSkipLearning: boolean;
  initialNewCardCap: number;
  isPremium: boolean;
  defaultCap: number;
  maxCap: number;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function ProfileForm({
  userId,
  initialSkipLearning,
  initialNewCardCap,
  isPremium,
  defaultCap,
  maxCap,
}: ProfileFormProps) {
  const [skipLearning, setSkipLearning] = useState(initialSkipLearning);
  const [newCardCap, setNewCardCap] = useState<number>(initialNewCardCap);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "saving" });

    // Defensive client validation — mirrors the server action's bounds.
    // Free users can't submit a raised cap; the UI disables the input but a
    // rogue client could patch the DOM, so fall back to defaultCap on submit.
    const capToSend = isPremium
      ? Math.min(Math.max(newCardCap, 1), maxCap)
      : defaultCap;

    try {
      await updateUserPrefs(userId, {
        skipLearning,
        newCardCap: capToSend,
      });
      setState({ kind: "saved" });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to save preferences.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* skip_learning toggle */}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={skipLearning}
          onChange={(e) => {
            setSkipLearning(e.target.checked);
            setState({ kind: "idle" });
          }}
          className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-600"
        />
        <span>
          <span className="block font-medium text-white">
            Skip learn cards
          </span>
          <span className="block text-sm text-gray-400">
            Jump straight into exercises without a pre-question breakdown.
            The new-word cap still applies.
          </span>
        </span>
      </label>

      {/* new_card_cap input — disabled for free users */}
      <div>
        <label
          htmlFor="new-card-cap"
          className="block font-medium text-white"
        >
          New words per session
        </label>
        <p className="mb-2 text-sm text-gray-400">
          How many brand-new words can enter a single session. Default{" "}
          {defaultCap}.
        </p>
        <input
          id="new-card-cap"
          type="number"
          min={1}
          max={maxCap}
          step={1}
          disabled={!isPremium}
          value={newCardCap}
          onChange={(e) => {
            const v = Number(e.target.value);
            setNewCardCap(Number.isFinite(v) ? v : defaultCap);
            setState({ kind: "idle" });
          }}
          aria-describedby="cap-help"
          className="w-24 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        />
        {!isPremium && (
          <p id="cap-help" className="mt-2 text-xs text-indigo-400">
            Upgrade to premium to raise the cap (up to {maxCap}).
          </p>
        )}
        {isPremium && (
          <p id="cap-help" className="mt-2 text-xs text-gray-500">
            Between 1 and {maxCap}.
          </p>
        )}
      </div>

      {/* Submit + status */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={state.kind === "saving"}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {state.kind === "saving" ? "Saving..." : "Save"}
        </button>
        {state.kind === "saved" && (
          <span className="text-sm text-green-400">Saved.</span>
        )}
        {state.kind === "error" && (
          <span className="text-sm text-red-400">{state.message}</span>
        )}
      </div>
    </form>
  );
}
