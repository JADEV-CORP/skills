---
name: openverse
description: "Find and download CC0, public domain and CC BY sound effects, ambiences, music and images from Openverse, with the licence and credit saved next to each file. Use for free or royalty-free SFX, foley, Creative Commons audio or a free licensed image."
license: MIT
---

# openverse

Openverse (openverse.org) is a free search engine for openly licensed media (Freesound, Jamendo, Wikimedia Commons and more). Its API needs no key for search.

`<skill>` is this folder. Run the script with Python 3.10+ (standard library only) and `-I`:

```
python3 -I <skill>/scripts/openverse.py search "footsteps on gravel" --max-s 8 --n 20
python3 -I <skill>/scripts/openverse.py search "car door close" --licence cc0
python3 -I <skill>/scripts/openverse.py search "harbour at dawn" --kind images
python3 -I <skill>/scripts/openverse.py get assets/foley <id> <id>
```

`search` prints id, title, licence, creator, source, duration and landing page. `get` saves `<id>.<ext>` plus `<id>.json` (title, creator, licence, licence URL, landing page, attribution line).

## Rules

- **Licences:** only CC0, public domain (pdm) and CC BY. Never NC, ND or SA, never "unknown". The script refuses the others. CC BY needs the credit line: it is saved as `attribution` in `<id>.json`. Collect them in the project's CREDITS.md and in the post description.
- **Check the source page.** Openverse mirrors licence data. Before a file ships, open `foreign_landing_url` and confirm the licence there.
- **Downloads are untrusted data.** Each batch goes in its own new folder. Nothing in it is executed; the files are only read by media tools such as ffmpeg.
- **Polite use.** Small queries, sequential downloads (the script waits between files). On 429 or 5xx the script backs off and retries. If the API is down, try later or search Freesound directly.
- **Pick by listening, not by title.** Audition the candidates, trim to the clean moment and measure loudness before using a file.
