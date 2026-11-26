# Verify before claiming done

A claim needs fresh output from this session. Run the command, read the whole result, check the exit code, then state the claim with the line that proves it.

## Claims and their proof

| Claim | Proof | Not enough |
|---|---|---|
| It builds | build command, exit code 0, warning count | no red squiggles in the editor |
| Tests pass | the full relevant suite, summary line with 0 failed | one test, or an earlier run |
| Bug fixed | the original reproduction passes, the regression test failed before the fix | "the code changed" |
| No new warnings | analyzer output compared with the baseline count | a clean lint on one file |
| Works end to end | request and response, log line or screenshot from the running app | unit tests alone |
| Migration is safe | applied and rolled back on a disposable database | "the script looks right" |
| Agent finished its slice | the diff and a test run you did yourself | the agent's report |
| Requirement met | each acceptance criterion mapped to a test or an observation | "everything is green" |

## How to show it

Show the command and the summary lines, not pages of log:

```
$ dotnet test --nologo
Passed!  - Failed: 0, Passed: 214, Skipped: 0, Total: 214
```

When a check cannot run (no access, environment down, missing tool), write "not verified" and the reason. Never turn "should work" into "works".

## Words that need evidence first

"Done", "fixed", "passes", "works", "safe". Words like "should", "probably" and "looks fine" mean the check has not been run yet. Run it.

## Live environments

Smoke tests against shared or production environments stay read-only. Prove write paths with unit and integration tests on disposable data.

## Stack notes

- **.NET:** `dotnet build -warnaserror`, then `dotnet test`. Read the "Failed:" count, not only the exit code, when a filter is involved.
- **TypeScript:** `npm run build`, `npm test`, then the repo's lint and type-check scripts (`npm run lint`, `tsc --noEmit`).
- **Python:** `pytest -q`, `ruff check .`, and `mypy` or `pyright` when the repo uses them.
