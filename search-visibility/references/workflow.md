# Workflow detail: baseline and the four levers

Steps 1 and 3 of the workflow in `SKILL.md`, in full.

## 1. Baseline (day 0)

Export everything below before changing the site. Every later decision compares against it.

| Measure | Where | Keep |
|---|---|---|
| Clicks, impressions, CTR, position per query and per page, last 3 months | Search Console, Performance, export | `baseline-<date>.csv` |
| Indexed vs not indexed, and the reasons | Search Console, Pages | count per reason |
| Referring domains, and how many are independent | Search Console, Links | list of sites |
| Bing clicks, plus Copilot citations and grounding queries | Bing Webmaster Tools, Search Performance and AI Performance | export |
| AI answers for 15 to 30 buyer prompts | ChatGPT, Claude, Perplexity, Gemini, Copilot, Google AI Mode, by hand | `templates/prompt-portfolio.csv` |
| Reviews per platform | The review sites and directories buyers in the sector use, Google Business Profile | count, rating |

## 3. Work the four levers per target

For each target query, find the weakest lever and work it in both columns.

| Lever | Classic search | AI answers |
|---|---|---|
| Found | Sitemap, internal links, request indexing, IndexNow for Bing | Allow `OAI-SearchBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, Bingbot; check WAF and CDN too. Submit the URL to Brave (Claude's likely index) |
| Trusted | Independent referring domains, brand searches, real reviews | Mentions on the third-party pages the engines cite for the prompt (directories, comparisons, Reddit, LinkedIn, YouTube, Wikipedia) |
| Best answer | Title matches the query, the page answers it fully, real prices and proof | Self-contained passages that state the fact plainly, with numbers and dates; one page per question |
| Clicked | Title and description that win the click; brand recognition | Being named in the answer, not only cited in the sources |
