import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAdo } from '../scripts/lib/ado.mjs';
import { fetchReview } from '../scripts/lib/fetch-pr.mjs';
import { workDirFor, loadState, saveState, emptyState } from '../scripts/lib/state.mjs';
import { synthPr, fakeAdoFetch } from './fake-ado.mjs';

const profile = { name: 'example', language: 'en', groups: null, assetRegisterCheck: true, outsideLookups: false, instructions: null, workRoot: '/tmp/x' };
const prRef = (d) => ({ org: d.org, project: d.project, repo: d.repo, id: d.id, baseUrl: `https://dev.azure.com/${d.org}` });
async function run(d, state = emptyState(), limits) {
  const ado = createAdo({ baseUrl: `https://dev.azure.com/${d.org}`, token: 't', fetchImpl: fakeAdoFetch(d) });
  return fetchReview({ pr: prRef(d), profile, ado, state, limits });
}

test('builds review.json for a 3-file PR', async () => {
  const r = await run(synthPr());
  assert.equal(r.version, 1);
  assert.equal(r.pr.title, 'Add card payment');
  assert.equal(r.pr.repoId, 'r-1');
  assert.equal(r.pr.projectId, 'p-1');
  assert.equal(r.pr.url, 'https://dev.azure.com/acme/Web/_git/shop/pullrequest/42');
  assert.deepEqual(r.pr.workItemIds, [101]);
  assert.deepEqual(r.iteration, { id: 1, sourceCommit: 's1', commonCommit: 'c1', targetCommit: 't1' });
  const byPath = Object.fromEntries(r.files.map((f) => [f.path, f]));
  assert.equal(byPath['src/new.js'].changeType, 'add');
  assert.equal(byPath['src/new.js'].oldContent, null);
  assert.equal(byPath['src/new.js'].newContent, 'export const a = 1;\n');
  assert.equal(byPath['src/app.js'].oldContent, 'line1\nline2\nline3\n');
  assert.equal(byPath['src/app.js'].newLineCount, 3);
  assert.equal(byPath['src/app.js'].changeTrackingId, 2);
  assert.equal(byPath['src/old.js'].newContent, null);
  assert.equal(byPath['src/old.js'].newLineCount, 0);
  assert.equal(r.since, null);
  assert.deepEqual(r.profile, { name: 'example', language: 'en', groups: null, assetRegisterCheck: true, outsideLookups: false, instructions: null });
  assert.deepEqual(r.signals, { deps: [], assets: [], secrets: [] });
});

test('marks own PR', async () => {
  const r = await run(synthPr({ meId: 'u-author' }));
  assert.equal(r.identity.ownPr, true);
});

test("marks a teammate's PR as not own", async () => {
  const r = await run(synthPr());
  assert.equal(r.identity.ownPr, false);
  assert.equal(r.identity.id, 'u-me');
});

test('reduces work item HTML to text', async () => {
  const [w] = (await run(synthPr())).workItems;
  assert.equal(w.title, 'Pay by card');
  assert.equal(w.type, 'User Story');
  assert.equal(w.description, 'As a buyer\nI pay');
  assert.equal(w.acceptanceCriteria, '- Card accepted\n- Receipt & mail');
});

test('drops deleted and system threads', async () => {
  const r = await run(synthPr());
  assert.deepEqual(r.threads, [{ id: 7, status: 'active', filePath: 'src/app.js', line: 2, author: 'Sam', firstComment: 'Why?' }]);
});

test('pipeline build on an older commit is not coversLatest', async () => {
  const r = await run(synthPr());
  const ci = r.checks.find((c) => c.kind === 'build' && c.name === 'CI');
  const nightly = r.checks.find((c) => c.kind === 'build' && c.name === 'Nightly');
  assert.equal(ci.result, 'pass');
  assert.equal(ci.coversLatest, true);
  assert.equal(nightly.result, 'fail');
  assert.equal(nightly.coversLatest, false);
  const sonar = r.checks.find((c) => c.kind === 'status');
  assert.equal(sonar.result, 'pass');
  assert.equal(sonar.coversLatest, true);
});

test('missing required build is a gap', async () => {
  const r = await run(synthPr());
  const sec = r.checks.find((c) => c.kind === 'policy' && c.name === 'Security build');
  assert.equal(sec.result, 'gap');
  assert.ok(!r.checks.some((c) => c.name === 'Minimum number of reviewers'));
});

test('paginates changes and caps content', async () => {
  const changes = [];
  const items = {};
  for (let i = 1; i <= 128; i++) {
    changes.push({ changeTrackingId: i, item: { path: `/src/f${i}.js` }, changeType: 'add' });
    items[`s1:/src/f${i}.js`] = `x${i}\n`;
  }
  changes.push({ changeTrackingId: 129, item: { path: '/data/big.json' }, changeType: 'add' });
  items['s1:/data/big.json'] = 'a'.repeat(500_000);
  changes.push({ changeTrackingId: 130, item: { path: '/img/logo.png' }, changeType: 'add' });
  items['s1:/img/logo.png'] = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]);
  const r = await run(synthPr({ changes: { 1: changes }, items }), emptyState(), { maxTextBytes: 400_000, maxPages: 50 });
  assert.equal(r.files.length, 130);
  const big = r.files.find((f) => f.path === 'data/big.json');
  assert.equal(big.tooLarge, true);
  assert.equal(big.newContent, null);
  const png = r.files.find((f) => f.path === 'img/logo.png');
  assert.equal(png.binary, true);
  assert.equal(png.newContent, null);
});

test('since lists only paths changed after the last reviewed iteration', async () => {
  const d = synthPr({
    iterations: [{ id: 1, source: 's0', common: 'c1', target: 't1' }, { id: 2, source: 's1', common: 'c1', target: 't1' }],
    changes: { 2: synthPr().changes[1] },
    changesSince: { '2:1': [{ changeTrackingId: 2, item: { path: '/src/app.js' }, changeType: 'edit' }] },
  });
  const r = await run(d, { ...emptyState(), lastReviewedIteration: 1 });
  assert.deepEqual(r.since, { fromIteration: 1, paths: ['src/app.js'] });
});

test('previous findings carry the current thread status', async () => {
  const state = { ...emptyState(), lastReviewedIteration: 1, threads: { 'R-01': 7 }, findings: { 'R-01': { title: 'Null check', file: 'src/app.js' }, 'R-02': { title: 'Skipped one', file: null } } };
  const r = await run(synthPr(), state);
  assert.deepEqual(r.previous.findings, [
    { id: 'R-01', title: 'Null check', file: 'src/app.js', threadId: 7, threadStatus: 'active' },
    { id: 'R-02', title: 'Skipped one', file: null, threadId: null, threadStatus: null },
  ]);
});

test('workDirFor and state round-trip', () => {
  const root = mkdtempSync(join(tmpdir(), 'prr-'));
  const dir = workDirFor({ workRoot: root }, { org: 'acme', repo: 'api core', id: 7 });
  assert.equal(dir, join(root, 'acme', 'api core', 'pr-7'));
  assert.deepEqual(loadState(dir), emptyState());
  saveState(dir, { ...emptyState(), nextId: 4 });
  assert.equal(loadState(dir).nextId, 4);
});

test('fills signals from the PR', async () => {
  const d = synthPr({
    changes: { 1: [
      { changeTrackingId: 1, item: { path: '/package.json' }, changeType: 'edit' },
      { changeTrackingId: 2, item: { path: '/img/logo.png' }, changeType: 'add' },
      { changeTrackingId: 3, item: { path: '/src/cfg.js' }, changeType: 'add' },
    ] },
    items: {
      'c1:/package.json': '{"dependencies":{"a":"1.0.0"}}',
      's1:/package.json': '{"dependencies":{"a":"1.1.0"}}',
      's1:/img/logo.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 4, ...Buffer.from('tEXt'), 0]),
      's1:/src/cfg.js': 'const password = "Sandbox123!";\n',
      's1:/ASSETS.md': '| img/other.png | own |\n',
    },
  });
  const r = await run(d);
  assert.deepEqual(r.signals.deps.map((x) => [x.name, x.from, x.to]), [['a', '1.0.0', '1.1.0']]);
  assert.deepEqual(r.signals.assets, [{ path: 'img/logo.png', kind: 'image', registered: false, metadata: ['PNG text'] }]);
  assert.deepEqual(r.signals.secrets.map((s) => [s.path, s.line, s.rule]), [['src/cfg.js', 1, 'password assignment']]);
  assert.ok(!JSON.stringify(r).includes('Sandbox123!') || r.files.some((f) => f.newContent?.includes('Sandbox123!')));
});
