#!/usr/bin/env python3
"""Weighted decision matrix with an exact sensitivity check.

Standard library only. Input CSV, one row per criterion:

  criterion,weight,Option A,Option B,Option C
  Performance,5,4,5,3
  Cost,3,4,2,5

Scores use one direction for every criterion: higher is better (score cost as
"cheapness", risk as "safety"). The script prints the weighted totals and, for
each criterion, the weight at which the leading option would lose first place
while all other weights stay the same. A recommendation that flips with a small
weight change is a close call and must be presented as one.

Usage: python3 matrix.py decision.csv
"""

import csv
import sys


def load(path):
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        if not header or len(header) < 4 or header[0].strip().lower() != "criterion" or header[1].strip().lower() != "weight":
            sys.exit("header must be: criterion,weight,<option>,<option>[,...]")
        options = [h.strip() for h in header[2:]]
        criteria = []
        for line_no, row in enumerate(reader, start=2):
            if not row or not row[0].strip():
                continue
            try:
                weight = float(row[1])
                scores = [float(x) for x in row[2:2 + len(options)]]
            except ValueError:
                sys.exit(f"line {line_no}: weight and scores must be numbers")
            if len(scores) != len(options):
                sys.exit(f"line {line_no}: expected {len(options)} scores")
            if weight < 0:
                sys.exit(f"line {line_no}: weights cannot be negative")
            criteria.append((row[0].strip(), weight, scores))
    if not criteria:
        sys.exit("no criteria rows")
    return options, criteria


def totals(options, criteria):
    return [sum(w * s[i] for _, w, s in criteria) for i in range(len(options))]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    options, criteria = load(sys.argv[1])
    result = totals(options, criteria)
    ranking = sorted(range(len(options)), key=lambda i: result[i], reverse=True)
    leader = ranking[0]

    print("Totals")
    for i in ranking:
        print(f"  {options[i]:<24} {result[i]:8.1f}")
    if len(ranking) > 1 and result[ranking[0]] == result[ranking[1]]:
        print("\nTie for first place: no recommendation from the matrix alone.")
        return

    print(f"\nLeader: {options[leader]} (margin {result[leader] - result[ranking[1]]:.1f} over {options[ranking[1]]})")
    print("\nSensitivity: weight at which another option draws level with the leader (other weights fixed)")
    for name, weight, scores in criteria:
        nearest = {"up": None, "down": None}
        for j in range(len(options)):
            if j == leader:
                continue
            slope = scores[leader] - scores[j]
            if slope == 0:
                continue
            # Solve result[leader] + d * scores[leader] = result[j] + d * scores[j] for d.
            delta = (result[j] - result[leader]) / slope
            new_weight = weight + delta
            if new_weight < 0:
                continue
            side = "up" if delta > 0 else "down"
            if nearest[side] is None or abs(delta) < abs(nearest[side][0]):
                nearest[side] = (delta, new_weight, options[j])
        parts = []
        for side, label in (("down", "lowered"), ("up", "raised")):
            if nearest[side]:
                _, new_weight, rival = nearest[side]
                parts.append(f"{label} to {new_weight:.2f}: {rival}")
        detail = "; ".join(parts) if parts else "no weight from 0 upward changes the leader"
        print(f"  {name:<24} (weight {weight:g}) {detail}")

if __name__ == "__main__":
    main()
