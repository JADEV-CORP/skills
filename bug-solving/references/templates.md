# Templates

Fill only what you know. Write "unknown" rather than inventing a value, and list how to find it.

## Bug report

```markdown
## <one-line summary: what fails, where>

**Observed:** <what happens, exact error text>
**Expected:** <what should happen, and the source of that expectation (spec, ticket, previous behaviour)>
**Scope:** <users, tenants, endpoints, platforms affected; how often>
**Since:** <first occurrence; last known good version>
**Environment:** <app version or commit, environment, browser or client, region>

### Reproduction
1. ...
2. ...
Result: <what you see>

### Evidence
- Stack trace or log excerpt (secrets and personal data masked)
- Trace ID(s): ...
- Recent changes around that time: ...
```

## Fix write-up (pull request description)

```markdown
**Problem:** <observed vs expected, scope>
**Root cause:** <what was wrong and where, with the evidence that proves it>
**Fix:** <what changed and why it removes the cause>
**Proof:** <test that failed before and passes now; other checks>
**Risk:** <what else this touches; how it was checked>
**Prevention:** <guard, alert, constraint or follow-up ticket, if any>
```

## Incident review (blameless)

Written within a few days, for incidents that reached users. It describes systems and decisions, never who to blame.

```markdown
# <Incident title> (<date>)

## Summary
<two or three sentences: what users saw, for how long, how it ended>

## Impact
<users or requests affected, duration, data affected, money or SLA impact if known>

## Timeline (UTC)
- hh:mm  first signal (alert, ticket, customer)
- hh:mm  ...
- hh:mm  mitigated
- hh:mm  resolved

## Root cause and contributing factors
<the technical cause; then the conditions that let it reach users or slowed detection>

## What went well / what was hard
- ...

## Actions
| Action | Type (prevent, detect, mitigate) | Owner | Due |
|---|---|---|---|
```

Prefer actions that change the system (a test, a check, an alert, a safer default) over actions that ask people to be more careful.
