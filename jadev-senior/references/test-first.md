# Build test first

For each slice: red, green, refactor. Then the next behaviour.

## Red

- Write one test for the next behaviour. Name it after the behaviour, for example `rejects_order_when_stock_is_zero`.
- Run it and watch it fail for the right reason: the assertion on the behaviour. A compile error or a missing fixture is not a red test yet.
- If it passes straight away, it tests nothing new. Fix the test or pick the next behaviour.
- For a bug, the first test reproduces the reported symptom.

## Green

- Write the least code that makes the test pass. No extra options, no abstraction for a second caller that does not exist.
- Run the test, then the suite around it.

## Refactor

- With the tests green, improve names, remove duplication, extract a function only when it helps the reader.
- Run the suite again. Refactoring never changes behaviour, so a test change during refactor is a warning sign.

## Good tests

- Test behaviour through public seams. Avoid asserting on private methods or on how many times a mock was called.
- One reason to fail per test. Arrange, act and assert are easy to see.
- Deterministic: inject the clock, random seeds and generated IDs. Wait for a condition instead of sleeping.
- Fakes for your own boundaries. Real databases and brokers in throwaway containers for integration tests.
- Follow the neighbours: same framework, folder, naming, builders and fixtures as the tests next to yours.
- Cover the inputs the spec does not mention: empty, null, maximum size, duplicates, concurrent calls, time zones, retries after a timeout.

## Prove a regression test can fail

Run it against the code without the fix (stash or revert the fix), see it fail, restore the fix, see it pass. A test that has never failed has not proved anything.

## When test first does not fit

Exploratory spikes, generated code, pure configuration and visual layout. Say so in the plan, and add tests as soon as the behaviour settles. For legacy code without seams, first write a characterisation test that pins today's behaviour, then change it.

## Delegated slices

When another agent builds a slice, give it the test to make pass, the files it may touch and the out-of-scope list. Check that the test failed before its change and passes after, from your own run.

## Stack notes

- **.NET:** use the framework the repo uses (xUnit, NUnit or MSTest). Run one class with `dotnet test --filter "FullyQualifiedName~OrderServiceTests"`. Use `TimeProvider` (from .NET 8) or the repo's clock abstraction for time. Add an assertion library only if the repo already has one.
- **TypeScript:** Vitest or Jest, as configured. Run one test through the repo's script, for example `npm test -- order.test.ts -t "rejects order"`. Fake timers with `vi.useFakeTimers()` or `jest.useFakeTimers()`. Test components through what the user sees (Testing Library queries by role and label).
- **Python:** pytest. Run one test with `pytest tests/test_orders.py -k rejects -x`. Inject a clock or freeze time; use the `tmp_path` fixture for files; block network calls in unit tests.
