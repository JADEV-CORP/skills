---
name: jadev-grill
description: "Stress-tests a plan or design with hard questions one at a time, keeps a domain glossary and writes ADRs in the repo's own format. Use for 'grill me', 'poke holes', design reviews, pinning down domain terms or recording an architecture decision."
license: MIT
---

# Grill

Find the weak spots in a plan before the code does. You ask, the user decides, and every answer lands in the repo as a glossary entry, a decision record or an open question.

## Before the first question

1. Read what exists: the plan or design, the code it touches, the README, the glossary, the decision records, recent history on the affected files.
2. Find the conventions: where the glossary and the ADRs live, their format, numbering and status words. See `references/glossary.md` and `references/adr.md`. Never start a second convention next to an existing one.
3. Write down what you already know as facts, each with its source. Facts are your job. Never ask the user for something the repo or the tools can tell you.

## The loop

1. Map the decisions the plan depends on. Order them so each question depends only on answers you already have.
2. Ask one question at a time. Each question:
   - names one decision, in the domain's own words;
   - says what changes with each answer;
   - ends with your recommended answer, worded so "yes" accepts it.
3. Push on the answer with a concrete edge case: two events in the wrong order, a partial failure, a retry after a timeout, a customer with two accounts, a rollback halfway through a migration. Ask what happens.
4. Check the answer against the code. When they disagree, say so with file and line.
5. Record as you go. A settled term goes to the glossary. A hard-to-reverse decision becomes an ADR draft. Anything unanswered goes on the open list.
6. Stop when no branch is open and nothing rests on a silent assumption. Play back the result and wait for the user to confirm before any build work starts.

Pick questions from `references/questions.md`. Start with the hardest unknown, usually the part the user sounds least sure of.

## Language

- When the user uses a vague or overloaded word ("account", "order", "status", "user"), propose one precise term and ask which meaning they intend.
- When a word conflicts with the glossary, say so at once and quote the entry.
- Update the glossary the moment a term is settled, in the repo's format. Keep it free of implementation detail.

## Decisions

Propose an ADR only when all three hold: the decision is hard to reverse, a future reader would be surprised by it, and it came from a real trade-off between named options. Anything less goes in the pull request description. New ADRs start as Proposed. The user accepts them.

## Open questions on one page

When a review-page tool is available (for example `lavish-axi`), collect the open questions of the current round on one page instead of in chat. Each gets an ID, your recommendation, a Go / Maybe / No choice and a notes field. Number the rounds. After each round, fold the answers into the glossary and the ADRs, then build the next round from what the answers opened. Layout in `references/review-page.md`. Without such a tool, keep to one question per message.

## Rules

- Ask the hard question plainly. Do not soften it into a suggestion.
- One recommendation per question. When two answers are close, name the fact that would decide it.
- No build work during grilling unless the user asks for it.
- Never invent a fact to make a scenario work. Label assumptions.
- Keep secrets, personal data and customer names out of the glossary and the ADRs.

## Output

```
Settled:    one line per decision, with the ADR file when one was written
Terms:      glossary entries added or changed
Open:       questions still waiting, and who can answer them
Risks:      scenarios that still have no good answer
Next step:  the first concrete action
```
