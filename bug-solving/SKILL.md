---
name: bug-solving
description: "Finds a bug's root cause before changing code: reproduce, gather evidence, test one hypothesis at a time, fix at the right layer, prove it with a test that failed first. Use for errors, failing or flaky tests, regressions, incidents, slow requests."
license: MIT
---

# Bug solving

No fix without evidence. A change that makes the symptom disappear without an explained cause is a guess, and guesses come back.

## The loop

1. **Define the problem.** Observed versus expected, in one sentence each. Who is affected, since when, how often. What changed around that time: deployments, configuration, feature flags, data, dependency versions, infrastructure.
2. **Reproduce it.** Find the smallest reliable reproduction, ideally a failing automated test. If it does not reproduce locally, compare environments (versions, configuration, data, time zone and locale, CPU architecture, load) and collect evidence from where it does happen.
3. **Gather evidence.** The exact error and the full stack trace, read from the bottom frame of your own code. Logs and traces for the same request (trace ID or correlation ID). Recent commits to the files involved (`git log -p -- <path>`). If a known good version exists, `git bisect run <test command>` finds the commit that broke it.
4. **Form hypotheses.** Two to four candidate causes, each with the evidence for and against and the cheapest test that would prove it wrong. Start with the test that splits the most hypotheses, not the most likely story.
5. **Test one variable at a time.** Change one thing, observe, write down the result. Keep a short debug log in the conversation: hypothesis, test, result. Revert experiments that did not prove anything.
6. **Fix the cause at the right layer.** The smallest change that removes the cause where it lives: bad data at the boundary that admitted it, a race where the shared state is, a wrong query in the repository. Not a null check three layers up.
7. **Verify.** The failing test now passes. The full suite passes. The original reproduction steps no longer fail. For intermittent bugs, run the reproduction enough times to make a pass meaningful (for example 100 runs of a test that failed 1 in 10).
8. **Prevent.** The test stays. Add the validation, constraint, alert or type that stops the same class of bug, if it is cheap. Say in the pull request what caused it and why the fix addresses that cause.

## Rules

- Read the error message and the code before theorising. Search the codebase for the exact message text.
- Never silence the signal: no empty `catch`, no retry or longer timeout to hide a failure, no skipping or deleting a failing test, no loosened assertion.
- Do not stack fixes. If the first fix did not work, revert it before trying the next.
- Remove temporary logging and debug flags before finishing.
- Never log secrets, tokens or personal data while instrumenting. Mask them.
- State your confidence. "Root cause confirmed by test X" and "most likely cause, not reproduced" are different reports.

## Special cases

- **Flaky tests:** look for shared state between tests, time and time zones, test order, unawaited async work, fixed sleeps, real network calls, random data without a seed, parallel runs on one database. Reproduce by running the single test in a loop and the suite in random order.
- **Production incidents:** mitigate first (roll back, turn off the flag, scale), then investigate. Investigation in production is read-only and low impact: filtered queries, sampled logs, no writes, no restarts without the owner's go.
- **Performance:** measure before changing anything. Profile or trace the slow path, read the query plan, compare with a fast case. Optimise the measured hotspot and measure again.
- **Only in one environment:** diff the environments field by field. Configuration and data differences explain most of these.

## Output

When done, report in this shape:

```
Problem:     observed vs expected, scope
Root cause:  what was wrong, where (file:line), and the evidence
Fix:         what changed and why it removes the cause
Proof:       test that failed before and passes now; other checks run
Prevention:  guard, alert or follow-up, if any
Confidence:  confirmed / likely / unconfirmed, and what would raise it
```

## References (load when needed)

- `references/techniques.md`: minimal reproduction, `git bisect`, tracing a request across services, flaky test recipes, reading stack traces.
- `references/stack-notes.md`: .NET (diagnostic tools, async pitfalls, EF Core), JavaScript and TypeScript front ends, SQL Server and PostgreSQL slow queries.
- `references/templates.md`: bug report, fix write-up and blameless incident review.

Further reading: "Debugging: The 9 Indispensable Rules" by David J. Agans; "Why Programs Fail" by Andreas Zeller.
