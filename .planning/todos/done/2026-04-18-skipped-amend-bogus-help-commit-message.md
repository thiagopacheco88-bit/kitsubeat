---
created: 2026-04-16T21:10:00.000Z
resolved: 2026-04-18T19:30:00.000Z
resolution: skipped
resolution_note: "3109fcf is 192 commits deep as of 2026-04-18. Interactive rebase + force-push risk outweighs the cosmetic fix. Commit content is correct; leaving the ugly message in history."
title: Amend bogus "--help" commit message on 3109fcf
area: tooling
files:
  - .planning/config.json
  - .planning/phases/07-data-foundation/07-01-PLAN.md
  - .planning/phases/07-data-foundation/07-02-PLAN.md
---

## Problem

Commit `3109fcf` on master has the literal message `--help` because of a CLI mis-parse during a `/gsd:add-todo` invocation on 2026-04-16:

1. `node gsd-tools.cjs commit "long quoted message" --files <paths>` was called — the script treated each word of the quoted message as a pathspec, returned `committed: false, reason: nothing_to_commit`.
2. A subsequent diagnostic call `node gsd-tools.cjs commit --help` (intended to print usage) was interpreted by the tool as `commit with message "--help"` and committed the staged leftovers.

Content of the commit is harmless and correct: Phase 7 documentation refinements only (no Phase 8 work was touched, no functional code changed).

- `.planning/config.json` — trailing newline cleanup
- `.planning/phases/07-data-foundation/07-01-PLAN.md` — adds `refreshVocabGlobal` helper requirement and wiring
- `.planning/phases/07-data-foundation/07-02-PLAN.md` — clarifies `dictionary_form` script-variant normalization and the `structured_conjugation` decision

The commit has not been pushed yet (master is ahead of origin/master by 22+ commits at time of capture). Cleanup is purely cosmetic — content is fine, only the message is ugly.

## Solution

**Preferred (low risk while still local):**

Amend the message in place when it is convenient and no parallel agent is mid-commit:

```bash
git checkout master
git log --oneline -5  # confirm 3109fcf is still HEAD or near it
git rebase -i HEAD~N  # mark 3109fcf as 'reword'
# rebase opens editor — change message to:
# docs(07): refine 07-01 and 07-02 plan files post-execution
```

If `3109fcf` is still HEAD when you get to it (no commits piled on top), simpler:

```bash
git commit --amend -m "docs(07): refine 07-01 and 07-02 plan files post-execution"
```

**Fallback (if it has already been pushed):**

Leave it. Force-pushing to rewrite a single ugly commit message on shared history is not worth it. Add a note in the next squash-friendly window.

**Why this needs explicit user approval:**

The repo CLAUDE.md prohibits `git commit --amend` and any history-rewriting destructive op without an explicit go-ahead from the user. This todo flags the cleanup so it can be done deliberately, not race-committed by an agent.

## Related

This incident also exposed two CLI hazards worth noting (separate todos if they recur):
- `gsd-tools.cjs commit "<message with spaces>" --files <paths>` mis-parses the message as multiple pathspecs.
- `gsd-tools.cjs commit --help` performs a real commit instead of printing usage.

If either is reproducible after a `gsd-tools` update, file as bugs against the CLI.
