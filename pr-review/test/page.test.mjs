import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFileTree, fileSummary, groupFindings, decisionOptions, collectDecisions, SEVERITY_ORDER } from '../page/app.mjs';

const files = [
  { path: 'src/b.js', changeType: 'edit' },
  { path: 'README.md', changeType: 'edit' },
  { path: 'src/api/a.js', changeType: 'add' },
  { path: 'src/a.js', changeType: 'delete' },
];
const findings = [
  { id: 'R-01', category: 'Bug', severity: 'Medium', file: 'src/b.js', fix: null },
  { id: 'R-02', category: 'Security', severity: 'High', file: 'src/b.js', fix: '--- a\n+++ b\n@@ -1 +1 @@\n-x\n+y\n' },
  { id: 'R-03', category: 'Story', severity: 'Low', file: null, fix: null },
  { id: 'R-04', category: 'Quality', severity: 'Low', file: 'src/api/a.js', fix: null },
];

test('severity order is Blocker to Low', () => {
  assert.deepEqual(SEVERITY_ORDER, ['Blocker', 'High', 'Medium', 'Low']);
});

test('buildFileTree nests folders like ADO', () => {
  const root = buildFileTree(files, findings);
  assert.deepEqual(root.children.map((n) => n.name), ['src', 'README.md']);
  const src = root.children[0];
  assert.deepEqual(src.children.map((n) => n.name), ['api', 'a.js', 'b.js']);
  assert.equal(src.path, 'src');
  assert.deepEqual(src.children[2].file, { path: 'src/b.js', changeType: 'edit', count: 2, maxSeverity: 'High' });
  assert.equal(src.children[0].children[0].file.count, 1);
});

test('fileSummary takes the highest severity', () => {
  assert.deepEqual(fileSummary(findings, 'src/b.js'), { count: 2, maxSeverity: 'High' });
  assert.deepEqual(fileSummary(findings, 'README.md'), { count: 0, maxSeverity: null });
});

test('groupFindings uses profile groups when present', () => {
  const groups = { Bug: 'Potential bug reports', Security: 'Security considerations', Story: 'Testing and documentation gaps', Quality: 'Quality suggestions' };
  const g = groupFindings(findings, groups);
  assert.deepEqual(g.map((x) => x.heading), ['Potential bug reports', 'Security considerations', 'Testing and documentation gaps', 'Quality suggestions']);
});

test('groupFindings falls back to severity groups, highest first', () => {
  const g = groupFindings(findings, null);
  assert.deepEqual(g.map((x) => [x.heading, x.findings.map((f) => f.id)]), [['High', ['R-02']], ['Medium', ['R-01']], ['Low', ['R-03', 'R-04']]]);
});

test("decisionOptions hides apply-fix on a teammate's PR", () => {
  assert.deepEqual(decisionOptions(findings[1], false), ['post', 'post-with-fix', 'skip']);
  assert.deepEqual(decisionOptions(findings[1], true), ['post', 'post-with-fix', 'apply-fix', 'skip']);
});

test('decisionOptions hides fix options without a fix', () => {
  assert.deepEqual(decisionOptions(findings[0], true), ['post', 'skip']);
});

test('collectDecisions lists undecided IDs', () => {
  const r = collectDecisions([
    { id: 'R-01', decision: 'post', comment: 'edited text' },
    { id: 'R-02', decision: null, comment: 'x' },
    { id: 'R-03', decision: 'skip', comment: 'y' },
  ]);
  assert.deepEqual(r, { items: [{ id: 'R-01', decision: 'post', comment: 'edited text' }, { id: 'R-03', decision: 'skip', comment: 'y' }], undecided: ['R-02'] });
});

import { ROBOT_SVG, robotLine } from '../page/app.mjs';

test('robot is a small self-contained SVG', () => {
  assert.ok(ROBOT_SVG.startsWith('<svg'));
  assert.ok(ROBOT_SVG.length < 3000, `${ROBOT_SVG.length} bytes`);
  assert.doesNotMatch(ROBOT_SVG, /https?:|<script|<image|href=/i);
});

test('robotLine summarises the issues', () => {
  assert.equal(robotLine([{ severity: 'Blocker' }, { severity: 'High' }, { severity: 'Low' }]), '3 issues, 1 blocker. Your call.');
  assert.equal(robotLine([{ severity: 'Medium' }]), '1 issue. Your call.');
  assert.equal(robotLine([]), 'Nothing found in the checked scope. Not an approval.');
});

import { safeUrl, findingDigest } from '../page/app.mjs';

test('safeUrl keeps http and https links only', () => {
  assert.equal(safeUrl('https://dev.azure.com/x'), 'https://dev.azure.com/x');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,x'), null);
  assert.equal(safeUrl(null), null);
});

test('findingDigest changes when file, line, fix or comment-independent fields change', () => {
  const f = { id: 'R-01', category: 'Bug', severity: 'High', file: 'a.js', line: { start: 1, end: 2 }, title: 'T', fix: null, comment: 'c' };
  assert.equal(findingDigest(f), findingDigest({ ...f, comment: 'edited' }));
  assert.notEqual(findingDigest(f), findingDigest({ ...f, line: { start: 2, end: 2 } }));
  assert.notEqual(findingDigest(f), findingDigest({ ...f, fix: '--- a\n' }));
});
