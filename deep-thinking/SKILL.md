---
name: deep-thinking
description: "Structures hard technical decisions: frames the real question, separates facts from assumptions, compares real options, checks reversibility and second-order effects, ends on one recommendation. Use for architecture, migrations, build vs buy."
license: MIT
---

# Deep thinking

For decisions that are expensive to get wrong. A simple question gets a direct answer; this method is for choices with several real options, uncertain facts and lasting consequences.

Match the depth to the stakes. A two-way door (cheap to reverse) deserves a short analysis and a fast decision. A one-way door (data model, public contract, vendor lock-in, team structure) deserves the full method.

## Method

1. **Frame the question.** One sentence: what is being decided, for whom, by when. What happens if nobody decides (the default path)? Which outcome would make this a good decision a year from now?
2. **Separate facts, assumptions and unknowns.** Put each claim in one column. Check the facts against the code, the documentation, measurements or the people who know. Each assumption gets a note: how could we test it cheaply?
3. **Strip inherited constraints.** For every constraint, ask whether it is physical, contractual or regulatory, or only habit. Rebuild options from the real constraints only.
4. **Generate real alternatives.** At least three, always including "do nothing or keep the status quo" and a smaller, incremental version. Write each so its strongest supporter would sign it. No strawmen.
5. **Evaluate.** Fix the criteria and their weights before scoring. Score with evidence, all criteria in the same direction (higher is better). Run `python3 <skill>/scripts/matrix.py decision.csv` for the totals and the exact weight at which the winner changes. If a small, plausible weight change flips the result, say it is a close call and name the deciding question.
6. **Stress-test the leader.** Pre-mortem: it is a year later and this failed; write the three most likely reasons. Inversion: what would guarantee failure, and does the plan avoid it? Second-order effects: who changes behaviour because of this, and what does that cost? Base rate: how did similar choices go elsewhere?
7. **Make it reversible where you can.** Feature flags, adapters, the strangler pattern, a pilot with one team or one tenant, contracts that allow exit. Cheap reversibility turns a one-way door into a two-way door.
8. **Decide and record.** Recommendation, the main reason, the price paid (what we give up), kill criteria ("we revisit if p95 latency exceeds 300 ms or the pilot takes more than six weeks"), the next concrete step and the date of the first checkpoint. For architecture, write an ADR (`references/adr.md`).

## Rules

- Do the arithmetic, never eyeball it. Claims like "if cost mattered more, C would win" need the computed threshold.
- Numbers carry their status: measured, estimated or assumed.
- Say "I do not know" and name how to find out, rather than filling a gap with a plausible guess.
- One recommendation. Offering a menu without a choice hands the thinking back.
- Steelman the runner-up in two sentences before dismissing it.

## Which tool for which problem

| Situation | Tool (details in `references/frameworks.md`) |
|---|---|
| "We have always done it this way" | First principles |
| Several options, several criteria | Weighted matrix with sensitivity |
| Uncertain payoffs, known odds | Expected value and the worst case |
| A plan about to start | Pre-mortem, inversion |
| Choice with long-lasting effects | Second-order effects, reversibility |
| Fast-moving competitive situation | OODA loop |
| A group stuck arguing | Six Thinking Hats as a facilitation sequence |
| A defect or incident | Use a debugging method, not this skill |

## Output

```markdown
**Decision:** <one sentence>
**Recommendation:** <option>, because <main reason>. Price: <what we give up>.
**Options considered:** <table: option, score, one-line verdict>
**Close call?** <yes or no, with the flip threshold>
**Key assumptions:** <each with how to test it>
**Pre-mortem:** <top three failure reasons and the mitigation>
**Kill criteria:** <measurable triggers to revisit>
**Next step:** <action, owner if known, checkpoint date>
```

Keep it as short as the decision allows. A one-page answer that is right beats a ten-page template that is filled in.

## References (load when needed)

- `references/frameworks.md`: how to run each tool, with a worked matrix example and a bias checklist.
- `references/adr.md`: a short architecture decision record template.

Further reading: "Thinking, Fast and Slow" by Daniel Kahneman; "Thinking in Bets" by Annie Duke; Gary Klein, "Performing a Project Premortem", Harvard Business Review, September 2007.
