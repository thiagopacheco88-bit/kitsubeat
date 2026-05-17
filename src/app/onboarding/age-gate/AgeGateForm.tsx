"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/Button";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function getAgeFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

// Parse YYYY-MM-DD into {year, month, day} parts for pre-filling selects
function parseDob(dob: string): { year: string; month: string; day: string } {
  const [y, m, d] = dob.split("-");
  return {
    year: y ?? "",
    month: m ? String(parseInt(m, 10)) : "",
    day: d ? String(parseInt(d, 10)) : "",
  };
}

// Build YYYY-MM-DD from parts, returns "" if any part is missing
function buildDob(year: string, month: string, day: string): string {
  if (!year || !month || !day) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const selectClass =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-border-strong)] min-h-[44px] w-full";

interface AgeGateFormProps {
  initialDob?: string; // pre-filled from DB for returning users (YYYY-MM-DD)
}

export function AgeGateForm({ initialDob }: AgeGateFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockerRef = useRef<HTMLHeadingElement>(null);

  const parsed = initialDob ? parseDob(initialDob) : null;
  const [dobDay, setDobDay] = useState(parsed?.day ?? "");
  const [dobMonth, setDobMonth] = useState(parsed?.month ?? "");
  const [dobYear, setDobYear] = useState(parsed?.year ?? "");
  const [termsChecked, setTermsChecked] = useState(false);
  const [showMinorStep, setShowMinorStep] = useState(() => {
    if (!initialDob) return false;
    const age = getAgeFromDob(initialDob);
    return age >= 13 && age < 18;
  });
  const [minorConfirmed, setMinorConfirmed] = useState(false);
  const [isUnder13, setIsUnder13] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function onSelectChange(
    field: "day" | "month" | "year",
    value: string,
    currentDay = dobDay,
    currentMonth = dobMonth,
    currentYear = dobYear
  ) {
    const next = {
      day: field === "day" ? value : currentDay,
      month: field === "month" ? value : currentMonth,
      year: field === "year" ? value : currentYear,
    };

    if (field === "day") setDobDay(value);
    if (field === "month") setDobMonth(value);
    if (field === "year") setDobYear(value);

    setErrorMessage("");

    const dob = buildDob(next.year, next.month, next.day);
    if (!dob) {
      setShowMinorStep(false);
      setIsUnder13(false);
      return;
    }

    const age = getAgeFromDob(dob);
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

    const dob = buildDob(dobYear, dobMonth, dobDay);
    if (!dob || !termsChecked) return;
    if (showMinorStep && !minorConfirmed) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const result = await completeOnboarding(dob);

      if (result.error === "under_13") {
        setIsUnder13(true);
        requestAnimationFrame(() => {
          blockerRef.current?.focus();
        });
      } else if (result.error) {
        setErrorMessage(
          result.error === "invalid_date"
            ? "Please select a valid date of birth."
            : "Something went wrong. Please try again."
        );
      } else {
        const redirectTo = searchParams.get("redirect_url") ?? "/";
        router.replace(redirectTo);
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const dob = buildDob(dobYear, dobMonth, dobDay);
  const isSubmitDisabled =
    !dob || !termsChecked || (showMinorStep && !minorConfirmed);

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
        <h1 className="text-[28px] font-bold text-[var(--color-text)]">
          Complete your profile
        </h1>
        <p className="mt-2 mb-6 text-sm text-[var(--color-text-muted)]">
          {initialDob
            ? "Please review and accept our Terms to continue."
            : "We need your date of birth and agreement to our Terms to continue."}
        </p>

        <form onSubmit={onSubmit} noValidate>
          <fieldset>
            <legend className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Date of birth
            </legend>
            <div className="grid grid-cols-3 gap-2" aria-describedby="dob-error">
              <div>
                <label htmlFor="dob-day" className="sr-only">Day</label>
                <select
                  id="dob-day"
                  value={dobDay}
                  onChange={(e) => onSelectChange("day", e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Day</option>
                  {DAYS.map((d) => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dob-month" className="sr-only">Month</label>
                <select
                  id="dob-month"
                  value={dobMonth}
                  onChange={(e) => onSelectChange("month", e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Month</option>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={String(i + 1)}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dob-year" className="sr-only">Year</label>
                <select
                  id="dob-year"
                  value={dobYear}
                  onChange={(e) => onSelectChange("year", e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

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

          <div
            id="dob-error"
            role="alert"
            aria-live="assertive"
            className="mt-3 text-sm text-[var(--color-accent)]"
          >
            {errorMessage}
          </div>

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
