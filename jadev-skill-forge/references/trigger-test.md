# Trigger test

The description is the only part of a skill the agent sees before it decides to load it. Test it like a function: inputs that must match, inputs that must not.

## Write six prompts

- **Three should trigger.** Phrase them the way a user would, not with the skill's own words. Vary them: one direct ("review this pull request"), one indirect ("can you check what my colleague changed before I approve?"), one with a file or tool name ("here is the dev.azure.com link").
- **Three should not.** Near misses that share vocabulary but belong elsewhere: a neighbouring skill's job, a question about the topic with no task, a task that is too small to need the skill.

## Run it

1. Start a fresh session with the skill installed and the neighbouring skills you expect to compete with.
2. Send each prompt on its own. Note whether the skill loaded and which other skill loaded instead.
3. Record the result:

| # | Prompt | Expected | Loaded | Pass |
|---|---|---|---|---|
| 1 | "can you check what changed in this PR before I approve" | jadev-example | jadev-example | yes |
| 4 | "what is a pull request" | none | none | yes |

When a fresh session is not available, read the description against each prompt and write down which words would match. Mark the result as a desk check, not a run.

## Fix failures

- **Missed trigger:** add the user's actual words to the "Use when" part. Users say "PR", "pull request" and "merge request"; list the ones your audience uses.
- **False trigger:** narrow the description with the object or context ("Azure DevOps pull request", "existing Postman collection"), or name what the skill does not cover when a neighbour owns it.
- **Two skills compete:** give each a distinct object. Overlap in verbs is fine; overlap in objects is the problem.

Rerun all six after every description change. A fix for one prompt often breaks another.
