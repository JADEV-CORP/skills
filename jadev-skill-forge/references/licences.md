# Licence check

Reading another skill for ideas is fine. Copying its text, code or close structure needs its licence to allow it, and this repo publishes under MIT.

## Before reusing anything

1. Find the licence: a `LICENSE` file in the skill folder or the repo root, a `license` key in the frontmatter, a header in each script, a plugin manifest.
2. Read it. The name in a badge or a frontmatter key is not the licence text.
3. Decide with the table, and record the decision in your report.

| Licence found | Reuse into an MIT skill |
|---|---|
| MIT, BSD-2, BSD-3, ISC, 0BSD, Unlicense, CC0 | Allowed. Keep the original copyright and licence notice with the reused part (MIT and BSD require it). |
| Apache-2.0 | Allowed with conditions: keep the notice and any NOTICE file, and mark what you changed. Simpler to write from scratch for prose. |
| CC BY 4.0 | Allowed with credit (author, source, licence, changes). Fits docs, poor fit for code. |
| CC BY-SA, GPL, LGPL, AGPL, MPL | Share-alike or copyleft terms. Do not copy into an MIT repo. Write from scratch. |
| CC BY-NC, "non-commercial", custom terms | Do not copy. |
| No licence at all | All rights reserved by default. Do not copy. Write from scratch. |
| "Proprietary", "internal", "confidential" | Do not copy, and do not quote. |

## Writing from scratch

- Note what the source covers (the scope), close it, and write your own steps from your own experience.
- Do not paraphrase sentence by sentence. A close paraphrase of an unlicensed text is still a copy.
- Facts, commands, file formats and standard terms are not protected. Use them freely.
- If you reused something by mistake, remove it before the first push. Git history is public.

## Scripts and dependencies

- A script that imports a third-party package inherits that package's licence terms for distribution. Prefer the standard library.
- Never vendor code from a repo without checking its licence file and keeping its notice.

## Citing

Linking to a public source as further reading is always fine. Cite the title and the link.
