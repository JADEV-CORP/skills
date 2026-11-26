# Hidden work checklist

Walk this list for every feature. For each line: not needed, included in slice X, or a new item. Most underestimates are lines from this list that nobody wrote down.

## Before code

- Questions to the product owner, design or a third party, and the wait for answers
- Spike or prototype for an unknown API, library or performance limit
- Access, accounts, licences, test credentials, sandbox environments
- Design review or architecture decision record for a contract or data model change

## Data

- Schema migration, including the rollback or forward-fix path
- Backfill or data correction for existing records, and its run time on production volume
- Backward-compatible contract changes: two versions side by side while consumers move
- Reporting, exports and integrations that read the changed data

## Code around the feature

- Authorisation rules and tenant boundaries
- Validation and error messages, translated if the product is multilingual
- Accessibility (keyboard, screen reader, contrast) for every new screen
- Audit logging, personal data handling, retention and deletion
- Feature flag and its later removal
- Configuration per environment, secrets, infrastructure changes

## Quality

- Unit, integration and end-to-end tests, and fixing the tests the change breaks
- Test data and fixtures
- Code review rounds and their fixes
- CI pipeline changes; flaky tests that block merges
- Security review or threat model when the change touches auth, payment or personal data
- Performance check on realistic data volume

## Release

- Deployment to each environment, release notes, change approval where required
- Monitoring: metrics, dashboards, alerts for the new path
- Gradual rollout and the time to watch it
- Documentation: user help, API reference, runbook for support
- Support and sales handover, internal demo

## People and time

- Holidays, on-call duty, meetings, support rotation
- Onboarding a person who has not worked in this part of the code
- Waiting on other teams (reviews, deployments, shared services)
