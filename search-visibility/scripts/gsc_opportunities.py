"""Rank Search Console queries into quick wins, striking distance, authority gaps and brand.

Input: the "Queries.csv" file from a Search Console Performance export (English or French
headers). Usage:
    python3 gsc_opportunities.py Queries.csv --brand "acme|acme corp" [--min-impressions 20]

--brand is required: a case-insensitive regex for your own brand queries. They are set
aside so they do not hide the real opportunities.

Buckets follow the skill: position 4 to 15 is a quick win (title and snippet work),
16 to 30 is striking distance (depth and internal links), over 30 is an authority gap
(independent links and mentions). The expected CTR per position is a rough heuristic used
only to flag snippets that underperform; it is not an engine fact.
"""
import argparse, csv, re, sys

HEADERS = {
    "query": ["top queries", "requêtes les plus fréquentes", "query", "requête"],
    "clicks": ["clicks", "clics"],
    "impressions": ["impressions"],
    "position": ["position"],
}
# Heuristic only: typical organic CTR by position, used to flag weak snippets.
EXPECTED_CTR = {1: 0.25, 2: 0.13, 3: 0.09, 4: 0.06, 5: 0.05, 6: 0.04, 7: 0.03, 8: 0.025, 9: 0.02, 10: 0.02}


def num(value):
    # French exports group thousands with a narrow no-break space or a no-break space.
    value = value.strip().replace("\u202f", "").replace("\u00a0", "").replace(" ", "").replace("%", "")
    return float(value.replace(",", ".")) if value else 0.0


def column(header, key):
    names = [h.strip().lower() for h in header]
    for candidate in HEADERS[key]:
        if candidate in names:
            return names.index(candidate)
    sys.exit(f"column for '{key}' not found in {header}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--brand", required=True, metavar="REGEX",
                    help='regex of your brand queries to set aside, for example "acme|acme corp"')
    ap.add_argument("--min-impressions", type=float, default=20)
    args = ap.parse_args()

    with open(args.csv, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header, data = rows[0], rows[1:]
    qi, ci, ii, pi = (column(header, k) for k in ("query", "clicks", "impressions", "position"))
    brand = re.compile(args.brand, re.I)

    buckets = {"quick win (pos 4-15): fix title, description, H1; request indexing": [],
               "striking distance (pos 16-30): add depth and proof, internal links": [],
               "authority gap (pos > 30): independent links and mentions, plan in quarters": [],
               "top 3 already: protect and refresh": [],
               "brand": []}
    for r in data:
        q, clicks, impr, pos = r[qi], num(r[ci]), num(r[ii]), num(r[pi])
        if impr < args.min_impressions:
            continue
        ctr = clicks / impr if impr else 0
        expected = EXPECTED_CTR.get(round(pos))
        flag = " weak snippet" if expected and ctr < expected / 2 else ""
        line = (impr, f"{q} | impr {impr:.0f} | clicks {clicks:.0f} | ctr {ctr:.1%} | pos {pos:.1f}{flag}")
        if brand.search(q):
            buckets["brand"].append(line)
        elif pos <= 3.5:
            buckets["top 3 already: protect and refresh"].append(line)
        elif pos <= 15:
            buckets["quick win (pos 4-15): fix title, description, H1; request indexing"].append(line)
        elif pos <= 30:
            buckets["striking distance (pos 16-30): add depth and proof, internal links"].append(line)
        else:
            buckets["authority gap (pos > 30): independent links and mentions, plan in quarters"].append(line)

    for name, items in buckets.items():
        print(f"\n## {name} ({len(items)})")
        for _, text in sorted(items, reverse=True)[:25]:
            print(" -", text)


if __name__ == "__main__":
    main()
