---
name: product-feature-estimation
description: "Estimates features from the real codebase. Slices the work, gives ranges with stated confidence, lists assumptions and hidden work, and forecasts from the team's own history when it exists. Use for sizing, story points, roadmap or quote estimates."
license: MIT
---

# Feature estimation

An estimate is a range with a probability, built from evidence. It is not a target ("we need it by March") and not a commitment ("we promise March"). Keep the three apart and say which one you are giving.

## Workflow

1. **Pin down "done".** Acceptance criteria, platforms, environments, data migration, rollout, documentation, non-functional needs. Every open question becomes either an answer or an explicit assumption with its effect on the range.
2. **Read the code.** Find the modules, contracts and tables the feature touches, their call sites and their tests. Find a similar feature already shipped (`git log`, merged pull requests) and how long it really took. Note what makes this one harder or easier. Name files, do not guess.
3. **Slice vertically.** Break the feature into slices that each deliver something testable end to end, plus the enabling work (migration, infrastructure, feature flag). Walk the hidden work checklist in `references/hidden-work.md`.
4. **Estimate each slice with three numbers:** best, likely, worst, in the unit the team uses (ideal days, or story points against the team's own reference stories). If a slice is mostly unknown, do not invent a number: propose a time-boxed spike and estimate the rest.
5. **Combine.** `python3 <skill>/scripts/estimate.py pert slices.csv` gives the PERT mean and P50, P85, P95 for the total. With throughput history, `estimate.py forecast --remaining <items> --throughput <weekly counts>` runs a Monte Carlo forecast. Both use the standard library only.
6. **Convert to calendar time only with real capacity:** the team's own past throughput or velocity, people actually available, holidays, other commitments, dependencies on other teams. Without that data, give effort and say that duration is unknown.
7. **Report** with the template below.

## Rules

- Ranges, never a single number. State the confidence of each end ("P85: 85 % of similar outcomes finish by then").
- The team's history beats any generic table. Never convert story points to days with a fixed factor; points only mean something inside the team that set them.
- Points above the team's split threshold (often 13) or slices above a few days: split before estimating.
- Show contingency as a line of its own, sized by the named risks. Never hide padding inside items.
- Do not anchor on the date someone wants. Estimate first, then compare with the target and show what would have to change (scope, people, risk) to meet it.
- Count all the work: tests, review, CI fixes, migration, rollout, monitoring, documentation, support handover.
- Re-estimate when you learn something. An estimate made before a spike should narrow after it.

## Report template

```markdown
## Estimate: <feature>

**Answer:** <effort range, for example 9 to 14 ideal days (P50 10, P85 12)>, <duration if capacity is known>
**Confidence:** <what the range rests on: similar feature X took N days; team throughput last 12 weeks>

| Slice | Best | Likely | Worst | Notes (files, risks) |
|---|---|---|---|---|

**Assumptions:** each with its effect if wrong (+N days)
**Risks:** each with likelihood and range impact
**Not included:** explicit exclusions
**To narrow the range:** questions to answer or spikes to run, cheapest first
**Suggested first slice:** <smallest slice that proves the riskiest part>
```

## References (load when needed)

- `references/methods.md`: PERT and its limits, Monte Carlo from throughput, story points done right, t-shirt sizes, the cone of uncertainty, reference class forecasting, anti-patterns.
- `references/hidden-work.md`: the checklist of work that estimates forget.

Further reading: "Software Estimation: Demystifying the Black Art" by Steve McConnell; "When Will It Be Done?" by Daniel Vacanti; "Agile Estimating and Planning" by Mike Cohn.
