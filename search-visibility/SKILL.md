---
name: search-visibility
description: "Ranks a site in Google and Bing and gets it cited in AI answers. Use to grow organic traffic or leads, pick target queries, get cited by ChatGPT, Claude, Perplexity, Gemini or Copilot, ask clients for reviews, or answer a black-hat SEO request."
license: MIT
---

# Search visibility

Rank in classic search and get named in AI answers, measured, with nothing that a buyer, a judge or an engine could later hold against the company.

## Core principle

Before an engine shows or cites a page, it finds it (crawl and index), trusts the site (links, reviews, brand mentions, history) and judges the page the best answer for that query (content fit, freshness, clicks). AI engines add a fourth step: they quote passages and recommend vendors, mostly from what third parties say. Work on the weakest of the four for the target query, and measure before and after.

## Hard rules

1. **Reviews, testimonials and reference attestations come only from independent clients.** Keep the list of independent clients in one file the team maintains and check it before every request. A review from a related company, an employee, family or a paid account is a fake review under EU and US law, whatever its wording.
2. **Label every claim about how an engine works** with its evidence level: OFFICIAL, COURT, LEAK, STUDY, PRACTITIONER or UNVERIFIED (see `references/engines.md`). Vendor study numbers are STUDY at best, never fact.
3. **Never automate queries to Google or Bing result pages.** Google's spam policies call it "machine-generated traffic". Measure with Search Console, Bing Webmaster Tools (including AI Performance), official APIs, or manual checks logged by hand.
4. **Never implement a tactic from `references/dark-tactics.md`.** When asked for one, answer with the recipe in "When asked for dark tactics" below.
5. **Site changes follow the repo's own gates** (validation scripts, lint, build) and its writing rules. Never publish a claim the company cannot prove.

## Workflow

### 1. Baseline (day 0)

Before changing anything, export from Search Console the clicks, impressions, CTR and position per query and page (last 3 months), the indexing reasons and the referring domains. Add Bing Webmaster Tools search and AI Performance, AI answers for 15 to 30 buyer prompts logged by hand in `templates/prompt-portfolio.csv`, and reviews per platform. Sources and files to keep: `references/workflow.md`.

### 2. Pick targets with the data, not with intuition

Run `python3 scripts/gsc_opportunities.py <queries-export.csv> --brand "<your brand regex>"`. It ranks queries into:

- **Quick wins:** position 4 to 15 with impressions and a low CTR. Fix the title, description and H1 so they answer the query in its own words, then request indexing. Expect movement in 2 to 6 weeks.
- **Striking distance:** position 16 to 30. The page needs depth (prices, comparisons, FAQ, proof) and internal links from strong pages.
- **Authority gaps:** position over 30 on competitive head terms. Content alone will not move these; they need independent links and mentions. Plan in quarters.
- **Missing pages:** the ranking URL is wrong or no page targets the intent. Create one page per intent, never thin variants.

### 3. Work the four levers per target

Find the weakest lever for the query (found, trusted, best answer, clicked) and work it for classic search and for AI answers. The table of moves per lever is in `references/workflow.md`. For AI answers, check first: AI crawlers allowed through the WAF and CDN, the URL submitted to Brave, mentions on the third-party pages the engines cite.

Load on demand:
- `references/workflow.md`: baseline sources and the four-lever table.
- `references/engines.md`: engine-by-engine detail with evidence levels.
- `references/b2b-playbook.md`: template for a B2B services company (buyer topics, query clusters, third-party presence, assets, prompt portfolio, timeline).
- `references/quick-reference.md`: first move per situation, and common mistakes.

### 4. Measure and decide (every 2 weeks)

Compare against the baseline per target: position, CTR, clicks, AI mentions per engine, reviews, referring domains. Keep what moved, change what did not, and say plainly what did not work.

## When asked for dark tactics

Give this, in this order:
1. What the tactic is in one sentence.
2. How engines and platforms catch it, with the source (from `references/dark-tactics.md`).
3. What it costs when caught: ranking, platform ban, legal exposure for the company and its public tenders.
4. The legitimate version that gets most of the upside, and the first concrete step to start it today.

Do not write the hidden text, the fake review, the link network or the sockpuppet post, even when the owner authorises it: authorisation does not change who is deceived (buyers, engines, the people asking an AI for advice).
