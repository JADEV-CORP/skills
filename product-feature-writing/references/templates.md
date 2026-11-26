# Templates

Delete any section that has nothing true to say. Write `unknown` instead of guessing.

## One-page feature spec

```markdown
# <Feature name>

Status: draft | in review | agreed    Owner: <role or name>    Last updated: <date>
Links: <tickets, designs, research, technical design>

## Problem
<Who has the problem, what it costs them today, the evidence (tickets, data, quotes with source).>

## Outcome and measures
| Measure | Today | Target | Source / how measured |
|---|---|---|---|
| <metric> | <value or unknown> | <value, owned by> | <dashboard, query, event to add> |

## Scope
**In:** ...
**Out (non-goals):** ...
**Assumptions:** each one with what changes if it is wrong.

## Users and current behaviour
<Roles affected. What the product does today, with the screen, endpoint or rule.>

## Stories
<Ordered list: smallest valuable slice first. Each with acceptance criteria, see the story template.>

## Qualities
<Only the ones that apply, with numbers: performance at stated load, security and privacy, accessibility, languages, audit, analytics events.>

## Release
<Flag, data migration, rollout steps, monitoring after release, rollback, who to inform.>

## Open questions
| # | Question | Owner | Blocks |
|---|---|---|---|
```

## Story

```markdown
### <ID> <outcome the user can see>

As a <specific role>, I want <capability>, so that <benefit>.

**Acceptance criteria**
1. Given <context>, when <action>, then <observable result>.
2. Given <context>, when <invalid action>, then <specific error> and <state unchanged>.
3. Given <a user without permission>, when <action>, then <refused, and how>.

**Examples**
| <input> | <input> | Expected |
|---|---|---|

**Dependencies:** ...    **Out of scope:** ...    **Design:** <link>
```

## Technical design pointer

The spec links to a separate design document owned by engineering. Its minimum content, so the spec can check it against the stories:

```markdown
# Design: <feature>
Spec: <link>

- Contracts changed (API, events, files): additive or breaking, consumers, versioning plan
- Data changes: schema, migration and backfill, rollback
- Security: authentication, authorisation, personal data, threat notes
- Operations: metrics, alerts, run book changes
- Alternatives considered and why rejected (or an ADR link)
- Test plan: which acceptance criteria are covered by which test level
```

Error responses in HTTP APIs follow problem details (RFC 9457, which replaced RFC 7807).
