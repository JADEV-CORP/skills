# Review checklist

Six questions, asked of every pull request. Each answer goes into `findings.json`.

## Rules for every finding

- **Evidence.** What you observed, how it is reached (the trigger), what it causes. Before you raise it, search for an existing safeguard (a guard elsewhere, a test, a policy) that already handles it.
- **No noise.** No style preference presented as a defect. Style and naming go under `Quality`, are always optional, and only when they hurt readability for the team. Fewer proven findings beat a long list.
- **Location.** A finding sits on the file and right-side line range of the latest iteration. Use `file: null, line: null` only when no line fits (a story gap, a missing work item).
- **Comment.** Written as the reviewer would say it to a colleague: what is wrong, why it matters, a question or a request. No tool or AI trace, no en or em dash, never a secret value.
- **Fix.** Only when it is clear and small: a unified diff against the file (`--- a/<path>`, `+++ b/<path>`, `@@` hunks).

## 1. What is wrong

Introduced or worsened bugs: logic, null and boundary handling, error handling that hides failures (background jobs, retries, queues, timers), concurrency, resource leaks, regressions against existing behaviour. Category `Bug`.

## 2. What is missing

What the change needs and does not have: tests that would fail without the change, a migration for a schema change, configuration or infrastructure the code expects, documentation the change makes false, a case the story names. Category `Missing`, `Tests` or `Docs`.

## 3. The story

- Read `review.workItems`: title, description, acceptance criteria.
- One `story` row per acceptance criterion: `met`, `partly`, `not-met` or `cannot-tell`, with the code and test that prove it.
- No linked work item: a `Story` finding on the whole PR.
- Work no criterion asks for: mention it in a `Story` finding so the reviewer can judge scope.

## 4. External impact and backward compatibility

- List every changed contract: DTOs and request or response models, API routes and verbs, OpenAPI files, events and messages, database schema and migrations, configuration keys, public types of shared libraries and packages.
- Classify each: `additive` or `breaking`. Breaking: a field removed or renamed, a type or nullability change, a new required field, an enum value removed or renumbered, a route or verb change, a changed default, a changed serialisation name.
- For each changed contract, an `impact` row with its consumers (other repositories, found in local clones and through Azure DevOps code search), what breaks for them, and the order things must deploy in. A breaking change with consumers is also a `Breaking change` finding.

## 5. Licences

- `review.signals.deps`: every new or upgraded dependency with its licence (when the profile allows lookups) and known vulnerabilities. Flag strong copyleft (GPL, AGPL), SSPL, non-commercial or source-available licences, unknown licences, and a licence that changed with the upgrade.
- Copied code: new files or blocks carrying another project's licence header, or code with a known outside origin.
- `review.signals.assets`: every image, icon, font or media file the PR adds needs a known source and licence, and no leftover camera or author metadata. When `review.profile.assetRegisterCheck` is on, it also needs a row in `ASSETS.md` at the repository root (file, source, licence or proof, date); `registered: false` is a `Licence` finding.
- `review.signals.deps` shows `licence: null` when `outsideLookups` is off: check those licences in the package metadata of the lock file or the local package cache, and mark them `unknown` if you cannot.
- One `licences` row per item; problems become `Licence` findings.

## 6. Security by design

New or changed endpoints and handlers: authentication, authorisation, tenant and site boundaries, input validation, injection, unsafe deserialisation, SSRF, secrets in the diff (`review.signals.secrets`), personal data in logs, cryptography, CORS, infrastructure changes against least privilege, known vulnerabilities in new dependency versions, data that would leave the company or client boundary. One `security` row per area you checked (`ok`, `issue`, `not-applicable`); problems become `Security` findings.

## findings.json

```json
{
  "story": [{ "workItemId": 101, "criterion": "Card accepted", "result": "met", "evidence": "pay() posts the total; checkout.test.js" }],
  "impact": [{ "contract": "OrderDto", "path": "src/api/OrderDto.cs", "change": "breaking", "detail": "CustomerName renamed", "consumers": [{ "repo": "shop-mobile", "path": "lib/order.dart", "effect": "reads customerName, gets null" }], "deployOrder": "keep both names for one release" }],
  "licences": [{ "kind": "package", "name": "chart-lib 4.0.0", "licence": "MIT", "status": "ok", "note": "" }],
  "security": [{ "area": "Authorisation", "status": "issue", "note": "site never checked against the caller" }],
  "checks": [{ "name": "unit tests (web)", "source": "local", "result": "pass", "commit": "<sha>", "detail": "12 passed" }],
  "findings": [{
    "category": "Breaking change", "severity": "High",
    "file": "src/api/OrderDto.cs", "line": { "start": 3, "end": 3 },
    "title": "CustomerName rename breaks mobile and admin",
    "evidence": { "observed": "...", "trigger": "...", "consequence": "..." },
    "comment": "Renaming CustomerName breaks shop-mobile and shop-admin. Can we keep both for one release?",
    "fix": null
  }]
}
```

Enums: category `Bug`, `Missing`, `Story`, `Breaking change`, `Licence`, `Security`, `Tests`, `Docs`, `Quality`; severity `Blocker`, `High`, `Medium`, `Low`; story `met`, `partly`, `not-met`, `cannot-tell`; impact `additive`, `breaking`; licences `ok`, `flag`, `unknown`; security `ok`, `issue`, `not-applicable`; local checks `pass`, `fail`, `gap`, `known-failure`.
