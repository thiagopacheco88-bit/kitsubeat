// Phase 14.4 Wave 0 stub — filled in by plan 03
import { describe, it, expect } from "vitest";
// import { sendEmail } from "./send"; // uncomment when plan 03 creates the file

describe("sendEmail", () => {
  it.todo("returns { sent: false, dry_run: true } when RESEND_API_KEY is unset");
  it.todo("logs [email-dry-run] with kind, userId, subject — never the API key");
  it.todo("returns { sent: true, id } when Resend call succeeds");
});
