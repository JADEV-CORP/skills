# Other stacks

Same rules as `SKILL.md`: real engine in a pinned container, one container per run, clean state per test, fakes only at the HTTP edge. Versions are the latest stable checked on 2026-11-26; pin them in the lock file.

## Node and TypeScript

- Packages: `testcontainers` and modules such as `@testcontainers/postgresql` (12.2.2), `supertest` (7.3.2) for in-process HTTP calls against an Express, Fastify or Nest app.
- Start the container in a global setup file (Vitest `globalSetup`, Jest `globalSetup`) and pass the connection string through an environment variable, so each worker does not start its own.
- Truncate tables between tests, or give each worker its own schema.
- Fake outside HTTP with MSW (`msw/node`) or a WireMock container. Use absolute URLs in handlers: Node has no base URL to resolve relative ones against.

```ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async function setup() {
  const pg = await new PostgreSqlContainer('postgres:17.6').start();
  process.env.DATABASE_URL = pg.getConnectionUri();
  return async () => { await pg.stop(); };
}
```

## Java and Spring Boot

- Testcontainers for Java 2.x renamed the modules: `org.testcontainers:testcontainers-postgresql:2.0.5` (1.x used `org.testcontainers:postgresql`). Check which line the build already uses.
- Spring Boot 3.1 and later: declare the container as a `@Bean` or static field annotated `@ServiceConnection`; Boot wires the datasource without `@DynamicPropertySource`.
- `@SpringBootTest(webEnvironment = RANDOM_PORT)` with `TestRestTemplate` or `WebTestClient` for HTTP tests; `@DataJpaTest` with a real container (set `@AutoConfigureTestDatabase(replace = NONE)`) for repository tests.
- Reuse one Spring context across test classes: same configuration and same `@MockitoBean` set, or each variation starts a new context.

## Python

- Packages: `testcontainers` (4.15.0) with `pytest` (9.2.0).
- A session-scoped fixture starts the container; a function-scoped fixture opens a transaction and rolls it back, or truncates.

```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def database_url():
    with PostgresContainer("postgres:17.6") as pg:
        yield pg.get_connection_url()
```

- For FastAPI use `TestClient` with the dependency override pointing at the test database. For Django use `pytest-django` with the database settings read from the container.

## Go

- Module: `github.com/testcontainers/testcontainers-go` (v0.45.0) and its `modules/postgres` package.
- Start containers in `TestMain`, run `m.Run()`, terminate afterwards. Use `t.Cleanup` for per-test data.
- `httptest.NewServer` covers fake third-party APIs without extra libraries.

Docs: testcontainers.com, node.testcontainers.org, java.testcontainers.org, testcontainers-python.readthedocs.io, golang.testcontainers.org.
