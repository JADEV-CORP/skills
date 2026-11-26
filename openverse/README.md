# openverse

A Claude Code skill that searches [Openverse](https://openverse.org) for openly licensed sound effects, ambiences, music and images, and downloads them with their licence and credit line saved next to each file.

Only CC0, public domain (pdm) and CC BY results are allowed. The script refuses NC, ND, SA and unknown licences, so everything it fetches can be used in commercial and organic posts as long as CC BY items are credited.

## What it does

- `search`: queries the Openverse API (no key needed) and lists id, title, licence, creator, source, duration and landing page. Audio results can be capped by length with `--max-s`.
- `get`: downloads each id into an output folder as `<id>.<ext>` plus `<id>.json` with title, creator, licence, licence URL, landing page and the attribution line.

The script is a single Python file, standard library only, Python 3.10 or later.

```
python3 -I scripts/openverse.py search "footsteps on gravel" --max-s 8 --n 20
python3 -I scripts/openverse.py search "city park" --kind images --licence cc0
python3 -I scripts/openverse.py get assets/foley <id> <id>
```

## Install

Copy the `openverse` folder into `~/.claude/skills/` (all projects) or into `.claude/skills/` in a project. Claude Code picks it up on the next session and loads it when a task needs free sounds or images.

## Notes

- Openverse mirrors licence data from the source sites. Confirm the licence on the landing page before a file ships.
- Treat downloads as untrusted data: keep each batch in its own folder and never execute anything from it.
- Anonymous API requests are rate limited. The script downloads sequentially and backs off on 429 and 5xx errors.
