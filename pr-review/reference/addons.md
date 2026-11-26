# Review profiles and add-ons

Every Azure DevOps organization the skill reviews needs a profile. Two ways to give it one:

- **Built-in profile.** Edit `profiles/example.json` in your copy of the skill: set `orgs` to your organization name and replace `<your-entra-tenant-id>` with your Microsoft Entra tenant ID (or drop the `--tenant` pair if your default `az` account already signs in to the right tenant). Every `.json` file in `profiles/` is loaded, so you can keep one file per organization.
- **Private add-on.** For an organization whose name, rules or procedures must not sit in a shared copy of the skill (a client, for example).

`499b84ac-1321-427f-aa17-267ca6975798` in the token command is the public Azure DevOps resource ID that Microsoft documents for Entra tokens. Leave it as is.

## Where add-ons live

`~/.config/pr-review/addons/<name>/addon.json`, with any extra files next to it. Add-ons never go into this repository, a commit, a shared page or an outside service. They can hold a client's organization name, rules and procedures, which stay on the reviewer's machine.

An add-on whose `orgs` match a built-in profile overrides it and inherits the fields it leaves out. Use this to change only the token command, for example when your default `az` account belongs to another tenant:

```json
{ "name": "my-org-local", "orgs": ["your-org"], "tokenCommand": ["az", "account", "get-access-token", "--subscription", "<your subscription id>", "--resource", "499b84ac-1321-427f-aa17-267ca6975798", "--query", "accessToken", "-o", "tsv"] }
```

An add-on that covers a built-in organization and another one inherits nothing, so a client organization never picks up another organization's settings.

## Fields

| Field | Meaning | Default for a new organization |
|---|---|---|
| `name` | Profile name, shown in `review.json` | required |
| `orgs` | Azure DevOps organization names it covers (case-insensitive) | required |
| `tokenCommand` | Command that prints an Azure DevOps token. Run as an argument list, never through a shell | required |
| `language` | Language of the comments (`en`, `en-GB`, `fr`, ...) | `en` |
| `groups` | Map from category to the organization's own headings, used on the page | `null` (group by severity) |
| `assetRegisterCheck` | Check added images, fonts and media against an `ASSETS.md` register at the repository root | `false` |
| `outsideLookups` | Look up licences and known vulnerabilities of new dependencies. Sends package names and versions to the public npm, NuGet and PyPI registries and to OSV.dev; nothing else leaves the machine | `false` |
| `workRoot` | Where work folders go (`~` allowed) | `~/pr-reviews` |
| `instructions` | Extra review instructions, relative to the add-on folder | `null` |
| `brand` | Page branding: `{ "name", "accent" (CSS colour), "logo" (png, svg, jpg or webp up to 100 KB, relative to the profile folder), "robot" (true or false) }` | the profile name, no logo, robot on |

Turn `outsideLookups` on only where the organization allows package names to be sent to those services. With it off, licences show as unknown and you check them by hand.

## Example add-on for a made-up organization

`~/.config/pr-review/addons/example-client/addon.json`:

```json
{
  "name": "example-client",
  "orgs": ["ExampleClientOrg"],
  "tokenCommand": ["az", "account", "get-access-token", "--tenant", "<client tenant id>", "--resource", "499b84ac-1321-427f-aa17-267ca6975798", "--query", "accessToken", "-o", "tsv"],
  "language": "en-GB",
  "groups": { "Bug": "Bugs", "Missing": "Bugs", "Security": "Security", "Quality": "Suggestions", "Tests": "Tests and docs", "Docs": "Tests and docs", "Story": "Tests and docs", "Licence": "Hygiene", "Breaking change": "Bugs" },
  "assetRegisterCheck": false,
  "outsideLookups": false,
  "workRoot": "~/pr-reviews/example-client",
  "instructions": "instructions.md"
}
```

`instructions.md` holds what the client's own review procedure adds: gates to pass first, extra checks, where to keep records.
