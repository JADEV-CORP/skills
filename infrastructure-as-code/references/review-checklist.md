# Infra pull request checklist

Answer each line with the evidence (file and line, or the preview output). "Looks fine" is not an answer.

## Preview

- What-if or plan output is attached and matches the diff. No unexplained creates, deletes or replaces.
- Every delete or replace of a stateful resource (database, storage, vault, registry, broker) has a reason and a backup or migration plan.
- Drift shown in the preview is explained: whoever changed the resource outside code is told, and the code or the resource is corrected.

## Security

- No secret in templates, parameter files, variables with defaults, outputs or pipeline YAML.
- New identities have only the roles they need, at the narrowest scope. No `Owner` or `Contributor` for workloads.
- Data services are private (private endpoint and DNS) or the exception is written down. No `0.0.0.0` SQL rule, no `defaultAction: 'Allow'` on Key Vault or storage in production.
- Local auth (keys, SQL logins, registry admin user) is off where the app supports Entra.
- TLS 1.2 minimum, HTTPS only, CORS limited to real origins.

## Reliability and operations

- Production data resources have purge protection, soft delete, backups and a delete lock or deny setting.
- Diagnostic settings send logs and metrics to the shared workspace. Alerts exist for what the change adds.
- Zone redundancy and SKU match the service level the product promises.
- The change can be rolled back: previous template version redeployable, or a written forward fix.

## Hygiene

- GA API versions, pinned module and provider versions, image tags not `latest`.
- Names follow the repository convention and the length limits; global names carry a unique suffix.
- Tags present (owner, environment, cost centre).
- Dev and production differ in size, not in features the code depends on.
- No retired or retiring service introduced (check Azure updates for the services touched).

## Cost

- New or resized resources with their monthly estimate from the Azure pricing calculator. Flag anything billed per hour while idle (Premium tiers, dedicated plans, NAT gateways, private endpoints in bulk).
