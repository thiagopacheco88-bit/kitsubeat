import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail } from "./send";

describe("sendEmail", () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    if (originalKey) process.env.RESEND_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("returns { sent: false, dry_run: true } when RESEND_API_KEY is unset", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "test",
      html: "<p>test</p>",
      text: "test",
      kind: "daily_reminder",
      userId: "user_123",
    });
    expect(result.sent).toBe(false);
    expect(result.dry_run).toBe(true);
  });

  it("logs [email-dry-run] with kind, userId, subject — never the API key or email address", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail({
      to: "secret@example.com",
      subject: "Test subject",
      html: "<p>test</p>",
      text: "test",
      kind: "daily_reminder",
      userId: "user_abc",
    });
    expect(spy).toHaveBeenCalledWith("[email-dry-run]", {
      kind: "daily_reminder",
      userId: "user_abc",
      subject: "Test subject",
    });
    // Verify the email address was NOT logged
    const loggedArgs = JSON.stringify(spy.mock.calls);
    expect(loggedArgs).not.toContain("secret@example.com");
  });
});
