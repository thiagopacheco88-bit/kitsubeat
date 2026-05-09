"use client";

/**
 * Age-gate onboarding page (Phase 18).
 *
 * Shown once after signup (Clerk afterSignUpUrl) and again when T&Cs change
 * (middleware redirects authenticated users whose terms_version !== CURRENT_TERMS_VERSION).
 *
 * Security: All age/minor logic is re-validated server-side in completeOnboarding().
 * Client-side age detection is UX guidance ONLY — not a security gate.
 *
 * REQ-MINORS-GATE-01 through REQ-MINORS-GATE-10, REQ-MINORS-DEFAULT-01 through -03,
 * REQ-MINORS-12, REQ-A11Y-11, REQ-A11Y-20, REQ-A11Y-28, REQ-A11Y-43, REQ-A11Y-44, REQ-A11Y-48
 */

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/Button";

/**
 * Client-side age estimation — UX only, NOT used for security decisions.
 * Server always re-validates the submitted DOB.
 */
function getAgeFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockerRef = useRef<HTMLHeadingElement>(null);

  const [dob, setDob] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [showMinorStep, setShowMinorStep] = useState(false);
  const [minorConfirmed, setMinorConfirmed] = useState(false);
  const [isUnder13, setIsUnder13] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function onDobChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDob(value);
    setErrorMessage("");

    if (!value) {
      setShowMinorStep(false);
      setIsUnder13(false);
      return;
    }

    // Client-side age detection for UX guidance only — server re-validates on submit
    const age = getAgeFromDob(value);
    if (age < 13) {
      setShowMinorStep(false);
      setIsUnder13(false);
    } else if (age < 18) {
      setShowMinorStep(true);
      setIsUnder13(false);
    } else {
      setShowMinorStep(false);
      setMinorConfirmed(false);
      setIsUnder13(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!dob || !termsChecked) return;
    if (showMinorStep && !minorConfirmed) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const result = await completeOnboarding(dob);

      if (result.error === "under_13") {
        setIsUnder13(true);
        // Focus the blocker heading for screen reader announcement (REQ-A11Y-43)
        requestAnimationFrame(() => {
          blockerRef.current?.focus();
        });
      } else if (result.error) {
        setErrorMessage(
          result.error === "invalid_date"
            ? "Please enter a valid date of birth (day, month, year)."
            : "Something went wrong. Please try again."
        );
      } else {
        // Navigate to the page they were trying to visit, or home as fallback.
        // The server action already set kb_terms_done cookie so middleware won't loop.
        const redirectTo = searchParams.get("redirect_url") ?? "/";
        router.replace(redirectTo);
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isSubmitDisabled =
    !dob || !termsChecked || (showMinorStep && !minorConfirmed);

  // Under-13 blocker — replaces form entirely (REQ-MINORS-GATE-03)
  if (isUnder13) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-8 w-full max-w-md text-center">
          <h2
            ref={blockerRef}
            tabIndex={-1}
            className="text-[20px] font-bold text-[var(--color-text)] focus:outline-none"
          >
            Age requirement not met
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            KitsuBeat requires users to be at least 13 years old. If you
            believe this is an error, contact support@kitsubeat.com.
          </p>
          <a
            href="/"
            className="mt-4 inline-block text-sm text-[var(--color-accent-readable)] underline"
          >
            Return to home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-8 w-full max-w-md">
        {/* Page heading */}
        <h1 className="text-[28px] font-bold text-[var(--color-text)]">
          Complete your profile
        </h1>
        <p className="mt-2 mb-6 text-sm text-[var(--color-text-muted)]">
          We need your date of birth and agreement to our Terms to continue.
        </p>

        <form onSubmit={onSubmit} noValidate>
          {/* Date of birth field */}
          <div>
            <label
              htmlFor="dob"
              className="block text-sm font-medium text-[var(--color-text)] mb-1"
            >
              Date of birth
            </label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={dob}
              onChange={onDobChange}
              aria-describedby="dob-error"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-border-strong)] min-h-[44px] w-full"
              required
            />
          </div>

          {/* Terms & conditions checkbox */}
          <label
            htmlFor="terms-accept"
            className="flex items-start gap-2 mt-4 py-2 text-sm text-[var(--color-text)] cursor-pointer"
          >
            <input
              type="checkbox"
              id="terms-accept"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              className="mt-0.5 accent-[var(--color-accent)] min-h-[20px] min-w-[20px]"
            />
            <span>
              I have read and agree to the{" "}
              <a
                href="/legal/terms"
                className="text-[var(--color-accent-readable)] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms &amp; Conditions
              </a>{" "}
              and{" "}
              <a
                href="/legal/privacy"
                className="text-[var(--color-accent-readable)] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          {/* Minor awareness step — shown when client-side age is 13–17 */}
          {showMinorStep && (
            <section
              aria-live="polite"
              role="group"
              aria-labelledby="minor-step-heading"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] p-4 mt-4"
            >
              <h3
                id="minor-step-heading"
                className="text-[16px] font-bold text-[var(--color-text)]"
              >
                Heads up &mdash; your account is configured for privacy
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Since you&apos;re under 18, your account starts with these
                settings:
              </p>
              <ul className="mt-2 ml-6 list-disc text-sm text-[var(--color-text-muted)] space-y-1">
                <li>No social activity sharing</li>
                <li>No marketing emails</li>
                <li>No leaderboards</li>
              </ul>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                You can review these settings after your 18th birthday.
              </p>
              <label className="flex items-start gap-2 mt-3 py-2 text-sm text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  id="minor-confirm"
                  checked={minorConfirmed}
                  onChange={(e) => setMinorConfirmed(e.target.checked)}
                  className="mt-0.5 accent-[var(--color-accent)] min-h-[20px] min-w-[20px]"
                />
                I understand my account settings are pre-configured for
                privacy.
              </label>
            </section>
          )}

          {/* Error region — always in DOM, empty when no error (REQ-A11Y-44) */}
          <div
            id="dob-error"
            role="alert"
            aria-live="assertive"
            className="mt-3 text-sm text-[var(--color-accent)]"
          >
            {errorMessage}
          </div>

          {/* Submit CTA */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-4"
            disabled={isSubmitDisabled || loading}
          >
            {loading ? "Saving..." : "Continue to KitsuBeat"}
          </Button>
        </form>
      </div>
    </main>
  );
}
