#!/usr/bin/env python3
"""Combine three-point estimates and forecast delivery from past throughput.

Standard library only. Two subcommands:

  pert      Read a CSV with columns item,best,likely,worst (any unit, for
            example ideal days). Prints the PERT mean and spread per item and
            the total with P50, P85 and P95 under a normal approximation.

  forecast  Monte Carlo forecast: how many weeks to finish N items, given the
            number of items the team finished in each recent week.

Examples:
  python3 estimate.py pert slices.csv
  python3 estimate.py forecast --remaining 24 --throughput 3,5,2,4,6,3,4,0,5,4
"""

import argparse
import csv
import math
import random
import statistics
import sys

# One-sided z-scores for the normal approximation.
Z = {"P50": 0.0, "P85": 1.036, "P95": 1.645}


def pert(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for line_no, row in enumerate(csv.DictReader(handle), start=2):
            try:
                best, likely, worst = (float(row[k]) for k in ("best", "likely", "worst"))
            except (KeyError, TypeError, ValueError):
                sys.exit(f"line {line_no}: need numeric best, likely, worst columns")
            if not best <= likely <= worst:
                sys.exit(f"line {line_no}: expected best <= likely <= worst")
            mean = (best + 4 * likely + worst) / 6
            sd = (worst - best) / 6
            rows.append((row.get("item", f"line {line_no}"), best, likely, worst, mean, sd))

    if not rows:
        sys.exit("no rows")

    print(f"{'item':<40} {'best':>7} {'likely':>7} {'worst':>7} {'mean':>7} {'sd':>6}")
    for item, best, likely, worst, mean, sd in rows:
        print(f"{item[:40]:<40} {best:7.1f} {likely:7.1f} {worst:7.1f} {mean:7.1f} {sd:6.2f}")

    total_mean = sum(r[4] for r in rows)
    # Items are treated as independent; correlated risks make the real spread wider.
    total_sd = math.sqrt(sum(r[5] ** 2 for r in rows))
    print()
    print(f"sum of best cases (not a plan): {sum(r[1] for r in rows):.1f}")
    print(f"total mean: {total_mean:.1f}  sd: {total_sd:.1f}")
    for label, z in Z.items():
        print(f"{label}: {total_mean + z * total_sd:.1f}")


def forecast(remaining, throughput, runs, seed):
    samples = [int(x) for x in throughput.split(",") if x.strip()]
    if remaining <= 0:
        sys.exit("--remaining must be positive")
    if len(samples) < 5:
        sys.exit("need at least 5 weeks of throughput history")
    if not any(samples):
        sys.exit("throughput history is all zero: no forecast possible")

    rng = random.Random(seed)
    weeks_needed = []
    for _ in range(runs):
        done, weeks = 0, 0
        while done < remaining:
            done += rng.choice(samples)
            weeks += 1
        weeks_needed.append(weeks)

    weeks_needed.sort()
    print(f"items remaining: {remaining}, history: {len(samples)} weeks, "
          f"mean throughput {statistics.mean(samples):.1f}/week, runs: {runs}")
    for label, q in (("P50", 0.50), ("P85", 0.85), ("P95", 0.95)):
        index = min(len(weeks_needed) - 1, math.ceil(q * len(weeks_needed)) - 1)
        print(f"{label}: {weeks_needed[index]} weeks or fewer")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("pert", help="combine three-point estimates from a CSV")
    p.add_argument("csv")

    f = sub.add_parser("forecast", help="Monte Carlo forecast from weekly throughput")
    f.add_argument("--remaining", type=int, required=True, help="items left to finish")
    f.add_argument("--throughput", required=True, help="comma-separated items finished per week")
    f.add_argument("--runs", type=int, default=10000)
    f.add_argument("--seed", type=int, default=None, help="fix for repeatable output")

    args = parser.parse_args()
    if args.command == "pert":
        pert(args.csv)
    else:
        forecast(args.remaining, args.throughput, args.runs, args.seed)


if __name__ == "__main__":
    main()
