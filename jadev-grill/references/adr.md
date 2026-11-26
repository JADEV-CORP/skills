# Architecture decision records

One decision per record, stored in the repo next to the code, so the reason travels with the change.

## Find the convention first

```
git ls-files | grep -iE '(^|/)(adrs?|decisions|architecture-decisions)/'
ls -a | grep -iE '^\.(adr-dir|log4brains\.yml)$'
```

- An `.adr-dir` file names the folder used by adr-tools. A `.log4brains.yml` file means log4brains manages the records.
- Common folders: `docs/adr/`, `docs/adrs/`, `docs/decisions/`, `doc/adr/`, `docs/architecture/decisions/`. Monorepos sometimes keep one folder per service or context.
- Read the two or three most recent records. Copy their file naming, headings, status words, date format and how they link to each other.
- If the folder has an index (`README.md` or `index.md`), you will update it too.

When nothing exists, propose `docs/adr/` in the repo's docs folder and write the first record there. Create the folder only when the first record is written.

## When a decision deserves a record

All three must hold:

1. **Hard to reverse.** Changing it later costs weeks, a migration or a broken contract.
2. **Surprising without context.** A new engineer would ask "why did they do it this way?"
3. **A real trade-off.** There were named alternatives, and one was chosen for stated reasons.

Typical cases: the shape of the system, how contexts or services talk to each other, technology with lock-in (database, broker, identity provider, hosting), ownership boundaries, deliberate departures from the obvious path, constraints that the code cannot show (regulation, a partner's contract, a latency budget), and rejected options that people will propose again.

Skip it for easy-to-reverse choices, routine library picks and anything with only one sensible option.

## Numbering and naming

- Next number: highest existing number plus one, with the same zero padding (`0007`).
- Slug: short and specific, in the imperative (`0007-use-outbox-for-order-events.md`).
- Two branches can pick the same number. Check again just before merging.

## Template

Use the repo's template when one exists. Otherwise:

```markdown
# 7. Use a transactional outbox for order events

Status: Proposed
Date: YYYY-MM-DD

## Context

The problem, the constraints and the measured facts with their source. What happens if we do nothing.

## Options

1. Outbox table written in the same transaction, relayed to the broker.
2. Publish to the broker after commit, with retries.
3. Do nothing.

## Decision

We use option 1 because <reasons tied to the context>.

## Consequences

- Gains: ...
- Price we accept: ...
- Follow-up work: ...

## Revisit when

Measurable triggers that would reopen this: load, cost, incident count, a date.
```

A record can be shorter. Context, decision and price in one paragraph is enough for a small decision. The value is the "why", not the headings.

## Status and lifecycle

- Proposed, Accepted, Rejected, Deprecated, Superseded by NNNN. Use the repo's words if they differ.
- The user (or the team's review) accepts a record. Write new ones as Proposed.
- An accepted record does not change. A new decision gets a new record that supersedes the old one, and the old record's status line is the only edit it receives.
- Update the index, if there is one, in the same change.

## Writing rules

- Facts carry their source: a file, a measurement, a document.
- Describe each rejected option fairly, in the form its supporters would sign.
- Keep it to about a page. Link to longer analysis instead of pasting it.
- No secrets, personal data or customer names.
