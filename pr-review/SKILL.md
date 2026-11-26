---
name: pr-review
description: "Reviews an Azure DevOps pull request (bugs, gaps, story, breaking changes, licences, security) on a review page and posts only the comments the reviewer picks. Use when asked to review a PR or given a dev.azure.com pull request URL."
license: MIT
metadata:
  argument-hint: <pull request URL>
---

# PR review

One pass over one Azure DevOps pull request. Scripts do the mechanical work; you do the judgement; the reviewer decides on a page; a script posts only what they chose.

Scripts: `node <skill>/scripts/pr-review.mjs <fetch|check|render|post>`, where `<skill>` is this folder. They use Node built-ins only, nothing to install.

## Needs

- `lavish-axi` (JADEV build, github.com/JADEV-CORP/lavish-axi) on the PATH: `lavish-axi --version` ends in `-jadev.<n>`. It opens the page and carries the reviewer's decisions back. If it is missing, stop and point the reviewer to that repository.
- Azure CLI signed in (`az login`) with access to the organization. Node.js 20 or later.
- A review profile for the PR's organization: fill in `profiles/example.json` (organization name, Entra tenant ID) or add a private add-on. See `reference/addons.md`.

## Hard rules

- Never vote, approve, complete, merge, commit or push. Never run `lavish-axi share`.
- Nothing is posted unless the reviewer chose it on the page. `post` is the only command that writes to Azure DevOps.
- Comments are written as the reviewer would write them: plain words, no tool or AI trace, no en or em dash. `check` and `post` refuse them otherwise.
- Add-ons stay on the reviewer's machine. Nothing from them goes into this repository, a commit, a shared page or an outside service.
- Never paste code, secrets or client names into web searches or outside tools while reviewing.
- "No issue found" is never "approved". A missing or stale check is a gap, never a pass.

## The loop

1. `fetch <PR URL>` prints the work folder `<dir>` and writes `<dir>/review.json`: PR, latest iteration, files with old and new content, existing threads, work items, pipeline checks, signals (dependencies, assets, secrets), and earlier findings.
2. If `review.profile.instructions` is set, read that file now and follow it on top of this one.
3. Review with `reference/review-checklist.md`: the six questions, evidence for every finding, no noise. Search the reviewer's local clones and Azure DevOps code search for consumers of changed contracts.
4. Validations: read `review.checks` first. Run locally only what the pipeline did not cover for the latest commit, and only for the projects the change touches, in a separate worktree outside the repository that you remove afterwards. A test that also fails on the target branch is `known-failure`.
5. Write `<dir>/findings.json` (format in `reference/review-checklist.md`). Comments in `review.profile.language`.
6. `check <dir>` until it prints `ok`. Fix every error; read the warnings. It assigns the IDs (`R-01`, ...), stable across passes.
7. `render <dir>`, then `lavish-axi <dir>/review.html`. Tell the reviewer the page is open and what it shows in one or two lines.
8. Run `lavish-axi poll <dir>/review.html > <dir>/poll.txt` in the foreground with a time limit of at least 9 minutes, then read `<dir>/poll.txt`; run it again when it returns `waiting`. A prompt tagged `pr-review-decisions` carries the decisions as a `PRR1:` token. Never retype decisions or comments by hand.
9. `post <dir> --decisions <dir>/poll.txt`. Add `--repo <local clone>` when the reviewer chose "Apply fix" on their own PR. Use `--dry-run` first if the reviewer asks.
10. `lavish-axi reply <dir>/review.html --agent-reply "<receipt summary>"`, then give the reviewer the receipt: one line per ID (posted with link, applied, skipped, undecided, failed with reason). Every ID in `findings.json` must be accounted for.

If `post` reports "PR changed since review", run the loop again from step 1: IDs and posted threads carry over.

When the page cannot reach Lavish it copies the decisions to the clipboard as JSON. Save what the reviewer pastes to `<dir>/decisions.json` unchanged and pass that file to `post --decisions`.

## Second pass

After the author pushes, run the loop again. `review.since` lists what changed since the last reviewed iteration and `review.previous` lists earlier findings with their thread status. Review the changed parts, keep the IDs of findings that still apply (set `id` in `findings.json`), and do not repeat threads already posted.
