import { describe, it, expect } from "vitest";
import { render } from "./dailyReminder";

describe("dailyReminder.render", () => {
  const props = { firstName: "Yuki", streakCurrent: 7, hoursLeft: 5 };

  it("subject contains 'hours left to extend' (not 'ends in' loss-frame)", () => {
    const { subject } = render(props);
    expect(subject).toContain("hours left to extend");
    expect(subject).not.toContain("ends in");
    expect(subject).not.toContain("don't lose");
  });

  it("subject contains the streak count", () => {
    const { subject } = render(props);
    expect(subject).toContain("7");
    expect(subject).toContain("7-day streak");
  });

  it("html body contains the first name", () => {
    const { html } = render(props);
    expect(html).toContain("Yuki");
  });

  it("text fallback is non-empty and contains name", () => {
    const { text } = render(props);
    expect(text.length).toBeGreaterThan(50);
    expect(text).toContain("Yuki");
  });

  it("does not contain 'don\\'t lose' or 'you\\'ll fail' anywhere", () => {
    const { subject, html, text } = render(props);
    const all = subject + html + text;
    expect(all).not.toContain("don't lose");
    expect(all).not.toContain("you'll fail");
    expect(all).not.toContain("you failed");
    expect(all).not.toContain("miss out");
  });
});
