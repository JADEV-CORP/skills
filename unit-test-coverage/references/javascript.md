# JavaScript and TypeScript unit tests and coverage

Use the runner the repository already has. Latest stable versions checked on 2026-11-26: Vitest 5.1.2 with `@vitest/coverage-v8` 5.1.2, Jest 30.5.2, `@vue/test-utils` 2.6.0, Testing Library (`@testing-library/vue` 8.1.0, `@testing-library/angular` 19.6.0, `@testing-library/react` 16.3.3), MSW 3.0.8 (ESM only, Node 22 or later), StrykerJS 10.1.1. Keep the coverage package on the same major as Vitest. Read the migration guide before any major upgrade.

## Coverage

```bash
npm test -- --coverage          # the project's own test script (Vitest or Jest), local binaries only
ng test --coverage              # Angular CLI with its default Vitest runner
```

If the project has no test script, add one that calls the locally installed runner instead of fetching a tool at run time.

Vitest configuration for a report SonarQube or Codecov can read:

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'cobertura'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/**/generated/**', 'src/main.ts'],
    },
  },
});
```

Set `include` explicitly so files no test imports still count as uncovered instead of vanishing from the report.

## Pure logic

```ts
import { describe, expect, it } from 'vitest';
import { discountFor } from './discount';

describe('discountFor', () => {
  it.each([
    [99.99, 0],
    [100, 5],
    [500, 25],
  ])('total %d gives discount %d', (total, expected) => {
    expect(discountFor(total)).toBe(expected);
  });

  it('rejects a negative total', () => {
    expect(() => discountFor(-1)).toThrow(RangeError);
  });
});
```

Money in floating point is a bug source of its own: if the code uses numbers for currency, test the rounding cases and raise it.

## Vue components

Test what the user sees and does, not `wrapper.vm` internals.

```ts
import { mount } from '@vue/test-utils';
import QuantityPicker from './QuantityPicker.vue'; // default import: a .vue file has no named export

it('emits the new quantity and blocks values above the stock', async () => {
  const wrapper = mount(QuantityPicker, { props: { modelValue: 1, stock: 2 } });

  await wrapper.get('[data-test="increment"]').trigger('click');
  await wrapper.get('[data-test="increment"]').trigger('click');

  expect(wrapper.emitted('update:modelValue')).toEqual([[2]]);
  expect(wrapper.get('[data-test="increment"]').attributes('disabled')).toBeDefined();
});
```

## Angular components and services

- Standalone components go in `imports`, not `declarations`.
- `HttpClientTestingModule` is deprecated: use `provideHttpClient()` and `provideHttpClientTesting()`, then `HttpTestingController`.
- Configure spies and stubs before the first `fixture.detectChanges()`, because that call runs `ngOnInit`.

```ts
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [OrderListComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
});

it('shows the orders returned by the API', () => {
  const fixture = TestBed.createComponent(OrderListComponent);
  fixture.detectChanges(); // ngOnInit sends the request

  TestBed.inject(HttpTestingController)
    .expectOne('/api/orders')
    .flush([{ id: 'o-1', total: 120 }]);
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('o-1');
});
```

## React components

Testing Library with user-level queries (`getByRole`, `getByLabelText`) and `@testing-library/user-event`. Avoid testing hooks' internal state; test the rendered result of the component that uses them.

## HTTP in unit tests

Mock at the network level with MSW instead of mocking the HTTP client:

```ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { fetchOrders } from './orders-api';

const server = setupServer(
  http.get('https://api.example.test/orders', () => HttpResponse.json([{ id: 'o-1' }])),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('surfaces a server error', async () => {
  server.use(http.get('https://api.example.test/orders', () => new HttpResponse(null, { status: 500 })));
  await expect(fetchOrders()).rejects.toThrow();
});
```

Use absolute URLs in Node tests (configure the client's base URL), and fail on unhandled requests so a typo in a path does not pass silently.

## Mutation testing

`@stryker-mutator/core` with `@stryker-mutator/vitest-runner` or `@stryker-mutator/jest-runner` (10.1.1), installed as pinned dev dependencies. Limit `mutate` to the files you changed. Surviving mutants on newly covered lines mean the tests execute code without checking it.
