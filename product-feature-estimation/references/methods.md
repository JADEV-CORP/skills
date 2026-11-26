# Estimation methods

## Estimate, target, commitment

From McConnell: an estimate is a prediction with uncertainty, a target is a business wish, a commitment is a promise. Most estimation fights are a target being presented as an estimate, or an estimate being treated as a commitment. Name each one in the conversation.

## Three-point estimates and PERT

For each item: best (b), likely (m), worst (w).

- Mean: (b + 4m + w) / 6
- Standard deviation: (w - b) / 6
- Total mean: the sum of means. Total standard deviation: the square root of the sum of variances.
- P50 ≈ mean, P85 ≈ mean + 1.04 σ, P95 ≈ mean + 1.645 σ (normal approximation).

Limits you must state:

- The formula assumes items are independent. Real risks are correlated (one bad assumption about the data model hits five slices), so the true range is wider than the computed one. Treat the computed P85 as a lower bound for P85.
- Estimates of known items miss discovered work. If the team's history shows how much a feature grew after it started (for example 20 to 40 % more items), add it as its own line.
- The sum of best cases is not a plan. Never present it as one.

`scripts/estimate.py pert <csv>` does this arithmetic. CSV columns: `item,best,likely,worst`.

## Monte Carlo from throughput

When the team tracks finished items per week (any work item type, consistently counted), forecast from that instead of estimating each item:

1. Take the last 10 to 20 weeks of throughput. Drop weeks that are not representative only with a reason (for example the whole team on leave).
2. Count the remaining items, split to the size the team usually delivers. Add the expected discovered work.
3. Simulate: draw a random past week, add its count, repeat until the remaining items are done; record the number of weeks. Repeat 10,000 times.
4. Read P50, P85 and P95.

`scripts/estimate.py forecast --remaining 24 --throughput 3,5,2,4,6,3,4,0,5,4` does this. It needs no per-item estimate, and it carries the team's real interruptions, sick days and review delays, which no bottom-up estimate captures.

## Story points

- Relative size against reference stories the team agreed on, not hours. Fibonacci-like scales (1, 2, 3, 5, 8, 13) force coarse choices where precision would be fake.
- Points are only comparable within one team. A conversion like "points / 3 = days" is invented; do not use or produce one.
- Velocity is the points a team finished per sprint, a number of points, not a percentage of what was committed. Use the range of recent velocities (lowest to highest of the last 6 to 10 sprints), not one average, to forecast.
- When the team estimates together (planning poker), the value is in the discussion of disagreements: the person with the highest and the lowest card explain their reasoning.

## T-shirt sizes

For roadmaps, before slicing. Each size must map to a range the team agreed on from its own history (for example "M = 2 to 4 weeks for two people"). A size with no agreed range is a mood.

## The cone of uncertainty

Early estimates are wide by nature; the range narrows as requirements, design and code exist. An early estimate that claims to be narrow is wrong, not precise. Narrow the cone by doing the work that removes uncertainty (spikes, prototypes, the riskiest slice first), not by debating numbers.

## Reference class forecasting

Before estimating bottom-up, ask: how long did similar features take this team, measured from start to production? Use that distribution as the outside view, then adjust for the specific differences. If the bottom-up number is far below the reference class, explain why or trust the reference class.

## Anti-patterns

- Single-point estimates and hidden padding.
- Generic multiplier tables ("new technology × 1.5, legacy × 1.3"): they compound into numbers nobody can defend. Name the risk and size its impact instead.
- Estimating before slicing, or estimating slices that are not vertical (all backend first, all UI later).
- Counting code only: tests, review, CI, migration, rollout and documentation are part of the feature.
- Effort presented as duration, or duration calculated for 100 % availability.
- Re-using an old estimate after scope changed.
