# Writing guide

## Slicing stories (SPIDR)

When a story is too large to finish and test within a short cycle, split it along one of these lines:

- **Spike:** a time-boxed investigation that answers one question (can the payment provider do partial refunds?). It produces knowledge, not a feature; the real stories follow.
- **Paths:** one story per path through the workflow (pay by card; pay by bank transfer).
- **Interfaces:** one channel or device first (web, then mobile), or a simple version of the interface first.
- **Data:** a subset of data types or sources first (domestic addresses, then international).
- **Rules:** the core rule first, the special cases later (standard pricing, then discounts).

Never split by layer (backend story, frontend story): neither half is usable or testable by a user.

## INVEST

Independent, Negotiable, Valuable, Estimable, Small, Testable (Bill Wake). A story that fails one of them needs rewriting or splitting before planning.

## Acceptance criteria that test well

- One rule per criterion. "And" in the Then part is fine; a second When means a second criterion.
- Observable results only: what the user sees, what the API returns, what is stored, what is sent. Not "the system handles it correctly".
- Concrete values. "Shows an error" is weak; "shows 'Quantity must be between 1 and 10' next to the field and keeps the entered value" is testable.
- Use an examples table when the rule depends on values:

| Basket total | Customer type | Discount |
|---|---|---|
| 99.99 | standard | 0 |
| 100.00 | standard | 5 % |
| 100.00 | partner | 10 % |

- Cover the cases teams forget: no data yet, one item, the maximum, the maximum plus one, two people editing the same thing, a user losing permission mid-session, existing records created before the change, slow or failed third-party calls.

## Weak versus strong

| Weak | Strong |
|---|---|
| As a user, I want a better search. | As a support agent, I want to find an order by the customer's email, so that I can answer a call without asking for the order number. |
| The page should load fast. | The order list returns the first 50 orders in under 500 ms at the 95th percentile with 10,000 orders per tenant. |
| Users get notified. | Given an order ships, when the carrier confirms pickup, then the customer receives an email in their account language within 5 minutes, containing the tracking link. |
| Increase engagement by 20 %. | Weekly active buyers: today unknown (event `buyer_active` to add), target set after four weeks of baseline, owned by the product lead. |
| Admins can configure SSO. | Given a tenant admin, when they save a valid Microsoft Entra ID tenant ID and client ID, then users of that tenant see "Sign in with Microsoft" on the next login, and the change appears in the audit log. |

## Privacy and accessibility, briefly

- List the personal data the feature reads, stores or sends, why it is needed, who can see it, how long it is kept and how it is deleted. Flag anything new to whoever owns data protection.
- New screens meet WCAG 2.2 AA: keyboard use, visible focus, labels, contrast, error messages tied to fields, no information by colour alone. Products sold in the EU may fall under the European Accessibility Act, which applies from 28 June 2025.

## Final checklist

- [ ] The problem is stated with evidence, and the solution follows from it.
- [ ] Every number has a source or says `unknown` with a way to measure it. Nothing is invented.
- [ ] Non-goals are written down.
- [ ] Stories are vertical slices, smallest valuable first, each passing INVEST.
- [ ] Every acceptance criterion is observable and has concrete values.
- [ ] Permissions, errors, empty states, limits and existing data are covered.
- [ ] Qualities that apply have numbers.
- [ ] Release, migration, monitoring and rollback are described.
- [ ] Open questions have owners.
- [ ] Implementation detail lives in the linked design, unless it is the requirement.
- [ ] No client names, personal data or secrets in examples: use neutral sample data.
