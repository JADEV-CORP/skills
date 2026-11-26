# Bicep

Bicep CLI 0.49.2 and Azure CLI with deployment stack support (2.61.0 or later) were current on 2026-11-26. AVM versions below were the latest on that date: check the registry for newer ones and pin exactly.

## Layout

```
infra/
├── bicepconfig.json
├── main.bicep              composition only: modules and wiring
├── main.dev.bicepparam
├── main.prod.bicepparam
└── modules/
    ├── network.bicep       VNet, subnets, private DNS zones
    ├── observability.bicep Log Analytics, Application Insights
    ├── data.bicep          SQL, storage, Key Vault with private endpoints
    └── app.bicep           Container Apps environment, apps, identities, role assignments
```

Split modules by lifecycle and ownership, not one file per resource type. A module that holds every resource defeats review.

## bicepconfig.json

Raise the rules that catch real mistakes. Several useful ones are off by default.

```json
{
  "analyzers": {
    "core": {
      "rules": {
        "use-recent-api-versions": { "level": "warning" },
        "use-recent-module-versions": { "level": "warning" },
        "outputs-should-not-contain-secrets": { "level": "error" },
        "secure-parameter-default": { "level": "error" },
        "secure-secrets-in-parameters": { "level": "error" },
        "use-secure-value-for-secure-inputs": { "level": "error" },
        "no-hardcoded-env-urls": { "level": "error" }
      }
    }
  }
}
```

## Parameter files

`.bicepparam` replaces JSON parameter files: typed, checked against `main.bicep`, and able to read environment variables.

```bicep
using './main.bicep'

param environmentName = 'prod'
param location = 'westeurope'
param workload = 'orders'
param sqlAdminGroupName = 'sql-admins-orders-prod'
param sqlAdminGroupObjectId = '<Entra group object ID>'
param imageTag = readEnvironmentVariable('IMAGE_TAG')
```

No secret values in these files. If a deployment truly needs one, read it from Key Vault with `getSecret()` in the parameter file or pass it from the pipeline secret store.

## Names

```bicep
@allowed(['dev', 'test', 'prod'])
param environmentName string
param workload string

var suffix = uniqueString(subscription().id, resourceGroup().id)
// Key Vault: 3 to 24 characters, letters, digits and hyphens, no trailing hyphen.
var keyVaultName = take('kv-${workload}-${environmentName}-${suffix}', 24)
// Registry: 5 to 50 lowercase letters and digits.
var registryName = take('cr${workload}${environmentName}${suffix}', 50)
```

Abbreviations from the Cloud Adoption Framework: `rg`, `vnet`, `snet`, `pep`, `nsg`, `kv`, `cr`, `cae`, `ca`, `id`, `sql`, `sqldb`, `sbns`, `st`, `log`, `appi`, `amr` (Azure Managed Redis).

## Identity and access

```bicep
module appIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.6.0' = {
  params: {
    name: 'id-${workload}-${environmentName}'
    location: location
  }
}

module vault 'br/public:avm/res/key-vault/vault:0.14.4' = {
  params: {
    name: keyVaultName
    location: location
    enableRbacAuthorization: true
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
    privateEndpoints: [
      {
        subnetResourceId: privateEndpointSubnetId
        privateDnsZoneGroup: {
          privateDnsZoneGroupConfigs: [ { privateDnsZoneResourceId: keyVaultDnsZoneId } ]
        }
      }
    ]
    roleAssignments: [
      {
        roleDefinitionIdOrName: 'Key Vault Secrets User'
        principalId: appIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
      }
    ]
    diagnosticSettings: [ { workspaceResourceId: logAnalyticsWorkspaceId } ]
    lock: environmentName == 'prod' ? { kind: 'CanNotDelete' } : null
  }
}
```

Without AVM, a role assignment needs a deterministic name and the principal type, or it races identity replication:

```bicep
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull (built-in)

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, appIdentityPrincipalId, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: appIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}
```

A container app that pulls from a registry with a managed identity fails to start until that identity holds `AcrPull`. Assign it before the app revision is created (user-assigned identity, role assignment, then app).

## SQL with Entra-only authentication

Pass an Entra group as administrator and no SQL login or password at all:

```bicep
administrators: {
  administratorType: 'ActiveDirectory'
  azureADOnlyAuthentication: true
  login: sqlAdminGroupName
  sid: sqlAdminGroupObjectId
  principalType: 'Group'
  tenantId: tenant().tenantId
}
```

The AVM `sql/server` module (0.23.2) takes the same object in its `administrators` parameter. Apps connect with their managed identity (`Authentication=Active Directory Managed Identity` in the connection string). No firewall rule `0.0.0.0`.

## Container Apps networking

- Workload profiles environment: subnet `/27` or larger, delegated to `Microsoft.App/environments`.
- Consumption-only environment: subnet `/23` or larger, not delegated.
- The subnet size cannot change after the environment is created: plan for scale and for the doubling during single-revision deployments.
- Send logs with `appLogsConfiguration.destination: 'azure-monitor'` plus a diagnostic setting, instead of passing the workspace shared key into the template.
- Ingress: `external: false` for internal APIs. CORS lists real origins.
- Image: `${registry}/${name}:${imageTag}` with the tag from the pipeline, never `latest`.

## Commands

```bash
bicep lint infra/main.bicep
bicep build infra/main.bicep --stdout > /dev/null

az deployment group what-if \
  --resource-group rg-orders-dev \
  --template-file infra/main.bicep \
  --parameters infra/main.dev.bicepparam

# Deployment stack: preview, then apply with deny settings on production data
az stack-whatif group create --name whatif-orders-prod --resource-group rg-orders-prod \
  --stack-id <stack resource ID> --template-file infra/main.bicep \
  --parameters infra/main.prod.bicepparam \
  --action-on-unmanage detachAll --deny-settings-mode denyDelete --retention-interval PT3H

az stack group create --name orders-prod --resource-group rg-orders-prod \
  --template-file infra/main.bicep --parameters infra/main.prod.bicepparam \
  --action-on-unmanage detachAll --deny-settings-mode denyDelete
```

`--action-on-unmanage detachAll` is the safe default: removing a resource from the template detaches it instead of deleting it. Choose `deleteResources` only for disposable environments.

## Migrating old templates

- ARM JSON: `az bicep decompile --file azuredeploy.json`, then fix the warnings, rename symbols, and replace hand-built resources with AVM modules where one exists.
- JSON parameter files: `az bicep generate-params --file infra/main.bicep --output-format bicepparam` creates a `.bicepparam` skeleton; copy the values across.
- Preview API versions: move to the latest GA version and run what-if to see what changes.

Docs: learn.microsoft.com/azure/azure-resource-manager/bicep (linter, parameter files, deployment stacks, what-if), azure.github.io/Azure-Verified-Modules.
