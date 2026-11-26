---
name: postman-api-testing
description: "Builds and maintains Postman API test collections: extends existing ones before creating, chains requests, checks JSON Schema contracts, keeps secrets out, runs Newman in CI. Use when endpoints change or Postman tests are requested."
license: MIT
---

# Postman API testing

Grow one collection per API over time. Every request carries tests that can fail. Secrets never land in a collection, an export or a workspace.

## Where the collection lives

1. **Files in the repository (preferred).** Look for `*.postman_collection.json` and `*.postman_environment.json` (often under `postman/`). Edit them in place: they are reviewed in pull requests and run in CI.
2. **A Postman workspace.** If Postman's official MCP server is connected, use its tools to list, read and update collections. Otherwise ask the user to export the collection (format v2.1) or to share the workspace access they want you to use.

## Always check before creating

1. List collections. Match by API name, base path and owning service.
2. In the match, look for the request by method and path, not by display name.
3. Request exists: update its body and tests. Folder exists: add the request there. Nothing matches: create `<service>-api` (for example `orders-api`) with the layout below, and tell the user you created it and why no existing one fitted.

Never create a second collection for an API that already has one.

## Layout

```
orders-api
├── _setup            auth token, seed data the run needs
├── orders            POST /orders, GET /orders/{id}, GET /orders, PATCH, DELETE
├── order-items
└── _cleanup          deletes what the run created
```

Folders by resource. Request names: `POST /orders`, `GET /orders/{id} (not found)`. The runner executes in order, so the order inside a folder is the scenario.

## Variables and secrets

- `baseUrl`, client ID and test user name in the environment. IDs created during the run in collection variables (`pm.collectionVariables.set('orderId', id)`).
- Secrets (client secrets, passwords, API keys, tokens) never go in an initial value: initial values are synced to Postman's cloud, shared with everyone in the workspace and written into exports. Use the current value or Postman Vault in the app, and `--env-var name=value` from a CI secret in Newman.
- Keep workspaces private or team-only. Public workspaces have leaked live production keys. Before committing an export, search it for `token`, `secret`, `password`, `Bearer` and `key`.
- Never run a collection that writes or deletes against production. Check `baseUrl` first.

## Tests on every request

- Status code, exact (`201`, not "2xx").
- Contract: `pm.response.to.have.jsonSchema(schema)` (Postman validates with Ajv). The old `tv4` global is not the way to do it.
- The fields the endpoint exists to return, with values, plus headers that matter (`Location` on 201, `Content-Type`).
- Store what later requests need.

Every test must be able to fail. No `console.log` placeholders posing as tests. No response-time assertions in a functional suite: they flake on shared CI agents. Measure performance with a load-test tool.

## Coverage per endpoint

Happy path; validation (400 with problem details, RFC 9457); 401 without a token; 403 with the wrong role; 404 for an unknown ID; 409 for a duplicate or stale version where the API supports it; list endpoints with paging and one filter. A full resource flow: create, read, list contains it, update, read the update, delete, read gives 404.

Unique data per run (`{{$guid}}`, `{{$timestamp}}`) so runs do not collide, and a `_cleanup` folder that removes it.

## Workflow

1. Read the endpoint code or the OpenAPI document to know the real contract: status codes, required fields, error shape.
2. Discover as above. Update or add requests and tests.
3. Run the folder you touched (Postman runner or Newman `--folder`). Then make one test fail on purpose to prove it checks something.
4. Run the whole collection once against a non-production environment.
5. Report: requests added or changed, scenarios covered, how to run it, anything not covered.

## References (load when needed)

- `references/scripts.md`: test snippets, schema checks, problem details, token pre-request script, chaining.
- `references/ci.md`: Newman pinned as a dev dependency, GitHub Actions and Azure Pipelines jobs, JUnit results.

Docs: learning.postman.com (scripting reference, Newman, Vault), github.com/postmanlabs/newman.
