import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdo, AdoError } from '../scripts/lib/ado.mjs';
import { getToken } from '../scripts/lib/token.mjs';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
  fn.calls = calls;
  return fn;
}

test('sends bearer header', async () => {
  const f = fakeFetch(() => json({ ok: 1 }));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 'tok123', fetchImpl: f });
  await ado.get(['Web', '_apis', 'git', 'repositories']);
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer tok123');
});

test('encodes path segments', async () => {
  const f = fakeFetch(() => json({}));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  await ado.get(['Team A - Café', '_apis', 'git']);
  assert.match(f.calls[0].url, /^https:\/\/dev\.azure\.com\/acme\/Team%20A%20-%20Caf%C3%A9\/_apis\/git\?/);
});

test('adds api-version 7.1 unless given', async () => {
  const f = fakeFetch(() => json({}));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  await ado.get(['_apis', 'x']);
  await ado.get(['_apis', 'y'], { 'api-version': '7.1-preview.1' });
  assert.equal(new URL(f.calls[0].url).searchParams.get('api-version'), '7.1');
  assert.equal(new URL(f.calls[1].url).searchParams.get('api-version'), '7.1-preview.1');
});

test('401 gives a sign-in message', async () => {
  const f = fakeFetch(() => new Response('nope', { status: 401 }));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 'secret-token-value', fetchImpl: f });
  await assert.rejects(ado.get(['_apis']), (e) => {
    assert.ok(e instanceof AdoError);
    assert.equal(e.status, 401);
    assert.match(e.message, /sign in again/i);
    assert.doesNotMatch(e.message, /secret-token-value/);
    return true;
  });
});

test('203 HTML sign-in page is treated as 401', async () => {
  const f = fakeFetch(() => new Response('<html>sign in</html>', { status: 203, headers: { 'content-type': 'text/html' } }));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  await assert.rejects(ado.get(['_apis']), (e) => e.status === 401);
});

test('other errors carry the ADO message', async () => {
  const f = fakeFetch(() => json({ message: 'TF401019: repo not found' }, 404));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  await assert.rejects(ado.get(['_apis']), (e) => e.status === 404 && /TF401019/.test(e.message));
});

test('getAllPages follows nextSkip/nextTop', async () => {
  const f = fakeFetch((url) => {
    const skip = Number(new URL(url).searchParams.get('$skip') || 0);
    return skip === 0
      ? json({ changeEntries: [1, 2], nextSkip: 2, nextTop: 2 })
      : json({ changeEntries: [3], nextSkip: 0, nextTop: 0 });
  });
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  const all = await ado.getAllPages(['_apis', 'changes'], { $top: 2 }, 'changeEntries');
  assert.deepEqual(all, [1, 2, 3]);
});

test('getAllPages follows x-ms-continuationtoken', async () => {
  const f = fakeFetch((url) => {
    const ct = new URL(url).searchParams.get('continuationToken');
    return ct ? json({ value: ['b'] }) : json({ value: ['a'] }, 200, { 'x-ms-continuationtoken': 'abc' });
  });
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  assert.deepEqual(await ado.getAllPages(['_apis', 'builds'], {}, 'value'), ['a', 'b']);
});

test('getBytes stops at maxBytes and returns tooLarge', async () => {
  const f = fakeFetch(() => new Response(new Uint8Array(50)));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  assert.deepEqual(await ado.getBytes(['_apis', 'items'], {}, 10), { tooLarge: true });
  const small = await ado.getBytes(['_apis', 'items'], {}, 100);
  assert.equal(small.bytes.length, 50);
});

test('post sends JSON body', async () => {
  const f = fakeFetch(() => json({ id: 9 }));
  const ado = createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl: f });
  const r = await ado.post(['_apis', 'threads'], { a: 1 });
  assert.equal(r.id, 9);
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].init.body, '{"a":1}');
});

test('getToken trims output and hides stdout on failure', async () => {
  const ok = await getToken({ name: 'p', tokenCommand: ['x'] }, async () => ({ stdout: 'tok\n' }));
  assert.equal(ok, 'tok');
  await assert.rejects(
    getToken({ name: 'p', tokenCommand: ['x'] }, async () => { const e = new Error('boom LEAKED'); e.stdout = 'LEAKED'; throw e; }),
    (e) => /Could not get an Azure DevOps token for p\. Sign in with az login and try again\./.test(e.message) && !/LEAKED/.test(e.message),
  );
  await assert.rejects(getToken({ name: 'p', tokenCommand: ['x'] }, async () => ({ stdout: '  ' })), /Could not get/);
});
