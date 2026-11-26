# Plan

Turn the chosen option into small slices. Each slice ships and rolls back on its own.

## 1. Set up the workspace

- Work on a branch named after the change. Use a separate git worktree when the main checkout must stay usable (parallel work, a long review, a hotfix in between).
- Record the baseline before the first edit: build result, test counts, warning count. A failure that appears later is then provably yours.

## 2. Map the change

List every file you expect to create or modify, with one line on what it is responsible for. Keep files that change together close together. Follow the repo's layout even where you would choose another one. If a file you must touch is already too large, a split can be its own slice.

## 3. Check impact across layers

Fill in every row for every plan. Write "none" where nothing changes. A blank row means it was not checked.

| Layer | Questions |
|---|---|
| API and contracts | Does a request, response, event, message or file format change? Backward compatible? Who consumes it: other services, front ends, mobile apps, partners, reports? Versioning? |
| Services and domain | Which rules change? Which invariants must still hold? |
| Persistence | Schema change, data backfill, new index? Reversible? Safe under production load and data volume? |
| Configuration and secrets | New settings per environment, defaults, feature flags? Where do the secrets live? |
| Deployment | Deploy order across services. Can old and new versions run side by side during rollout? Rollback path? |
| Other services | Callers and callees, timeouts, retries, idempotency, shared libraries that need a version bump. |
| Security | Authentication, authorisation, input validation, data exposure, personal data in logs. |
| Observability | Logs, metrics, traces and alerts that show it works in production. |
| Environments and regions | Is every dependency available in every cloud, region and environment the product runs in (service, endpoint, identity authority, network path)? Mark what is verified and what is assumed. |

## 4. Slice the work

- A slice is the smallest change that carries its own test, passes the build and could ship alone.
- Order: lock current behaviour with tests, add the new path (additive schema, new code behind a flag), switch over, remove the old path.
- Breaking changes follow expand and contract: add the new field or endpoint, move every consumer, then remove the old one in a later slice.
- Fold setup, configuration and docs into the slice that needs them. Split only where a reviewer could accept one slice and reject its neighbour.

```markdown
## Plan: <feature>
Goal: <one sentence>
Chosen option: <ID, and the trade-off from Frame>
Out of scope: <list>
Baseline: <build, test counts, warnings>

### Slice 1: <name>
Files: <paths>
Test first: <test name and what it asserts>
Proof: <command and the expected result line>
Impact: <rows from the table, or none>
Rollback: <revert, flag off, down migration>
```

## 5. Review the plan before starting

- Every slice is testable on its own and has a proof command.
- No blank row in the impact table.
- Rollback is possible after every slice.
- Nothing contradicts the out-of-scope list.
- For large work, the user approves the plan. After that, run the steps the plan covers without asking again, and recap after each slice. Anything outside the plan goes back to the user.

## Stack notes

- **.NET:** read `Directory.Build.props`, `.editorconfig` and the analyzer packages before planning, so you know the warning rules. For EF Core, review the generated migration and the SQL from `dotnet ef migrations script --idempotent`.
- **TypeScript:** check `tsconfig` strictness and the workspace tool (npm or pnpm workspaces, Nx, Turborepo). A change in a shared package touches every consumer; list them.
- **Python:** check `pyproject.toml`, the lock file and the supported Python versions. Review generated Alembic or Django migrations line by line.
