import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdo } from '../scripts/lib/ado.mjs';
import { postDecisions, threadBody } from '../scripts/lib/post.mjs';
import { applyFixes } from '../scripts/lib/apply.mjs';
import { emptyState } from '../scripts/lib/state.mjs';
import { findingDigest } from '../page/app.mjs';

const review = {
  pr: { org: 'acme', project: 'Web', repo: 'shop', repoId: 'r-1', id: 42, url: 'https://dev.azure.com/acme/Web/_git/shop/pullrequest/42' },
  iteration: { id: 3, sourceCommit: 'abc123' },
  identity: { ownPr: false },
  files: [{ path: 'src/app.js', changeType: 'edit', changeTrackingId: 5, oldContent: 'a\n', newContent: 'b\nconst password = "Sandbox123!";\n', newLineCount: 2 }],
};
const ev = { observed: 'o', trigger: 't', consequence: 'c' };
const doc = {
  iteration: 3,
  findings: [
    { id: 'R-01', category: 'Bug', severity: 'High', file: 'src/app.js', line: { start: 1, end: 2 }, title: 'A', evidence: ev, comment: 'orig', fix: '--- a/src/app.js\n+++ b/src/app.js\n@@ -1 +1 @@\n-b\n+c\n' },
    { id: 'R-02', category: 'Story', severity: 'Low', file: null, line: null, title: 'B', evidence: ev, comment: 'orig2', fix: null },
    { id: 'R-03', category: 'Quality', severity: 'Low', file: 'src/app.js', line: { start: 1, end: 1 }, title: 'C', evidence: ev, comment: 'orig3', fix: null },
  ],
};
const withDigest = (i) => ({ digest: findingDigest(doc.findings.find((f) => f.id === i.id) || {}), ...i });
const decisions = (items, undecided = []) => ({ pr: 42, iteration: 3, items: items.map(withDigest), undecided });

function fakeAdo({ latest = 3, failPostOn = null } = {}) {
  const posts = [];
  let n = 100;
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(String(url));
    if (init.method === 'POST') {
      const body = JSON.parse(init.body);
      if (failPostOn && body.comments[0].content.includes(failPostOn)) return new Response(JSON.stringify({ message: 'boom' }), { status: 500 });
      posts.push({ path: decodeURIComponent(u.pathname), body });
      return new Response(JSON.stringify({ id: ++n }), { headers: { 'content-type': 'application/json' } });
    }
    if (u.pathname.endsWith('/iterations')) return new Response(JSON.stringify({ value: Array.from({ length: latest }, (_, i) => ({ id: i + 1 })) }));
    return new Response('{}', { status: 404 });
  };
  return { ado: createAdo({ baseUrl: 'https://dev.azure.com/acme', token: 't', fetchImpl }), posts };
}
const run = async (dec, opts = {}) => {
  const f = fakeAdo(opts);
  const saves = [];
  const r = await postDecisions({ review: opts.review || review, doc, decisions: dec, state: opts.state || emptyState(), ado: f.ado, dryRun: !!opts.dryRun, save: (s) => saves.push(JSON.parse(JSON.stringify(s))) });
  return { ...r, posts: f.posts, saves };
};
const outcome = (r, id) => r.receipt.outcomes.find((o) => o.id === id);

test('post creates a line thread with iteration context', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'post', comment: 'edited' }]));
  assert.equal(r.posts.length, 1);
  assert.equal(r.posts[0].path, '/acme/Web/_apis/git/repositories/r-1/pullRequests/42/threads');
  assert.deepEqual(r.posts[0].body, {
    comments: [{ parentCommentId: 0, content: 'edited', commentType: 1 }],
    status: 'active',
    threadContext: { filePath: '/src/app.js', rightFileStart: { line: 1, offset: 1 }, rightFileEnd: { line: 2, offset: 1 } },
    pullRequestThreadContext: { changeTrackingId: 5, iterationContext: { firstComparingIteration: 1, secondComparingIteration: 3 } },
  });
  assert.deepEqual(outcome(r, 'R-01'), { id: 'R-01', outcome: 'posted', threadId: 101, url: `${review.pr.url}?discussionId=101` });
});

test('PR-level finding creates a thread without context', async () => {
  const r = await run(decisions([{ id: 'R-02', decision: 'post', comment: 'whole PR' }]));
  assert.deepEqual(r.posts[0].body, { comments: [{ parentCommentId: 0, content: 'whole PR', commentType: 1 }], status: 'active' });
});

test('post-with-fix appends the suggested change block', () => {
  const body = threadBody(doc.findings[0], 'Please change.', review, true);
  assert.equal(body.comments[0].content, 'Please change.\n\nSuggested change:\n```diff\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1 +1 @@\n-b\n+c\n```');
});

test('comment text is posted exactly as edited', async () => {
  const r = await run(decisions([{ id: 'R-03', decision: 'post', comment: '  Two spaces, "quotes" and émojis are fine.\nLine 2' }]));
  assert.equal(r.posts[0].body.comments[0].content, '  Two spaces, "quotes" and émojis are fine.\nLine 2');
});

test('edited comment with an em dash or a secret is refused', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'post', comment: 'bad \u2014 dash' }, { id: 'R-03', decision: 'post', comment: 'remove Sandbox123!' }]));
  assert.equal(r.posts.length, 0);
  assert.match(outcome(r, 'R-01').reason, /dash/);
  assert.match(outcome(r, 'R-03').reason, /secret/);
  assert.ok(!JSON.stringify(r.receipt).includes('Sandbox123!'));
});

test('skip posts nothing', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'skip', comment: 'x' }]));
  assert.equal(r.posts.length, 0);
  assert.equal(outcome(r, 'R-01').outcome, 'skipped');
});

test('undecided IDs appear in the receipt', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'skip', comment: 'x' }], ['R-02']));
  assert.equal(outcome(r, 'R-02').outcome, 'undecided');
  assert.equal(outcome(r, 'R-03').outcome, 'undecided');
});

test('receipt has one outcome per finding', async () => {
  const r = await run(decisions([{ id: 'R-02', decision: 'post', comment: 'x' }]));
  assert.deepEqual(r.receipt.outcomes.map((o) => o.id), ['R-01', 'R-02', 'R-03']);
  assert.equal(r.receipt.pr, 42);
  assert.equal(r.receipt.iteration, 3);
  assert.match(r.receipt.at, /^\d{4}-\d{2}-\d{2}T/);
});

test('post refuses when the PR moved', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'post', comment: 'x' }, { id: 'R-02', decision: 'post', comment: 'y' }]), { latest: 4 });
  assert.equal(r.posts.length, 0);
  for (const id of ['R-01', 'R-02']) {
    assert.equal(outcome(r, id).outcome, 'failed');
    assert.equal(outcome(r, id).reason, 'PR changed since review (iteration 3 to 4), run the review again');
  }
});

test('decisions for another iteration are refused', async () => {
  const r = await run({ pr: 42, iteration: 2, items: [withDigest({ id: 'R-01', decision: 'post', comment: 'x' })], undecided: [] });
  assert.equal(r.posts.length, 0);
  assert.match(outcome(r, 'R-01').reason, /decisions are for iteration 2, the review is iteration 3/);
});

test('already posted is not posted twice', async () => {
  const state = { ...emptyState(), threads: { 'R-01': 77 } };
  const r = await run(decisions([{ id: 'R-01', decision: 'post', comment: 'x' }]), { state });
  assert.equal(r.posts.length, 0);
  assert.deepEqual(outcome(r, 'R-01'), { id: 'R-01', outcome: 'already-posted', threadId: 77, url: `${review.pr.url}?discussionId=77` });
});

test('state is saved after each post', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'post', comment: 'first' }, { id: 'R-03', decision: 'post', comment: 'FAILME' }]), { failPostOn: 'FAILME' });
  assert.equal(r.saves[0].threads['R-01'], 101);
  assert.equal(outcome(r, 'R-03').outcome, 'failed');
  assert.match(outcome(r, 'R-03').reason, /500/);
  assert.equal(r.state.threads['R-01'], 101);
  assert.equal(r.state.lastReviewedIteration, 3);
});

test('dry run posts nothing and reports what would be posted', async () => {
  const r = await run(decisions([{ id: 'R-01', decision: 'post', comment: 'x' }]), { dryRun: true });
  assert.equal(r.posts.length, 0);
  assert.equal(outcome(r, 'R-01').outcome, 'skipped');
  assert.equal(outcome(r, 'R-01').reason, 'dry run: would post on src/app.js:1-2');
  assert.equal(r.saves.length, 0);
});

const fixItem = [{ id: 'R-01', decision: 'apply-fix', comment: 'x' }];
const fakeRun = (head, { applyFails = false } = {}) => {
  const calls = [];
  const fn = async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args.includes('rev-parse')) return { stdout: `${head}\n` };
    if (args.includes('apply') && applyFails) { const e = new Error('x'); e.stderr = 'error: patch failed: src/app.js:1\nmore'; throw e; }
    return { stdout: '' };
  };
  fn.calls = calls;
  return fn;
};

test("apply-fix refused on a teammate's PR", async () => {
  const out = await applyFixes({ review, doc, items: fixItem, repoDir: '/repo', run: fakeRun('abc123') });
  assert.deepEqual(out, [{ id: 'R-01', outcome: 'failed', reason: 'apply fix is only for your own PR' }]);
});

test('apply-fix refused when HEAD differs', async () => {
  const own = { ...review, identity: { ownPr: true } };
  const out = await applyFixes({ review: own, doc, items: fixItem, repoDir: '/repo', run: fakeRun('zzz999') });
  assert.equal(out[0].reason, 'local clone is not at the PR commit');
});

test('apply-fix applies with git apply', async () => {
  const own = { ...review, identity: { ownPr: true } };
  const run = fakeRun('abc123');
  const out = await applyFixes({ review: own, doc, items: fixItem, repoDir: '/repo', run });
  assert.deepEqual(out, [{ id: 'R-01', outcome: 'applied' }]);
  const applies = run.calls.filter((c) => c.includes('apply'));
  assert.deepEqual(applies.map((c) => c.slice(0, 5)), [['git', '-C', '/repo', 'apply', '--check'], ['git', '-C', '/repo', 'apply', '--whitespace=nowarn']].map((a) => a.slice(0, 5)));
  assert.ok(!run.calls.some((c) => c.includes('commit') || c.includes('push')));
});

test('apply-fix reports the first git error line', async () => {
  const own = { ...review, identity: { ownPr: true } };
  const out = await applyFixes({ review: own, doc, items: fixItem, repoDir: '/repo', run: fakeRun('abc123', { applyFails: true }) });
  assert.deepEqual(out, [{ id: 'R-01', outcome: 'failed', reason: 'error: patch failed: src/app.js:1' }]);
});

test('post routes apply-fix items to applyFixes', async () => {
  const f = fakeAdo();
  const r = await postDecisions({ review, doc, decisions: decisions(fixItem), state: emptyState(), ado: f.ado, dryRun: false, save: () => {}, applyFix: async (items) => items.map((i) => ({ id: i.id, outcome: 'applied' })) });
  assert.equal(outcome(r, 'R-01').outcome, 'applied');
  assert.equal(f.posts.length, 0);
});

test('post-with-fix refuses a fix that repeats a secret', async () => {
  const leaky = { iteration: 3, findings: [{ ...doc.findings[0], fix: '--- a/src/app.js\n+++ b/src/app.js\n@@ -2 +2 @@\n-const password = "Sandbox123!";\n+const password = process.env.PW;\n' }] };
  const f = fakeAdo();
  const dec = { pr: 42, iteration: 3, items: [{ id: 'R-01', decision: 'post-with-fix', comment: 'Use the environment.', digest: findingDigest(leaky.findings[0]) }], undecided: [] };
  const r = await postDecisions({ review, doc: leaky, decisions: dec, state: emptyState(), ado: f.ado, save: () => {} });
  assert.equal(f.posts.length, 0);
  assert.match(outcome(r, 'R-01').reason, /fix repeats a secret/);
});

test('post refuses a decision whose finding changed after the page was rendered', async () => {
  const f = fakeAdo();
  const changed = { ...doc, findings: doc.findings.map((x) => (x.id === 'R-01' ? { ...x, fix: '--- a/src/app.js\n+++ b/src/app.js\n@@ -1 +1 @@\n-b\n+zzz\n' } : x)) };
  const r = await postDecisions({ review, doc: changed, decisions: decisions([{ id: 'R-01', decision: 'post-with-fix', comment: 'x' }]), state: emptyState(), ado: f.ado, save: () => {} });
  assert.equal(f.posts.length, 0);
  assert.match(outcome(r, 'R-01').reason, /changed since the page was rendered/);
});

test('post refuses findings checked for another iteration', async () => {
  const f = fakeAdo();
  const r = await postDecisions({ review, doc: { ...doc, iteration: 2 }, decisions: decisions([{ id: 'R-02', decision: 'post', comment: 'x' }]), state: emptyState(), ado: f.ado, save: () => {} });
  assert.equal(f.posts.length, 0);
  assert.match(outcome(r, 'R-02').reason, /findings.json was checked for iteration 2/);
});
