# Coverage in SonarQube (Server and Cloud)

SonarQube does not run tests. It imports coverage files your pipeline produced before the analysis ends. A coverage of 0 % on a project with tests almost always means the file was not found or not in a supported format.

## Report paths

| Language | Property | Format |
|---|---|---|
| C# | `sonar.cs.cobertura.reportsPaths` | Cobertura (Coverlet, Microsoft code coverage) |
| C# | `sonar.cs.opencover.reportsPaths` | OpenCover (Coverlet with `opencover` format) |
| C# | `sonar.cs.vscoveragexml.reportsPaths` | Visual Studio XML (`dotnet-coverage`) |
| JavaScript, TypeScript | `sonar.javascript.lcov.reportPaths` | lcov (`coverage/lcov.info`) |
| Java | `sonar.coverage.jacoco.xmlReportPaths` | JaCoCo XML |
| Python | `sonar.python.coverage.reportPaths` | Cobertura XML (`coverage xml`) |

Paths accept wildcards (`**/TestResults/**/coverage.cobertura.xml`). For .NET, pass them in the scanner's begin step:

```bash
dotnet sonarscanner begin /k:"<project key>" /d:sonar.token="$SONAR_TOKEN" \
  /d:sonar.cs.cobertura.reportsPaths="**/TestResults/**/coverage.cobertura.xml"
dotnet build --no-incremental
dotnet test --no-build --collect:"XPlat Code Coverage"
dotnet sonarscanner end /d:sonar.token="$SONAR_TOKEN"
```

The token comes from the CI secret store, never from a file in the repository.

## Quality gate

- The default "Sonar way" gate judges new code: it fails when coverage on new code is below 80 %, among other conditions. Old code does not fail it, which is why coverage work should start with the branch's own changes.
- What counts as new code is the project's new code definition (previous version, number of days, or reference branch). Check it before arguing about a number.
- On pull requests, the gate reads only the changed lines.

## Exclusions

- `sonar.coverage.exclusions` removes files from the coverage figure only (they are still analysed for issues). Use it for generated code, migrations, composition roots, DTO-only folders.
- `sonar.exclusions` removes files from analysis entirely. Do not use it to hide coverage gaps.
- Keep exclusions in the scanner configuration under review, with a comment per pattern.

## Reading the data from an agent session

If SonarSource's official MCP server is connected (published as the `sonarsource/sonarqube-mcp` container image), use it to read measures, uncovered lines and quality gate status. Otherwise, read the coverage file from the CI artifacts or run coverage locally: the line-level data is the same.

Docs: docs.sonarsource.com (test coverage parameters for each language, quality gates, new code definition).
