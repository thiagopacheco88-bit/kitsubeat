import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy — KitsuBeat",
  description: "KitsuBeat's refund and cancellation policy for paid plans.",
};

function LegalNavFooter() {
  return (
    <nav
      aria-label="Legal pages"
      className="mt-8 border-t border-[var(--color-border)] pt-6"
    >
      <ul className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
        {[
          { href: "/legal/terms", label: "Terms & Conditions" },
          { href: "/legal/privacy", label: "Privacy Policy" },
          { href: "/legal/cookie-policy", label: "Cookie Policy" },
          { href: "/legal/ai-transparency", label: "AI Transparency" },
          { href: "/legal/refund", label: "Refund Policy" },
        ].map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="hover:text-[var(--color-accent-readable)] hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-[var(--color-text)]">
      <h1 className="text-[28px] font-bold leading-[1.2]">Refund Policy</h1>

      {/* Prominent deferred callout — must appear immediately after H1 */}
      <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 my-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          KitsuBeat is currently in free beta. This refund policy will activate
          when paid subscriptions launch. The sections below are template
          language that activates at monetization.
        </p>
      </aside>

      <hr className="border-[var(--color-border)] my-6" />

      <section>
        {/* REQ-CONS-EU-05 — UK 14-day cooling-off period */}
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          1. UK 14-Day Cancellation Right
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          UK consumers have a 14-day cooling-off period for digital services
          under the Consumer Contracts (Information, Cancellation and Additional
          Charges) Regulations 2013. By starting your subscription and accessing
          digital content, you may waive this right. This will be explained
          clearly at checkout.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          [Activates at monetization — full checkout waiver language and process
          to follow at subscription launch]
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          2. Subscription Cancellations
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          [Activates at monetization — details to follow at subscription launch]
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          3. Refund Eligibility
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          [Activates at monetization — details to follow at subscription launch]
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          4. How to Request a Refund
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          [Activates at monetization — details to follow at subscription launch]
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          5. Contact
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          For billing questions (once subscriptions launch), contact us at{" "}
          <a
            href="mailto:support@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            support@kitsubeat.com
          </a>
          .
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          For UK consumer rights information, visit the{" "}
          <a
            href="https://www.citizensadvice.org.uk/consumer/somethings-gone-wrong-with-a-purchase/return-or-cancel-something/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent-readable)] underline"
          >
            Citizens Advice
          </a>{" "}
          website.
        </p>
      </section>

      <LegalNavFooter />
    </main>
  );
}
