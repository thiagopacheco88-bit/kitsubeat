import { wrapLayout } from "./layout";

export interface DailyReminderProps {
  firstName: string;
  streakCurrent: number;
  hoursLeft: number;
}

/**
 * Phase 14.4 REQ-4 — Daily streak-at-risk reminder email template.
 *
 * Anti-loss-frame per D-17: subject uses "hours left to extend" NOT "ends in".
 * Forbidden phrases: "don't lose", "you'll fail", "ends in" (reminder framing), "miss out".
 */
export function render({
  firstName,
  streakCurrent,
  hoursLeft,
}: DailyReminderProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${hoursLeft} hours left to extend your ${streakCurrent}-day streak`;

  const body = `
    <h2 style="color:#e8e8f0;font-family:sans-serif;margin:0 0 16px;">Hey ${firstName}!</h2>
    <p style="color:#e8e8f0;font-family:sans-serif;margin:0 0 24px;line-height:1.5;">
      You're on a <strong>${streakCurrent}-day streak</strong> — keep it going!
      Log a session in the next ${hoursLeft} ${hoursLeft === 1 ? "hour" : "hours"} to extend it.
    </p>
    <a href="https://kitsubeat.app" style="display:inline-block;padding:12px 24px;background:#ff6b6b;color:#fff;text-decoration:none;border-radius:6px;font-family:sans-serif;font-weight:600;">
      Study now →
    </a>
  `;

  const text = [
    `Hey ${firstName}!`,
    ``,
    `You're on a ${streakCurrent}-day streak — keep it going!`,
    `Log a session in the next ${hoursLeft} ${hoursLeft === 1 ? "hour" : "hours"} to extend it.`,
    ``,
    `Study now: https://kitsubeat.app`,
    ``,
    `Manage preferences: https://kitsubeat.app/profile`,
  ].join("\n");

  return { subject, html: wrapLayout(body), text };
}
