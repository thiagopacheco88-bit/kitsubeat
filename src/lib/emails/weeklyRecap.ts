import { wrapLayout } from "./layout";

export interface WeeklyRecapProps {
  firstName: string;
  vocabLearned: number;
  songsTouched: number;
  streakCurrent: number;
  streakBest: number;
  nextUp: { title: string; slug: string } | null;
}

/**
 * Phase 14.4 REQ-5 — Sunday weekly recap email template.
 *
 * 4 fixed sections in order per SPEC REQ-5:
 *   1. Vocab Learned
 *   2. Songs Touched
 *   3. Streak (current + best)
 *   4. Up Next (next song on path)
 *
 * Sections with 0 values use "—" placeholder per acceptance criteria.
 */
export function render({
  firstName,
  vocabLearned,
  songsTouched,
  streakCurrent,
  streakBest,
  nextUp,
}: WeeklyRecapProps): { subject: string; html: string; text: string } {
  const subject =
    vocabLearned > 0 || songsTouched > 0
      ? `Your week with KitsuBeat: ${vocabLearned} vocab + ${songsTouched} songs`
      : "Your week with KitsuBeat";

  const sectionStyle =
    "margin:0 0 20px;padding:0 0 20px;border-bottom:1px solid #2a2a3a;";
  const labelStyle =
    "color:#9090a8;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;";
  const valueStyle =
    "color:#e8e8f0;font-family:sans-serif;font-size:28px;font-weight:700;margin:0;";
  const subvalueStyle =
    "color:#9090a8;font-family:sans-serif;font-size:14px;margin:4px 0 0;";

  const nextUpHtml = nextUp
    ? `<a href="https://kitsubeat.app/songs/${nextUp.slug}" style="color:#ff6b6b;font-family:sans-serif;text-decoration:none;font-weight:600;">${nextUp.title}</a>`
    : `<span style="${subvalueStyle}">—</span>`;

  const body = `
    <h2 style="color:#e8e8f0;font-family:sans-serif;margin:0 0 24px;">Your week, ${firstName}</h2>
    <div style="${sectionStyle}">
      <p style="${labelStyle}">Vocab Learned</p>
      <p style="${valueStyle}">${vocabLearned > 0 ? vocabLearned : "—"}</p>
    </div>
    <div style="${sectionStyle}">
      <p style="${labelStyle}">Songs Touched</p>
      <p style="${valueStyle}">${songsTouched > 0 ? songsTouched : "—"}</p>
    </div>
    <div style="${sectionStyle}">
      <p style="${labelStyle}">Streak</p>
      <p style="${valueStyle}">${streakCurrent > 0 ? `${streakCurrent} days` : "—"}</p>
      <p style="${subvalueStyle}">Best: ${streakBest > 0 ? `${streakBest} days` : "—"}</p>
    </div>
    <div style="margin:0;">
      <p style="${labelStyle}">Up Next</p>
      <div>${nextUpHtml}</div>
    </div>
  `;

  const text = [
    `Your week, ${firstName}`,
    ``,
    `Vocab Learned: ${vocabLearned > 0 ? vocabLearned : "—"}`,
    `Songs Touched: ${songsTouched > 0 ? songsTouched : "—"}`,
    `Streak: ${streakCurrent > 0 ? `${streakCurrent} days` : "—"} (best: ${streakBest > 0 ? `${streakBest} days` : "—"})`,
    `Up Next: ${nextUp ? `${nextUp.title} — https://kitsubeat.app/songs/${nextUp.slug}` : "—"}`,
    ``,
    `Manage preferences: https://kitsubeat.app/profile`,
  ].join("\n");

  return { subject, html: wrapLayout(body), text };
}
