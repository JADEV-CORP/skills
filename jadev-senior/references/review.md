# Review

Review your own diff before anyone else sees it. Then handle other people's feedback with the same rigour.

## Read the diff twice

Run both passes on the final diff (`git diff <base>...HEAD`), even if you read earlier versions. Do it again before every commit, push, deploy or contract change.

**Pass 1, correctness.** Hunk by hunk, ask what input breaks it: null or empty, very large, duplicated, concurrent, retried, out of order, in another time zone. Check that error paths leave state consistent, that resources are released, and that nothing outside the plan changed.

**Pass 2, the next reader.** Read it as an engineer who joins next month and must change this code alone.

- Names say what things are and do.
- Each function does one thing. Nesting stays shallow.
- The code matches the style around it, even where you prefer another.
- A comment explains why wherever the code cannot: a workaround, a constraint from another system, a non-obvious invariant, a deliberate performance choice. No comment that repeats the code.
- No commented-out code, stray debug output, or TODO without a ticket reference.
- Public types and endpoints have the doc comments the repo expects.

## Checklist

- **Scope:** every change traces to the plan. Unrelated fixes go in a separate change.
- **Contracts:** API, events, schemas and config keys stay backward compatible or are versioned. Consumers are listed.
- **Data:** migrations are reversible and safe under load. Backfills are idempotent and resumable.
- **Security:** input validated at the boundary, authorisation checked on the server, parameterised queries, no secrets or personal data in code, logs, tests or fixtures. New dependencies come from trusted sources and have a compatible licence.
- **Errors:** no swallowed exceptions. Failures carry context. Retries are safe to repeat.
- **Tests:** new behaviour covered, tests follow the neighbours, each new test has been seen failing.
- **Docs:** README, API docs, changelog and decision records updated where behaviour or a decision changed.

## No new warnings

Count warnings before and after. Every new one is yours to fix. A suppression needs a justification on the same line and the narrowest scope possible. Respect the analyzer rules the repo uses (SonarQube, Roslyn analyzers, ESLint, Ruff). When none are configured, apply the default ruleset of the main analyzer for the language.

- **.NET:** `dotnet build -warnaserror` (or `-p:TreatWarningsAsErrors=true`), `dotnet format --verify-no-changes`.
- **TypeScript:** `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, through the repo's scripts when they exist.
- **Python:** `ruff check .`, `ruff format --check .` or `black --check .`, and `mypy` or `pyright` as configured.

## Asking for review

Follow the repo's pull request template. Say what changed and why, how it was tested (commands and result lines), the risk and the rollback. Add screenshots for UI changes. Keep the change small enough to review in one sitting. Around 400 changed lines is a common ceiling; split above that.

## Receiving review

- Read every comment before changing anything.
- Check each point against the code. Reviewers can be wrong, and so can you.
- Agree with evidence or push back with evidence. Thanks and apologies add nothing to a thread.
- When a comment is unclear, ask one precise question before acting on it.
- Fix in this order: correctness and security, contracts, readability, nits.
- Answer each thread with what changed (commit or line) or why it stays.
