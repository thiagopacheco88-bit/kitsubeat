# /journal-song-lesson

Produces one KitsuBeat journal article for an anime song TV opening/ending.
Runs 6 phases in strict sequence with explicit verification gates between them.
Each phase has a defined output that the next phase consumes - nothing carries over implicitly.

**Usage:** `/journal-song-lesson "Song Name" "Anime Name" "optional notes: OP number, artist, focus topics"`

If arguments are missing, ask before proceeding.

---

## Phase 0 — Pre-flight checks

Run these before writing anything:

**Duplicate check:**
- `ls src/content/journal/` and scan for any filename containing the song name (fuzzy match)
- If found, report the existing slug and stop. Do not overwrite without explicit user instruction.

**TV version confirmation:**
- Confirm a TV version (≤ 2 minutes) exists for this song - the article analyses the TV cut, not the full release
- If only a full version exists, note this and ask the user how to proceed

**Song-to-anime mapping:**
- State explicitly: "[Song] is the [OP/ED number] for [Anime], performed by [Artist]"
- If you are not confident in this mapping, say so and ask. Wrong attribution is the most common hallucination in song articles.

---

## Phase 1 — Content draft (sub-agent)

Spawn a `claude` sub-agent with this brief:

> Write a KitsuBeat journal article for the TV version of "[Song]" from "[Anime]".
> Follow all conventions in `.claude/commands/journal-post.md` (tone, structure, frontmatter shape, grammar sections, FAQ, vocabulary table).
>
> **Title format (mandatory for song lessons):** `"Learning Japanese with [Song Name] ([Anime] Opening/Ending/Theme)"`
> **Subtitle:** one specific, interesting claim about the grammar or vocabulary - NOT a repetition of the title.
>
> **Image handling:** Use `HERO_PLACEHOLDER` for coverImage and `BODY_IMAGE_PLACEHOLDER` for every in-article image. Do not search for or invent image URLs.
>
> **Uncertainty markers:** For every claim you are less than fully confident in - lyrics reading order, historical etymology, JLPT level of a specific word, grammar pattern name - wrap it in `[UNCERTAIN: reason]`. Do not omit uncertain claims; flag them so they can be verified.
>
> **Outputs:**
> 1. Full MDX file content (frontmatter + body), with PLACEHOLDERs for images
> 2. `UNCERTAINTY_LIST`: a bullet list of every [UNCERTAIN] marker with the specific claim and why you flagged it

Return both outputs to the main thread. Do not write any files yet.

---

## Phase 2 — Image research (sub-agent, can run in parallel with Phase 1)

Spawn a `claude` sub-agent with this brief:

> Find and verify Wikimedia Commons images for a KitsuBeat journal article about "[Song]" from "[Anime]".
>
> You need:
> - 1 hero image (coverImage): must be landscape (width > height), minimum 800px wide, thematically relevant to the song or anime
> - 2 body images minimum: any aspect ratio (CSS renders `width:100%; height:auto` - no cropping), thematically relevant
>
> **Process for each candidate:**
> 1. Search: `curl "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=KEYWORD&srnamespace=6&format=json&srlimit=8"`
> 2. Get dimensions + CDN URL: `curl "https://commons.wikimedia.org/w/api.php?action=query&titles=File:NAME&prop=imageinfo&iiprop=url|dimensions&format=json"`
> 3. Verify URL returns a real image: `curl -sI URL | grep "HTTP\|content-type"` - must be 200 + image/jpeg or image/png
> 4. Strip `?utm_source=...` query params from all URLs before returning
>
> **Hero image rules:**
> - Reject anything where height > width (portrait images get cropped to an unrecognisable sliver by the hero CSS)
> - Reject anything where width < 800px
> - Prefer: ukiyo-e woodblock prints, classical Japanese paintings, relevant cultural art
> - Avoid: anime screenshots (copyrighted), modern photos of characters
>
> **Rate limit handling:** If Wikimedia returns 429, wait 10 seconds between requests. Do not batch more than 3 API calls without a pause.
>
> **Output format:**
> ```json
> {
>   "hero": { "url": "...", "width": N, "height": N, "description": "what it shows and why it fits" },
>   "body": [
>     { "url": "...", "width": N, "height": N, "description": "...", "suggested_placement": "after section X" },
>     { "url": "...", "width": N, "height": N, "description": "...", "suggested_placement": "after section Y" }
>   ]
> }
> ```
>
> If you cannot find 3 verified images (1 hero + 2 body) after 3 rounds of searching, return what you have and explain what you tried.

Return the image map to the main thread.

---

## Phase 3 — Fact check (sub-agent)

Spawn a `claude` sub-agent with WebSearch access and this brief:

> Fact-check a draft journal article about "[Song]" from "[Anime]".
>
> **Inputs:**
> - Draft article text (provided below)
> - Uncertainty list (provided below)
>
> **Required checks:**
>
> 1. **Song-to-anime mapping:** Confirm "[Song]" is actually from "[Anime]" and not a different series. State your source.
>
> 2. **Artist attribution:** Confirm the artist/band named in the article performed this song for this anime. Check for common mix-ups (e.g., LiSA has multiple anime songs; Ikimono-gakari has multiple Naruto songs).
>
> 3. **Every UNCERTAINTY_LIST item:** Web-search each one. Return: CONFIRMED, CORRECTED (with the right answer), or STILL_UNCERTAIN (if you can't verify).
>
> 4. **Lyrics spot-check:** For the first verse and chorus in the article, verify the romaji and Japanese match what you can confirm. Flag any line where the article's reading seems wrong.
>
> 5. **Cross-contamination check:** Scan the article for references to characters, events, or vocabulary that belong to a DIFFERENT anime/game. (Example: Eren Jager in an Evangelion article.) List any found.
>
> 6. **Grammar claim check:** For each grammar pattern named (e.g. "ほど is N4"), verify the JLPT level is approximately correct.
>
> **Output format:**
> ```
> SONG_ATTRIBUTION: [CONFIRMED / ISSUE: ...]
> ARTIST_ATTRIBUTION: [CONFIRMED / ISSUE: ...]
> UNCERTAINTY_RESOLUTIONS:
>   - [item 1]: CONFIRMED / CORRECTED: [right answer] / STILL_UNCERTAIN
>   - ...
> CROSS_CONTAMINATION: [NONE / FOUND: ...]
> GRAMMAR_ISSUES: [NONE / FOUND: ...]
> LYRICS_ISSUES: [NONE / FOUND: ...]
> OVERALL: APPROVED / NEEDS_CORRECTION
> ```

Return the fact-check report to the main thread.

---

## Phase 4 — Assembly

Back in the main thread:

1. **Apply corrections** from the Phase 3 report to the draft:
   - Fix every CORRECTED item
   - Remove or rewrite any cross-contamination found
   - Flag STILL_UNCERTAIN items in a comment for human review if they are material claims

2. **Inject images** from the Phase 2 map:
   - Replace `HERO_PLACEHOLDER` in frontmatter with the verified hero URL
   - Replace each `BODY_IMAGE_PLACEHOLDER` with the corresponding body image URL and suggested alt text
   - Alt text format: "[what is shown] - [why it's relevant to this article]"

3. **Em-dash sweep:** Scan the assembled content for `—` and replace with `-`

4. **Write the file:** `src/content/journal/[slug].mdx`

5. **Verify file written:** Read back the first 10 lines to confirm frontmatter is intact.

---

## Phase 5 — Visual QA (human gate)

Start the dev server if not already running: `npm run dev` (port 7000).

Wait for the route to compile (up to 30 seconds), then:

**Automated checks (Playwright):**
```bash
npx playwright test tests/e2e/journal-article.spec.ts --reporter=line
```

If the spec file has no stub for this article, run a targeted check instead:
```bash
npx playwright test --reporter=line -- --grep "journal"
```

**Image verification for human review:**
For each image in the article, display to the user:
- URL
- Dimensions (width x height)
- Role (hero / body)
- What the image shows (from Phase 2 description)

Then ask (AskUserQuestion with multiSelect: false):

> "Hero image check: [URL] ([W]x[H]px) - [description]
> Does this look correct for the article cover? (It will be cropped to a wide landscape banner.)"
> Options: Approve / Reject and find a different one

> "Body image [N] check: [URL] ([W]x[H]px) - [description]
> Is this image relevant and would it add value for a reader?"
> Options: Approve / Reject and find a different one

If any image is rejected, return to Phase 2 for that slot only (not a full restart).

Do not proceed to Phase 6 until all images are approved.

---

## Phase 6 — SEO / GEO review

Check each item against the assembled MDX. Fix inline if failing.

| Check | Rule | How to verify |
|---|---|---|
| summary length | 150-160 characters | `echo -n "summary text" \| wc -c` |
| faq entries | ≥ 5, plain-text answers (no markdown) | count `- question:` entries |
| about entries | 2-4 topics, every entry has `sameAs` Wikipedia URL | scan frontmatter |
| mentions entries | every franchise/character cited in body has `sameAs` | cross-ref body text |
| Key Takeaways | `> **Key Takeaways**` blockquote present after hook | grep for `Key Takeaways` |
| keywords | ≥ 5 keyword phrases in frontmatter | count entries |
| /songs link | at least one internal link to `/songs` in body | grep for `(/songs` |
| /journal link | at least one internal link to `/journal` in body | grep for `(/journal` |
| title format | starts with "Learning Japanese with " | check frontmatter title |
| subtitle | different from title, contains specific grammar/vocab claim | read and verify |

If all pass: proceed to Phase 7.
If any fail: fix and re-run only the failing checks.

---

## Phase 7 — Commit and deploy

```bash
git add src/content/journal/[slug].mdx
git commit -m "feat(journal): Learning Japanese with [Song] ([Anime] Opening)"
git push origin master
```

Report back:
- Live URL: `https://kitsubeat.com/journal/[slug]`
- Phases passed: 1-6 all green
- Image count: N verified
- Fact-check result: APPROVED (or list remaining STILL_UNCERTAIN items)
- Playwright: N/N tests passing

---

## Error handling

| Failure | Action |
|---|---|
| Phase 0: duplicate found | Stop. Ask user. |
| Phase 0: song attribution uncertain | Ask user to confirm before continuing |
| Phase 2: fewer than 3 images verified | Return what you have, explain, ask user whether to proceed or search differently |
| Phase 3: NEEDS_CORRECTION returned | Apply all corrections before Phase 4 assembly |
| Phase 3: STILL_UNCERTAIN items | Include them in final report; do not fabricate answers |
| Phase 5: Playwright test fails | Diagnose (500 = stale HMR → restart server; 404 = broken image URL → replace) |
| Phase 5: image rejected by user | Return to Phase 2 for that slot only |
| Phase 6: SEO check fails | Fix inline immediately, do not skip and deploy |
| Phase 7: push rejected | Check branch protection, report to user |
