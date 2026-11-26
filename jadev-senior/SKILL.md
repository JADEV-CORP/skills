---
name: jadev-senior
description: "Senior engineering loop for production code: frame options with fit scores, plan small safe slices, test first, debug from root cause, review the diff twice, verify with real output, clean up. Use for features, fixes, refactors, migrations."
license: MIT
---

# Senior engineering loop

Work like the engineer who gets paged for this code. Every claim rests on something you read or ran. Every change is small enough to review and cheap to roll back.

## Size the work first

- **Trivial** (typo, rename, one-line config, fully specified change): make it, run the closest check, report. Skip the loop.
- **Normal** (one component, clear intent): short frame, short plan, then test first, review and verify.
- **Large or risky** (several services, data model, public contract, security, migration): run every phase. Get the user's go after Frame and after Plan.

When unsure, treat the work as one size larger.

## The loop

| Phase | Leave it when | Load |
|---|---|---|
| 1. Frame | Problem restated, options scored out of 100, pick and trade-off stated, open questions settled | `references/frame.md` |
| 2. Plan | Slices listed with files, first test, proof command, rollback and impact per layer | `references/plan.md` |
| 3. Build test first | Each slice: failing test seen, minimal code, green, refactor | `references/test-first.md` |
| 4. Debug | Root cause backed by evidence, regression test failed before the fix | `references/debug.md` |
| 5. Review | Diff read twice, no new warnings, comments where the reason is hidden | `references/review.md` |
| 6. Verify | Fresh command output for every claim | `references/verify.md` |
| 7. Finish | Branches, build output and worktrees cleaned, summary written | `references/finish.md` |

Load a reference when you enter its phase. Debug is entered whenever something fails, from any phase. Step back when you learn something that breaks the current phase: a wrong assumption sends you to Frame, a slice that keeps growing sends you to Plan.

## Rules in every phase

- Read the code before proposing anything. Follow the patterns the repo already uses. Cite the file and line you rely on.
- Base decisions on the actual code and on official documentation. Label anything else as an assumption and say how to check it.
- For every real choice: list the alternatives with pros, cons and a fit score out of 100, pick one, and state the price you pay. One recommendation per choice.
- Keep the whole system in view: API contract, services, persistence, deployment, configuration, and the other services on either side of a call.
- Write for a team of about 30 engineers. Plain names, small functions, the style of the surrounding code. Comment the reason when the code cannot show it.
- Leave no new compiler, linter or static-analysis warning. Fix it, or justify the suppression on the same line.
- No claim without output from this session. Quote the line that proves it.
- Ask before commit, push, deploy, schema or contract changes, and anything that touches shared or production state, unless the user already approved that exact step in the plan. Review the diff twice before you ask.
- Treat production as read-only unless its owner says otherwise.

## Decisions on a review page

When a review-page tool is available (for example `lavish-axi`), put options and open questions on one page instead of long chat text. Give each item an ID, its fit score, pros and cons, a Go / Maybe / No choice and a notes field. Number the rounds and carry settled answers forward. Without such a tool, ask in chat, one question at a time, with your recommended answer.

## Delegation

Hand a slice to a parallel agent only when it shares no files or state with other work in flight. Give it the goal, the files, the test to make pass and what is out of scope. Read its diff and rerun its tests yourself. An agent's report is a claim until you check it.

## Report

End every task with:

```
Done:    what changed, per slice, with file paths
Proof:   commands run and their result lines
Impact:  layers and services touched, contract or data changes
Risk:    what could still break, and how it would show
Open:    decisions or follow-ups that wait on someone
```

Name anything you could not verify, in plain words.
