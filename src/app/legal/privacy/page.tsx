import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_PRIVACY_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Privacy Policy — KitsuBeat",
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

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-[var(--color-text)]">
      <h1 className="text-[28px] font-bold leading-[1.2]">Privacy Policy</h1>
      <p className="mt-2 mb-8 text-sm text-[var(--color-text-muted)]">
        Version {CURRENT_PRIVACY_VERSION} &middot; Effective 2026-XX-XX
      </p>
      <hr className="border-[var(--color-border)] my-6" />

      {/* Child-friendly summary — REQ-MINORS-07 (UK Year 8 reading level) */}
      <section
        aria-label="Simple summary for younger users"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 mb-8"
      >
        <h2 className="mb-3 text-[20px] font-bold leading-[1.3]">
          What we collect and why — plain English
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          When you sign up we ask for your email address and date of birth. We
          use your email to send you important messages about your account. We
          use your date of birth to make sure the app is set up safely for
          younger learners.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We track which songs and lessons you have completed so we can show you
          your progress. We do not sell your information to anyone. We do not
          show you adverts. We do not share your data with social networks.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          You can ask us to delete your account and all your data at any time by
          emailing{" "}
          <a
            href="mailto:privacy@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            privacy@kitsubeat.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          1. Data Controller
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          KitsuBeat is the data controller for personal data collected through
          this Service. We are registered with the UK Information Commissioner&rsquo;s
          Office (ICO).
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          ICO Registration Number:{" "}
          <strong>[ZB000000 — to be inserted before Phase 19 launch]</strong>
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          2. Data We Collect
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We collect the following categories of personal data:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>
            <strong>Account data:</strong> email address, display name, date of
            birth (for age verification)
          </li>
          <li>
            <strong>Learning data:</strong> song progress, flashcard review
            history, lesson completion records, FSRS scheduling data
          </li>
          <li>
            <strong>Consent data:</strong> cookie consent decisions (timestamp,
            categories accepted, hashed IP address, consent version)
          </li>
          <li>
            <strong>Technical data:</strong> IP address (hashed before storage),
            device type, browser type, session tokens
          </li>
          <li>
            <strong>Usage data (analytics, consent-gated):</strong> pages
            visited, features used, events triggered — only collected if you
            accept analytics cookies
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          3. How We Use Your Data
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We use your personal data to:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>Create and manage your account (legal basis: contract)</li>
          <li>
            Personalise your learning experience and track progress (legal
            basis: contract)
          </li>
          <li>
            Verify age and apply appropriate protections for minors (legal
            basis: legal obligation — UK AADC, GDPR Art. 8)
          </li>
          <li>
            Send account-related transactional emails (legal basis: contract)
          </li>
          <li>
            Send marketing emails if you have opted in (legal basis: consent)
          </li>
          <li>
            Improve the Service through aggregated analytics (legal basis:
            legitimate interests — only with analytics consent)
          </li>
          <li>
            Comply with legal obligations including data subject requests (legal
            basis: legal obligation)
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          4. Cookies
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We use cookies to operate the Service and, with your consent, to
          collect analytics data. For a full list of cookies we set, see our{" "}
          <Link
            href="/legal/cookie-policy"
            className="text-[var(--color-accent-readable)] underline"
          >
            Cookie Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          5. Data Sharing
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We do not sell your personal data. We share data only with the
          following service providers who process it on our behalf:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>
            <strong>Clerk</strong> — authentication and identity management
          </li>
          <li>
            <strong>Neon</strong> — PostgreSQL database hosting (EU/US data
            centres)
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and edge delivery
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery
          </li>
          <li>
            <strong>Sentry</strong> — error tracking and performance monitoring
          </li>
          <li>
            <strong>PostHog</strong> — product analytics (only if you accept
            analytics cookies)
          </li>
          <li>
            <strong>Anthropic</strong> — AI model provider (lesson content
            generation; data processed per Anthropic&rsquo;s Privacy Policy)
          </li>
        </ul>
        <p className="mt-4 text-[16px] leading-[1.6]">
          All processors operate under Data Processing Agreements and are
          required to handle your data in compliance with UK GDPR.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          6. Data Retention
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We retain your account data for as long as your account is active.
          After account deletion, we retain anonymised aggregate data (no
          personal identifiers) indefinitely for service improvement. Error logs
          are retained for 90 days. Cookie consent records are retained for 3
          years as required by PECR.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          You may request deletion of your personal data at any time (see
          Section 7).
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          7. Your Rights
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Under UK GDPR, you have the following rights:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>
            <strong>Right of access (DSAR):</strong> Request a copy of all
            personal data we hold about you. You can download your data at any
            time via{" "}
            <Link
              href="/api/user/data-export"
              className="text-[var(--color-accent-readable)] underline"
            >
              /api/user/data-export
            </Link>
            . DSAR requests are logged as required by REQ-PRIV-UK-DSAR-04.
          </li>
          <li>
            <strong>Right to erasure (&ldquo;right to be forgotten&rdquo;):</strong> Request
            deletion of your personal data. Email{" "}
            <a
              href="mailto:privacy@kitsubeat.com"
              className="text-[var(--color-accent-readable)] underline"
            >
              privacy@kitsubeat.com
            </a>
            . We will action erasure requests within 30 days.
          </li>
          <li>
            <strong>Right to portability:</strong> Request your data in a
            machine-readable format (JSON) via the data export endpoint above.
          </li>
          <li>
            <strong>Right to rectification:</strong> Request correction of
            inaccurate personal data.
          </li>
          <li>
            <strong>Right to restrict processing:</strong> Request that we limit
            how we process your data in certain circumstances.
          </li>
          <li>
            <strong>Right to object:</strong> Object to processing based on
            legitimate interests.
          </li>
          <li>
            <strong>Right to withdraw consent:</strong> Where processing is
            based on consent (e.g., marketing emails, analytics cookies), you
            may withdraw consent at any time.
          </li>
        </ul>
        <p className="mt-4 text-[16px] leading-[1.6]">
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:privacy@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            privacy@kitsubeat.com
          </a>
          . We will respond within one calendar month.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          8. Cookies and Analytics (Consent-Gated)
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We use PostHog for product analytics. PostHog tracking is disabled by
          default and only activates after you explicitly accept analytics
          cookies via the cookie consent banner. You can withdraw this consent
          at any time by clearing the{" "}
          <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-sm">
            kb_consent
          </code>{" "}
          cookie from your browser settings and refreshing the page.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          9. AI Systems and Automation
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          KitsuBeat uses the following AI systems. No automated decisions with
          legal or similarly significant effects are made solely by these
          systems:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>
            <strong>WhisperX</strong> — AI speech-recognition model that
            generates song transcriptions from audio. Transcriptions may contain
            errors.
          </li>
          <li>
            <strong>Anthropic Claude</strong> — AI language model that generates
            vocabulary definitions, grammar explanations, verse translations, and
            learning mnemonics. Content is reviewed but may contain errors.
          </li>
          <li>
            <strong>Sentry</strong> — automated error tracking and performance
            monitoring (no personal data used for profiling).
          </li>
          <li>
            <strong>PostHog</strong> — product analytics (consent-gated; no
            individual profiling for advertising purposes).
          </li>
          <li>
            <strong>Resend</strong> — automated transactional email delivery
            (account notifications, DSAR confirmations).
          </li>
        </ul>
        <p className="mt-4 text-[16px] leading-[1.6]">
          For more details on AI use, see our{" "}
          <Link
            href="/legal/ai-transparency"
            className="text-[var(--color-accent-readable)] underline"
          >
            AI Transparency &amp; Disclosure
          </Link>{" "}
          page.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          10. Children&rsquo;s Privacy (AADC)
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          KitsuBeat is designed to be used by learners aged 13 and over. We
          comply with the UK Age Appropriate Design Code (AADC) for users aged
          13–17.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Users aged 13–17 (&ldquo;minor users&rdquo;) receive the following default
          protections at sign-up:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>Social activity sharing is disabled by default</li>
          <li>Marketing email opt-in is disabled by default</li>
          <li>
            Only essential cookies and analytics cookies are enabled
            (no behavioural advertising)
          </li>
        </ul>
        <p className="mt-4 text-[16px] leading-[1.6]">
          When a minor user turns 18, their account is automatically transitioned:
          the <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-sm">is_minor</code>{" "}
          flag is set to false by a scheduled process. Minor privacy settings are
          not changed automatically — users can update their own settings after
          turning 18.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          A Data Protection Impact Assessment (DPIA) has been conducted for
          minor user processing and is available to supervisory authorities on
          request.
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          We do not knowingly collect personal data from users under 13. If we
          discover that a user under 13 has registered, we will delete their
          account and all associated data within 72 hours.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          11. International Transfers
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Some of our service providers (including Anthropic, Vercel, and
          PostHog) process data in the United States. These transfers are
          conducted under appropriate safeguards including Standard Contractual
          Clauses (SCCs) as approved by the UK ICO. Where providers hold EU-US
          Data Privacy Framework certification, we rely on that adequacy decision
          for EEA transfers.
        </p>
      </section>

      <section>
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          12. Contact and Complaints
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          For privacy questions or to exercise your data subject rights:
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          <strong>Data Protection contact:</strong>{" "}
          <a
            href="mailto:privacy@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            privacy@kitsubeat.com
          </a>
          {" "}[operator alias — configure before Phase 19 launch]
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          If you are unhappy with how we handle your data, you have the right to
          lodge a complaint with the UK Information Commissioner&rsquo;s Office (ICO)
          at{" "}
          <a
            href="https://ico.org.uk/make-a-complaint/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent-readable)] underline"
          >
            ico.org.uk/make-a-complaint
          </a>
          .
        </p>
      </section>

      {/* LGPD section — REQ-PRIV-BR-POLICY-01 */}
      <section
        lang="pt-BR"
        aria-label="Para usuários brasileiros / For Brazilian users"
      >
        <h2 className="mt-8 mb-3 text-[20px] font-bold leading-[1.3]">
          Para usuários brasileiros / For Brazilian users
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6]">
          De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei n&ordm;
          13.709/2018), informamos o seguinte aos usuários localizados no Brasil:
        </p>
        <h3 className="mt-6 mb-2 text-[16px] font-bold leading-[1.3]">
          Dados coletados
        </h3>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Coletamos endereço de e-mail, data de nascimento, dados de progresso
          de aprendizagem, histórico de revisão de cartões e registros de
          consentimento de cookies. Não coletamos dados sensíveis conforme
          definido pelo artigo 5&ordm;, inciso II da LGPD.
        </p>
        <h3 className="mt-6 mb-2 text-[16px] font-bold leading-[1.3]">
          Base legal
        </h3>
        <p className="mt-4 text-[16px] leading-[1.6]">
          O tratamento dos seus dados pessoais é realizado com base nas seguintes
          hipóteses legais previstas na LGPD:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>
            <strong>Execução de contrato</strong> (art. 7&ordm;, V) — dados de conta e
            aprendizagem necessários para prestar o serviço
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7&ordm;, IX) — melhoria do serviço
            por meio de análises agregadas (sujeito ao consentimento de cookies
            analíticos)
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (art. 7&ordm;, II) —
            verificação de idade para proteção de menores (art. 14)
          </li>
          <li>
            <strong>Consentimento</strong> (art. 7&ordm;, I) — e-mails de marketing e
            cookies analíticos (apenas se você consentir explicitamente)
          </li>
        </ul>
        <h3 className="mt-6 mb-2 text-[16px] font-bold leading-[1.3]">
          Proteção de menores (art. 14)
        </h3>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Em conformidade com o artigo 14 da LGPD, o KitsuBeat não realiza
          qualquer forma de publicidade comportamental ou perfilização de usuários
          com idade inferior a 18 anos. Usuários com 13 a 17 anos recebem
          configurações padrão de privacidade reforçadas no momento do cadastro.
          Não coletamos dados de crianças com menos de 13 anos.
        </p>
        <h3 className="mt-6 mb-2 text-[16px] font-bold leading-[1.3]">
          Seus direitos como titular de dados
        </h3>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Nos termos do artigo 18 da LGPD, você tem os seguintes direitos:
        </p>
        <ul className="mt-4 list-disc pl-6 text-[16px] leading-[1.6] space-y-2">
          <li>Confirmação da existência de tratamento</li>
          <li>Acesso aos dados</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
          <li>Portabilidade dos dados a outro fornecedor</li>
          <li>Eliminação dos dados pessoais tratados com consentimento</li>
          <li>Informação sobre compartilhamento com terceiros</li>
          <li>Revogação do consentimento a qualquer momento</li>
        </ul>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Para exercer seus direitos, entre em contato pelo e-mail{" "}
          <a
            href="mailto:privacy@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            privacy@kitsubeat.com
          </a>
          . Responderemos dentro de 15 dias úteis.
        </p>
        <h3 className="mt-6 mb-2 text-[16px] font-bold leading-[1.3]">
          Período de retenção
        </h3>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Os dados pessoais são retidos enquanto a conta estiver ativa. Após a
          exclusão da conta, dados anonimizados podem ser mantidos para fins
          estatísticos. Registros de consentimento são mantidos por 3 anos.
        </p>
        <h3 className="mt-6 mb-2 text-[16px] font-bold leading-[1.3]">
          Encarregado de proteção de dados (DPO)
        </h3>
        <p className="mt-4 text-[16px] leading-[1.6]">
          O responsável pelo tratamento de dados do KitsuBeat pode ser contatado
          pelo e-mail{" "}
          <a
            href="mailto:privacy@kitsubeat.com"
            className="text-[var(--color-accent-readable)] underline"
          >
            privacy@kitsubeat.com
          </a>
          {" "}[alias do operador — configurar antes do lançamento na Fase 19].
        </p>
        <p className="mt-4 text-[16px] leading-[1.6]">
          Caso não esteja satisfeito com nossa resposta, você pode contatar a
          Autoridade Nacional de Proteção de Dados (ANPD) pelo site{" "}
          <a
            href="https://www.gov.br/anpd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent-readable)] underline"
          >
            gov.br/anpd
          </a>
          .
        </p>
      </section>

      <LegalNavFooter />
    </main>
  );
}
