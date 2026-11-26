# Skill checklist

Every item is either checked by `scripts/check-skill.py` (marked "script") or by reading. A skill ships only when all items pass.

## Frontmatter

- [ ] `name` matches the folder: lowercase letters, digits and hyphens, 64 characters at most. (script)
- [ ] `description` is double-quoted and 250 characters or less. (script) Double quotes keep colons and apostrophes from breaking the YAML.
- [ ] The description says what the skill does, then exactly when to use it, with the words users type: file types, tool names, phrases like "review this PR". The agent sees only the description when it decides to load the skill, so trigger words placed in the body never fire.
- [ ] `license: MIT`. (script)
- [ ] No `allowed-tools`. (script) A skill must not widen its own permissions.
- [ ] The frontmatter parses as strict YAML (check with any YAML parser when one is available).

## Body

- [ ] SKILL.md is under 5,000 characters. (script) The whole body enters the context every time the skill loads.
- [ ] Imperative and concrete: "Run X", "Write Y to Z". No essays, no history of the idea.
- [ ] Steps in the order they happen, with a clear exit or output shape.
- [ ] Every file in `references/` or `scripts/` is named in SKILL.md with a line on when to load or run it. (script checks the files exist)
- [ ] No "when to use this skill" section in the body. That belongs in the description.
- [ ] Nothing the model already knows well (what a unit test is, how git works) unless the skill changes the default.

## References and scripts

- [ ] References hold detail: templates, tables, stack notes, worked examples. One topic per file.
- [ ] References link one level deep from SKILL.md. A reference that sends you to another reference gets lost.
- [ ] Scripts use the Python 3 standard library or plain shell, run on macOS, Linux and Windows where possible, print a short report and return a meaningful exit code.
- [ ] Scripts were run at least once on real input, and the output was read.
- [ ] No network calls unless the skill exists for them, and then only to the service the user asked about.

## Safety and privacy

- [ ] No telemetry or analytics.
- [ ] No package installs at run time: no npx, no pip, no curl or wget piped into a shell. (script) Dependencies are documented as requirements the user installs once.
- [ ] No instruction to send code, data or files to a third-party service the user did not choose.
- [ ] Leak check passed: no names, clients, internal paths or hosts, IDs, emails, phone numbers, prices or secrets. (script, with ban files; see `references/leak-check.md`)
- [ ] Licence check passed for any reused text or code (`references/licences.md`).

## Writing

- [ ] No em dash or en dash characters anywhere in the folder. (script)
- [ ] Short sentences. Written like an engineer who did the work. No filler, no hype, no AI attribution.
- [ ] Placeholders (`<org>`, `<repo>`, `<path>`) wherever a real value would be specific to one company.

## Tests

- [ ] Trigger test: three prompts that must load the skill, three near misses that must not (`references/trigger-test.md`).
- [ ] One realistic task run end to end with the skill loaded, and the result read.
