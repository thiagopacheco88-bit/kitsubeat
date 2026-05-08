import { wrapLayout } from "./layout";

export interface BirthdayTransitionProps {
  firstName: string;
}

/**
 * Phase 18 REQ-MINORS-GATE-11 — 18th-birthday transition email.
 *
 * Notifies the user that their account has transitioned from minor status.
 * Per REQ-MINORS-GATE-12: this email does NOT promise any automatic changes
 * to privacy settings — it informs the user they can NOW update settings
 * themselves if they choose.
 *
 * CRITICAL: Do NOT say "your settings have been changed" — the birthday
 * cron ONLY sets is_minor=false; it does not flip social_activity_enabled
 * or any other preference column.
 */
export function render({ firstName }: BirthdayTransitionProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Happy 18th birthday, ${firstName}! Your KitsuBeat account has been updated`;

  const body = `
    <h2 style="color:#e8e8f0;font-family:sans-serif;margin:0 0 16px;">Happy 18th birthday, ${firstName}!</h2>
    <p style="color:#e8e8f0;font-family:sans-serif;margin:0 0 16px;line-height:1.5;">
      Your KitsuBeat account has been updated now that you've turned 18.
      You can review and update your privacy and sharing settings at any time from your profile.
    </p>
    <a href="https://kitsubeat.app/profile" style="display:inline-block;padding:12px 24px;background:#ff6b6b;color:#fff;text-decoration:none;border-radius:6px;font-family:sans-serif;font-weight:600;">
      Review settings →
    </a>
    <p style="color:#a0a0b8;font-family:sans-serif;margin:24px 0 0;font-size:12px;">
      If you have any questions about your data, contact privacy@kitsubeat.com.
    </p>
  `;

  const text = [
    `Happy 18th birthday, ${firstName}!`,
    ``,
    `Your KitsuBeat account has been updated now that you've turned 18.`,
    `You can review and update your privacy and sharing settings at any time from your profile.`,
    ``,
    `Review settings: https://kitsubeat.app/profile`,
    ``,
    `If you have any questions about your data, contact privacy@kitsubeat.com.`,
  ].join("\n");

  return { subject, html: wrapLayout(body), text };
}
