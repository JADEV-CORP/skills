import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrUrl } from '../scripts/lib/url.mjs';

test('parses dev.azure.com URL', () => {
  assert.deepEqual(parsePrUrl('https://dev.azure.com/acme/Web/_git/shop/pullrequest/42'), {
    org: 'acme', project: 'Web', repo: 'shop', id: 42, baseUrl: 'https://dev.azure.com/acme',
  });
});

test('parses encoded project names', () => {
  const pr = parsePrUrl('https://dev.azure.com/acme/Team%20A%20-%20Caf%C3%A9/_git/api%20core/pullrequest/7');
  assert.equal(pr.project, 'Team A - Café');
  assert.equal(pr.repo, 'api core');
  assert.equal(pr.id, 7);
});

test('parses visualstudio.com URL', () => {
  assert.deepEqual(parsePrUrl('https://acme.visualstudio.com/Web/_git/shop/pullrequest/42'), {
    org: 'acme', project: 'Web', repo: 'shop', id: 42, baseUrl: 'https://dev.azure.com/acme',
  });
});

test('ignores query string and trailing slash', () => {
  const pr = parsePrUrl('https://dev.azure.com/acme/Web/_git/shop/pullrequest/42/?_a=files&path=/x');
  assert.equal(pr.id, 42);
});

test('rejects non-PR URL', () => {
  assert.throws(() => parsePrUrl('https://dev.azure.com/acme/Web/_git/shop'), /Not an Azure DevOps pull request URL/);
});
