---
name: infrastructure-as-code
description: "Writes and reviews Azure infrastructure as code in Bicep or Terraform: secure defaults, pinned modules, what-if or plan before any change, keyless CI. Use when creating or changing .bicep, .bicepparam or .tf files, or reviewing an infra PR."
license: MIT
---

# Infrastructure as code (Azure)

Infrastructure changes are code changes with a larger blast radius. Every change is previewed, read, explained and approved before it is applied.

## Pick the tool

- Use what the repository already uses. Do not mix Bicep and Terraform for the same resources.
- New Azure-only work: Bicep with `.bicepparam` files and Azure Verified Modules (AVM). Multi-cloud or an existing Terraform estate: Terraform or OpenTofu with the `azurerm` provider.
- Do not hand-write ARM JSON. Convert it with `az bicep decompile` and clean up the result.

## Workflow

1. Read the existing layout: modules, naming, parameter files, pipelines, state backend. Follow it.
2. Change the smallest module that does the job. One concern per pull request.
3. Validate locally: `bicep build` and `bicep lint` (or `terraform fmt -check`, `terraform validate`).
4. Preview against the target: `az deployment group what-if` (or `sub`), `az stack-whatif group create` for deployment stacks, `terraform plan -out=tfplan`.
5. Read the preview line by line. List every delete, replace and change to identity, network, SKU or data settings, with the reason. Drift you did not cause gets reported, not silently overwritten.
6. Never run `create`, `apply` or `destroy` yourself unless the user explicitly asks for that environment. Production goes through the pipeline and its approval.
7. Report: files changed, preview summary, risks, cost impact, rollback.

## Secure defaults (deviate only with a written reason)

- **No secrets in code, parameter files, outputs or state.** `@secure()` parameters, Key Vault references, managed identities. Outputs never return keys or connection strings.
- **Identity over keys.** Managed identities with RBAC role assignments at the narrowest scope (`AcrPull` on the registry, `Key Vault Secrets User` on the vault). Disable local auth where the service supports it: SQL Entra-only authentication, `adminUserEnabled: false` on registries, `disableLocalAuth` on Service Bus and Cosmos DB once apps use Entra tokens.
- **Private by default for data services.** `publicNetworkAccess: 'Disabled'`, private endpoints plus private DNS zones linked to the VNet. The SQL rule `0.0.0.0` ("allow Azure services") admits every Azure customer's resources: it is not a security control.
- **TLS 1.2 minimum, HTTPS only, CORS limited to known origins.**
- **GA API versions only.** No `-preview` in production templates. Turn on the Bicep linter rule `use-recent-api-versions`.
- **Pinned versions.** AVM modules by exact version (`br/public:avm/res/key-vault/vault:0.14.4`), Terraform `required_providers` with constraints plus a committed `.terraform.lock.hcl`, container images by tag or digest, never `latest`.
- **Globally unique names within limits.** Follow the Cloud Adoption Framework abbreviations and add `uniqueString(resourceGroup().id)` where names are global. Key Vault and storage names: 3 to 24 characters. Storage and registry names: letters and digits only.
- **Protect production state.** Key Vault purge protection, soft delete, backups, and delete locks or deployment stack deny settings on resources that hold data.
- **Observability.** Diagnostic settings to a Log Analytics workspace for every resource that supports them. Tags for owner, environment and cost centre.
- **Environment parity.** Dev may be smaller, not different. Service Bus Basic has no topics; a Basic dev namespace hides bugs that a Premium production one would show.

## Retirements to design around

- Azure Cache for Redis (Basic, Standard, Premium) retires on 30 September 2028; new customers cannot create caches from 1 April 2026. Use Azure Managed Redis.
- `azurerm` 5.0 no longer registers resource providers by default.

Check Azure updates for the services you touch.

## CI

- Sign in with OpenID Connect (GitHub federated credentials, Azure DevOps workload identity federation). No client secrets.
- Pull request: lint, build, preview, scanner (PSRule for Azure, Checkov or Trivy), preview posted to the PR.
- Main: apply the reviewed artifact (saved `tfplan`, or the same template and parameters) behind an environment approval.

## References (load when needed)

- `references/bicep.md`: layout, `.bicepparam`, AVM examples, role assignments, private endpoints, deployment stacks, commands.
- `references/terraform.md`: layout, remote state, provider setup, plan and apply in CI.
- `references/review-checklist.md`: what to check on an infra pull request.

Docs: learn.microsoft.com/azure/azure-resource-manager/bicep, azure.github.io/Azure-Verified-Modules, the Cloud Adoption Framework abbreviations, registry.terraform.io/providers/hashicorp/azurerm.
