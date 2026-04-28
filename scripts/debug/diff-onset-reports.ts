/**
 * Cross-tab the original spot-check-full-onsets report (verse.start_time_ms
 * mode) vs the corrected --player-path catalog-wide report. Shows:
 *   - was-FAIL → now-PASS (false positives that the gate fix exposed)
 *   - was-FAIL → still-FAIL (real drift the original gate also caught)
 *   - was-PASS → now-FAIL (NEW signal the original gate missed)
 *   - was-PASS → still-PASS
 *
 * Usage: npx tsx scripts/debug/diff-onset-reports.ts
 */
import { readFileSync } from "node:fs";

interface Verdict {
  slug: string;
  verdict: "PASS" | "FAIL" | "NO_DATA";
  pass_rate: number;
  total_verses: number;
  fail: number;
}
interface Report {
  verdicts: Verdict[];
}

const orig = JSON.parse(readFileSync("data/full-onset-report.json", "utf-8")) as Report;
const playerpath = JSON.parse(readFileSync("data/full-onset-report-playerpath-all.json", "utf-8")) as Report;

const origMap = new Map(orig.verdicts.map((v) => [v.slug, v]));
const ppMap = new Map(playerpath.verdicts.map((v) => [v.slug, v]));

const newFails: Verdict[] = [];
const wasFailNowPass: Verdict[] = [];
const stillFails: Verdict[] = [];

for (const slug of new Set([...origMap.keys(), ...ppMap.keys()])) {
  const o = origMap.get(slug);
  const p = ppMap.get(slug);
  if (!o || !p) continue;
  if (o.verdict === "FAIL" && p.verdict === "PASS") wasFailNowPass.push(p);
  else if (o.verdict === "FAIL" && p.verdict === "FAIL") stillFails.push(p);
  else if (o.verdict === "PASS" && p.verdict === "FAIL") newFails.push(p);
}

console.log(`# Onset gate corrected — diff vs original`);
console.log(`Original FAIL count:     ${orig.verdicts.filter((v) => v.verdict === "FAIL").length}`);
console.log(`Player-path FAIL count:  ${playerpath.verdicts.filter((v) => v.verdict === "FAIL").length}`);
console.log();
console.log(`## was-FAIL → now-PASS (audit false positives, ${wasFailNowPass.length})`);
for (const v of wasFailNowPass) console.log(`  ${v.slug}: ${(v.pass_rate * 100).toFixed(0)}%`);
console.log();
console.log(`## was-FAIL → still-FAIL (real drift, ${stillFails.length})`);
for (const v of stillFails.sort((a, b) => a.pass_rate - b.pass_rate))
  console.log(`  ${v.slug}: ${(v.pass_rate * 100).toFixed(0)}% (${v.fail}/${v.total_verses})`);
console.log();
console.log(`## was-PASS → now-FAIL (new signal, ${newFails.length})`);
for (const v of newFails.sort((a, b) => a.pass_rate - b.pass_rate))
  console.log(`  ${v.slug}: ${(v.pass_rate * 100).toFixed(0)}% (${v.fail}/${v.total_verses})`);
