# Thinking tools

Use one or two per decision. Each tool is a question you answer, not a template you fill.

## First principles

1. List what the current approach assumes ("we need a message broker", "reports must be real time").
2. For each, ask: is this a law of physics, a contract, a regulation, or a habit? Who said so, and when?
3. Keep only the real constraints and design the simplest thing that satisfies them.
4. Compare with the current approach. The difference is either waste to remove or a constraint you missed.

## Weighted matrix with sensitivity

1. Criteria and weights first, agreed before anyone scores. Five to seven criteria. A criterion every option meets equally is not a criterion.
2. Score each option on each criterion with one sentence of evidence. Same direction everywhere: higher is better (score cost as cheapness, risk as safety).
3. Run `scripts/matrix.py`. It prints the totals and, per criterion, the weight at which another option draws level.

Worked example (weights 1 to 5, scores 1 to 5):

| Criterion | Weight | A | B | C |
|---|---|---|---|---|
| Performance | 5 | 4 | 5 | 3 |
| Maintainability | 4 | 5 | 3 | 4 |
| Cost (cheapness) | 3 | 4 | 2 | 5 |
| Time to deliver (speed) | 4 | 3 | 2 | 5 |
| Scalability | 3 | 4 | 5 | 3 |
| Team expertise | 4 | 5 | 2 | 4 |
| **Total** | | **96** | **74** | **91** |

Sensitivity from the script: C draws level with A if the cost weight rises from 3 to 8, or the time-to-deliver weight from 4 to 6.5. B only catches up if the performance weight reaches 27. So "if performance mattered more, B would win" is false for any reasonable weight, while A versus C is a close call that hinges on how much delivery time matters. That is the question to put to the decision maker.

## Expected value and the worst case

For options with uncertain outcomes: list the outcomes, a probability for each (state where it comes from), and the payoff. Expected value = sum of probability × payoff. Then look at the worst case separately: an option with the best expected value can still be unacceptable if its worst case is fatal (data loss, a breached contract). Choose the best expected value among options whose worst case you can survive.

## Pre-mortem

"It is twelve months from now. This failed badly. Why?" Write the reasons as if they happened, for technology, people, process and outside factors. Rank by likelihood times impact. For the top three, decide now: a mitigation, an early warning signal with a threshold, or acceptance.

## Inversion

Ask how to guarantee failure ("ship the migration on a Friday without a rollback, with no metrics"). Then check the plan against each item. Easier than imagining success, and it finds the obvious gaps.

## Second-order effects

For the leading option, ask "and then what?" twice. Who changes their behaviour because of this decision (users, other teams, attackers, the finance department), and what does that do to cost, load, support and security over time?

## Reversibility

Classify the decision: two-way door (reversible at low cost) or one-way door (expensive or impossible to undo). Two-way doors should be decided quickly by the people closest to the work. One-way doors deserve the full method and a wider review. Then look for ways to make a one-way door reversible: pilots, adapters, dual writes during a migration, exit clauses.

## OODA loop

For situations that change while you decide (an incident, a competitor's move). Observe what changed, orient (what it means given what you know), decide on the smallest useful action, act, and loop again quickly. The value is in the speed of the loop, not in a long write-up.

## Six Thinking Hats

A facilitation sequence for a group that argues past each other: everyone looks at facts together (white), then benefits (yellow), then risks (black), then feelings and intuition (red), then new ideas (green), and the facilitator closes with process and decision (blue). Useful in a meeting; as a solo writing template it mostly produces filler.

## Bias checklist

Before finalising, ask:

- Did I look for evidence against my favourite option, or only for it? (confirmation)
- Is the first number I heard still steering the answer? (anchoring)
- Am I keeping something because of what it already cost? (sunk cost)
- Am I overweighting the last incident or the loudest example? (availability)
- Did anyone disagree, or did the group converge too fast? (groupthink)
- How wide would my range be if I had to bet money on it? (overconfidence)
- Am I preferring the status quo only because it is familiar? (status quo bias)
- Did I plan for interruptions, review and rework? (planning fallacy)
