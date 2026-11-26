---
name: integration-tests
description: Writes integration tests that run the app against real databases, brokers and HTTP fakes in throwaway containers (.NET first, Node, Java, Python, Go noted). Use when adding or fixing API, repository or messaging tests, or setting up Testcontainers.
license: MIT
---

# Integration tests

An integration test runs your code against the real infrastructure it owns (database, broker, cache, blob store) and fakes only what you do not own, at the wire. It proves the pieces fit: SQL translation, constraints, transactions, serialisation, auth, configuration. It is not an end-to-end test of the whole product.

## Before writing anything

1. Read the existing test projects. Reuse their framework (xUnit, MSTest, NUnit, Jest, Vitest, pytest, JUnit), fixtures, builders, naming and folder layout. Never mix two test frameworks in one project.
2. Find the seam: the HTTP endpoint, message handler or repository the change touches, and every dependency it reaches.
3. Check that Docker answers (`docker info`). Testcontainers needs a Docker-compatible runtime and nothing else.

## Rules

- **Same engine as production.** Run the real database in a container, same major version as production. Never substitute an in-memory provider or SQLite for SQL Server or PostgreSQL: they hide query translation, constraints, collation and transaction behaviour.
- **Pin image tags.** `postgres:17.6`, never `postgres:latest`. A floating tag turns a green build red with no code change.
- **One container per run, clean state per test.** Start containers once per test collection or assembly. Reset data between tests (Respawn, a rolled-back transaction, or unique IDs per test). Tests must pass in any order and in parallel.
- **Override configuration, not internals.** Point the app at the container through configuration (connection string, environment variable). Replace services only where a real dependency is outside your control.
- **Fake third parties at the HTTP level** (WireMock.Net, WireMock, MSW, a stub server). Assert on the requests they received when the call is the behaviour under test.
- **Test auth for real.** Never disable authorization globally. Use a test authentication scheme or real tokens signed with a test key, and cover 401 and 403 explicitly.
- **No sleeps.** For asynchronous work, poll an observable outcome with a timeout, or invoke the handler directly. `Task.Delay(5000)` and `sleep(5)` make tests slow and flaky at the same time.
- **Assert the outcome, not just the status.** Status code, response body, persisted state read through a fresh scope or connection, and messages published.
- **No real secrets, no shared environments.** Container credentials are generated. Never point a test at a shared dev, staging or production resource.

## Scenarios to cover per endpoint or handler

Happy path with persisted state; validation failure (400 with problem details per RFC 9457); not found; unauthenticated (401) and forbidden (403); conflict or concurrency (duplicate key, stale version); idempotency on retry for message handlers; rollback when a later step fails; migrations apply from an empty database.

Pick the ones the change can break. Do not pad with tests that cannot fail.

## Workflow

1. List the scenarios and the assertions for each before writing code.
2. Write the fixture once (container, app factory, reset), then the tests.
3. Run them. Then break the code under test on purpose (or invert one assertion) and watch each new test fail once. A test that never failed proves nothing.
4. Run the whole suite twice, the second time in a different order or in parallel, to catch shared state.
5. Report: tests added, scenarios covered, what is still not covered and why, run time.

## CI

Linux hosted agents on GitHub Actions and Azure Pipelines ship with Docker, so Testcontainers runs there without a compose file or extra services. Keep integration tests in their own project or category so a fast unit run stays possible. Collect results as JUnit or TRX.

## References (load when needed)

- `references/dotnet.md`: ASP.NET Core with `WebApplicationFactory`, Testcontainers, Respawn, a test auth handler, WireMock.Net, messaging, MSTest notes, checked package versions.
- `references/other-stacks.md`: Node and TypeScript, Java and Spring Boot, Python, Go.

Official docs: learn.microsoft.com/aspnet/core/test/integration-tests, testcontainers.com, dotnet.testcontainers.org.
