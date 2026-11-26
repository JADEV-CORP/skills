#!/usr/bin/env python3
"""Check agent skill folders against the JADEV skill checklist.

Standard library only, Python 3.10 or later. For each skill folder (a folder
that holds a SKILL.md) it reports:

  description  length of the frontmatter description (limit 250 characters)
  size         SKILL.md length in characters (must stay under 5,000)
  frontmatter  name matches the folder, description is double-quoted,
               license is MIT, no allowed-tools key
  references   files that a Markdown file in the skill points to but that do
               not exist
  dashes       em dash, en dash and look-alike characters in any text file
  runtime      package installs at run time (npx, pip, curl or wget piped
               into a shell)
  banned       matches for the regular expressions given with --ban or
               --ban-file

Usage:
  python3 check-skill.py PATH [PATH ...] [--ban REGEX] [--ban-file FILE]

PATH is a skill folder or a folder that holds skill folders. Patterns are
Python regular expressions, matched case-insensitively. A ban file holds one
pattern per line; blank lines and lines starting with # are skipped. Ban files
are never scanned themselves, so a pattern list can live inside a skill.

Exit code: 0 when every skill passes, 1 when any check fails, 2 on bad usage.
"""

import argparse
import re
import sys
from pathlib import Path

MAX_DESCRIPTION = 250
SKILL_SIZE_LIMIT = 5000  # SKILL.md must stay strictly under this many characters
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv"}

# Built with chr() so this file never contains the characters it hunts for.
DASHES = {
    chr(0x2012): "figure dash",
    chr(0x2013): "en dash",
    chr(0x2014): "em dash",
    chr(0x2015): "horizontal bar",
}

RUNTIME_PATTERNS = [
    re.compile(r"\bnpx\s+(?:-y\s+|--yes\s+)?[@\w]"),
    re.compile(r"\bpip3?\s+install\b"),
    re.compile(r"\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b"),
]

# Folder names that, at the start of a path, mean "a file inside this skill".
SKILL_DIRS = {"references", "reference", "scripts", "assets", "templates", "examples"}

# A relative path with at least one folder and a file extension. The look-behind
# stops matches from starting in the middle of a longer path or a URL.
PATH_RE = re.compile(r"(?<![\w/.:-])((?:[\w.$<>{}-]+/)+[\w.-]+\.[A-Za-z0-9]{1,8})(?![\w/])")
LINK_RE = re.compile(r"\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")


def read_text(path):
    """Return the file as text, or None for binary or non UTF-8 files."""
    data = path.read_bytes()
    if b"\0" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def text_files(root, excluded):
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.resolve() in excluded:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        text = read_text(path)
        if text is not None:
            yield path, text


def unquote(raw):
    """Return (value, style) for a one-line YAML scalar."""
    if len(raw) >= 2 and raw[0] == raw[-1] == '"':
        escapes = {"n": "\n", "t": "\t"}
        value = re.sub(r'\\(["\\/nt])', lambda m: escapes.get(m.group(1), m.group(1)), raw[1:-1])
        return value, "double"
    if len(raw) >= 2 and raw[0] == raw[-1] == "'":
        return raw[1:-1].replace("''", "'"), "single"
    return raw, "plain"


def parse_frontmatter(text):
    """Read top-level keys of the frontmatter. Returns (fields, error).

    Each field maps to (value, style). Nested keys (metadata) are skipped.
    Block scalars (> or |) are joined from their indented lines.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, "SKILL.md does not start with a --- frontmatter line"
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return {}, "frontmatter has no closing --- line"
    fields = {}
    i = 1
    while i < end:
        line = lines[i]
        i += 1
        if not line.strip() or line.lstrip().startswith("#") or line[0] in " \t":
            continue
        key, sep, raw = line.partition(":")
        if not sep:
            return fields, "unreadable frontmatter line: " + line.strip()
        raw = raw.strip()
        if raw[:1] in (">", "|"):
            block = []
            while i < end and (not lines[i].strip() or lines[i][0] in " \t"):
                block.append(lines[i].strip())
                i += 1
            joiner = " " if raw.startswith(">") else "\n"
            fields[key.strip()] = (joiner.join(b for b in block if b), "block")
        else:
            fields[key.strip()] = unquote(raw)
    return fields, None


def check_frontmatter(skill, text):
    """Return (description_length or None, problems)."""
    fields, error = parse_frontmatter(text)
    problems = [error] if error else []
    name = fields.get("name", ("", ""))[0]
    if not name:
        problems.append("name is missing")
    elif name != skill.name:
        problems.append(f"name '{name}' does not match folder '{skill.name}'")
    elif not NAME_RE.match(name) or len(name) > 64:
        problems.append(f"name '{name}' must be lowercase letters, digits and hyphens, 64 at most")
    description, style = fields.get("description", ("", ""))
    if not description:
        problems.append("description is missing")
    elif style != "double":
        problems.append("description is not double-quoted")
    if fields.get("license", ("", ""))[0] != "MIT":
        problems.append("license is not MIT")
    if "allowed-tools" in fields:
        problems.append("allowed-tools must not be set")
    return (len(description) if description else None), problems


def outside_fences(text):
    """Blank out fenced code blocks, keeping line numbers.

    Links inside a code example illustrate a format; they do not point at
    files of this skill.
    """
    kept, fence = [], None
    for line in text.split("\n"):
        marker = line.lstrip()[:3]
        if fence is None and marker in ("```", "~~~"):
            fence = marker
            kept.append("")
        elif fence is not None:
            if marker == fence:
                fence = None
            kept.append("")
        else:
            kept.append(line)
    return "\n".join(kept)


def referenced_paths(text):
    """Yield (relative path, from_link) for paths that look like skill files."""
    for match in LINK_RE.finditer(outside_fences(text)):
        target = match.group(1).split("#", 1)[0]
        if not target or "://" in target or target.startswith(("mailto:", "/", "~")):
            continue
        yield target, True
    for match in PATH_RE.finditer(text):
        yield match.group(1), False


def check_references(skill, path, text):
    """Return (count checked, list of 'file:line: path' for missing files)."""
    checked, missing, seen = 0, [], set()
    skill_dirs = SKILL_DIRS | {p.name for p in skill.iterdir() if p.is_dir()}
    for rel, from_link in referenced_paths(text):
        parts = rel.split("/")
        # Drop leading placeholders such as <skill>/ or {baseDir}/ or $DIR/.
        while parts and any(c in parts[0] for c in "<{$"):
            parts = parts[1:]
        if not parts or any(c in "".join(parts) for c in "<>{}$*"):
            continue
        # Links are checked whatever they point to. A bare path counts only when
        # it starts with a skill folder: "./x" in a code example is the user's
        # project, not this skill.
        if not (from_link or parts[0] in skill_dirs):
            continue
        clean = "/".join(parts)
        if clean in seen:
            continue
        seen.add(clean)
        checked += 1
        if not ((skill / clean).exists() or (path.parent / clean).exists()):
            line = text.count("\n", 0, text.find(rel)) + 1
            missing.append(f"{path.relative_to(skill)}:{line}: {clean}")
    return checked, missing


def scan_lines(skill, path, text, patterns):
    """Return 'file:line: label: snippet' for every pattern hit."""
    hits = []
    for number, line in enumerate(text.splitlines(), start=1):
        for label, regex in patterns:
            for match in regex.finditer(line):
                snippet = match.group(0)[:60]
                hits.append(f"{path.relative_to(skill)}:{number}: {label}: {snippet}")
    return hits


def check_skill(skill, banned, excluded):
    """Return a list of (status, check, summary, details)."""
    rows = []
    skill_md = skill / "SKILL.md"
    text = read_text(skill_md) or ""

    length, problems = check_frontmatter(skill, text)
    if length is None:
        rows.append(("FAIL", "description", "missing", []))
    else:
        status = "ok" if length <= MAX_DESCRIPTION else "FAIL"
        rows.append((status, "description", f"{length}/{MAX_DESCRIPTION} chars", []))

    size = len(text)
    status = "ok" if size < SKILL_SIZE_LIMIT else "FAIL"
    rows.append((status, "SKILL.md", f"{size} chars (must stay under {SKILL_SIZE_LIMIT})", []))

    rows.append(("FAIL" if problems else "ok", "frontmatter",
                 f"{len(problems)} problem(s)" if problems else "name, description, license", problems))

    checked, missing, dashes, runtime, bans = 0, [], [], [], []
    dash_patterns = [(name, re.compile(char)) for char, name in DASHES.items()]
    runtime_patterns = [("runtime install", regex) for regex in RUNTIME_PATTERNS]
    for path, body in text_files(skill, excluded):
        if path.suffix.lower() in (".md", ".markdown"):
            count, lost = check_references(skill, path, body)
            checked += count
            missing += lost
        dashes += scan_lines(skill, path, body, dash_patterns)
        runtime += scan_lines(skill, path, body, runtime_patterns)
        bans += scan_lines(skill, path, body, banned)

    rows.append(("FAIL" if missing else "ok", "references",
                 f"{checked} checked, {len(missing)} missing", missing))
    rows.append(("FAIL" if dashes else "ok", "dashes", f"{len(dashes)} found", dashes))
    rows.append(("FAIL" if runtime else "ok", "runtime", f"{len(runtime)} found", runtime))
    rows.append(("FAIL" if bans else "ok", "banned",
                 f"{len(bans)} hit(s), {len(banned)} pattern(s)", bans))
    return rows


def usage_error(message):
    print(f"check-skill: {message}", file=sys.stderr)
    sys.exit(2)


def find_skills(paths):
    skills = []
    for raw in paths:
        path = Path(raw).expanduser()
        if (path / "SKILL.md").is_file():
            skills.append(path)
        elif path.is_dir():
            found = sorted(p for p in path.iterdir() if (p / "SKILL.md").is_file())
            if not found:
                usage_error(f"no SKILL.md in {path} or its subfolders")
            skills += found
        else:
            usage_error(f"not a folder: {path}")
    return skills


def load_patterns(args):
    sources = [("--ban", p) for p in args.ban]
    excluded = set()
    for file_name in args.ban_file:
        path = Path(file_name).expanduser()
        if not path.is_file():
            usage_error(f"ban file not found: {path}")
        excluded.add(path.resolve())
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.lstrip().startswith("#"):
                sources.append((path.name, line.strip()))
    patterns = []
    for origin, source in sources:
        try:
            patterns.append((f"banned /{source}/", re.compile(source, re.IGNORECASE)))
        except re.error as exc:
            usage_error(f"bad pattern from {origin}: {source} ({exc})")
    return patterns, excluded


def main():
    parser = argparse.ArgumentParser(description="Check agent skill folders against the JADEV skill checklist.")
    parser.add_argument("paths", nargs="+", help="skill folder, or a folder of skill folders")
    parser.add_argument("--ban", action="append", default=[], metavar="REGEX", help="banned pattern, repeatable")
    parser.add_argument("--ban-file", action="append", default=[], metavar="FILE",
                        help="file with one banned pattern per line, repeatable")
    args = parser.parse_args()

    banned, excluded = load_patterns(args)
    failed = []
    skills = find_skills(args.paths)
    for skill in skills:
        print(f"== {skill.name}")
        rows = check_skill(skill, banned, excluded)
        for status, check, summary, details in rows:
            print(f"  {status:<4}  {check:<12} {summary}")
            for detail in details:
                print(f"          {detail}")
        if any(row[0] == "FAIL" for row in rows):
            failed.append(skill.name)
    passed = len(skills) - len(failed)
    print(f"\n{len(skills)} skill(s) checked, {passed} passed, {len(failed)} failed"
          + (": " + ", ".join(failed) if failed else "."))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
