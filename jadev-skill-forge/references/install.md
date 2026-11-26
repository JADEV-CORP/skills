# Find and install a skill

## Find what is already there

Check local skills before searching anywhere else. You may already have one that fits, or one that would compete with the new skill.

```
ls ~/.claude/skills/ .claude/skills/ 2>/dev/null
find ~/.claude/plugins -name SKILL.md 2>/dev/null | sed 's|/SKILL.md$||'
grep -l -i "<keyword>" ~/.claude/skills/*/SKILL.md .claude/skills/*/SKILL.md 2>/dev/null
```

Read the description of each match. Two skills with overlapping descriptions fight over the same prompts; keep the better one.

## Search public sources

- Search code hosting sites for `SKILL.md` together with your topic, and the public skill collections you trust.
- Prefer skills with a licence file, recent commits, readable scripts and no setup step that downloads code.
- Search pages and registries are for reading. Install by copying the folder after review, never through a one-line installer that fetches and runs code.

## Review before installing

1. Read SKILL.md and every reference.
2. Read every script line by line. Look for network calls, file writes outside the working folder, shell commands built from input, and anything that sends data out.
3. Check the licence (`references/licences.md`).
4. Run `python3 scripts/check-skill.py <downloaded-skill>` with the leak lists. A third-party skill can fail the JADEV writing rules and still be safe; the runtime and banned checks matter most.
5. Keep downloaded skills in their own folder outside your projects until reviewed.

## Install

| Goal | Command |
|---|---|
| All projects, fixed version | `cp -R my-skill ~/.claude/skills/` |
| One project, shared with the team through git | `cp -R my-skill <project>/.claude/skills/` |
| Follow a working copy while you edit it | `ln -s "$PWD/my-skill" ~/.claude/skills/my-skill` |

- A copy does not change when the source changes. Update it on purpose.
- A symlink picks up every edit at the next session. Use it while developing, not for skills you did not write.
- Start a new session after installing. Check that the skill appears in the skill list, then run the trigger test.

## Remove or update

- Remove: delete the folder (or the symlink) from the skills directory, then start a new session.
- Update: replace the folder with the new version, rerun `check-skill.py` and the trigger test.
