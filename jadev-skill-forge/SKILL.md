---
name: jadev-skill-forge
description: "Writes, checks, finds and installs agent skills the JADEV way: sharp trigger description, short SKILL.md, references, then trigger, size, leak and licence checks with a script. Use when creating, reviewing, finding or installing a skill."
license: MIT
---

# Skill forge

A skill is a folder an agent loads when a request matches its description. The description decides when it loads. The body decides what the agent does next. Write both for a reader who has never seen your project.

## Layout

```
my-skill/
  SKILL.md          frontmatter and instructions, under 5,000 characters
  references/       detail that SKILL.md points to, loaded only when needed
  scripts/          small standard-library scripts for exact, repeatable work
```

The folder name equals `name`: lowercase letters, digits and hyphens.

```yaml
---
name: my-skill
description: "Does X from Y. Use when the user asks for A, B or mentions C."
license: MIT
---
```

No other required keys. Never set `allowed-tools`.

## Write it

1. Collect three real requests the skill must handle. They become the trigger test.
2. Write the description first: what it does, then "Use when" or "Use for" with the words people actually type. Double-quoted, 250 characters or less.
3. Write SKILL.md in the imperative: steps, rules, output shape. Concrete commands and file names. Leave out what a capable model already knows.
4. Move long material (tables, templates, stack notes, examples) to `references/`. Point to each file from SKILL.md with a line on when to load it.
5. Add a script only when the work must be exact or repeatable. Python 3 standard library or plain shell. Test it by running it.

The full checklist, with the reason for each rule, is in `references/checklist.md`.

## Check it

Run every check before calling a skill done, and show the output.

1. **Script.** `python3 scripts/check-skill.py <skill-or-folder> --ban-file references/leak-patterns.txt --ban-file <your private list>`. It reports description length, SKILL.md size, frontmatter, missing referenced files, dash characters, runtime installs and banned patterns. Exit code 0 means clean. Point it at a folder of skills to check them all.
2. **Trigger test.** Three prompts that must load the skill and three near misses that must not. Method in `references/trigger-test.md`.
3. **Leak check.** Names, clients, internal paths and hosts, IDs, emails, phone numbers, prices, secrets. Method in `references/leak-check.md`. Keep the list of real names outside the repo.
4. **Licence check.** Read the licence before reusing anyone's text, code or structure. Rules in `references/licences.md`. When in doubt, write from scratch.
5. **Cold read.** Read SKILL.md top to bottom as a stranger. Cut every sentence that does not change what the agent does.

## Writing rules

- Short sentences, imperative, concrete. Say the thing, then stop.
- No em or en dash characters. Use a comma, a colon or a new sentence.
- No telemetry. No package installs at run time (npx, pip, curl piped into a shell). No instruction to send data to a third party.
- No client names, people's names, internal paths, hostnames, IDs or prices. Use placeholders such as `<org>` and `<repo>`.
- One skill, one job. If the description needs "and also", split the skill.
- No AI attribution and no filler about what the assistant will do.

## Find before you write

Look for an existing skill first: `~/.claude/skills/`, `.claude/skills/` in the project, installed plugins, then public repositories. Read the candidate's SKILL.md, every script and its licence before installing. Never run an installer you have not read. Steps in `references/install.md`.

## Install

```
cp -R my-skill ~/.claude/skills/              # all projects, pinned copy
cp -R my-skill <project>/.claude/skills/      # one project, shared through git
ln -s "$PWD/my-skill" ~/.claude/skills/my-skill   # follows a working copy
```

Start a new session. The skill loads when a request matches its description, or by name with `/my-skill`.

## Report

```
Skill:     name and one-line purpose
Files:     paths and sizes
Checks:    check-skill.py summary line, trigger test 6/6, leak and licence result
Open:      anything not verified, and why
```
