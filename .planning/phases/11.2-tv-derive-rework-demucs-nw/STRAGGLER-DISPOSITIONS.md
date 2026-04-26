# Phase 11.2 — Straggler Dispositions (SPEC-REQ-6)

**Date:** 2026-04-26
**Plan:** 11.2-05 Task 3 (D-05 fallback ladder)
**Final batch yield:** 47 of 56 manifest entries pass through to Wave 4 spot-check.

## Disposition outcomes

Per SPEC-REQ-6, every TV-version song must land in one of:
- `loaded-and-passing` — clean lesson, ships to production
- `loaded-and-flagged-by-audit-with-rationale` — ships, but flagged by audit
- `removed-from-catalog-with-rationale` — does NOT ship; documented reason
- `deferred-with-rationale` — does NOT ship now; explicitly punted to a follow-up phase

**Summary:** 47 `loaded-and-passing`, 13 `removed-from-catalog-with-rationale` or `deferred-with-rationale`.

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

## Followups

- **Phase 11.1 / Add-Song Pipeline cleanup:** The 6 youtube-id duplicates in `data/songs-manifest-tv.json` and the 2 mismatched full-version youtube-ids in `data/songs-manifest.json` indicate the upstream manifest is unreliable. Auditing all manifests against canonical YouTube ids should be part of the Add-Song Pipeline work.
- **Lyrics-fetch fix:** `scripts/seed/fetch-utanet-lyrics.ts` (in stash) addresses the romaji-only `lyrics-cache` problem that surfaced via mountain-a-go-go. Apply when ready.
- **WhisperX memory leak:** `tv-transcribe-stems.py` reloads the large-v3 model per song without freeing prior memory; required 3 retry passes (one full re-run + chunked retries) to clear the 56-song batch. Add `gc.collect()` + `del model` + `torch.cuda.empty_cache()` between songs.
- **5 remaining TV manifest dupes:** Three groups still share placeholder TV ids — `73fGDIJ1HVc` (×3 slugs after Tier 1 fix), `f9_7gGpL_RA` (×2), and `Cg36IJgn-so` / `aCLLQ5xWCPI` are now sole-owners. Worth a one-time audit to either find canonical TV ids or formally remove these slugs from the TV manifest.
- **viva-rock-japanese-side-orange-range root cause:** Worth one diagnostic pass to confirm whether the TV cut is genuinely instrumental / English-only.
