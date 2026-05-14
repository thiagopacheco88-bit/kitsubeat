# /qa-full — Full KitsuBeat QA Suite

Run the complete Playwright end-to-end test suite and report results. Covers all 6 feature areas plus the 60+ existing specs.

## Steps

1. **Check dev server** — verify port 7000 is responding. If not, start it:
   ```bash
   npm run dev
   ```
   Wait up to 60 seconds for `http://localhost:7000` to respond before proceeding.

2. **Run the full suite**:
   ```bash
   npx playwright test --reporter=list
   ```
   If any tests require auth bypass (exercise/progress tests), prefix with:
   ```bash
   PLAYWRIGHT_AUTH=true npx playwright test --reporter=list
   ```

3. **Parse and report** — after the run, summarise:
   - Total passed / failed / skipped
   - Which spec files failed and the first failing assertion
   - Any tests that hit the 30s timeout (likely flake candidates)
   - Coverage gaps: list any of the 6 feature areas with zero passing tests

4. **On failure** — for each failed test:
   - Show the test name and file
   - Show the Playwright error message
   - Suggest the most likely fix (selector changed, missing data-testid, timing issue)

## Feature areas covered

| Area | Spec files |
|---|---|
| Language switching | `i18n-language-picker`, `i18n-locale-routing`, `i18n-text-deep` |
| Loading & transitions | `loading-transitions`, `reduced-motion`, `home-reduced-motion`, `path-reduced-motion` |
| Admin (all tools) | `admin-auth`, `admin-lyrics-shell`, `admin-deep` |
| Kana full journey | `kana-full-journey`, `path-kana-checkpoint-nav` |
| Path / Trilha | `path-deep-journey`, `path-visual-light`, `path-visual-dark`, `path-a11y`, `path-continue-anchor`, `gamification-path` |
| Token popup & exercises | `token-popup-exercises`, `exercise-session-full`, `exercise-tab-tracks`, `exercise-progress-fsrs` |
| Player | `player-load`, `player-panels`, `player-sync-and-seek`, `player-lesson-toggles`, `iframe-defer` |
| Home | `home-and-browse`, `home-above-fold-auth`, `home-above-fold-unauth`, `home-foundations`, `home-section-narrative` |
| Regression | `regression-geo-fallback`, `regression-cross-song-leak`, `regression-premium-gate`, `flagged-song-404` |

## Quick runs (single area)

```bash
# New gap-filling specs — run in 2 groups to avoid overloading Next.js dev server
npx playwright test loading-transitions admin-deep path-deep-journey
npx playwright test i18n-text-deep kana-full-journey token-popup-exercises

# Only language switching
npx playwright test i18n-

# Only path/trilha
npx playwright test path-

# Only exercises
npx playwright test exercise-

# Only admin
npx playwright test admin-

# With HTML report (open after run)
npx playwright test && npm run test:report
```

## Notes

- Zero-flake policy: if a test fails once, do not re-run to confirm — investigate the root cause.
- Admin tests skip gracefully when Clerk credentials are not configured — that is expected, not a failure.
- Visual diff tests (`path-visual-light`, `path-visual-dark`, `home-visual-*`) require baseline snapshots. Run with `--update-snapshots` after intentional visual changes only.
- Quarantined tests are excluded by default. Run `npm run test:quarantine` to see them.
