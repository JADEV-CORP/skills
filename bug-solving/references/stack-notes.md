# Stack notes

## .NET

### Diagnostic tools

The .NET global tools (`dotnet-counters`, `dotnet-trace`, `dotnet-dump`, `dotnet-gcdump`, version 10.0.750501 on 2026-11-26). If they are missing, ask the user to install them with a pinned `--version`; do not install tools on a production host yourself.

| Symptom | Tool | Look at |
|---|---|---|
| Slow under load, CPU low | `dotnet-counters monitor -p <pid>` | thread pool queue length, thread count climbing: sync-over-async starvation |
| High CPU | `dotnet-trace collect -p <pid>` | hot methods in the CPU sample |
| Hang | `dotnet-dump collect -p <pid>`, then `analyze` with `clrstack -all` or `pstacks` | threads blocked on the same lock or task |
| Memory growth | `dotnet-gcdump collect -p <pid>` twice, compare | types whose count only grows: caches, event handlers, static lists |
| Exceptions | `dotnet-counters` exception count, then logs | first-chance exceptions used as control flow |

### Async pitfalls

- `.Result`, `.Wait()` or `GetAwaiter().GetResult()` on a task: in UI apps and classic ASP.NET this deadlocks on the synchronization context. ASP.NET Core has no synchronization context, so it does not deadlock there, but under load it starves the thread pool and requests queue up. Fix: async all the way to the entry point.
- `async void` outside event handlers: an exception crashes the process. Return `Task`.
- A task that is never awaited loses its exception. Await it, or hand it to a background service that logs failures.
- `CancellationToken` not passed down: cancelled requests keep working and hold connections.

### Exceptions and logging

- Log an exception once, at the boundary that handles it. `logger.LogError(ex, ...)` already includes inner exceptions; logging each inner one again only adds noise. In ASP.NET Core 8 and later use `IExceptionHandler` with problem details instead of a hand-written try/catch middleware.
- `Response.Headers.Add(...)` throws when the header already exists (analyzer ASP0019). Use the indexer or `Append`.
- Use the trace ID from `Activity.Current` (W3C trace context). OpenTelemetry instrumentation for ASP.NET Core, `HttpClient` and the SQL client propagates it across services without custom correlation middleware.

### EF Core

- See the SQL: `query.ToQueryString()`, or `optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information)` locally. `EnableSensitiveDataLogging()` only on a developer machine: it writes parameter values to logs.
- N+1 queries happen with lazy-loading proxies turned on. Without them, an unloaded navigation is simply empty: that is a missing `Include`, a different bug with wrong results instead of slow ones.
- Many `Include`s on collections multiply rows (cartesian explosion). Use `AsSplitQuery()` or project only the columns needed.
- Tracking queries in read paths cost memory and time: `AsNoTracking()`.
- `DbContext` is not thread-safe. Two concurrent operations on one context throw or corrupt state.

## JavaScript and TypeScript front ends

- Network panel first: status, request payload, response, timing. CORS errors appear in the console, and the server response is hidden from scripts.
- Breakpoints in Sources with source maps instead of `console.log` chains. Conditional breakpoints and logpoints leave the code untouched.
- Framework tools: Vue DevTools, Angular DevTools, React Developer Tools for component state, change detection or render profiling.
- Memory leaks: take heap snapshots before and after repeating an action, look for detached DOM nodes and growing listener counts. Usual causes: listeners, intervals and subscriptions not removed on unmount (`onBeforeUnmount`, `DestroyRef` or `takeUntilDestroyed`, `useEffect` cleanup).
- Reactivity bugs: destructuring a Vue `reactive` object loses reactivity (`toRefs`); Angular `OnPush` components do not see mutated inputs; React effects capture stale values.
- Request logging in interceptors: never log `Authorization` headers, cookies or full bodies with personal data.

## Databases

Investigation in production stays read-only and cheap. `EXPLAIN ANALYZE` runs the statement: never on writes in production.

### SQL Server

```sql
-- Who blocks whom right now
SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time, t.text
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.blocking_session_id <> 0;

-- Top queries by CPU over the last 24 hours (Query Store must be on)
SELECT TOP (20) q.query_id, qt.query_sql_text,
       SUM(rs.count_executions) AS executions,
       SUM(rs.avg_cpu_time * rs.count_executions) / 1000 AS total_cpu_ms
FROM sys.query_store_runtime_stats AS rs
JOIN sys.query_store_runtime_stats_interval AS i ON i.runtime_stats_interval_id = rs.runtime_stats_interval_id
JOIN sys.query_store_plan AS p ON p.plan_id = rs.plan_id
JOIN sys.query_store_query AS q ON q.query_id = p.query_id
JOIN sys.query_store_query_text AS qt ON qt.query_text_id = q.query_text_id
WHERE i.start_time > DATEADD(hour, -24, SYSUTCDATETIME())
GROUP BY q.query_id, qt.query_sql_text
ORDER BY total_cpu_ms DESC;
```

A query that was fast and became slow with no code change: check Query Store for a plan change (parameter sniffing, statistics update, index dropped).

### PostgreSQL

```sql
-- Blocked sessions and their blockers
SELECT pid, pg_blocking_pids(pid) AS blocked_by, wait_event_type,
       now() - query_start AS running_for, left(query, 200) AS query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;

-- Most expensive statements (pg_stat_statements extension)
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time, 1) AS mean_ms, left(query, 200) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Read plans with `EXPLAIN (ANALYZE, BUFFERS)` on a copy or on read-only statements. Compare estimated and actual rows: a large gap means stale statistics or a predicate the planner cannot estimate.
