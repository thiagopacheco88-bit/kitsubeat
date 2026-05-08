import { Resend } from "resend";
import pLimit from "p-limit";

// Lazy init — avoids crashes when RESEND_API_KEY is unset (dry-run mode)
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// RESEARCH Pitfall 2: Resend rate limit is 5 req/sec. p-limit(1) + 200ms delay = ~5 req/sec.
// EMAIL_SEND_CONCURRENCY is a tuning knob — default 1 to stay under rate limit.
// EMAIL_SEND_DELAY_MS is the gap between sends — default 200ms.
const CONCURRENCY = Number(process.env.EMAIL_SEND_CONCURRENCY ?? "1");
const DELAY_MS = Number(process.env.EMAIL_SEND_DELAY_MS ?? "200");

export const emailSendLimit = pLimit(CONCURRENCY);

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string; // for dry-run logging only
  userId: string; // for dry-run logging only
}

export interface SendEmailResult {
  sent: boolean;
  dry_run?: boolean;
  id?: string;
}

export async function sendEmail(
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    // D-05: log payload without the API key (T-LOG-01)
    // eslint-disable-next-line no-console
    console.info("[email-dry-run]", {
      kind: payload.kind,
      userId: payload.userId,
      subject: payload.subject,
      // NEVER include payload.to — email address in logs is a privacy risk
    });
    return { sent: false, dry_run: true };
  }

  const { data, error } = await getResend().emails.send({
    from: "KitsuBeat <noreply@kitsubeat.app>",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[email-send-error]", {
      kind: payload.kind,
      userId: payload.userId,
      error,
    });
    return { sent: false };
  }

  // Rate-limit gap between sends
  if (DELAY_MS > 0) {
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return { sent: true, id: data?.id };
}
