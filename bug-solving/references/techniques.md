# Debugging techniques

## Minimal reproduction

1. Capture the failing input exactly: request body, headers, user, tenant, data state, time.
2. Turn it into a test at the lowest layer that still fails (unit before integration before end to end).
3. Shrink: remove fields, steps and data until removing anything more makes it pass. What remains points at the cause.
4. If the input contains personal or client data, replace it with synthetic data that still fails before the test is committed.

## git bisect

When a known good commit exists:

```bash
git bisect start
git bisect bad HEAD
git bisect good v2.3.0
git bisect run ./scripts/repro.sh   # exit 0 = good, 1 to 127 except 125 = bad, 125 = skip
git bisect reset
```

The script must build and run only the reproduction, fast. Mark commits that do not build with exit code 125 so bisect skips them.

## Reading a stack trace

- Find the first frame in your own code, counting from the top of the exception. Framework frames above it say how you got there; the frame itself says where.
- Read the inner exception (`Caused by`, `InnerException`, `cause`). The outer one is often a wrapper.
- For async code, the logical call chain is what matters. Modern runtimes show it; older ones need the async stack in the debugger.
- A line number in a minified or release build can be wrong. Use source maps or symbols.

## Following one request across services

- Use the W3C trace context (`traceparent`) that OpenTelemetry and most platforms propagate. Search every service's logs and traces for the same trace ID.
- If there is no trace ID, correlate by time window, user ID and resource ID, and add tracing as part of the fix.
- Compare a failing trace with a successful one for the same operation. The first span that differs is the place to look.

## Flaky tests

1. Run the single test in a loop until it fails, and record the failure rate.
   - .NET: `for i in $(seq 1 100); do dotnet test --filter "FullyQualifiedName~MyTest" || break; done`
   - Jest or Vitest: run with the test name filter in a loop; Vitest also has `--retry=0` and `--sequence.shuffle`.
2. Run the suite in random order and in parallel. A test that fails only with others shares state.
3. Usual causes and their fixes:
   - Time: inject a clock, never read `now` directly in logic; fix the time zone in tests.
   - Order: each test creates its own data and cleans or isolates it.
   - Async: await everything; replace sleeps with polling on an observable condition with a deadline.
   - Randomness: seed it and log the seed.
   - Network: fake outside services; containers for owned infrastructure.
   - Resource limits: ports, file handles, connection pools exhausted by earlier tests.
4. Quarantine only with an owner and a date. A skipped test is a deleted test that still looks like coverage.

## Heisenbugs

If adding logging makes the bug vanish, suspect timing: races, missing memory barriers, unawaited tasks, event ordering. Log to an in-memory buffer and dump it after the failure, or use tracing with low overhead, instead of synchronous console writes.

## When stuck

- Explain the problem from the start to someone else (or write it down). The step you skip while explaining is often the bug.
- List what you know as facts, separately from what you assume. Test the assumption that, if wrong, would change the most.
- Check the boring things: the right branch, a clean build, the right configuration file loaded, the right database, caches cleared, the deployed version is the one you think.
