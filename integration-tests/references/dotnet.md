# .NET integration tests

ASP.NET Core API, EF Core, xUnit v3, Testcontainers. Adapt names to the repository. If the repository uses MSTest or NUnit, keep it (see the MSTest notes at the end).

## Packages (latest stable checked on 2026-11-26)

| Package | Version | Use |
|---|---|---|
| `Microsoft.AspNetCore.Mvc.Testing` | match the app's target framework (11.0.0 for .NET 11) | `WebApplicationFactory` |
| `Testcontainers.MsSql` / `Testcontainers.PostgreSql` | 4.17.0 | database containers |
| `Testcontainers.ServiceBus`, `Testcontainers.CosmosDb`, `Testcontainers.Azurite`, `Testcontainers.RabbitMq`, `Testcontainers.Redis` | 4.17.0 | emulators and brokers |
| `Respawn` | 7.0.0 | reset data between tests |
| `WireMock.Net` | 2.34.0 | fake third-party HTTP APIs |
| `xunit.v3` | 4.0.3 | test framework |

Pin exact versions in the project file or in `Directory.Packages.props`. Check for newer ones when you start.

## Factory and fixture

One factory per test run. It starts the container, points the app at it through configuration, applies migrations and exposes a reset.

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Respawn;
using Testcontainers.MsSql;

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Pin the tag that matches production. The builder takes the image explicitly.
    private readonly MsSqlContainer _db =
        new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04").Build();

    private Respawner? _respawner;

    public async ValueTask InitializeAsync()
    {
        await _db.StartAsync();

        // Building Services starts the host with the settings from ConfigureWebHost.
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();

        _respawner = await Respawner.CreateAsync(_db.GetConnectionString(),
            new RespawnerOptions { TablesToIgnore = ["__EFMigrationsHistory"] });
    }

    public Task ResetDatabaseAsync() => _respawner!.ResetAsync(_db.GetConnectionString());

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        // Override configuration instead of rewriting the DbContext registration.
        builder.UseSetting("ConnectionStrings:Default", _db.GetConnectionString());

        builder.ConfigureTestServices(services =>
        {
            // Only what you do not own gets replaced.
            services.AddSingleton<IClock>(new FixedClock(new DateTimeOffset(2026, 1, 15, 9, 0, 0, TimeSpan.Zero)));
        });
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}

[CollectionDefinition(nameof(ApiCollection))]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>;
```

xUnit v3 `IAsyncLifetime` returns `ValueTask` and inherits `IAsyncDisposable`, which is why `DisposeAsync` overrides the factory's own.

If `Program` reads the connection string so early that `UseSetting` is ignored, replace the registration in `ConfigureTestServices` instead. From EF Core 9, removing the `DbContextOptions<AppDbContext>` descriptor is not enough: the `IDbContextOptionsConfiguration<AppDbContext>` registrations must go too, or two providers end up configured.

## A test

```csharp
[Collection(nameof(ApiCollection))]
public sealed class CreateOrderTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public async ValueTask InitializeAsync() => await factory.ResetDatabaseAsync();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task Valid_order_returns_201_and_is_stored()
    {
        var ct = TestContext.Current.CancellationToken;
        var request = new { customerId = "c-1", items = new[] { new { sku = "A-1", quantity = 2 } } };

        var response = await _client.PostAsJsonAsync("/orders", request, ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<OrderDto>(ct);
        Assert.NotNull(response.Headers.Location);

        // Read back through a fresh scope: proves the data was committed.
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Orders.Include(o => o.Items).SingleAsync(o => o.Id == body!.Id, ct);
        Assert.Equal(2, saved.Items.Single().Quantity);
    }

    [Fact]
    public async Task Missing_customer_returns_problem_details()
    {
        var response = await _client.PostAsJsonAsync("/orders", new { items = Array.Empty<object>() },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
```

## Test authentication

A scheme that builds the user from request headers, registered as the default for the test host. Each test states who it is.

```csharp
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Scheme = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-User", out var user))
            return Task.FromResult(AuthenticateResult.NoResult()); // anonymous: lets 401 tests work

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, user.ToString()) };
        claims.AddRange(Request.Headers["X-Test-Roles"].ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(role => new Claim(ClaimTypes.Role, role)));

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme)));
    }
}

// In ConfigureTestServices:
services.AddAuthentication(TestAuthHandler.Scheme)
    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
```

If a policy names a scheme explicitly (`AuthenticationSchemes = "Bearer"`), the test scheme is not used for it. Then issue real JWTs signed with a test key and configure `JwtBearerOptions` in `ConfigureTestServices` (`services.PostConfigure<JwtBearerOptions>(...)`). Never share one `HttpClient` with a default `Authorization` header across tests: set headers per request.

## Third-party HTTP with WireMock.Net

```csharp
var server = WireMockServer.Start();
server.Given(Request.Create().WithPath("/v1/rates").UsingGet())
      .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { rate = 1.08 }));
builder.UseSetting("Rates:BaseUrl", server.Url);
```

Add one test for the failure the client must survive (timeout, 429, 500) and assert the app's behaviour, not just that it did not crash.

## Messaging

- Prefer invoking the handler with a real database behind it: build it from `factory.Services` and pass a message. This covers the logic and the persistence without a broker.
- When the broker behaviour itself matters (sessions, dead-lettering, duplicate detection), run the emulator: RabbitMQ and Redis are plain containers; Azure Service Bus and Cosmos DB have official emulators with Testcontainers modules. Check each emulator's documented limits before trusting it for that behaviour.
- Wait for an outcome with a deadline, never a fixed delay:

```csharp
static async Task<T> EventuallyAsync<T>(Func<Task<T?>> probe, TimeSpan timeout) where T : class
{
    var deadline = DateTime.UtcNow + timeout;
    while (DateTime.UtcNow < deadline)
    {
        if (await probe() is { } found) return found;
        await Task.Delay(TimeSpan.FromMilliseconds(200));
    }
    throw new TimeoutException($"Condition not met within {timeout}.");
}
```

## MSTest notes

- MSTest has no `IClassFixture` or constructor injection of fixtures. Start the container in `[AssemblyInitialize]` or `[ClassInitialize]` (static) and dispose it in the matching cleanup method.
- From MSTest 3.8 use `Assert.ThrowsExactly<T>`; `[ExpectedException]` is removed in MSTest 4.
- `[DoNotParallelize]` on a class that cannot share the database with others, until it can.

## Running

```bash
dotnet test tests/Orders.IntegrationTests --configuration Release --logger trx
```

Docs: learn.microsoft.com/aspnet/core/test/integration-tests, dotnet.testcontainers.org, github.com/jbogard/Respawn, wiremock.org/dotnet.
