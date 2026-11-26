# Architecture decision record

One decision per record, numbered, stored next to the code (`docs/adr/0007-use-outbox-for-order-events.md`). Records are immutable once accepted: a later change gets a new record that supersedes the old one. If the repository already has an ADR format, use it.

```markdown
# 7. Use a transactional outbox for order events

Status: Proposed | Accepted | Superseded by 12
Date: 2026-03-01
Deciders: <roles or names, as the team prefers>

## Context

What forces are at play: the problem, constraints, measured facts (with their source), and what happens if we do nothing.

## Options

1. <Option> : one paragraph, strongest form.
2. <Option> : ...
3. Do nothing : ...

## Decision

We will <option>, because <main reasons tied to the context>.

## Consequences

- Positive: ...
- Negative, the price we accept: ...
- Follow-up work this creates: ...

## Revisit when

Measurable triggers (load, cost, incidents, a date) that would reopen this decision.
```

Keep it to a page. Link the analysis (matrix, pre-mortem) rather than pasting it in.

Background: Michael Nygard's original ADR article (2011) and the MADR template at adr.github.io.
