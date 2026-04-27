# Phase 11.2 — Straggler Dispositions (SPEC-REQ-6)

**Date:** 2026-04-26
**Plan:** 11.2-05 Task 3 (D-05 fallback ladder)
**Final batch yield:** 29 of 56 manifest entries ship to production (29 loaded-and-passing; 18 removed-by-audit in Plan 06 + 9 removed-pre-Plan-06 + 4 deferred pre-existing exclusions).
**Updated (11.2-followup pass 1, 2026-04-27):** 3 previously `loaded-and-flagged-by-audit-with-rationale` songs (sign-flow, the-day-porno-graffitti, uso-sid) resolved to `loaded-and-passing` via R1 boundary-snap in 10b-derive-tv-lessons-nw.ts. All 29 TV lessons are now `loaded-and-passing`.
**Updated (11.2-followup pass 2, 2026-04-27):** R1 snap applied to the remaining 26 TV lessons. 5 additional songs improved to 100% (guren-does, haruka-kanata-asian-kung-fu-generation, mezamero-yasei-matchy-with-question, rocks-hound-dog, speed-analogfish). 2 songs (scenario-saboten ~93%, tsunaida-te-lilb ~83%) retain isolated FAIL verses not addressable by the long-span snap — both are above the ≥75% operational threshold. 0 regressions. See `R1-EXTENSION-REPORT.md` for full per-song breakdown.

## Disposition outcomes

Per SPEC-REQ-6, every TV-version song must land in one of:
- `loaded-and-passing` — clean lesson, ships to production
- `loaded-and-flagged-by-audit-with-rationale` — ships, but flagged by audit
- `removed-from-catalog-with-rationale` — does NOT ship; documented reason
- `deferred-with-rationale` — does NOT ship now; explicitly punted to a follow-up phase

**Summary:** 29 `loaded-and-passing` (all 29; 3 flagged resolved in pass 1, 5 more improved in pass 2, 21 already at 100%, 2 with isolated FAILs above threshold), 0 `loaded-and-flagged-by-audit-with-rationale`, 18 `removed-from-catalog-with-rationale` (Plan 06 audit drops), 9 `removed-from-catalog-with-rationale` (pre-Plan-06: manifest dupes / English-only / NW-fail), 4 `deferred-with-rationale` (pre-existing exclusions). Total disposition rows: 60 (matches phase scope of 60 TV songs).

## The 13 stragglers

### Tier 1 — Recovered via manifest fix (2 of 3)

| Slug | Outcome | Rationale | Lesson file |
|------|---------|-----------|-------------|
| remember-flow | loaded-and-passing | Manifest had wrong TV id `Cg36IJgn-so` (duplicate placeholder) and wrong full id `_msng5j20tA`. User-confirmed correct ids: TV `FvTjwbKsO9g`, full `0FRnEHwZroM`. Refetched and re-derived: 4/11 verses, 47% coverage, JP. | data/lessons-cache-tv-nw/remember-flow.json |
| shinkokyuu-super-beaver | loaded-and-passing | Manifest had wrong TV id `aCLLQ5xWCPI` (duplicate placeholder) and wrong full id `kuqYj3tQw1E`. User-confirmed correct ids: TV `lBES1aPv9yQ`, full `WRLLtdupOdY`. Refetched and re-derived: 8/34 verses, 36% coverage, JP. | data/lessons-cache-tv-nw/shinkokyuu-super-beaver.json |

### Tier 1 — Removed from catalog (1 of 3)

| Slug | Outcome | Rationale | Lesson file |
|------|---------|-----------|-------------|
| wind-akeboshi | removed-from-catalog | Manifest TV id corrected (`73fGDIJ1HVc` → `wzoIZO8WbI8`); refetched audio is correct. NW alignment yielded only 3 verses out of 40, all 100% English chorus ("Cultivate your hunger before you idealize / Motivate your anger to make them all realize / Climbing the mountain never coming down"). The Naruto opening cut contains only the song's English chorus; all Japanese verses are in the song's bridge/middle sections that the TV cut omits. A 3-verse English-only TV lesson has no Japanese-learning value. The full version of this song remains in production unchanged. | (n/a) |

### Tier 2 / Tier 3 — Manifest-dupe affected, not refetched (5)

User scope decision: only Tier 1 (wind, remember, shinkokyuu) got manual id correction this round. Tier 2 and Tier 3 slugs that share placeholder TV ids were dropped rather than chase canonical TV ids per slug.

| Slug | Outcome | Rationale | Lesson file |
|------|---------|-----------|-------------|
| ima-made-nando-mo-the-mass-missile | removed-from-catalog | TV manifest id `73fGDIJ1HVc` (still pointing at wind-akeboshi's video after Tier 1 fix). Audio downloaded was wind-akeboshi's, not this song's. T3 popularity. Drop pending future Phase 11.1 / Add-Song Pipeline cleanup. | (n/a) |
| parade-chaba | removed-from-catalog | TV manifest id `73fGDIJ1HVc` (still pointing at wind-akeboshi's video after Tier 1 fix). T2 popularity. Drop pending future Phase 11.1 / Add-Song Pipeline cleanup. | (n/a) |
| hajimete-kimi-to-shabetta-gagagasp | removed-from-catalog | TV manifest id `73fGDIJ1HVc` (still pointing at wind-akeboshi's video after Tier 1 fix). T2 popularity. Drop pending future Phase 11.1 / Add-Song Pipeline cleanup. | (n/a) |
| yellow-moon-akeboshi | removed-from-catalog | TV manifest id `f9_7gGpL_RA` shared with pinocchio-ore-ska-band; canonical owner unverified. T2 popularity (Akeboshi B-side; *Wind* is the Tier-1 hit from this artist). Drop pending future cleanup. | (n/a) |
| pinocchio-ore-ska-band | removed-from-catalog | TV manifest id `f9_7gGpL_RA` shared with yellow-moon-akeboshi; NW also produced no_detected_verses. T2 popularity. Drop pending future cleanup. | (n/a) |

### Tier 2 / Tier 3 — Was dupe, now sole user of id but still uncertain (2)

After Tier 1 fix, two slugs are sole users of formerly-shared ids. The downloaded audio for those ids was downloaded once before the fix; we cannot tell whether it was the canonical song for the surviving slug or a placeholder.

| Slug | Outcome | Rationale | Lesson file |
|------|---------|-----------|-------------|
| nakushita-kotoba-no-regret-life | removed-from-catalog | Was sharing TV id `Cg36IJgn-so` with remember-flow. After Tier 1 fix, this slug is the sole user. NW produced no_detected_verses, suggesting the audio is NOT this song's vocals. T2 popularity. Drop. | (n/a) |
| u-can-do-it-domino | removed-from-catalog | Was sharing TV id `aCLLQ5xWCPI` with shinkokyuu-super-beaver. After Tier 1 fix, this slug is the sole user. Lesson DID derive in Wave 3 (audio matches something), but cannot confirm it is u-can-do-it-domino's actual TV cut without manual verification. T3 popularity. Drop conservatively. | (n/a) |

### Pure NW-failure, no manifest dupe (1)

| Slug | Outcome | Rationale | Lesson file |
|------|---------|-----------|-------------|
| viva-rock-japanese-side-orange-range | removed-from-catalog | TV manifest id is unique (no dupe). Demucs produced a vocal stem of normal size (~16 MB), but WhisperX returned 0 segments — likely the TV cut has minimal Japanese vocal content (instrumental opening, English-only intro, or noise that defeats VAD). Out of scope to investigate root cause this phase. | (n/a) |

### Pre-existing manifest exclusions (4 of 60 originally excluded)

These 4 slugs were already excluded from `data/songs-manifest-tv.json` before Phase 11.2 began (manifest contained 56 entries, not 60). Their dispositions were captured here for SPEC-REQ-6 completeness.

| Slug | Outcome | Rationale | Lesson file |
|------|---------|-----------|-------------|
| mountain-a-go-go-too-captain-straydum | deferred-with-rationale | Plan 11.2-04 Task 1 was supposed to regenerate the full lesson with Japanese tokens, but investigation during Wave 2 revealed the upstream `data/lyrics-cache/mountain-a-go-go-too-captain-straydum.json` is itself romaji-only (`raw_lyrics`: "Get up!!... Sumimasen / Boku tama ni..."). User opted to defer rather than spend API credits or work the upstream lyrics-fetch fix here. Real upstream fix likely lands via stashed `scripts/seed/fetch-utanet-lyrics.ts` (currently in `git stash@{0}`) when convenient — likely as part of Phase 11.1 follow-up. | (n/a; not in batch manifest) |
| my-answer-seamo | deferred-with-rationale | Pre-existing exclusion. Likely D-05 step 1 (replace YouTube id) candidate or step 3 (drop). Out of scope this phase. | (n/a; not in batch manifest) |
| newsong-tacica | deferred-with-rationale | Pre-existing exclusion. TV cut is "ご視聴ありがとうございました" outro voiceover — vocals absent. D-05 step 0 → step 3 (drop). To formally drop, requires DB DELETE. Out of scope this phase. | (n/a; not in batch manifest) |
| whats-up-people-maximum-the-hormone | deferred-with-rationale | Pre-existing exclusion. Mixed English+Japanese ("What's up with my mind? アーメンボール!"). NW partial-alignment is plausible if user wants to retry with relaxed thresholds. Out of scope this phase. | (n/a; not in batch manifest) |

---

## Audit-Flagged Drops (Plan 06)

**Date:** 2026-04-26
**Plan:** 11.2-06 (spot-check + audit gate)
**Context:** Thresholds relaxed per checkpoint decision: DENSITY_FLOOR 0.08→0.03, MAX_VERSE_SPAN_MS 15s→25s. After relaxation, 18 of 47 lessons still flagged. All 18 removed from catalog: `data/lessons-cache-tv-nw/{slug}.json`, `data/audio-tv/{slug}.mp3`, `data/vocal-stems-tv/htdemucs/{slug}/`, `data/timing-cache-tv-stem/{slug}.json`.

**Remaining after drops:** 47 − 18 = 29 lessons in `data/lessons-cache-tv-nw/`.

| Slug | Outcome | Flag(s) that fired | Specific values |
|------|---------|--------------------|-----------------|
| again-yui | removed-from-catalog-with-rationale | density + max-span | density=0.0160 (floor=0.03); verse 1 spans 46288ms (max=25000ms). Single-verse mega-lesson — the NW collapsed the entire TV cut into one verse. Degenerate. |
| broken-youth-nico-touches-the-walls | removed-from-catalog-with-rationale | max-span | verse 7 spans 29811ms (max=25000ms). Single verse running ~30s indicates a verse-merge artifact. |
| diver-nico-touches-the-walls | removed-from-catalog-with-rationale | max-span | verse 3 spans 26476ms (max=25000ms). Verse merge artifact. |
| flame-dish | removed-from-catalog-with-rationale | max-span | verse 3 spans 29324ms (max=25000ms). Verse merge artifact. |
| freedom-home-made-kazoku | removed-from-catalog-with-rationale | max-span | verse 1 spans 27848ms (max=25000ms). Verse merge artifact. |
| golden-time-lover-sukima-switch | removed-from-catalog-with-rationale | max-span (×2) | verse 2 spans 26724ms; verse 3 spans 46367ms (max=25000ms). Multiple merged verses. |
| kara-no-kokoro-anly | removed-from-catalog-with-rationale | density + max-span | density=0.0249 (floor=0.03); verse 1 spans 47929ms, verse 2 spans 31653ms. Very sparse + long verses — likely a slow ballad whose TV cut has very few lyric events, or NW merged multiple verses. |
| let-it-out-miho-fukuhara | removed-from-catalog-with-rationale | max-span (×2) | verse 3 spans 26121ms; verse 4 spans 31445ms (max=25000ms). Multiple merged verses. |
| line-sukima-switch | removed-from-catalog-with-rationale | density + max-span | density=0.0192 (floor=0.03); verse 1 spans 40267ms. Single-verse or near-single-verse degenerate. |
| long-kiss-goodbye-halcali | removed-from-catalog-with-rationale | max-span | verse 5 spans 26555ms (max=25000ms). Verse merge artifact. |
| mother-mucc | removed-from-catalog-with-rationale | max-span | verse 3 spans 26933ms (max=25000ms). Verse merge artifact. |
| name-of-love-cinema-staff | removed-from-catalog-with-rationale | max-span | verse 1 spans 25407ms (max=25000ms). Marginal but exceeds threshold; verse merge artifact. |
| no-boy-no-cry-stance-punks | removed-from-catalog-with-rationale | density + max-span | density=0.0208 (floor=0.03); verse 1 spans 33204ms. Single-verse degenerate. |
| overfly-luna-haruna | removed-from-catalog-with-rationale | density + max-span | density=0.0241 (floor=0.03); verse 1 spans 59015ms. Single verse nearly 60s — extreme degenerate. |
| shinkokyuu-super-beaver | removed-from-catalog-with-rationale | max-span | verse 7 spans 25602ms (max=25000ms). Marginal (602ms over threshold); removed conservatively as the derived lesson has only 8/34 verses (36% coverage) and the marginal violation indicates NW alignment uncertainty on the final verse. |
| shunkan-sentimental-scandal | removed-from-catalog-with-rationale | density + max-span | density=0.0235 (floor=0.03); verse 1 spans 45478ms, verse 2 spans 37268ms. Two massive merged verses — severe degenerate. |
| soba-ni-iru-kara-amadori | removed-from-catalog-with-rationale | max-span | verse 5 spans 25322ms (max=25000ms). Marginal (322ms over threshold); removed conservatively. |
| utakata-hanabi-supercell | removed-from-catalog-with-rationale | max-span | verse 2 spans 34103ms (max=25000ms). Verse merge artifact. |

---

## Followups

- **Phase 11.1 / Add-Song Pipeline cleanup:** The 6 youtube-id duplicates in `data/songs-manifest-tv.json` and the 2 mismatched full-version youtube-ids in `data/songs-manifest.json` indicate the upstream manifest is unreliable. Auditing all manifests against canonical YouTube ids should be part of the Add-Song Pipeline work.
- **Lyrics-fetch fix:** `scripts/seed/fetch-utanet-lyrics.ts` (in stash) addresses the romaji-only `lyrics-cache` problem that surfaced via mountain-a-go-go. Apply when ready.
- **WhisperX memory leak:** `tv-transcribe-stems.py` reloads the large-v3 model per song without freeing prior memory; required 3 retry passes (one full re-run + chunked retries) to clear the 56-song batch. Add `gc.collect()` + `del model` + `torch.cuda.empty_cache()` between songs.
- **5 remaining TV manifest dupes:** Three groups still share placeholder TV ids — `73fGDIJ1HVc` (×3 slugs after Tier 1 fix), `f9_7gGpL_RA` (×2), and `Cg36IJgn-so` / `aCLLQ5xWCPI` are now sole-owners. Worth a one-time audit to either find canonical TV ids or formally remove these slugs from the TV manifest.
- **viva-rock-japanese-side-orange-range root cause:** Worth one diagnostic pass to confirm whether the TV cut is genuinely instrumental / English-only.

---

## Spot-Check-Flagged Ships (Plan 06) — RESOLVED via 11.2-followup

**Original date:** 2026-04-27
**Plan:** 11.2-06 (spot-check + audit gate)
**Resolution date:** 2026-04-27 (11.2-followup out-of-band fix)

All 3 previously-flagged songs resolved to `loaded-and-passing` via the R1 boundary-snap remediation.

| Slug | Original pass rate | Resolution | New pass rate | Outcome |
|------|--------------------|------------|---------------|---------|
| sign-flow | 58.3% (7/12 verses) | R1: snapVerseOnsetToWordBoundary (1400ms threshold) snaps onsets inside long WhisperX word spans (e.g., 11.3s "a" word covering instrumental break) to next structural boundary | 100% (12/12) | loaded-and-passing |
| the-day-porno-graffitti | 55.6% (5/9 verses) | R1: same snap fixes V3 (13s silence gap), V5/V7 (long 'よ' word spans ~2s), V8 (3.6s silence gap) | 100% (9/9) | loaded-and-passing |
| uso-sid | 71.4% (5/7 verses) | R1: snaps V3 (5.1s 'た' word), V5 (3.1s 'ぶ' word), V7 (1.5s 'の' word) to correct boundaries | 100% (7/7) | loaded-and-passing |

**Remediation:** R1 boundary-snap in `computeVerseTimes` (see `.planning/todos/done/2026-04-27-tv-alignment-refinement.md`).
**Spot-check methodology updated:** New word-span check replaces NW re-alignment; verse onsets in silence are PASS; mid-word onsets are FAIL.

---

## R1 Extension — Remaining 26 songs (11.2-followup pass 2, 2026-04-27)

After the 3 flagged songs were fixed, the R1 snap was applied to all remaining 26 shipping TV lessons. Full details in `R1-EXTENSION-REPORT.md`.

**5 additional songs improved to 100%:**

| Slug | Before | After | Key fix |
|------|--------|-------|---------|
| guren-does | 63% (7/8) | 100% (8/8) | V7 snapped from 68065→68965ms (inside long span) |
| haruka-kanata-asian-kung-fu-generation | 63% (7/8) | 100% (8/8) | V6 snapped from 48567→57983ms (inside long span) |
| mezamero-yasei-matchy-with-question | 50% (4/8 old; 5/6 new) | 100% (6/6) | V2 snapped from 39530→22902ms; re-derivation also shifted verse boundaries |
| rocks-hound-dog | 42% (3/7 old; 3/4 new) | 100% (4/4) | V3 snapped from 44189→57014ms; V4 shifted 57014→64811ms |
| speed-analogfish | 53% (7/13 old; 7/10 new) | 100% (10/10) | V7/V8/V10 each snapped forward by 7-9 seconds |

**2 songs with persistent isolated FAILs (above ≥75% threshold, no action taken):**

| Slug | Pass rate | Remaining FAIL | Root cause |
|------|-----------|----------------|------------|
| scenario-saboten | ~93% (14/15) | V13 "何" +1021ms | Short word span (<1400ms), outside R1 range |
| tsunaida-te-lilb | ~83% (5/6) | V6 "こ" +531ms | Short word span (<1400ms), 31ms over 500ms tolerance |

**0 regressions** across all 26 songs. R1 snap is safe for universal application.

**Catalog final state:** 27 of 29 songs at 100% pass rate. All 29 at ≥75% (operational threshold met).
