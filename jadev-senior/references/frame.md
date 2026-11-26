# Frame and brainstorm

Agree on what to build and why before choosing how.

## 1. Read before you ask

- Read the request, the linked ticket and the code it touches. Trace today's behaviour end to end: entry point, services, storage, outbound calls.
- Look for prior art in the repo: a helper that already does half the job, a similar endpoint, an ADR, a feature flag, a closed pull request on the same topic.
- Check the git history of the files involved (`git log --oneline -20 -- <path>`). Recent churn often explains the request.
- Never ask the user something the code, the docs or the history can answer. Facts are your job. Decisions are theirs.

## 2. Restate the problem

Write it in five lines and show it to the user:

```
Problem:  what is wrong or missing today, as observed
Who:      users, callers or teams affected
Why now:  the trigger (incident, customer request, deadline, dependency)
Success:  a measurable outcome (a test, a metric, a visible behaviour)
Out:      what this work will not do
```

If you cannot fill "Why now" or "Success" from what you have, that is your first question.

## 3. List real alternatives

- At least three. One of them is "change nothing" or the smallest possible version.
- Describe each one so its strongest supporter would accept the description.
- Drop options the code or the constraints rule out, with one line on why.
- When the choice is about how something will look or flow, sketch it (a few lines of text, a table, a small diagram) before scoring.

## 4. Score them

| ID | Option | Pros | Cons | Fit /100 |
|---|---|---|---|---|
| A | Extend the existing handler | reuses validation, one deploy | handler grows past 400 lines | 78 |
| B | New service | clean boundary, own scaling | new pipeline, new on-call surface | 52 |
| C | Change nothing, document the workaround | no cost now | support load stays | 30 |

The fit score covers the whole picture: correctness, risk, effort, reversibility, running cost, match with the existing architecture, and how easily a team of about 30 maintains it. Score from evidence you can point to. When two options are within 10 points, call it a close call and name the fact that would separate them.

## 5. Pick and state the trade-off

One sentence: "Pick A because <reason>. We accept <cost>. We revisit if <trigger>." The cost is the point of the sentence. A pick without a stated price has not been weighed.

## 6. Settle open questions

Ask only what changes what gets built. Give your recommended answer with each question, worded so "yes" accepts it.

With a review-page tool (`lavish-axi` or similar):

- One page per round, titled "Round 1", "Round 2" and so on.
- Every option and every question gets an ID (`A`, `B`, `Q1.3`), the fit score where it applies, a Go / Maybe / No choice and a notes field.
- A round holds only questions whose prerequisites are already answered. A question that depends on another open question waits for the next round.
- After each round, fold the answers in, drop settled items, and add the questions the answers opened.
- Read the notes as carefully as the choices. "Maybe" with a note is usually a new constraint.

Without such a tool: one question per message, recommendation first.

## 7. Leave Frame when

- The problem statement, the chosen option, the trade-off and the out-of-scope list are written down.
- For large work, the user said go.
- A decision that is hard to reverse has a short design note, in the pull request or in the repo's decision records, following the existing convention.

## Spikes

A throwaway spike is a fair way to answer a feasibility question. Time-box it, keep it off the main branch, and bring back the finding. The spike code does not become the implementation.
