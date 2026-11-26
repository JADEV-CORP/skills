# How each engine finds, trusts and picks sources

Evidence levels: **OFFICIAL** (the engine's own documentation), **COURT** (sworn testimony or a ruling), **LEAK** (leaked internal documentation, real but without context or dates), **STUDY** (published measurement; vendor studies are correlational), **PRACTITIONER** (credible reproduction or expert report), **UNVERIFIED**. Re-check OFFICIAL pages before quoting them: they change.

## Google Search (classic results)

| Claim | Level | Source |
|---|---|---|
| A page must be crawled, indexed and judged relevant and useful; Google lists 16 spam policies (cloaking, doorway abuse, expired domain abuse, hacked content, hidden text and link abuse, keyword stuffing, link spam, machine-generated traffic, malicious practices, misleading functionality, scaled content abuse, scraping, sneaky redirects, site reputation abuse, thin affiliation, user-generated spam) plus policy circumvention and scam rules | OFFICIAL | https://developers.google.com/search/docs/essentials/spam-policies |
| Violations lead to lower ranking or removal, through automated systems and manual actions; evading a penalty with new subdomains or sites is itself a violation | OFFICIAL | same page |
| Helpful, people-first content is assessed by the core ranking systems, not a separate filter | OFFICIAL | https://developers.google.com/search/docs/fundamentals/creating-helpful-content |
| E-E-A-T comes from the Search Quality Rater Guidelines; raters do not rank pages, their ratings evaluate the systems | OFFICIAL | https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf |
| User interaction data (clicks, which result satisfies the search) feeds a ranking system called NavBoost | COURT | US v. Google LLC, D.D.C. 1:20-cv-03010, testimony of Google's search VP in 2023 and the August 2024 ruling; case page https://www.justice.gov/atr/case/us-and-plaintiff-states-v-google-llc |
| Leaked API documentation (May 2024) names site-level attributes such as a site authority score, click-quality attributes and host age | LEAK | https://sparktoro.com/blog/an-anonymous-source-shared-thousands-of-leaked-google-search-api-documents-with-me-everyone-in-seo-should-see-them/ and https://ipullrank.com/google-algo-leak ; Google said the documents lack context |

What it means: a result that wins the click and satisfies the searcher helps itself; a whole site earns or lacks trust; a young site with no independent links starts behind. None of it is a reason to fake clicks: "machine-generated traffic" is a named spam policy.

## Google AI Overviews and AI Mode

| Claim | Level | Source |
|---|---|---|
| To appear, a page only needs to be indexed and eligible to show with a snippet; "no additional requirements" and no special markup or AI file | OFFICIAL | https://developers.google.com/search/docs/appearance/ai-features |
| Both may use "query fan-out": several related searches across subtopics, which surfaces a wider set of pages than one classic query | OFFICIAL | same page |
| Clicks and impressions from AI features are counted in the Performance report, search type Web, with no separate filter | OFFICIAL | same page |
| `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex` control what is shown; `Google-Extended` controls use for Gemini training and grounding outside Search | OFFICIAL | same page |
| Overlap between AI Overview sources and the classic top 10 varies widely by study and date | STUDY | vendor studies, figures disagree |

What it means: rank in classic search first; write passages that answer one subtopic each, because fan-out retrieves per subtopic.

## Bing and Microsoft Copilot

| Claim | Level | Source |
|---|---|---|
| Bing Webmaster Guidelines describe relevance, quality and credibility, user engagement, freshness, location and page load as ranking considerations | OFFICIAL | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a |
| IndexNow lets a site notify Bing (and other participating engines) of new or changed URLs immediately | OFFICIAL | https://www.indexnow.org |
| Bing Webmaster Tools has an AI Performance report (public preview since February 2026): citations in Copilot, Bing AI answers and some partners, plus grounding queries (the short queries the AI generates, not what the user typed), with no click data | OFFICIAL product, details PRACTITIONER | https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039 |
| Copilot cites LinkedIn heavily | STUDY | vendor data, 2026 |

## ChatGPT search

| Claim | Level | Source |
|---|---|---|
| `OAI-SearchBot` surfaces sites in ChatGPT search; sites that block it are not shown in ChatGPT search answers | OFFICIAL | https://developers.openai.com/api/docs/bots |
| `GPTBot` is for training and is independent of search; `ChatGPT-User` fetches pages for user actions and may not follow robots.txt; `OAI-AdsBot` only checks submitted ads | OFFICIAL | same page |
| ChatGPT search relies on a Bing-based index combined with its own retrieval | PRACTITIONER | widely reported; check the current OpenAI help pages before relying on it |
| Referring domains correlate most with being cited; recently updated pages are cited more | STUDY | vendor studies (SE Ranking 2025 and others), correlational |
| Share of citations going to Wikipedia, Reddit and large publishers is high and moves over time | STUDY | Profound citation datasets, 2024 to 2026 |

## Claude (web search)

| Claim | Level | Source |
|---|---|---|
| Three separate crawlers: `ClaudeBot` (training), `Claude-User` (fetches pages for a user's question), `Claude-SearchBot` (indexing for search results); each obeys its own robots.txt rule; blocking one does not block the others | OFFICIAL | https://support.claude.com/en/articles/8896518-what-is-claudebot |
| Claude's web search is backed by Brave Search | PRACTITIONER, strong | Brave listed as an Anthropic subprocessor and reproduced citation matches: https://simonwillison.net/2025/Mar/21/anthropic-used-brave/ . No explicit Anthropic statement found |

What it means: check that the brand and key pages appear on search.brave.com; Brave has no webmaster console, so measure with referrals from search.brave.com.

## Perplexity and Gemini

| Claim | Level | Source |
|---|---|---|
| Perplexity uses `PerplexityBot` for its index and `Perplexity-User` for user fetches | OFFICIAL | https://docs.perplexity.ai/guides/bots |
| Perplexity cites every answer with links and favours self-contained, sourced passages | PRACTITIONER | consistent reports |
| Gemini answers are grounded on Google Search; `Google-Extended` governs use outside Search | OFFICIAL | https://developers.google.com/search/docs/appearance/ai-features |

## Across engines

| Claim | Level | Source |
|---|---|---|
| Adding citations to sources, quotations and statistics raised visibility in generative engine answers in a controlled benchmark | STUDY, academic | Aggarwal et al., "GEO: Generative Engine Optimization", KDD 2024, https://arxiv.org/abs/2311.09735 |
| For "best X company" prompts, engines lean on third-party lists, directories and review platforms more than on vendors' own pages; self-ranked lists are discounted | PRACTITIONER | repeated live tests; run your own prompt portfolio before acting |

## Measuring each engine

| Engine | Tool |
|---|---|
| Google, incl. AI features | Search Console (Performance, Pages, Links, URL Inspection) |
| Bing, Copilot | Bing Webmaster Tools (Search Performance, AI Performance, URL Submission, IndexNow) |
| ChatGPT, Claude, Perplexity, Gemini, Google AI Mode | Prompt portfolio by hand (`templates/prompt-portfolio.csv`), plus referral traffic from chatgpt.com, claude.ai, perplexity.ai, gemini.google.com and search.brave.com in analytics |
