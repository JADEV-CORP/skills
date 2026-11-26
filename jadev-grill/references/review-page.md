# Open questions on a review page

A review page lets the user answer a whole round of questions at once, with notes, instead of scrolling through chat. Use it when a review-page tool is available (for example `lavish-axi`). Follow the tool's own help for its markup and its review loop. This file covers what goes on the page.

## One page per round

- Title: the topic and the round, for example "Payment retries: round 2".
- A round holds only questions whose prerequisites are settled. A question that depends on another open question waits for the next round.
- Keep a round to about eight questions. More than that and the answers get thin.

## Page layout

1. **Context.** Three to five lines: what is being decided and why now. One diagram when the topic is a flow or a set of services.
2. **Settled so far.** A short list of decisions from earlier rounds, each with its ID, so the user can spot a wrong one.
3. **Questions.** One block each:

```
Q2.3  What happens when the payment provider times out after charging?
Why it matters:  a retry could charge twice; no retry could lose the order.
Options:         A  retry with an idempotency key       fit 85
                 B  mark as pending, reconcile nightly  fit 60
                 C  fail the order, refund manually     fit 30
Recommendation:  A, because the provider supports idempotency keys.
Answer:          ( ) Go   ( ) Maybe   ( ) No
Notes:           [ free text ]
```

IDs combine round and position (`Q2.3` is round 2, question 3). Options inside a question get letters. Fit scores are out of 100 and come from evidence you can point to.

4. **Glossary and ADR changes.** Terms and decision records proposed this round, so the user can approve the wording too.

## Reading the answers

- **Go:** the recommendation stands. Write it into the glossary or the ADR, move it to "Settled".
- **Maybe:** keep it open. The note usually holds a new constraint; rework the question with it next round.
- **No:** read the note, find out what you missed, and come back with a better option or a sharper question.
- A note without a choice counts as Maybe.
- Answers often open new questions. Add them to the next round.

## Without a review-page tool

Ask in chat, one question per message, in the same block format. Keep a running "Settled" list and repeat it every few questions.
