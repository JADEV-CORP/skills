---
name: unit-test-coverage
description: "Closes unit test coverage gaps that matter: reads the coverage report (SonarQube, Codecov, local), ranks untested code by risk, writes tests in the repo's framework and proves they can fail. Use for coverage gaps, quality gates, untested code."
license: MIT
---

# Unit test coverage

Coverage shows which code no test executes. It does not show that executed code is checked. The goal is tests that would catch a regression in the uncovered behaviour; the percentage follows.

## Workflow

1. **Get the coverage data.** Use the report CI already produces, or SonarQube (if SonarSource's MCP server is connected, read uncovered lines and new-code coverage through it). Otherwise run coverage locally with the commands in the stack reference and read the Cobertura, OpenCover or lcov file.
2. **Rank the gaps.** In this order: new or changed code in the current branch (quality gates usually judge new code: SonarQube's default "Sonar way" gate fails below 80 % coverage on new code); business rules and calculations; error handling and branch conditions; code with high complexity or a history of bugs. Leave out generated code, DTOs without logic, DI wiring and framework glue: exclude them in the coverage configuration with a comment, do not write tests for them.
3. **Read before writing.** The code under test, its callers, and the existing tests. Reuse the repository's test framework, assertion and mocking libraries, builders, folder layout and naming. Never add a second assertion or mocking library to a project that already has one.
4. **Write tests per behaviour, not per method.** One behaviour per test, named after it (`Rejects_order_when_stock_is_insufficient`). Arrange, act, assert. Cover the boundaries (0, 1, max, max + 1, empty, null), each branch, and each error path. Assert outcomes and state; assert interactions with a mock only when the interaction is the behaviour (a message sent, a payment requested).
5. **Prove each test can fail.** Break the code under test on purpose (flip a condition, shift a boundary, remove a call), run the test, watch it fail, revert. For a whole file, run a mutation tool (Stryker.NET, StrykerJS) and read the surviving mutants.
6. **Measure again and report:** coverage before and after for the files touched, the tests added, what is still uncovered and why (unreachable, needs an integration test, excluded).

## Rules

- Tests are deterministic: inject the clock, seed randomness, fix the culture and time zone, no network, file system or database in unit tests (those belong in integration tests).
- Test through the public surface. A private method that needs its own tests is a class waiting to be extracted.
- Do not change production behaviour to raise coverage. Adding a seam for testability (an interface, an injected clock) is fine; say so in the report.
- No tests without assertions, no assertions that cannot fail (`Assert.NotNull` on a constructor result), no snapshot tests of large objects as a shortcut.
- Never use exclusion attributes (`[ExcludeFromCodeCoverage]`, `/* istanbul ignore */`, `/* v8 ignore */`) to hide code that has logic.
- Licences: FluentAssertions 8 and later require a paid licence for commercial use; version 7 stays Apache 2.0 and AwesomeAssertions is an Apache 2.0 fork. Check before adding or upgrading it.

## Stack references (load the one you need)

- `references/dotnet.md`: xUnit v3, MSTest 4, NUnit; Moq and NSubstitute; Coverlet and Microsoft code coverage; ReportGenerator; Stryker.NET.
- `references/javascript.md`: Vitest and Jest; Vue, Angular and React component tests; MSW; StrykerJS.
- `references/sonarqube.md`: importing coverage into SonarQube Server or Cloud, quality gates, exclusions.

Further reading: "Unit Testing Principles, Practices, and Patterns" by Vladimir Khorikov.
