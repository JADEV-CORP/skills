# Leak check

A public skill must not reveal who wrote it for whom. Check every file in the folder, scripts and examples included.

## What counts as a leak

- People's names, other than authors of public works you cite on purpose.
- Client, partner, product and project names that are not public.
- Internal paths: home folders, drive letters, mounted volumes, private repo names.
- Internal hosts and organization names: company domains, intranet hosts, cloud organization or tenant names in URLs.
- IDs: tenant, subscription, object and work item IDs, GUIDs, account numbers.
- Contact data: emails, phone numbers, street addresses.
- Prices, rates, salaries, budgets.
- Secrets: keys, tokens, passwords, connection strings, private keys. Fake ones in tests too, unless the folder is excluded from secret scanning on purpose.

## Run the script with two lists

```
python3 scripts/check-skill.py <skill-folder> \
  --ban-file references/leak-patterns.txt \
  --ban-file <private-list-outside-the-repo>
```

- `references/leak-patterns.txt` ships with this skill. It catches the generic shapes: home paths, emails, GUIDs, long hex strings, phone numbers, IBANs, prices, common key formats, organization names in Azure DevOps URLs.
- The private list holds the real words: people's names, client names, internal host names, project code names. One Python regular expression per line, matched case-insensitively. Keep it in your home folder or a private repo, never in the public one. A list of names you must not publish is itself a leak.

Ban files are never scanned by the script, so the generic list can live inside this skill.

## Read the hits

Every hit is a candidate. Decide per hit:

- **Real leak:** replace with a placeholder (`<org>`, `<tenant-id>`, `<customer>`), or remove it.
- **Harmless:** an example domain (`example.com`), a placeholder organization (`acme`), an all-zero GUID, a well-known public constant (a cloud provider's built-in role or first-party application ID), a file extension, a fake credential in a test that checks secret detection. Leave it, and tighten the pattern if it keeps firing.

## Also check by hand

- Git history: a leak removed in the last commit is still public once pushed. Before the first push, check `git log -p` for anything you replaced.
- Screenshots, recordings, PDFs and binary files: the script skips them. Open each one.
- File names and folder names.
- Example outputs pasted into references: they often carry real paths and IDs.
