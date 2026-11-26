# Debug from root cause

No fix before a cause backed by evidence. A change that hides the symptom without an explained cause comes back later, usually at a worse time.

If the `bug-solving` skill is installed, follow it for the full method. The short version:

## Steps

1. **State the problem.** Observed versus expected, one sentence each. Since when, how often, who is affected, what changed around that time (deploys, config, flags, data, dependency versions).
2. **Reproduce.** The smallest reliable reproduction, ideally a failing automated test. If it only fails in one environment, diff the environments field by field.
3. **Collect evidence.** The full error and stack trace, read from your own code's deepest frame. Logs and traces for the same request (correlation ID). `git log -p -- <path>` on the files involved. When a known good version exists, `git bisect run <test command>` finds the breaking commit.
4. **Form hypotheses.** Two to four, each with the evidence for and against it and the cheapest test that would prove it wrong. Run the test that rules out the most hypotheses first.
5. **Change one thing at a time.** Keep a short log in the conversation: hypothesis, test, result. Revert every experiment that proved nothing.
6. **Fix at the layer where the cause lives.** Bad data at the boundary that let it in. A race where the shared state is. Avoid a null check three layers away from the cause.
7. **Prove it.** The regression test fails without the fix and passes with it. The full suite passes. The original reproduction no longer fails. For intermittent failures, repeat enough runs to make the pass meaningful.
8. **Prevent.** Keep the test. Add the cheap guard (validation, constraint, type, alert) that stops the same class of bug.

After three failed fixes in a row, stop. Your model of the system is wrong. Go back to evidence, and question the design before trying a fourth fix.

## Never

- Swallow an exception, add a retry or raise a timeout to hide a failure.
- Skip, delete or loosen a failing test.
- Stack fixes. Revert the failed one before trying the next.
- Write to production while investigating. Reads stay small and filtered.
- Log secrets, tokens or personal data while instrumenting. Remove temporary logging before you finish.

## Report

```
Symptom:     observed vs expected, scope
Root cause:  what was wrong, file:line, and the evidence
Fix:         what changed and why it removes the cause
Proof:       test that failed before and passes now, other checks run
Confidence:  confirmed / likely / unconfirmed, and what would raise it
```

## Stack notes

- **.NET:** `dotnet-counters` for live metrics, `dotnet-trace` for slow paths, `dotnet-dump` for hangs and memory. Look for sync over async (`.Result`, `.Wait()`), missing `ConfigureAwait` in libraries where the repo requires it, and disposed `DbContext` use. Log EF Core SQL with `LogTo` to spot N+1 queries.
- **TypeScript:** missing `await`, unhandled promise rejections, stale closures in React effects. Enable source maps so stack traces point at the source. Use `node --inspect` for the server, the network tab and console for the browser.
- **Python:** `python -X faulthandler` for hangs, `breakpoint()` for stepping, `-W error` to turn warnings into failures. Watch for mutable default arguments and naive datetimes.
