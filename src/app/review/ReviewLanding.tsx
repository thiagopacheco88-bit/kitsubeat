"use client";

/**
 * ReviewLanding — the entry point for /review.
 *
 * Passed from the server component (page.tsx):
 * - isPremium: gates Start button vs upsell modal
 * - dueCount: how many cards are currently overdue
 * - newBudgetRemaining: how many new cards can be introduced today
 * - dailyCap: REVIEW_NEW_DAILY_CAP constant for display
 *
 * Design (per CONTEXT): free users see the counts but cannot start;
 * Start CTA opens UpsellModal for free users. Premium users see Start,
 * fetch the queue, hydrate the store, and transition to ReviewSession.
 *
 * No isPremium() call on the client — the flag is passed from the server page
 * (single source of truth per RESEARCH Pattern 3).
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import UpsellModal from "./UpsellModal";
import type { VocabRow, QueueResponse } from "@/app/api/review/queue/route";
import { useReviewSession } from "@/stores/reviewSession";
import { Button } from "@/components/ui/Button";

// Lazy-load ReviewSession so it doesn't inflate the landing bundle
const ReviewSession = dynamic(() => import("./ReviewSession"), { ssr: false });

interface ReviewLandingProps {
  isPremium: boolean;
  dueCount: number;
  newBudgetRemaining: number;
  dailyCap: number;
  /** Resolved by getCurrentUserId() in review/page.tsx */
  userId: string;
}


export default function ReviewLanding({
  isPremium,
  dueCount,
  newBudgetRemaining,
  dailyCap,
  userId,
}: ReviewLandingProps) {
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vocabData, setVocabData] = useState<Record<string, VocabRow>>({});
  const [jlptPools, setJlptPools] = useState<Record<string, VocabRow[]>>({});

  const { load } = useReviewSession();

  const totalAvailable = dueCount + Math.min(newBudgetRemaining, dailyCap);
  const isEmpty = dueCount === 0 && newBudgetRemaining === 0;

  const handleStart = async () => {
    if (!isPremium) {
      setUpsellOpen(true);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/review/queue");
      if (!res.ok) {
        if (res.status === 403) {
          setUpsellOpen(true);
          return;
        }
        throw new Error(`Queue fetch failed: ${res.status}`);
      }

      const data: QueueResponse = await res.json() as QueueResponse;

      if (data.items.length === 0) {
        setLoadError("No cards available right now. Come back later!");
        return;
      }

      // Hydrate the review store and switch to session view
      load(data.items);
      setVocabData(data.vocabData);
      setJlptPools(data.jlptPools ?? {});
      setStarted(true);
    } catch (err) {
      console.error("Failed to load review queue:", err);
      setLoadError("Failed to load your queue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Session is active — render the session component
  if (started && isPremium) {
    return (
      <ReviewSession
        userId={userId}
        vocabData={vocabData}
        jlptPools={jlptPools}
        onBack={() => {
          setStarted(false);
          setVocabData({});
          setJlptPools({});
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--color-text)]">Review</h1>

      {/* Card count summary */}
      <div className="mt-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Cards due</p>
            <p className="text-4xl font-bold text-[var(--color-text)]">{dueCount}</p>
          </div>
          {isPremium && newBudgetRemaining > 0 && (
            <div className="text-right">
              <p className="text-sm text-[var(--color-text-muted)]">New today</p>
              <p className="text-4xl font-bold text-[var(--color-jlpt-n4)]">
                up to {newBudgetRemaining}
              </p>
            </div>
          )}
        </div>

        {isPremium && (
          <p className="mt-3 text-sm text-[var(--color-text-dim)]">
            {newBudgetRemaining === 0
              ? "New-card quota reached for today. All due cards available."
              : `Daily new-card limit: ${dailyCap} per day`}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="mt-6">
        {isEmpty ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)]/50 p-6 text-center">
            <p className="text-[var(--color-text-muted)]">
              All caught up — come back tomorrow!
            </p>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleStart}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading queue..." : "Start Review"}
            </Button>

            {!isPremium && (
              <p className="mt-3 text-center text-sm text-[var(--color-text-dim)]">
                The cross-song review queue is a premium feature.
              </p>
            )}

            {loadError && (
              <p className="mt-3 text-center text-sm text-[var(--color-accent)]">{loadError}</p>
            )}
          </>
        )}
      </div>

      {/* Upsell modal for free users */}
      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </div>
  );
}
