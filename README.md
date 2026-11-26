# JADEV skills

Claude Code skills from our daily engineering and delivery work. Each one is a plain folder: a short `SKILL.md` that loads when a request matches, plus references and scripts that load only when needed, so a skill costs few tokens until it is used.

## Engineering

- **jadev-senior**: the full engineering loop, from scored options and small slices to test first, two review passes, proof before "done" and cleanup.
- **pr-review**: reviews an Azure DevOps pull request on a review page and posts only the comments the reviewer picks.
- **bug-solving**: finds the root cause first (reproduce, evidence, one hypothesis at a time) and proves the fix with a test that failed before.
- **integration-tests**: tests the app against real databases and brokers in Testcontainers, with HTTP fakes for third parties.
- **unit-test-coverage**: closes the coverage gaps that matter and proves each new test can fail.
- **postman-api-testing**: grows one Postman collection per API, with schema checks, no secrets, and Newman in CI.
- **infrastructure-as-code**: Bicep or Terraform on Azure with secure defaults, pinned modules and a preview before every change.

## Product

- **product-feature-writing**: feature specs and user stories with testable acceptance criteria and no invented facts.
- **product-feature-estimation**: ranges with stated confidence from the real code, plus PERT and Monte Carlo forecasting.
- **search-visibility**: ranks a site in Google and Bing and gets it cited in AI answers, with a Search Console triage script.

## Research and decisions

- **deep-thinking**: frames hard technical decisions and checks exactly which weight change would flip the answer.
- **decision-coach**: challenges plans and drafts with named book frameworks, scores, a pre-mortem and one recommendation.
- **jadev-grill**: grills a plan one hard question at a time, keeps the domain glossary and writes ADRs in the repo's own format.

## Design

- **jadev-ui**: designs, critiques and polishes web pages and app screens to WCAG 2.2 AA, then checks them in a browser at phone and desktop widths, light and dark.

## Media

- **openverse**: finds CC0, public domain and CC BY sounds and images, with the licence and credit saved next to each file.
- **jadev-sound**: picks licensed music and effects, keeps the credits file, and mixes to platform loudness with two-pass ffmpeg loudnorm and voice ducking.
- **jadev-hyperframes**: videos from HTML with the HyperFrames CLI pinned at 0.9.98, telemetry off, checked with snapshots before a local render.

## Writing skills

- **jadev-skill-forge**: how we write, test and install skills, with a checker for size, references, dashes, runtime installs and leaks.

## Install

Copy a skill folder into `~/.claude/skills/` for every project, or into `.claude/skills/` inside one project:

```
git clone <this repo> jadev-skills
cp -R jadev-skills/bug-solving ~/.claude/skills/
```

Start a new Claude Code session. A skill loads on its own when a request matches its description, or call it by name (`/bug-solving`).

Requirements: Python 3.10 or later for the Python scripts (standard library only). `pr-review` needs Node.js 20 or later, the Azure CLI, `lavish-axi` and a profile for your Azure DevOps organization (see `pr-review/profiles/example.json`).

`jadev-sound` needs FFmpeg 7.1 or later. `jadev-hyperframes` needs Node.js 22 or later, FFmpeg 7.1 or later and Google Chrome. The optional browser scripts in `jadev-ui` need Node.js 20 or later and an installed Google Chrome or Microsoft Edge.

## License

MIT, see [LICENSE](LICENSE).
