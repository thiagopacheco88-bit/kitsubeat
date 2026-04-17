/**
 * scripts/qa/run-quarantined.ts
 *
 * Plan 08.1-08 Task 2.
 *
 * Wrapper for `npm run test:quarantine`. Sets KB_RUN_QUARANTINE=1 (flips
 * playwright.config.ts's grepInvert to never-match) and forwards to
 * `playwright test --grep '[kb-quarantine]'` so ONLY quarantined tests run.
 *
 * Cross-platform alternative to a Bash one-liner — keeps the package.json script
 * simple and avoids a cross-env dependency for one wrapper.
 */

import { spawnSync } from "node:child_process";

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

const result = spawnSync(
  npxCmd,
  ["playwright", "test", "--grep", "\\[kb-quarantine\\]"],
  {
    stdio: "inherit",
    env: { ...process.env, KB_RUN_QUARANTINE: "1" },
  }
);

process.exit(result.status ?? 1);
