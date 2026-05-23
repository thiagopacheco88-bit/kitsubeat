import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_COOKIE_CONSENT_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Cookie Policy — KitsuBeat",
  description: "Information about cookies and tracking technologies used on KitsuBeat.",
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

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-[var(--color-text)]">
      <h1 className="text-[28px] font-bold leading-[1.2]">Cookie Policy</h1>
      <p className="mt-2 mb-8 text-sm text-[var(--color-text-muted)]">
        Cookie Schema Version {CURRENT_COOKIE_CONSENT_VERSION} &middot; Effective 2026-XX-XX
      </p>
      <hr className="border-[var(--color-border)] my-6" />

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          What Are Cookies
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Cookies are small text files that websites place on your device when
          you visit them. They are widely used to make websites work, remember
          your preferences, and provide information to website owners.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          KitsuBeat uses a minimal set of cookies. We do not use advertising
          cookies, and we never sell cookie data to third parties.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          Cookies We Use
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          The following table lists every cookie KitsuBeat sets:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[16px] leading-[1.6] border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th
                  scope="col"
                  className="pb-2 text-left font-bold pr-4 text-[14px]"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="pb-2 text-left font-bold pr-4 text-[14px]"
                >
                  Purpose
                </th>
                <th
                  scope="col"
                  className="pb-2 text-left font-bold pr-4 text-[14px]"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  className="pb-2 text-left font-bold text-[14px]"
                >
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-mono text-[14px]">kb_theme</td>
                <td className="py-3 pr-4">
                  Stores your light/dark theme preference
                </td>
                <td className="py-3 pr-4">1 year</td>
                <td className="py-3">
                  <span className="rounded bg-[var(--color-card)] px-2 py-0.5 text-sm">
                    Essential
                  </span>
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-mono text-[14px]">kb_consent</td>
                <td className="py-3 pr-4">
                  Records your cookie consent decision so we don&rsquo;t ask every
                  time
                </td>
                <td className="py-3 pr-4">1 year</td>
                <td className="py-3">
                  <span className="rounded bg-[var(--color-card)] px-2 py-0.5 text-sm">
                    Essential
                  </span>
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-mono text-[14px]">
                  __clerk_db_jwt
                </td>
                <td className="py-3 pr-4">
                  Clerk authentication token that keeps you logged in during
                  your session
                </td>
                <td className="py-3 pr-4">Session</td>
                <td className="py-3">
                  <span className="rounded bg-[var(--color-card)] px-2 py-0.5 text-sm">
                    Essential
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono text-[14px]">_posthog</td>
                <td className="py-3 pr-4">
                  PostHog analytics — tracks feature usage and page views to
                  help us improve the app. Only set if you accept analytics
                  cookies.
                </td>
                <td className="py-3 pr-4">Session</td>
                <td className="py-3">
                  <span className="rounded bg-[var(--color-card)] px-2 py-0.5 text-sm">
                    Analytics
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          Essential vs Analytics Cookies
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          <strong>Essential cookies</strong> are required for the Service to
          function. They include authentication tokens and your consent and
          preference records. Essential cookies do not require your consent under
          PECR (Privacy and Electronic Communications Regulations 2003).
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          <strong>Analytics cookies</strong> help us understand how the app is
          used so we can improve it. These cookies are disabled by default and
          only activated when you explicitly accept analytics cookies via the
          cookie consent banner.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          Managing Your Consent
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          You can withdraw your analytics cookie consent at any time by:
        </p>
        <ol className="mt-4 list-decimal pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>
            Opening your browser&rsquo;s developer tools (F12) and navigating to
            Application &rarr; Storage &rarr; Cookies
          </li>
          <li>
            Deleting the{" "}
            <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-sm">
              kb_consent
            </code>{" "}
            cookie
          </li>
          <li>Refreshing the page — the consent banner will reappear</li>
        </ol>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Most browsers also allow you to block or delete cookies through their
          settings. See the help documentation for your browser for instructions.
          Note that blocking essential cookies may prevent the Service from
          working correctly.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Our use of cookies is also governed by our{" "}
          <Link
            href="/legal/terms"
            className="text-[var(--color-accent-readable)] underline"
          >
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            className="text-[var(--color-accent-readable)] underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          Contact
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          If you have questions about our use of cookies, please contact us at{" "}
          <a
            href="mailto:privacy@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            privacy@kitsubeat.com
          </a>
          .
        </p>
      </section>

      <LegalNavFooter />
    </main>
  );
}
