# Running collections in CI

Newman runs exported collection files with no Postman account. Pin it as a dev dependency so every run uses the same version (latest stable checked on 2026-11-26).

## package.json

```json
{
  "devDependencies": {
    "newman": "6.2.3"
  },
  "scripts": {
    "test:api": "newman run postman/orders-api.postman_collection.json -e postman/ci.postman_environment.json --env-var clientSecret=$API_TEST_CLIENT_SECRET --reporters cli,junit --reporter-junit-export results/newman.xml"
  }
}
```

- Commit `package-lock.json`; CI runs `npm ci`.
- The environment file holds non-secret values only. Secrets arrive through `--env-var` from the CI secret store.
- `--folder orders` runs one folder. `--bail` stops at the first failure when the run seeds data later steps depend on.
- `newman-reporter-htmlextra` (1.23.1, community package) adds an HTML report if the team wants one. The built-in `junit` reporter is enough for test results in CI.

## GitHub Actions

```yaml
api-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v7
      with:
        node-version: 22
    - run: npm ci
    - run: npm run test:api
      env:
        API_TEST_CLIENT_SECRET: ${{ secrets.API_TEST_CLIENT_SECRET }}
    - uses: actions/upload-artifact@v7
      if: always()
      with:
        name: newman-results
        path: results/
```

Pin third-party actions to a full commit SHA if your organisation requires it.

## Azure Pipelines

```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '22.x'
- script: npm ci
- script: npm run test:api
  env:
    API_TEST_CLIENT_SECRET: $(ApiTestClientSecret)   # secret pipeline variable
- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: JUnit
    testResultsFiles: results/newman.xml
```

## Where to point it

- A per-pull-request or shared test environment, never production for write requests.
- If the API runs inside the pipeline (container or `dotnet run` in the background), wait for its health endpoint before starting Newman.

## Postman CLI

If the team already uses the Postman CLI (`postman collection run`), keep it: it runs collections by ID from the workspace and reports runs to Postman. Do not add it to a project that runs Newman on exported files, and do not install it with a piped shell script from inside a session.
