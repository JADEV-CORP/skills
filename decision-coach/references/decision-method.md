# Decision method

The default way to think whenever the input is a choice: architecture, pipeline, roadmap, tooling, hiring, pricing, offer, which client, which approach. It turns "what do you think?" into a scored, evidence-based recommendation the user can accept or overrule in minutes.

The method has seven steps. Skip none. Scale the depth to the stakes: a small choice gets each step in a line, a platform choice gets each step as a section.

---

## 1. Ground: measure the present before imagining the future

- Read the real thing first: code, pipeline files, run timelines, invoices, CRM, logs. Never reason from the description of a system when the system itself is readable.
- Put numbers on the current state: durations, counts, costs, failure rates, with their source (run id, file, report).
- Tag every claim with its status:
  - **measured**: you saw it, with a source;
  - **estimate**: derived, with the basis stated;
  - **unverified**: an assumption that would change the answer if false.
- Find the root cause of the pain before proposing cures. A slow pipeline is "the same image rebuilt for every environment, then copied across regions", not "the pipeline is slow".

*Framework:* outside view and WYSIATI, "what you see is all there is" (Daniel Kahneman, *Thinking, Fast and Slow*). Decisions go wrong on the evidence you did not look at, not on the evidence you weighed badly.

## 2. Frame: say what winning means before looking at options

Write four short lists:

- **Goals**: the outcomes, stated as observable results ("the image tested is the image shipped").
- **Non-goals**: what this decision deliberately does not solve.
- **Anti-goals**: results that would make it a failure even if it technically works ("a clever pipeline nobody else can fix").
- **Constraints**: hard facts no option can change (a regulated region, no Docker on the build agent, budget, team size, contract).

Then fix the **criteria and their weights, summing to 100**, before scoring anything. Three to six criteria. Weights come from the goals and the user's stated priorities, never from the option you already like.

*Framework:* architecture characteristics, pick your top three (Richards & Ford, *Fundamentals of Software Architecture*). If every criterion weighs the same, nothing was prioritised.

## 3. Diverge: generate wide, on purpose

Produce at least five candidates before judging any. Use these generators so the list is not five variations of the first idea:

| Generator | Question to ask |
|---|---|
| Status quo | What happens if we change nothing? (always in the list, always scored) |
| Increment | What is the smallest change to what exists? |
| Remove the step | Can the slow or risky step disappear instead of getting faster? |
| Move the work | Where, when or by whom could this run instead? Closer to the data, earlier, once instead of every time |
| Change the unit | Per run, per version, per change, per digest, per customer: which unit makes the problem smaller? |
| Invert | What would guarantee failure? Now avoid exactly that. |
| Borrow | How does another domain solve the same shape? (CDNs, package managers, accounting, logistics) |
| 10x | If it had to be ten times faster or cheaper, what would we have to stop doing? |
| Buy or delegate | Does a platform feature, vendor or partner already do this? |

Then prune: drop options that break a constraint or an anti-goal, each with a one-line reason. Keep two to six for scoring. Name the ones rejected at once, so the user sees they were considered.

Separate **alternatives** (mutually exclusive ways to do it) from **levers** (add-ons that work with any alternative). Score levers on their own list. Mixing them makes every option look like a bundle and hides the real choice.

*Framework:* the deployment pipeline and "only build your binaries once" (Humble & Farley, *Continuous Delivery*). A good example of "remove the step": promote the tested artifact instead of rebuilding it faster.

## 4. Score: show the math

For each alternative:

- a score from 0 to 100 per criterion;
- the weighted total out of 100, computed, not felt (check the arithmetic);
- two to four **for** and two to four **against**, concrete to this case;
- one line **"the score changes if..."**: the assumption that would move it most.

Calibration rules:

- Use the full range. If every option lands between 70 and 80, the criteria are too vague or the options are not really different.
- The status quo scores honestly, including its low change cost. Beating "do nothing" by three points is not a case for change.
- An option resting on an unverified assumption is scored as if the assumption fails, or marked "unverified" next to its score.
- Never let the recommended option win on a criterion added after scoring.

## 5. Pre-mortem the favourite

Assume the recommended option was chosen and failed six months later. Write the three or four most likely reasons, each with its guard (a check, a fallback, a rule). If a failure has no guard, the score was too high: lower it and say so.

*Framework:* the pre-mortem by Gary Klein (Daniel Kahneman, *Thinking, Fast and Slow*).

## 6. Decide and sequence

- Recommend one alternative. State the trade-off in one sentence: what we give up to get what.
- Order the work so the smallest reversible step comes first and every step ships something usable.
- Name what must be verified before the expensive steps, and how.
- List the decisions that belong to the user, each with your recommended answer. Everything else is your call; say it plainly as a call they can overrule.

*Framework:* BATNA (Fisher & Ury, *Getting to Yes*): the status quo is the BATNA every option has to beat. Decide reversible steps fast and irreversible ones slowly.

## 7. Present it so the decision takes minutes

When there are several decisions, put them on one review page, not in a long chat message and not inside a finished document where an open question can slip through to the reader. If a review page tool is available, use it; otherwise send one structured message in this order:

1. Outcome as a full sentence, two or three lines of context.
2. Key numbers (measured, with sources).
3. Today, drawn as a diagram, with the three or four real problems.
4. Goals, anti-goals, constraints, criteria with weights.
5. Scorecard table (alternatives x criteria, weighted total), recommended row highlighted.
6. One card per alternative: what it looks like, for, against, "score changes if".
7. Levers table with their own scores.
8. Target state diagram, expected effect (measured vs estimate), pre-mortem table, order of work.
9. Decisions: one card per question, with choice controls if the tool has them, the recommended answer pre-selected and labelled.
10. Footer: sources, what was measured, what was estimated.

---

## Anti-patterns to catch in your own draft

- Options generated after the favourite was chosen, as strawmen.
- No status quo row.
- Criteria or weights picked after the scores.
- Totals that do not match the weights.
- Scores in a narrow band (everything 70 to 80).
- "Estimate" numbers presented as measured.
- A menu with no recommendation, or a recommendation with no trade-off.
- Levers mixed into alternatives.
- Questions for the user that the code, data or earlier conversation already answer.

## Output skeleton (chat version, small decisions)

```
## Decision: [the question]

Today (measured): [numbers, sources]
Winning means: [goals] · Not: [anti-goals] · Fixed: [constraints]
Criteria: [A 30, B 25, C 25, D 20]

| Option | A | B | C | D | Fit /100 |
|---|---|---|---|---|---|
| ... recommended ... | | | | | **xx** |
| Status quo | | | | | xx |

Recommended: [option]. Trade-off: [one sentence].
Pre-mortem: [risk → guard] x3
Order: [step 1 reversible] → [step 2] → [step 3]
Your call: [decision, recommended answer]
```
