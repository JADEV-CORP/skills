# Domain glossary

A short list of the words this domain uses, each with one meaning. It ends arguments about what "account" means and keeps code, tickets and conversations aligned.

## Find the existing one first

```
git ls-files | grep -iE '(glossary|ubiquitous|language|terms|context)[^/]*\.md$'
```

Also check the README, a `docs/` folder and the team wiki if the repo links one. Use what exists, in its format. When nothing exists, create `GLOSSARY.md` at the repo root (or the file the team prefers) when the first term is settled, not before.

## Format

```markdown
# <Context name>

<One or two sentences: what this part of the business does.>

## Terms

**Order**
A customer's request to buy one or more products, from checkout until delivery or cancellation.
Avoid: purchase, basket.

**Cancellation**
Ending an order before it ships. Partial cancellation removes some lines and keeps the order.
Avoid: void, delete.
```

## Rules

- One or two sentences per term. Say what the thing is, in business words.
- Pick one word per concept. List the rejected synonyms under "Avoid".
- Only terms specific to this domain. General software words (timeout, cache, retry) stay out.
- No implementation detail: no table names, class names or endpoints. The glossary outlives the code.
- Update it the moment a term is settled, in the same session. Batching updates means they get lost.
- Group terms under headings once clusters appear. A flat list is fine for a small domain.

## Several contexts in one repo

When the same word means different things in different parts of the system (an "account" in billing and in identity), each context gets its own glossary next to its code. A short map at the root lists them:

```markdown
# Glossary map

- [Ordering](src/ordering/GLOSSARY.md): takes and tracks customer orders.
- [Billing](src/billing/GLOSSARY.md): invoices and payments.

## How they relate

- Ordering publishes OrderPlaced. Billing creates the invoice from it.
- Both refer to a customer by ID only. Identity owns the customer.
```

When the topic of a question is ambiguous between contexts, ask which one before writing.

## Challenging terms during grilling

- Quote the glossary entry when the user's word contradicts it: "The glossary says cancellation ends the whole order. You just described cancelling one line. Which is it?"
- Propose the precise term when the user's word is overloaded, and add the loser to "Avoid".
- Check the code: if the code models it differently from what the user says, show the file and line.
