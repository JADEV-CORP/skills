# .NET unit tests and coverage

Use what the repository already has. Latest stable versions checked on 2026-11-26; pin exact versions in `Directory.Packages.props` or the project file.

| Package | Version | Note |
|---|---|---|
| `xunit.v3` | 4.0.3 | `IAsyncLifetime` returns `ValueTask`; `TestContext.Current.CancellationToken` |
| `MSTest` (or the `MSTest.Sdk` project SDK) | 4.5.3 | `[ExpectedException]` is gone: use `Assert.ThrowsExactly<T>` |
| `NUnit` | 5.0.0 | check the migration notes before moving from 3.x or 4.x |
| `NSubstitute` / `Moq` | 6.2.0 / 4.21.0 | keep the one already in use |
| `coverlet.collector` | 10.1.1 | VSTest mode: `--collect:"XPlat Code Coverage"` |
| `coverlet.MTP` | 10.1.1 | Microsoft.Testing.Platform mode: `--coverlet` |
| `Microsoft.Testing.Extensions.CodeCoverage` | 18.12.0 | Microsoft.Testing.Platform mode: `--coverage` |
| `dotnet-reportgenerator-globaltool` | 5.6.1 | merge reports, HTML and text summary |
| `dotnet-stryker` | 5.1.0 | mutation testing |

## Test shape (xUnit v3)

```csharp
public sealed class DiscountCalculatorTests
{
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 3, 1, 9, 0, 0, TimeSpan.Zero));

    // decimal is not a valid attribute argument, so decimal cases go through TheoryData.
    public static TheoryData<decimal, decimal> Thresholds => new()
    {
        { 99.99m, 0m },     // just below the threshold
        { 100.00m, 5.00m }, // at the threshold
        { 500.00m, 25.00m },
    };

    [Theory]
    [MemberData(nameof(Thresholds))]
    public void Applies_five_percent_from_100(decimal total, decimal expectedDiscount)
    {
        var calculator = new DiscountCalculator(_time);

        var discount = calculator.For(new Basket(total));

        Assert.Equal(expectedDiscount, discount);
    }

    [Fact]
    public void Rejects_a_negative_total()
    {
        var calculator = new DiscountCalculator(_time);

        var error = Assert.Throws<ArgumentOutOfRangeException>(() => calculator.For(new Basket(-1m)));
        Assert.Equal("total", error.ParamName);
    }
}
```

## MSTest 4

```csharp
[TestClass]
public sealed class OrderRulesTests
{
    [TestMethod]
    [DataRow(0, false)]
    [DataRow(1, true)]
    [DataRow(10, true)]
    [DataRow(11, false)]
    public void Accepts_quantities_from_1_to_10(int quantity, bool expected)
        => Assert.AreEqual(expected, OrderRules.IsValidQuantity(quantity));

    [TestMethod]
    public void Rejects_a_negative_total()
    {
        var error = Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => OrderRules.Total(-1m));
        Assert.AreEqual("total", error.ParamName);
    }
}
```

The MSTest analyzers (MSTEST0006 and others) flag obsolete patterns; fix them rather than suppressing them.

## Fakes

- Fake time with `TimeProvider` (built in since .NET 8) and `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing`, or the clock abstraction the code already has.
- A hand-written fake is often clearer than a mock for repositories and gateways. Use the mocking library for interactions that are the behaviour:

```csharp
var payments = Substitute.For<IPaymentGateway>();
await sut.CheckoutAsync(order, ct);
await payments.Received(1).ChargeAsync(order.Id, 120.00m, Arg.Any<CancellationToken>());
```

## Coverage

Which command depends on the test platform the repository uses. Check `global.json` and the test project packages.

```bash
# VSTest (classic dotnet test) with coverlet.collector: Cobertura per test project
dotnet test --collect:"XPlat Code Coverage" --results-directory ./TestResults

# Microsoft.Testing.Platform with Microsoft code coverage
dotnet test -- --coverage --coverage-output-format cobertura

# Microsoft.Testing.Platform with coverlet.MTP
dotnet test --coverlet --coverlet-output-format cobertura

# Merge and read
reportgenerator -reports:"**/TestResults/**/*.cobertura.xml" -targetdir:coverage -reporttypes:"Html;TextSummary"
cat coverage/Summary.txt
```

With Microsoft.Testing.Platform and several test projects, do not give every project the same `--coverage-output` path: reports overwrite each other. Leave the default names or use `--results-directory-layout per-module`.

Exclude generated code and pure wiring in a `coverlet.runsettings` or the `--coverage-settings` file, or with `[ExcludeFromCodeCoverage(Justification = "...")]` on code that truly has no logic.

## Mutation testing

```bash
cd tests/Orders.Tests
dotnet stryker --project Orders.csproj
```

Read the HTML report. A surviving mutant on a line you just covered means the test executes the line without checking what it does. Run Stryker on the files you touched, not the whole solution, to keep it fast.
