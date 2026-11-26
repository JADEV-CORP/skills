# Question bank

Pick the questions that bite for this plan. Rewrite each one in the domain's words and attach a concrete scenario. A generic question gets a generic answer.

## Purpose and scope

- What does a user do differently once this ships? How will you know it worked?
- What happens if we never build it? Who notices, and when?
- What is explicitly out of scope, and who agreed to that?
- Which part of this plan are you least sure about?

## Domain and language

- What exactly is a <term> here? When does one start existing, and when does it stop?
- Can one <thing> belong to two <owners>? Can it move from one to another?
- What is the difference between cancelled, deleted, expired and archived in this domain? Which of them can be undone?
- Who is allowed to change this, and who only reads it?

## Data

- Who owns this data? Which service is the source of truth, and who keeps a copy?
- What happens to existing records when the rule changes? Is there a backfill, and can it run twice safely?
- How large does this get in a year? Which query must stay fast at that size?
- What do we delete, when, and what must we keep for legal or audit reasons?

## Failure

- The downstream call times out after the write succeeded. What state is the system in? What does the retry do?
- Two requests for the same thing arrive at the same moment. Which one wins? What does the loser see?
- Events arrive out of order, or twice. What breaks?
- The job dies halfway through. How does it resume, and how do we know where it stopped?

## Contracts and integration

- Who consumes this API, event or file today? Which of them breaks if a field is renamed or removed?
- How do old and new versions run side by side during the rollout?
- What does a partner see while we are deploying?

## Scale and performance

- What is the expected peak, and what happens at ten times that?
- Which call is on the hot path, and what is its time budget?
- What gets cached, for how long, and how is the cache invalidated?

## Security and privacy

- Who can call this, and where is that checked?
- What personal data passes through, and where could it end up in logs?
- What does an attacker gain by replaying, guessing or enumerating this request?

## Operations

- How will you know it is broken before a user tells you? Which alert fires?
- How do you roll it back? Does rollback lose data?
- Who gets paged, and what does the runbook say?
- Does every environment, region and cloud we run in have the services this needs?

## Migration

- Can you migrate in small steps and stop halfway?
- What is the plan if the migration has to be reversed after users wrote new data?
- How do you prove the migrated data matches the original?

## Cost and team

- What does this cost to run per month at expected volume, and at peak?
- Who maintains this in a year? Can someone new change it without the original author?
- What do we stop doing to make room for this?
