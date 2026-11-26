---
name: product-feature-writing
description: "Writes feature specs a team can build and test from: problem and evidence, scope and non-goals, vertical stories, testable acceptance criteria, rollout, open questions, no invented facts. Use for epics, user stories, PRDs or feature specs."
license: MIT
---

# Feature writing

A spec exists so a team can make the right decisions without a meeting for each one. It says what problem to solve, for whom, what done looks like and what is out. It does not decide the implementation unless that is a real requirement.

## Hard rules

- **Never invent facts.** No made-up baselines, targets, user counts, quotes, names or dates. Write `unknown`, add an open question with who can answer it, and say how to measure it.
- **Problem before solution.** If the request arrives as a solution ("add an export button"), find the problem behind it and write that first. The solution may still be right.
- **Separate product spec and technical design.** Data models, schemas, class designs and endpoint lists go in a design document or ADR that the spec links to, unless the interface itself is the product (a public API).
- **Read the current behaviour.** Check what the code and the product do today before describing the change. Quote the screen, endpoint or rule you are changing.
- **Short beats complete.** Every section answers a question someone will ask. Delete sections that answer nothing.

## Workflow

1. **Gather.** The request, the evidence behind it (tickets, support cases, analytics, interviews, contract clauses), the users affected, constraints (legal, contractual, technical, dates), related specs, and current behaviour in the code.
2. **Problem and outcome.** Who has the problem, what it costs them today, how we will know it is solved. Success measures name a metric, its current value (or `unknown` and how to get it) and a target owned by someone.
3. **Scope.** In scope, out of scope (non-goals stated plainly), assumptions. Non-goals prevent more rework than any other section.
4. **Slice into stories.** Vertical slices, each usable and testable on its own, smallest valuable first. Split large stories with SPIDR (spike, paths, interfaces, data, rules). Each story passes INVEST.
5. **Acceptance criteria.** One rule per criterion, in Given/When/Then or an examples table. Cover the happy path, alternative paths, validation and errors, permissions (who may and who may not), empty and first-use states, limits and volumes, concurrent edits, and what happens to existing data.
6. **Qualities.** Only the ones that apply, with numbers: response time at a stated load, availability, security and privacy (personal data processed, legal basis, retention, deletion), accessibility (WCAG 2.2 AA), languages and locales, audit, analytics events to add.
7. **Release.** Feature flag or not, migration of existing data and users, rollout steps, what to watch after release, how to roll back, who must be told (support, sales, customers).
8. **Open questions.** Numbered, each with an owner and the decision it blocks. A spec with open questions is fine; a spec that hides them is not.
9. **Check** against `references/writing-guide.md` before handing it over.

## Story format

```markdown
### <ID> <title as a user-visible outcome>

As a <specific role>, I want <capability>, so that <benefit tied to the problem>.

**Acceptance criteria**
1. Given <context>, when <action>, then <observable result>.
2. ...

**Examples** (when rules depend on values)
| Input | Expected |
|---|---|

**Notes:** links to designs, the parent spec, dependencies. **Out of scope:** ...
```

Story points, sprint and priority belong to the team's planning, not to the writer. Leave them out unless asked.

## Output

For a feature or epic use the one-page spec in `references/templates.md`; for single stories, the format above. State at the top what kind of document it is and its status (draft, in review, agreed).

## References (load when needed)

- `references/templates.md`: one-page feature spec, story, and a pointer template for the linked technical design.
- `references/writing-guide.md`: slicing patterns, acceptance criteria that test well, weak versus strong examples, the final checklist.

Further reading: "User Story Mapping" by Jeff Patton; "Specification by Example" by Gojko Adzic; Mike Cohn on SPIDR story splitting (mountaingoatsoftware.com).
