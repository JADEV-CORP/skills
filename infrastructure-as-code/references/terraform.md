# Terraform on Azure

Terraform 1.17.2 and the `azurerm` provider 5.15.0 were current on 2026-11-26. OpenTofu works with the same configuration for everything below.

## Layout

```
infra/
├── modules/
│   ├── network/
│   ├── data/
│   └── app/
└── envs/
    ├── dev/       main.tf, backend.tf, terraform.tfvars
    └── prod/
```

One state per environment and per lifecycle (network, data, apps), so a plan for an app change cannot touch the database.

## Versions and provider

```hcl
terraform {
  required_version = "~> 1.17"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.15"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id                 = var.subscription_id
  resource_provider_registrations = "none" # register what you need explicitly
  storage_use_azuread             = true   # data-plane calls with Entra, not account keys
}
```

- Commit `.terraform.lock.hcl`. Upgrade providers on purpose with `terraform init -upgrade`, in its own pull request.
- `azurerm` 4.0 and later need a subscription ID (`subscription_id` or `ARM_SUBSCRIPTION_ID`). From 5.0, resource providers are no longer registered by default.
- Prefer Azure Verified Modules for Terraform (`Azure/avm-res-*` on the registry) over home-grown modules, pinned to an exact version.

## Remote state

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-prod"
    storage_account_name = "sttfstateprod<suffix>"
    container_name       = "tfstate"
    key                  = "orders/app.tfstate"
    use_azuread_auth     = true
  }
}
```

- State holds every attribute of every resource, secrets included. The storage account gets: Entra auth only (shared keys disabled), private access or a tight firewall, versioning and soft delete on blobs, a delete lock, and RBAC limited to the pipeline identity and a break-glass group.
- Never commit `*.tfstate`, `*.tfplan` or `*.tfvars` holding secrets. Mark sensitive variables and outputs `sensitive = true`; that hides them in logs, not in state.

## Secrets

- Generate them where they live (`random_password` written straight to Key Vault) or reference existing Key Vault secrets by ID. Better still, use managed identities and Entra authentication so no secret exists.
- Pass unavoidable inputs as `TF_VAR_*` environment variables from the pipeline secret store.

## Plan and apply

```bash
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=tfplan
terraform show -no-color tfplan > plan.txt   # attach to the pull request
```

- Read the plan for `-/+` (replace) and `-` (destroy). A replace on a database, vault or storage account needs a stated reason and a backup.
- Use `lifecycle { prevent_destroy = true }` on resources that hold data.
- Rename or move resources with `moved` blocks and adopt existing ones with `import` blocks, both reviewed in the plan, instead of `terraform state` commands run by hand.
- Apply exactly the reviewed plan file (`terraform apply tfplan`) in the same pipeline run. A plan from yesterday is stale.

## CI with OpenID Connect

GitHub Actions:

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: actions/checkout@v7
  - uses: hashicorp/setup-terraform@v4
    with:
      terraform_version: 1.17.2
  - run: terraform init && terraform plan -out=tfplan
    working-directory: infra/envs/prod
    env:
      ARM_USE_OIDC: "true"
      ARM_CLIENT_ID: ${{ vars.AZURE_CLIENT_ID }}
      ARM_TENANT_ID: ${{ vars.AZURE_TENANT_ID }}
      ARM_SUBSCRIPTION_ID: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

The client, tenant and subscription IDs are configuration, kept in repository or environment variables, not in code. The federated credential on the Entra app or managed identity is scoped to the repository and environment. Azure DevOps: a service connection with workload identity federation, used through the `AzureCLI@2` task with `addSpnToEnvironment: true`, or the Terraform tasks that support it.

## Scanning

Run one scanner on every pull request and fail on high findings: Checkov (3.4.11) or Trivy (0.76.2, which absorbed tfsec) for Terraform, PSRule for Azure (1.47.0) for Bicep and ARM. Pin the scanner version in the pipeline.

Docs: developer.hashicorp.com/terraform, registry.terraform.io/providers/hashicorp/azurerm (5.0 upgrade guide), azure.github.io/Azure-Verified-Modules.
